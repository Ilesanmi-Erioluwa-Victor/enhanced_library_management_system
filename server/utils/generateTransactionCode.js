const Transaction = require("../models/Transaction");

const generateTransactionCode = async () => {
  const year = new Date().getFullYear();
  const prefix = `TXN-${year}`;
  const last = await Transaction.findOne({ transactionCode: { $regex: `^${prefix}` } })
    .sort({ transactionCode: -1 })
    .lean();
  let nextSeq = 1;
  if (last && last.transactionCode) {
    const tail = parseInt(last.transactionCode.replace(prefix, ""), 10);
    if (!Number.isNaN(tail)) nextSeq = tail + 1;
  }
  return `${prefix}${String(nextSeq).padStart(9, "0")}`;
};

module.exports = generateTransactionCode;
