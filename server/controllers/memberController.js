const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const Member = require("../models/Member");
const Department = require("../models/Department");
const Transaction = require("../models/Transaction");
const { getSettings } = require("../utils/settingsCache");
const logAudit = require("../utils/auditLogger");
const { buildPagination, buildSearchFilter } = require("../utils/pagination");
const generateMemberID = require("../utils/generateMemberID");

const PUBLIC_PROJ = "firstName lastName email phone gender address memberType department departmentRef memberID photo membershipStart membershipEnd maxBooksAllowed isActive";

const resolveDepartment = async (raw) => {
  if (!raw) return { departmentRef: undefined, department: undefined };
  if (mongoose.Types.ObjectId.isValid(raw) && String(raw).length === 24) {
    const d = await Department.findById(raw).select("name").lean();
    if (!d) { const e = new Error("Selected department does not exist"); e.statusCode = 400; throw e; }
    return { departmentRef: d._id, department: d.name };
  }
  const trimmed = String(raw).trim();
  if (!trimmed) return { departmentRef: undefined, department: undefined };
  const d = await Department.findOne({ name: trimmed, isActive: true }).select("_id name").lean();
  if (!d) { const e = new Error(`Department "${trimmed}" is not registered. Ask an admin to add it.`); e.statusCode = 400; throw e; }
  return { departmentRef: d._id, department: d.name };
};

exports.create = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, phone, gender, address, memberType, department, departmentRef, maxBooksAllowed } = req.body;
  if (!firstName || !lastName || !phone || !memberType) {
    res.status(400);
    throw new Error("firstName, lastName, phone, and memberType are required");
  }
  const normEmail = email ? email.toLowerCase().trim() : null;
  const normPhone = phone.trim();
  const resolvedDept = await resolveDepartment(departmentRef || department);

  const [emailDup, phoneDup, settings, memberID] = await Promise.all([
    normEmail ? Member.findOne({ email: normEmail }).lean() : Promise.resolve(null),
    Member.findOne({ phone: normPhone }).lean(),
    getSettings(),
    generateMemberID(),
  ]);
  if (emailDup) { res.status(409); throw new Error("A member with this email already exists"); }
  if (phoneDup) { res.status(409); throw new Error("A member with this phone already exists"); }

  const start = new Date();
  const end = new Date(start);
  end.setMonth(end.getMonth() + (settings.membershipValidityMonths || 12));

  const member = await Member.create({
    memberID,
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: normEmail || undefined,
    phone: normPhone,
    gender, address, memberType,
    department: resolvedDept.department,
    departmentRef: resolvedDept.departmentRef,
    maxBooksAllowed: maxBooksAllowed || settings.maxBooksPerMember || 3,
    membershipStart: start,
    membershipEnd: end,
    registeredBy: req.user._id,
  });
  await logAudit({ req, user: req.user, action: "member.create", targetModel: "Member", targetId: member._id, details: `Registered member ${member.firstName} ${member.lastName} (${member.memberID})` });
  res.status(201).json(member);
});

exports.list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = buildPagination(req);
  const filter = buildSearchFilter(req, ["firstName", "lastName", "memberID", "phone", "email"]);
  if (req.query.memberType) filter.memberType = req.query.memberType;
  if (req.query.department) filter.department = req.query.department;
  if (req.query.status === "active") filter.isActive = true;
  if (req.query.status === "inactive") filter.isActive = false;

  const [items, total] = await Promise.all([
    Member.find(filter)
      .select(PUBLIC_PROJ + " createdAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("registeredBy", "fullName")
      .populate("departmentRef", "name code")
      .lean(),
    Member.countDocuments(filter),
  ]);

  const memberIds = items.map((m) => m._id);
  const summaries = await Transaction.aggregate([
    { $match: { member: { $in: memberIds }, status: { $in: ["Issued", "Overdue"] } } },
    { $group: { _id: "$member", borrowed: { $sum: 1 } } },
  ]);
  const summaryMap = Object.fromEntries(summaries.map((s) => [String(s._id), s.borrowed]));

  const itemsWithCount = items.map((m) => ({ ...m, booksBorrowed: summaryMap[String(m._id)] || 0 }));
  res.json({ items: itemsWithCount, total, page, pages: Math.ceil(total / limit) || 1, limit });
});

exports.get = asyncHandler(async (req, res) => {
  const [member, txns, statsAgg] = await Promise.all([
    Member.findById(req.params.id).select(PUBLIC_PROJ)
      .populate("registeredBy", "fullName email")
      .populate("departmentRef", "name code")
      .lean(),
    Transaction.find({ member: req.params.id })
      .sort({ createdAt: -1 })
      .limit(100)
      .select("transactionCode book issueDate dueDate returnDate status fineAmount finePaid daysOverdue")
      .populate("book", "title accessionNumber author")
      .lean(),
    Transaction.aggregate([
      { $match: { member: new (require("mongoose").Types.ObjectId)(req.params.id) } },
      { $group: {
        _id: null,
        totalBorrowed:     { $sum: 1 },
        currentlyBorrowed: { $sum: { $cond: [{ $in: ["$status", ["Issued", "Overdue"]] }, 1, 0] } },
        overdue:           { $sum: { $cond: [{ $eq: ["$status", "Overdue"] }, 1, 0] } },
        totalFines:        { $sum: "$fineAmount" },
        unpaidFines:       { $sum: { $cond: [{ $and: [{ $gt: ["$fineAmount", 0] }, { $eq: ["$finePaid", false] }] }, "$fineAmount", 0] } },
      } },
    ]),
  ]);
  if (!member) { res.status(404); throw new Error("Member not found"); }
  const stats = statsAgg[0] || { totalBorrowed: 0, currentlyBorrowed: 0, overdue: 0, totalFines: 0, unpaidFines: 0 };
  res.json({ member, transactions: txns, stats });
});

exports.update = asyncHandler(async (req, res) => {
  const member = await Member.findById(req.params.id);
  if (!member) { res.status(404); throw new Error("Member not found"); }
  const allowed = ["firstName", "lastName", "email", "phone", "gender", "address", "memberType", "maxBooksAllowed", "membershipEnd"];
  for (const k of allowed) {
    if (req.body[k] !== undefined) {
      if (k === "email" && req.body.email) member.email = req.body.email.toLowerCase().trim();
      else member[k] = req.body[k];
    }
  }
  if (req.body.departmentRef !== undefined || req.body.department !== undefined) {
    const resolvedDept = await resolveDepartment(req.body.departmentRef || req.body.department);
    member.department = resolvedDept.department;
    member.departmentRef = resolvedDept.departmentRef;
  }
  await member.save();
  await logAudit({ req, user: req.user, action: "member.update", targetModel: "Member", targetId: member._id, details: `Updated member ${member.firstName} ${member.lastName}` });
  res.json(member);
});

exports.deactivate = asyncHandler(async (req, res) => {
  const [member, active] = await Promise.all([
    Member.findById(req.params.id).select("firstName lastName memberID isActive").lean(),
    Transaction.countDocuments({ member: req.params.id, status: { $in: ["Issued", "Overdue"] } }),
  ]);
  if (!member) { res.status(404); throw new Error("Member not found"); }
  if (active > 0) {
    res.status(400);
    throw new Error(`Member has ${active} active loan(s). Process them first.`);
  }
  await Member.updateOne({ _id: req.params.id }, { $set: { isActive: false } });
  await logAudit({ req, user: req.user, action: "member.deactivate", targetModel: "Member", targetId: member._id, details: `Deactivated member ${member.firstName} ${member.lastName}` });
  res.json({ message: "Member deactivated" });
});

exports.uploadPhoto = asyncHandler(async (req, res) => {
  if (!req.file) { res.status(400); throw new Error("No image file provided"); }
  const member = await Member.findByIdAndUpdate(
    req.params.id,
    { $set: { photo: `/uploads/${req.file.filename}` } },
    { new: true, projection: "firstName lastName photo memberID" }
  ).lean();
  if (!member) { res.status(404); throw new Error("Member not found"); }
  await logAudit({ req, user: req.user, action: "member.uploadPhoto", targetModel: "Member", targetId: member._id, details: `Uploaded photo for ${member.firstName} ${member.lastName}` });
  res.json({ photo: member.photo });
});

exports.history = asyncHandler(async (req, res) => {
  const { page, limit, skip } = buildPagination(req);
  const [member, items, total] = await Promise.all([
    Member.findById(req.params.id).select("firstName lastName memberID").lean(),
    Transaction.find({ member: req.params.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("transactionCode book issueDate dueDate returnDate status fineAmount finePaid daysOverdue")
      .populate("book", "title accessionNumber author")
      .lean(),
    Transaction.countDocuments({ member: req.params.id }),
  ]);
  if (!member) { res.status(404); throw new Error("Member not found"); }
  res.json({ member, items, total, page, pages: Math.ceil(total / limit) || 1, limit });
});

exports.findByEmail = asyncHandler(async (req, res) => {
  const email = (req.query.email || "").toString().trim().toLowerCase();
  if (!email) { res.status(400); throw new Error("email query is required"); }
  const member = await Member.findOne({ email }).select(PUBLIC_PROJ).populate("departmentRef", "name code").lean();
  if (!member) { res.status(404); throw new Error("No member profile linked to this email"); }
  res.json(member);
});

exports.outstanding = asyncHandler(async (req, res) => {
  if (req.user.role === "member" && (!req.user.memberRef || String(req.user.memberRef) !== String(req.params.id))) {
    res.status(403); throw new Error("You can only access your own outstanding fines");
  }
  const [member, txns, totalAgg] = await Promise.all([
    Member.findById(req.params.id).select("firstName lastName memberID email").lean(),
    Transaction.find({ member: req.params.id, outstandingFine: { $gt: 0 } })
      .select("transactionCode book issueDate dueDate returnDate status fineAmount outstandingFine paymentStatus")
      .populate("book", "title accessionNumber")
      .sort({ dueDate: 1 })
      .lean(),
    Transaction.aggregate([
      { $match: { member: new mongoose.Types.ObjectId(req.params.id), outstandingFine: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: "$outstandingFine" }, count: { $sum: 1 } } },
    ]),
  ]);
  if (!member) { res.status(404); throw new Error("Member not found"); }
  const total = totalAgg[0]?.total || 0;
  const count = totalAgg[0]?.count || 0;
  res.json({ member, transactions: txns, outstandingFine: total, unpaidCount: count });
});
