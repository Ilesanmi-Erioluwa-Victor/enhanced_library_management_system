const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema(
  {
    maxBooksPerMember:    { type: Number, default: 3 },
    defaultLoanDays:      { type: Number, default: 14 },
    maxRenewals:          { type: Number, default: 2 },
    fineRatePerDay:       { type: Number, default: 50 },
    lostBookReplacement:  { type: Number, default: 5000 },
    allowMemberLogin:     { type: Boolean, default: true },
    autoMarkOverdue:      { type: Boolean, default: true },
    requirePaymentBeforeReturn: { type: Boolean, default: true },
    defaultGateway:       { type: String, enum: ["paystack", "cash"], default: "paystack" },
    libraryName:          { type: String, default: "DSPG Library" },
    libraryAddress:       { type: String, default: "" },
    libraryPhone:         { type: String, default: "" },
    libraryEmail:         { type: String, default: "" },
  },
  { timestamps: true }
);

const SETTINGS_ID = new mongoose.Types.ObjectId("000000000000000000000001");

settingsSchema.statics.getOrCreate = async function () {
  let s = await this.findById(SETTINGS_ID).lean();
  if (!s) {
    s = await this.create({ _id: SETTINGS_ID });
    s = s.toObject();
  }
  return s;
};

module.exports = mongoose.model("Settings", settingsSchema);
module.exports.SETTINGS_ID = SETTINGS_ID;
