const AuditLog = require("../models/AuditLog");

const logAudit = async ({ req, user, action, targetModel, targetId, details }) => {
  try {
    await AuditLog.create({
      performedBy: user?._id || user?.id || null,
      action,
      targetModel,
      targetId,
      details,
      ipAddress: req?.ip || req?.headers?.["x-forwarded-for"] || req?.connection?.remoteAddress,
    });
  } catch (e) {
    console.error("[audit] failed to write log:", e.message);
  }
};

module.exports = logAudit;
