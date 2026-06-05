const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    transactionCode: { type: String, unique: true, index: true },
    book:            { type: mongoose.Schema.Types.ObjectId, ref: "Book", required: true, index: true },
    member:          { type: mongoose.Schema.Types.ObjectId, ref: "Member", required: true, index: true },
    issueDate:       { type: Date, default: Date.now, index: true },
    dueDate:         { type: Date, required: true, index: true },
    returnDate:      { type: Date },
    status:          {
      type: String,
      enum: ["Issued", "Returned", "Overdue", "Renewed", "Lost"],
      default: "Issued",
      index: true,
    },
    renewals:        { type: Number, default: 0 },
    maxRenewals:     { type: Number, default: 2 },
    daysOverdue:     { type: Number, default: 0 },
    fineAmount:      { type: Number, default: 0 },
    finePaid:        { type: Boolean, default: false },
    outstandingFine: { type: Number, default: 0, index: true },
    paymentStatus:   { type: String, enum: ["unpaid", "partial", "paid", "waived"], default: "unpaid", index: true },
    paymentHistory:  [{ type: mongoose.Schema.Types.ObjectId, ref: "Payment" }],
    notes:           { type: String },
    issuedBy:        { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    returnedBy:      { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    lost:            { type: Boolean, default: false },
  },
  { timestamps: true }
);

transactionSchema.index({ status: 1, dueDate: 1 });
transactionSchema.index({ member: 1, status: 1 });
transactionSchema.index({ book: 1, status: 1 });
transactionSchema.index({ transactionCode: "text", notes: "text" });
transactionSchema.index({ createdAt: -1 });
transactionSchema.index({ member: 1, outstandingFine: 1 });

module.exports = mongoose.model("Transaction", transactionSchema);
