const asyncHandler = require("express-async-handler");
const Department = require("../models/Department");
const Member = require("../models/Member");
const logAudit = require("../utils/auditLogger");

exports.create = asyncHandler(async (req, res) => {
  const { name, code, description } = req.body;
  if (!name) { res.status(400); throw new Error("Department name is required"); }
  const existing = await Department.findOne({ name: name.trim() }).select("_id").lean();
  if (existing) { res.status(409); throw new Error("Department with this name already exists"); }
  const dept = await Department.create({
    name: name.trim(),
    code: code ? code.trim().toUpperCase() : undefined,
    description,
    createdBy: req.user._id,
  });
  await logAudit({
    req, user: req.user,
    action: "department.create",
    targetModel: "Department",
    targetId: dept._id,
    details: `Created department ${dept.name}`,
  });
  res.status(201).json(dept);
});

exports.list = asyncHandler(async (req, res) => {
  const { activeOnly } = req.query;
  const filter = activeOnly === "true" ? { isActive: true } : {};
  const depts = await Department.find(filter)
    .select("name code description isActive createdBy createdAt")
    .sort({ name: 1 })
    .populate("createdBy", "fullName email")
    .lean();
  res.json(depts);
});

exports.update = asyncHandler(async (req, res) => {
  const { name, code, description, isActive } = req.body;
  const dept = await Department.findById(req.params.id);
  if (!dept) { res.status(404); throw new Error("Department not found"); }
  if (name && name.trim() !== dept.name) {
    const dup = await Department.findOne({ name: name.trim(), _id: { $ne: dept._id } }).select("_id").lean();
    if (dup) { res.status(409); throw new Error("Another department already has this name"); }
    dept.name = name.trim();
  }
  if (code !== undefined) dept.code = code ? code.trim().toUpperCase() : undefined;
  if (description !== undefined) dept.description = description;
  if (isActive !== undefined) dept.isActive = !!isActive;
  await dept.save();
  await logAudit({
    req, user: req.user,
    action: "department.update",
    targetModel: "Department",
    targetId: dept._id,
    details: `Updated department ${dept.name}`,
  });
  res.json(dept);
});

exports.remove = asyncHandler(async (req, res) => {
  const [dept, assigned] = await Promise.all([
    Department.findById(req.params.id).select("name").lean(),
    Member.countDocuments({ department: req.params.id }),
  ]);
  if (!dept) { res.status(404); throw new Error("Department not found"); }
  if (assigned > 0) {
    res.status(400);
    throw new Error(`Cannot delete department with ${assigned} assigned member(s). Reassign them first.`);
  }
  await Department.deleteOne({ _id: req.params.id });
  await logAudit({
    req, user: req.user,
    action: "department.delete",
    targetModel: "Department",
    targetId: req.params.id,
    details: `Deleted department ${dept.name}`,
  });
  res.json({ message: "Department deleted" });
});
