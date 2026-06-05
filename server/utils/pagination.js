const buildPagination = (req) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
  return { page, limit, skip: (page - 1) * limit };
};

const buildSearchFilter = (req, fields = []) => {
  const q = (req.query.q || req.query.search || "").toString().trim();
  if (!q) return {};
  const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  return { $or: fields.map((f) => ({ [f]: rx })) };
};

module.exports = { buildPagination, buildSearchFilter };
