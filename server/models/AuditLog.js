const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    action:       { type: String, required: true, index: true },
    performedBy:  { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    performedByName: { type: String },
    role:         { type: String },
    target:       { type: String },
    targetModel:  { type: String },
    details:      { type: mongoose.Schema.Types.Mixed },
    ip:           { type: String },
    userAgent:    { type: String },
    timestamp:    { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);

auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ performedBy: 1, timestamp: -1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
