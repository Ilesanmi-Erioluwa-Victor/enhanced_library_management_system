const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const Member = require("../models/Member");
const generateToken = require("../utils/generateToken");

const resolveMemberRef = async (user) => {
  if (user.role !== "member") return null;
  const member = await Member.findOne({ email: user.email.toLowerCase() }).select("_id memberID").lean();
  return member ? String(member._id) : null;
};

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (user && (await user.matchPassword(password))) {
    const memberRef = await resolveMemberRef(user);
    const enriched = { ...user.toObject(), memberRef };
    res.json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      memberRef,
      member: memberRef ? await Member.findById(memberRef).select("firstName lastName memberID memberType email phone").lean() : null,
      token: generateToken(enriched),
    });
  } else {
    res.status(401);
    throw new Error("Invalid email or password");
  }
});

exports.logout = asyncHandler(async (req, res) => res.json({ message: "Logged out" }));
exports.forgotPassword = asyncHandler(async (req, res) => res.json({ message: "Password reset link sent" }));
exports.resetPassword = asyncHandler(async (req, res) => res.json({ message: "Password reset successful" }));
exports.me = asyncHandler(async (req, res) => {
  const memberRef = await resolveMemberRef(req.user);
  res.json({ ...req.user.toObject(), memberRef });
});
