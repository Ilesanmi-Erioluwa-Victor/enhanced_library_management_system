const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const User = require("../models/User");

const protect = asyncHandler(async (req, res, next) => {
  let token;
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    token = header.split(" ")[1];
  }
  if (!token) {
    res.status(401);
    throw new Error("Not authorized — no token");
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    if (!user || !user.isActive) {
      res.status(401);
      throw new Error("Not authorized — user inactive");
    }
    user.memberRef = decoded.memberRef || null;
    req.user = user;
    next();
  } catch (err) {
    res.status(401);
    throw new Error("Not authorized — token invalid");
  }
});

module.exports = protect;
