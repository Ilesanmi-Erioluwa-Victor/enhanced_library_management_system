const mongoose = require("mongoose");

const departmentSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, unique: true, trim: true, index: true },
    code:        { type: String, trim: true, uppercase: true },
    description: { type: String, trim: true },
    isActive:    { type: Boolean, default: true, index: true },
    createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Department", departmentSchema);
