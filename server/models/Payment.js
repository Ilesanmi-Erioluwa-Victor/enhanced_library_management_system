const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    reference:    { type: String, required: true, unique: true, index: true },
    transaction:  { type: mongoose.Schema.Types.ObjectId, ref: "Transaction", required: true, index: true },
    member:       { type: mongoose.Schema.Types.ObjectId, ref: "Member", required: true, index: true },
    amount:       { type: Number, required: true, min: 0 },
    currency:     { type: String, default: "NGN" },
    gateway:      { type: String, enum: ["paystack", "cash", "bank_transfer"], default: "paystack", index: true },
    gatewayRef:   { type: String, index: true, sparse: true },
    accessCode:   { type: String },
    status:       { type: String, enum: ["pending", "success", "failed", "cancelled"], default: "pending", index: true },
    method:       { type: String, enum: ["card", "transfer", "ussd", "qr", "cash", "bank_transfer", "other"], default: "card" },
    channel:      { type: String },
    initiatedBy:  { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    paidAt:       { type: Date, index: true },
    rawResponse:  { type: mongoose.Schema.Types.Mixed },
    notes:        { type: String, trim: true },
  },
  { timestamps: true }
);

paymentSchema.index({ transaction: 1, status: 1 });
paymentSchema.index({ member: 1, createdAt: -1 });
paymentSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("Payment", paymentSchema);
