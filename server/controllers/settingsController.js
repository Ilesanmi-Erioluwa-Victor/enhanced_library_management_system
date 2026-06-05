const Settings = require("../models/Settings");
const { invalidate, refresh } = require("../utils/settingsCache");
const { logAction } = require("../utils/auditLogger");

const SETTINGS_PROJ = "libraryName libraryAddress libraryPhone libraryEmail maxBooksPerMember defaultLoanDays maxRenewals fineRatePerDay lostBookReplacement allowMemberLogin autoMarkOverdue requirePaymentBeforeReturn defaultGateway";

exports.getSettings = async (req, res) => {
  const settings = await refresh();
  res.json({ data: settings });
};

exports.updateSettings = async (req, res) => {
  const updated = await Settings.findByIdAndUpdate(
    Settings.SETTINGS_ID,
    { $set: req.body },
    { new: true, runValidators: true, projection: SETTINGS_PROJ }
  ).lean();
  if (!updated) {
    const created = await Settings.create({ _id: Settings.SETTINGS_ID, ...req.body });
    invalidate();
    return res.json({ data: created.toObject() });
  }
  invalidate();
  await logAction({
    req,
    action: "settings.update",
    target: "Settings",
    targetModel: "Settings",
    details: { fields: Object.keys(req.body) },
  });
  res.json({ data: updated });
};
