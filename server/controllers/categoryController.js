const asyncHandler = require("express-async-handler");
const Category = require("../models/Category");
const Book = require("../models/Book");
const logAudit = require("../utils/auditLogger");

exports.create = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  if (!name) { res.status(400); throw new Error("Category name is required"); }
  const existing = await Category.findOne({ name: name.trim() }).select("_id").lean();
  if (existing) { res.status(409); throw new Error("Category with this name already exists"); }
  const cat = await Category.create({ name: name.trim(), description, createdBy: req.user._id });
  await logAudit({ req, user: req.user, action: "category.create", targetModel: "Category", targetId: cat._id, details: `Created category ${cat.name}` });
  res.status(201).json(cat);
});

exports.list = asyncHandler(async (req, res) => {
  const cats = await Category.find()
    .select("name description createdBy createdAt")
    .sort({ name: 1 })
    .populate("createdBy", "fullName email")
    .lean();
  res.json(cats);
});

exports.update = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const cat = await Category.findById(req.params.id);
  if (!cat) { res.status(404); throw new Error("Category not found"); }
  if (name && name.trim() !== cat.name) {
    const dup = await Category.findOne({ name: name.trim(), _id: { $ne: cat._id } }).select("_id").lean();
    if (dup) { res.status(409); throw new Error("Another category already has this name"); }
    cat.name = name.trim();
  }
  if (description !== undefined) cat.description = description;
  await cat.save();
  await logAudit({ req, user: req.user, action: "category.update", targetModel: "Category", targetId: cat._id, details: `Updated category ${cat.name}` });
  res.json(cat);
});

exports.remove = asyncHandler(async (req, res) => {
  const [cat, assigned] = await Promise.all([
    Category.findById(req.params.id).select("name").lean(),
    Book.countDocuments({ category: req.params.id }),
  ]);
  if (!cat) { res.status(404); throw new Error("Category not found"); }
  if (assigned > 0) {
    res.status(400);
    throw new Error(`Cannot delete category with ${assigned} assigned book(s). Reassign or delete them first.`);
  }
  await Category.deleteOne({ _id: req.params.id });
  await logAudit({ req, user: req.user, action: "category.delete", targetModel: "Category", targetId: req.params.id, details: `Deleted category ${cat.name}` });
  res.json({ message: "Category deleted" });
});
