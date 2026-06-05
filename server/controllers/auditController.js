const asyncHandler = require("express-async-handler");
const AuditLog = require("../models/AuditLog");
const { buildPagination, buildSearchFilter } = require("../utils/pagination");

exports.list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = buildPagination(req);
  const filter = buildSearchFilter(req, ["action", "details", "targetModel"]);
  if (req.query.user) filter.performedBy = req.query.user;
  if (req.query.action) filter.action = req.query.action;
  if (req.query.startDate || req.query.endDate) {
    filter.timestamp = {};
    if (req.query.startDate) filter.timestamp.$gte = new Date(req.query.startDate);
    if (req.query.endDate)   filter.timestamp.$lte = new Date(req.query.endDate);
  }
  const [items, total] = await Promise.all([
    AuditLog.find(filter)
      .populate("performedBy", "fullName email role")
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(filter),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) || 1, limit });
});
