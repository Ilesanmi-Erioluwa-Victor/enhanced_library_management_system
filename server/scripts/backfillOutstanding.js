// Recompute outstandingFine + paymentStatus + finePaid for ALL transactions
// from the source-of-truth Payment records. Safe to run multiple times.
// Run: node server/scripts/backfillOutstanding.js
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const Transaction = require("../models/Transaction");
const Payment = require("../models/Payment");

(async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) { console.error("MONGO_URI not set"); process.exit(1); }
  await mongoose.connect(uri);
  console.log("[backfill] Connected");

  const txns = await Transaction.find({
    status: { $in: ["Issued", "Overdue", "Returned", "Lost", "Renewed"] },
    $or: [
      { fineAmount: { $gt: 0 } },
      { outstandingFine: { $exists: true } },
      { paymentStatus: { $exists: true } },
    ],
  }).select("_id fineAmount finePaid paymentStatus outstandingFine status");

  console.log(`[backfill] Inspecting ${txns.length} transaction(s)…`);

  let updated = 0;
  let unchanged = 0;
  for (const t of txns) {
    const paidAgg = await Payment.aggregate([
      { $match: { transaction: t._id, status: "success" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const paid = paidAgg[0]?.total || 0;
    const fineAmount = t.fineAmount || 0;
    const outstanding = Math.max(0, fineAmount - paid);
    let paymentStatus;
    if (fineAmount === 0) paymentStatus = "paid";
    else if (outstanding === 0) paymentStatus = "paid";
    else if (paid > 0) paymentStatus = "partial";
    else paymentStatus = "unpaid";
    const finePaid = fineAmount > 0 && outstanding === 0;

    const changed =
      t.outstandingFine !== outstanding ||
      t.paymentStatus !== paymentStatus ||
      t.finePaid !== finePaid;

    if (changed) {
      await Transaction.updateOne(
        { _id: t._id },
        { $set: { outstandingFine: outstanding, paymentStatus, finePaid } }
      );
      updated += 1;
      console.log(`  ${t._id}  fine=${fineAmount} paid=${paid} → outstanding=${outstanding} status=${paymentStatus}${t.outstandingFine !== outstanding ? "  (was " + t.outstandingFine + ")" : ""}`);
    } else {
      unchanged += 1;
    }
  }
  console.log(`[backfill] Updated ${updated}, unchanged ${unchanged}`);
  await mongoose.connection.close();
})().catch((e) => { console.error(e); process.exit(1); });
