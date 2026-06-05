const cron = require("node-cron");
const Transaction = require("../models/Transaction");
const calcFine = require("../utils/calcFine");

const FINE_RATE = Number(process.env.FINE_RATE_PER_DAY) || 50;

const runOverdueCheck = async () => {
  const now = new Date();
  const overdue = await Transaction.find({ status: "Issued", dueDate: { $lt: now } });
  for (const txn of overdue) {
    txn.status = "Overdue";
    txn.fineAmount = calcFine(txn.dueDate, now, FINE_RATE);
    txn.outstandingFine = txn.fineAmount;
    txn.paymentStatus = "unpaid";
    await txn.save();
  }
  if (overdue.length) {
    console.log(`[cron] Overdue check: marked ${overdue.length} transaction(s) as Overdue`);
  }
  return overdue;
};

const startOverdueScheduler = () => {
  cron.schedule("0 8 * * *", () => {
    console.log("[cron] Running daily overdue check (08:00)");
    runOverdueCheck().catch((e) => console.error("[cron] Overdue check failed:", e));
  });
  console.log("[cron] Overdue scheduler started (daily 08:00)");
};

module.exports = { startOverdueScheduler, runOverdueCheck };
