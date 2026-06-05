const Book = require("../models/Book");

const generateAccessionNo = async () => {
  const last = await Book.findOne({ accessionNumber: { $regex: /^ACC-/ } })
    .sort({ accessionNumber: -1 })
    .lean();
  let nextSeq = 1;
  if (last && last.accessionNumber) {
    const tail = parseInt(last.accessionNumber.split("-").pop(), 10);
    if (!Number.isNaN(tail)) nextSeq = tail + 1;
  }
  return `ACC-${String(nextSeq).padStart(6, "0")}`;
};

module.exports = generateAccessionNo;
