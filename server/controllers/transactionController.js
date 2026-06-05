const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const Transaction = require("../models/Transaction");
const Book = require("../models/Book");
const Member = require("../models/Member");
const Payment = require("../models/Payment");
const { getSettings } = require("../utils/settingsCache");
const logAudit = require("../utils/auditLogger");
const { buildPagination, buildSearchFilter } = require("../utils/pagination");
const generateTransactionCode = require("../utils/generateTransactionCode");
const calcFine = require("../utils/calcFine");

const ACTIVE_STATUSES = ["Issued", "Overdue"];

const ISSUE_LOOKUP = "firstName lastName email phone memberID memberType isActive membershipEnd maxBooksAllowed";
const BOOK_LOOKUP  = "title accessionNumber author totalCopies availableCopies isActive";
const TXN_LOOKUP   = "transactionCode book member issueDate dueDate returnDate status renewals fineAmount finePaid outstandingFine paymentStatus daysOverdue notes issuedBy returnedBy createdAt";

exports.issue = asyncHandler(async (req, res) => {
  const { memberId, bookId, dueDate, notes } = req.body;
  if (!memberId || !bookId) { res.status(400); throw new Error("memberId and bookId are required"); }

  const [member, book, settings, code] = await Promise.all([
    Member.findById(memberId).select(ISSUE_LOOKUP).lean(),
    Book.findById(bookId).select(BOOK_LOOKUP).lean(),
    getSettings(),
    generateTransactionCode(),
  ]);
  if (!member) { res.status(404); throw new Error("Member not found"); }
  if (!book)  { res.status(404); throw new Error("Book not found"); }

  if (!member.isActive) { res.status(400); throw new Error("Member is inactive"); }
  if (member.membershipEnd && new Date(member.membershipEnd) < new Date()) {
    res.status(400);
    throw new Error("Member's library membership has expired. Please renew.");
  }

  const [activeCount, unpaidFines] = await Promise.all([
    Transaction.countDocuments({ member: member._id, status: { $in: ACTIVE_STATUSES } }),
    Transaction.aggregate([
      { $match: { member: member._id, outstandingFine: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: "$outstandingFine" } } },
    ]),
  ]);
  if (activeCount >= (member.maxBooksAllowed || 3)) {
    res.status(400);
    throw new Error(`Member has reached their maximum borrowing limit (${member.maxBooksAllowed || 3}).`);
  }
  if (unpaidFines[0]?.total > 0) {
    res.status(400);
    throw new Error(`Member has an outstanding fine of NGN ${unpaidFines[0].total}. Please clear it first.`);
  }
  if (!book.isActive) { res.status(400); throw new Error("Book is inactive"); }
  if (book.availableCopies < 1) { res.status(400); throw new Error("No copies available for this book"); }

  const finalDueDate = dueDate ? new Date(dueDate) : (() => { const d = new Date(); d.setDate(d.getDate() + (settings.defaultLoanDays || 14)); return d; })();

  const [txn] = await Promise.all([
    Transaction.create({
      transactionCode: code,
      book: book._id, member: member._id, issuedBy: req.user._id,
      issueDate: new Date(), dueDate: finalDueDate, status: "Issued", notes,
    }),
    Book.updateOne({ _id: book._id, availableCopies: { $gt: 0 } }, { $inc: { availableCopies: -1 } }),
  ]);
  await logAudit({ req, user: req.user, action: "transaction.issue", targetModel: "Transaction", targetId: txn._id, details: `Issued ${book.title} to ${member.firstName} ${member.lastName} (${code})` });
  res.status(201).json(txn);
});

exports.return = asyncHandler(async (req, res) => {
  const { transactionCode, memberId, accessionNumber, finePaid } = req.body;
  let txn;
  if (transactionCode) {
    txn = await Transaction.findOne({ transactionCode }).select(TXN_LOOKUP);
  } else if (memberId && accessionNumber) {
    const book = await Book.findOne({ accessionNumber }).select("_id").lean();
    if (!book) { res.status(404); throw new Error("Book with that accession number not found"); }
    txn = await Transaction.findOne({
      book: book._id, member: memberId, status: { $in: ACTIVE_STATUSES },
    }).sort({ createdAt: -1 }).select(TXN_LOOKUP);
  }
  if (!txn) { res.status(404); throw new Error("Active transaction not found"); }
  if (txn.status === "Returned" || txn.status === "Lost") { res.status(400); throw new Error(`Transaction is already ${txn.status}`); }

  const [settings] = await Promise.all([getSettings()]);
  const now = new Date();
  const fine = calcFine(txn.dueDate, now, settings.fineRatePerDay);

  if (fine > 0 && settings.requirePaymentBeforeReturn) {
    const [paidAgg] = await Promise.all([
      Payment.aggregate([
        { $match: { transaction: txn._id, status: "success" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
    ]);
    const alreadyPaid = paidAgg[0]?.total || 0;
    if (alreadyPaid < fine) {
      res.status(400);
      throw new Error(`Fine of NGN ${fine - alreadyPaid} must be paid before returning this book. Initiate a payment first.`);
    }
  }

  txn.returnDate = now;
  txn.status = "Returned";
  txn.fineAmount = fine;
  if (finePaid) txn.finePaid = true;
  txn.returnedBy = req.user._id;
  await txn.save();

  await Payment.aggregate([
    { $match: { transaction: txn._id, status: "success" } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]).then(async ([paidAgg]) => {
    const paid = paidAgg?.total || 0;
    const outstanding = Math.max(0, fine - paid);
    let paymentStatus = "unpaid";
    if (fine === 0) paymentStatus = "paid";
    else if (outstanding === 0) paymentStatus = "paid";
    else if (paid > 0) paymentStatus = "partial";
    await Transaction.updateOne(
      { _id: txn._id },
      { $set: { outstandingFine: outstanding, paymentStatus, finePaid: fine > 0 && outstanding === 0 } }
    );
  });
  await Book.updateOne({ _id: txn.book }, { $inc: { availableCopies: 1 } });
  await logAudit({ req, user: req.user, action: "transaction.return", targetModel: "Transaction", targetId: txn._id, details: `Returned transaction ${txn.transactionCode} (fine: NGN ${fine})` });
  res.json({ ...txn.toObject(), fineAmount: fine });
});

exports.renew = asyncHandler(async (req, res) => {
  const [settings, txn] = await Promise.all([
    getSettings(),
    Transaction.findById(req.params.id).select(TXN_LOOKUP),
  ]);
  if (!txn) { res.status(404); throw new Error("Transaction not found"); }
  if (txn.status !== "Issued") { res.status(400); throw new Error(`Cannot renew a ${txn.status} transaction`); }
  if ((txn.renewals || 0) >= (settings.maxRenewals || 2)) { res.status(400); throw new Error(`Maximum renewals (${settings.maxRenewals || 2}) reached`); }
  if (new Date(txn.dueDate) < new Date()) { res.status(400); throw new Error("Cannot renew an overdue book. Please return and pay any fine first."); }

  const newDue = new Date(txn.dueDate);
  newDue.setDate(newDue.getDate() + (settings.defaultLoanDays || 14));
  await Transaction.updateOne(
    { _id: txn._id },
    { $set: { dueDate: newDue, status: "Renewed" }, $inc: { renewals: 1 } }
  );
  await logAudit({ req, user: req.user, action: "transaction.renew", targetModel: "Transaction", targetId: txn._id, details: `Renewed transaction ${txn.transactionCode}` });
  const fresh = await Transaction.findById(txn._id).select(TXN_LOOKUP).lean();
  res.json(fresh);
});

exports.markLost = asyncHandler(async (req, res) => {
  const txn = await Transaction.findById(req.params.id).select("transactionCode status");
  if (!txn) { res.status(404); throw new Error("Transaction not found"); }
  if (txn.status === "Lost") { res.status(400); throw new Error("Transaction is already marked as lost"); }
  if (txn.status === "Returned") { res.status(400); throw new Error("Cannot mark a returned transaction as lost"); }
  await Transaction.updateOne({ _id: txn._id }, { $set: { status: "Lost" } });
  await logAudit({ req, user: req.user, action: "transaction.markLost", targetModel: "Transaction", targetId: txn._id, details: `Marked transaction ${txn.transactionCode} as Lost` });
  const fresh = await Transaction.findById(txn._id).select(TXN_LOOKUP).lean();
  res.json(fresh);
});

exports.list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = buildPagination(req);
  const filter = buildSearchFilter(req, ["transactionCode", "notes"]);
  if (req.query.status) filter.status = req.query.status;
  if (req.query.startDate || req.query.endDate) {
    filter.issueDate = {};
    if (req.query.startDate) filter.issueDate.$gte = new Date(req.query.startDate);
    if (req.query.endDate)   filter.issueDate.$lte = new Date(req.query.endDate);
  }
  const [items, total] = await Promise.all([
    Transaction.find(filter)
      .select(TXN_LOOKUP)
      .populate("book", "title accessionNumber author")
      .populate("member", "firstName lastName memberID memberType")
      .populate("issuedBy", "fullName")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Transaction.countDocuments(filter),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) || 1, limit });
});

exports.overdue = asyncHandler(async (req, res) => {
  const { page, limit, skip } = buildPagination(req);
  const now = new Date();
  const settings = await getSettings();
  const fineRate = settings.fineRatePerDay || 50;

  const expired = await Transaction.find({ status: "Issued", dueDate: { $lt: now } })
    .select("dueDate")
    .lean();

  if (expired.length) {
    const bulkOps = expired.map((t) => {
      const days = Math.ceil((now - new Date(t.dueDate)) / 86400000);
      const fine = days * fineRate;
      return {
        updateOne: {
          filter: { _id: t._id },
          update: {
            $set: {
              status: "Overdue",
              daysOverdue: days,
              fineAmount: fine,
              outstandingFine: fine,
              paymentStatus: "unpaid",
            },
          },
        },
      };
    });
    await Transaction.bulkWrite(bulkOps, { ordered: false });
  }

  const filter = { status: "Overdue" };
  if (req.query.memberType) filter["memberType"] = req.query.memberType;
  const [items, total] = await Promise.all([
    Transaction.find(filter)
      .select(TXN_LOOKUP)
      .populate("book", "title accessionNumber")
      .populate("member", "firstName lastName memberID memberType phone email")
      .sort({ dueDate: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Transaction.countDocuments(filter),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) || 1, limit });
});

exports.get = asyncHandler(async (req, res) => {
  const txn = await Transaction.findById(req.params.id)
    .select(TXN_LOOKUP)
    .populate("book", "title accessionNumber author")
    .populate("member", "firstName lastName memberID memberType phone")
    .populate("issuedBy", "fullName email")
    .lean();
  if (!txn) { res.status(404); throw new Error("Transaction not found"); }
  res.json(txn);
});

exports.byMember = asyncHandler(async (req, res) => {
  const { page, limit, skip } = buildPagination(req);
  const [items, total] = await Promise.all([
    Transaction.find({ member: req.params.memberId })
      .select(TXN_LOOKUP)
      .populate("book", "title accessionNumber author")
      .populate("issuedBy", "fullName")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Transaction.countDocuments({ member: req.params.memberId }),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) || 1, limit });
});

exports.lookup = asyncHandler(async (req, res) => {
  const { transactionCode, memberId, accessionNumber } = req.body;
  let txn;
  if (transactionCode) {
    txn = await Transaction.findOne({ transactionCode })
      .select(TXN_LOOKUP)
      .populate("book", "title accessionNumber author")
      .populate("member", "firstName lastName memberID memberType phone")
      .lean();
  } else if (memberId && accessionNumber) {
    const book = await Book.findOne({ accessionNumber }).select("_id").lean();
    if (!book) { res.status(404); throw new Error("Book with that accession number not found"); }
    txn = await Transaction.findOne({ book: book._id, member: memberId })
      .sort({ createdAt: -1 })
      .select(TXN_LOOKUP)
      .populate("book", "title accessionNumber author")
      .populate("member", "firstName lastName memberID memberType phone")
      .lean();
  }
  if (!txn) { res.status(404); throw new Error("Transaction not found"); }
  const settings = await getSettings();
  const fine = txn.returnDate ? txn.fineAmount : calcFine(txn.dueDate, new Date(), settings.fineRatePerDay);
  res.json({ ...txn, fineAmount: fine });
});
