const asyncHandler = require("express-async-handler");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const logAudit = require("../utils/auditLogger");
const { buildPagination, buildSearchFilter } = require("../utils/pagination");

const hashPassword = async (plain) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
};

exports.create = asyncHandler(async (req, res) => {
  const { fullName, email, password, role, phone } = req.body;
  if (!fullName || !email || !password || !role) { res.status(400); throw new Error("fullName, email, password, and role are required"); }
  if (!["admin", "librarian", "member"].includes(role)) { res.status(400); throw new Error("role must be 'admin', 'librarian', or 'member'"); }
  if (password.length < 6) { res.status(400); throw new Error("Password must be at least 6 characters"); }
  const exists = await User.findOne({ email: email.toLowerCase().trim() }).select("_id").lean();
  if (exists) { res.status(409); throw new Error("A user with this email already exists"); }
  const user = await User.create({ fullName, email: email.toLowerCase().trim(), password, role, phone });
  await logAudit({ req, user: req.user, action: "user.create", targetModel: "User", targetId: user._id, details: `Created ${role} user ${user.fullName}` });
  res.status(201).json({ _id: user._id, fullName: user.fullName, email: user.email, role: user.role, phone: user.phone, isActive: user.isActive });
});

exports.list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = buildPagination(req);
  const filter = buildSearchFilter(req, ["fullName", "email", "phone"]);
  if (req.query.role) filter.role = req.query.role;
  if (req.query.status === "active") filter.isActive = true;
  if (req.query.status === "inactive") filter.isActive = false;
  const [items, total] = await Promise.all([
    User.find(filter).select("-password").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    User.countDocuments(filter),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) || 1, limit });
});

exports.get = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select("-password").lean();
  if (!user) { res.status(404); throw new Error("User not found"); }
  res.json(user);
});

exports.update = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) { res.status(404); throw new Error("User not found"); }
  const { fullName, email, role, phone, isActive, password } = req.body;
  if (fullName !== undefined) user.fullName = fullName;
  if (email !== undefined) {
    const dup = await User.findOne({ email: email.toLowerCase().trim(), _id: { $ne: user._id } }).select("_id").lean();
    if (dup) { res.status(409); throw new Error("Email is already in use by another user"); }
    user.email = email.toLowerCase().trim();
  }
  if (role !== undefined) {
    if (!["admin", "librarian", "member"].includes(role)) { res.status(400); throw new Error("role must be 'admin', 'librarian', or 'member'"); }
    user.role = role;
  }
  if (phone !== undefined) user.phone = phone;
  if (isActive !== undefined) user.isActive = !!isActive;
  if (password) {
    if (password.length < 6) { res.status(400); throw new Error("Password must be at least 6 characters"); }
    user.password = password;
  }
  await user.save();
  await logAudit({ req, user: req.user, action: "user.update", targetModel: "User", targetId: user._id, details: `Updated user ${user.fullName}` });
  const obj = user.toObject();
  delete obj.password;
  res.json(obj);
});

exports.deactivate = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select("fullName isActive").lean();
  if (!user) { res.status(404); throw new Error("User not found"); }
  await User.updateOne({ _id: req.params.id }, { $set: { isActive: false } });
  await logAudit({ req, user: req.user, action: "user.deactivate", targetModel: "User", targetId: req.params.id, details: `Deactivated user ${user.fullName}` });
  res.json({ message: "User deactivated" });
});

exports.changeOwnPassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) { res.status(400); throw new Error("New password must be at least 6 characters"); }
  const user = await User.findById(req.user._id).select("password");
  if (!user) { res.status(404); throw new Error("User not found"); }
  if (currentPassword) {
    const ok = await user.matchPassword(currentPassword);
    if (!ok) { res.status(400); throw new Error("Current password is incorrect"); }
  }
  const hashed = await hashPassword(newPassword);
  await User.updateOne({ _id: req.user._id }, { $set: { password: hashed } });
  await logAudit({ req, user: req.user, action: "user.changePassword", targetModel: "User", targetId: req.user._id, details: "Changed own password" });
  res.json({ message: "Password updated" });
});

exports.updateOwnProfile = asyncHandler(async (req, res) => {
  const { fullName, phone } = req.body;
  const user = await User.findById(req.user._id);
  if (!user) { res.status(404); throw new Error("User not found"); }
  if (fullName !== undefined) {
    if (!fullName.trim()) { res.status(400); throw new Error("Full name cannot be empty"); }
    user.fullName = fullName.trim();
  }
  if (phone !== undefined) user.phone = phone.trim();
  await user.save();
  await logAudit({ req, user: req.user, action: "user.updateOwnProfile", targetModel: "User", targetId: user._id, details: "Updated own profile" });
  const obj = user.toObject();
  delete obj.password;
  res.json(obj);
});
