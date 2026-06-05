const mongoose = require("mongoose");

const memberSchema = new mongoose.Schema(
  {
    memberID:        { type: String, unique: true, index: true },
    firstName:       { type: String, required: true, trim: true },
    lastName:        { type: String, required: true, trim: true },
    email:           { type: String, unique: true, sparse: true, lowercase: true, trim: true, index: true },
    phone:           { type: String, required: true, trim: true, index: true },
    gender:          { type: String, enum: ["Male", "Female", "Other"] },
    address:         { type: String },
    memberType:      { type: String, enum: ["Student", "Staff", "External"], required: true, index: true },
    department:      { type: String, trim: true, index: true },
    departmentRef:   { type: mongoose.Schema.Types.ObjectId, ref: "Department", index: true },
    photo:           { type: String },
    membershipStart: { type: Date, default: Date.now },
    membershipEnd:   { type: Date, index: true },
    maxBooksAllowed: { type: Number, default: 3 },
    isActive:        { type: Boolean, default: true, index: true },
    registeredBy:    { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

memberSchema.index({ firstName: "text", lastName: "text", email: "text", memberID: "text", phone: "text" });
memberSchema.index({ memberType: 1, isActive: 1 });

module.exports = mongoose.model("Member", memberSchema);
