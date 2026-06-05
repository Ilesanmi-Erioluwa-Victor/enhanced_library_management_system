const Member = require("../models/Member");

const generateMemberID = async () => {
  const year = new Date().getFullYear();
  const prefix = `LIB-${year}-`;
  const last = await Member.findOne({ memberID: { $regex: `^${prefix}` } })
    .sort({ memberID: -1 })
    .lean();
  let nextSeq = 1;
  if (last && last.memberID) {
    const tail = parseInt(last.memberID.split("-").pop(), 10);
    if (!Number.isNaN(tail)) nextSeq = tail + 1;
  }
  return `${prefix}${String(nextSeq).padStart(5, "0")}`;
};

module.exports = generateMemberID;
