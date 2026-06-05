const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    res.status(403);
    throw new Error(`Forbidden — requires one of: ${roles.join(", ")}`);
  }
  next();
};

module.exports = authorize;
