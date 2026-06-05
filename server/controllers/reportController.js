const asyncHandler = require("express-async-handler");
const Book = require("../models/Book");
const Member = require("../models/Member");
const Transaction = require("../models/Transaction");
const Category = require("../models/Category");
const User = require("../models/User");
const { generatePDF } = require("../utils/pdfGenerator");
const { formatDate, formatNGN } = require("../utils/formatters");

const libraryHeader = (doc) => {
  doc.fontSize(18).text(process.env.LIBRARY_NAME || "Library", { align: "center" });
  doc.moveDown(0.2);
  doc.fontSize(10).fillColor("gray").text(process.env.LIBRARY_ADDRESS || "", { align: "center" });
  doc.fillColor("black").moveDown(0.8);
};

const tableRow = (doc, y, columns, widths) => {
  let x = doc.page.margins.left;
  columns.forEach((c, i) => {
    doc.fontSize(9).text(String(c ?? ""), x, y, { width: widths[i], align: "left" });
    x += widths[i];
  });
  doc.moveDown(0.4);
};

const BULK_EXPORT_LIMIT = 5000;

exports.summary = asyncHandler(async (req, res) => {
  const now = new Date();
  const [stats] = await Book.aggregate([
    {
      $facet: {
        uniqueBooks: [{ $match: { isActive: true } }, { $count: "n" }],
        copies: [{ $group: { _id: null, total: { $sum: "$totalCopies" }, available: { $sum: "$availableCopies" } } }],
      },
    },
    {
      $project: {
        uniqueBooks: { $arrayElemAt: ["$uniqueBooks.n", 0] },
        totalCopies: { $arrayElemAt: ["$copies.total", 0] },
        available:   { $arrayElemAt: ["$copies.available", 0] },
      },
    },
  ]);
  const [totalMembers, activeIssues, overdue, totalCategories, totalUsers] = await Promise.all([
    Member.countDocuments({ isActive: true }),
    Transaction.countDocuments({ status: { $in: ["Issued", "Overdue"] } }),
    Transaction.countDocuments({ status: "Overdue" }),
    Category.countDocuments(),
    User.countDocuments({ isActive: true }),
  ]);
  res.json({
    totalBooks: { unique: stats?.uniqueBooks || 0, copies: stats?.totalCopies || 0, available: stats?.available || 0 },
    totalMembers,
    totalCategories,
    totalUsers,
    activeIssues,
    overdue,
    generatedAt: now,
  });
});

exports.booksByCategory = asyncHandler(async (req, res) => {
  const data = await Book.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: "$category", count: { $sum: 1 } } },
    { $lookup: { from: "categories", localField: "_id", foreignField: "_id", as: "cat" } },
    { $unwind: "$cat" },
    { $project: { _id: 0, category: "$cat.name", count: 1 } },
    { $sort: { count: -1 } },
  ]);
  res.json(data);
});

exports.topBorrowed = asyncHandler(async (req, res) => {
  const data = await Transaction.aggregate([
    { $group: { _id: "$book", borrowCount: { $sum: 1 } } },
    { $sort: { borrowCount: -1 } },
    { $limit: 10 },
    { $lookup: { from: "books", localField: "_id", foreignField: "_id", as: "book" } },
    { $unwind: "$book" },
    { $project: { _id: 0, title: "$book.title", author: "$book.author", accessionNumber: "$book.accessionNumber", borrowCount: 1 } },
  ]);
  res.json(data);
});

exports.memberActivity = asyncHandler(async (req, res) => {
  const data = await Transaction.aggregate([
    { $group: { _id: "$member", borrowCount: { $sum: 1 } } },
    { $sort: { borrowCount: -1 } },
    { $limit: 10 },
    { $lookup: { from: "members", localField: "_id", foreignField: "_id", as: "member" } },
    { $unwind: "$member" },
    { $project: { _id: 0, name: { $concat: ["$member.firstName", " ", "$member.lastName"] }, memberID: "$member.memberID", memberType: "$member.memberType", borrowCount: 1 } },
  ]);
  res.json(data);
});

exports.overdueSummary = asyncHandler(async (req, res) => {
  const data = await Transaction.aggregate([
    { $match: { status: "Overdue" } },
    { $lookup: { from: "members", localField: "member", foreignField: "_id", as: "m" } },
    { $unwind: "$m" },
    { $group: { _id: "$m.memberType", count: { $sum: 1 }, totalFines: { $sum: "$fineAmount" } } },
  ]);
  res.json(data);
});

exports.monthlyIssues = asyncHandler(async (req, res) => {
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
  twelveMonthsAgo.setDate(1); twelveMonthsAgo.setHours(0, 0, 0, 0);
  const data = await Transaction.aggregate([
    { $match: { issueDate: { $gte: twelveMonthsAgo } } },
    { $group: {
        _id: { y: { $year: "$issueDate" }, m: { $month: "$issueDate" } },
        issues: { $sum: 1 },
        returns: { $sum: { $cond: [{ $eq: ["$status", "Returned"] }, 1, 0] } },
    } },
    { $sort: { "_id.y": 1, "_id.m": 1 } },
  ]);
  res.json(data);
});

exports.dashboard = asyncHandler(async (req, res) => {
  const now = new Date();
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
  twelveMonthsAgo.setDate(1); twelveMonthsAgo.setHours(0, 0, 0, 0);

  const [bookStats, txnStats, recentTxns, booksByCategory, monthly, topBorrowed, totalMembers, totalCategories, totalUsers] = await Promise.all([
    Book.aggregate([
      {
        $facet: {
          uniqueBooks: [{ $match: { isActive: true } }, { $count: "n" }],
          copies: [{ $group: { _id: null, total: { $sum: "$totalCopies" }, available: { $sum: "$availableCopies" } } }],
        },
      },
      { $project: { uniqueBooks: { $arrayElemAt: ["$uniqueBooks.n", 0] }, totalCopies: { $arrayElemAt: ["$copies.total", 0] }, available: { $arrayElemAt: ["$copies.available", 0] } } },
    ]),
    Transaction.aggregate([
      {
        $facet: {
          active:    [{ $match: { status: { $in: ["Issued", "Overdue"] } } }, { $count: "n" }],
          overdue:   [{ $match: { status: "Overdue" } }, { $count: "n" }],
          returned:  [{ $match: { status: "Returned" } }, { $count: "n" }],
          totals:    [{ $count: "n" }],
        },
      },
      { $project: { active: { $arrayElemAt: ["$active.n", 0] }, overdue: { $arrayElemAt: ["$overdue.n", 0] }, returned: { $arrayElemAt: ["$returned.n", 0] }, total: { $arrayElemAt: ["$totals.n", 0] } } },
    ]),
    Transaction.find()
      .sort({ createdAt: -1 })
      .limit(8)
      .select("transactionCode book member status issueDate")
      .populate("book", "title accessionNumber")
      .populate("member", "firstName lastName memberID")
      .lean(),
    Book.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $lookup: { from: "categories", localField: "_id", foreignField: "_id", as: "cat" } },
      { $unwind: "$cat" },
      { $project: { _id: 0, category: "$cat.name", count: 1 } },
      { $sort: { count: -1 } },
    ]),
    Transaction.aggregate([
      { $match: { issueDate: { $gte: twelveMonthsAgo } } },
      { $group: { _id: { y: { $year: "$issueDate" }, m: { $month: "$issueDate" } }, issues: { $sum: 1 }, returns: { $sum: { $cond: [{ $eq: ["$status", "Returned"] }, 1, 0] } } } },
      { $sort: { "_id.y": 1, "_id.m": 1 } },
    ]),
    Transaction.aggregate([
      { $group: { _id: "$book", borrowCount: { $sum: 1 } } },
      { $sort: { borrowCount: -1 } },
      { $limit: 5 },
      { $lookup: { from: "books", localField: "_id", foreignField: "_id", as: "book" } },
      { $unwind: "$book" },
      { $project: { _id: 0, title: "$book.title", borrowCount: 1 } },
    ]),
    Member.countDocuments({ isActive: true }),
    Category.countDocuments(),
    User.countDocuments({ isActive: true }),
  ]);

  const bs = bookStats[0] || { uniqueBooks: 0, totalCopies: 0, available: 0 };
  const ts = txnStats[0] || { active: 0, overdue: 0, returned: 0, total: 0 };

  res.json({
    summary: {
      totalBooks: { unique: bs.uniqueBooks || 0, copies: bs.totalCopies || 0, available: bs.available || 0 },
      totalMembers,
      totalCategories,
      totalUsers,
      activeIssues: ts.active || 0,
      overdue: ts.overdue || 0,
      returned: ts.returned || 0,
      totalTransactions: ts.total || 0,
    },
    recentTxns,
    booksByCategory,
    monthly,
    topBorrowed,
    generatedAt: now,
  });
});

const fetchBooksForExport = async (filter = {}) =>
  Book.find(filter).select("accessionNumber title author totalCopies availableCopies shelfLocation category").populate("category", "name").sort({ title: 1 }).lean();

exports.exportBooks = asyncHandler(async (req, res) => {
  const books = await fetchBooksForExport();
  const doc = await generatePDF(res, { title: "Book Catalogue" });
  libraryHeader(doc);
  doc.fontSize(11).text(`Generated: ${formatDate(new Date())}  •  Total: ${books.length}`, { align: "right" });
  doc.moveDown(0.5);
  const cols = ["Acc. No", "Title", "Author", "Category", "Total", "Avail.", "Shelf"];
  const widths = [70, 130, 100, 80, 35, 40, 70];
  doc.fontSize(10).fillColor("navy").text(cols.join("  "), doc.page.margins.left, doc.y);
  doc.fillColor("black").moveDown(0.3);
  doc.moveTo(doc.page.margins.left, doc.y).lineTo(550, doc.y).stroke();
  doc.moveDown(0.3);
  books.forEach((b) => {
    tableRow(doc, doc.y, [b.accessionNumber, b.title, b.author, b.category?.name || "-", b.totalCopies, b.availableCopies, b.shelfLocation || "-"], widths);
  });
  doc.end();
});

exports.exportMembers = asyncHandler(async (req, res) => {
  const members = await Member.find()
    .select("memberID firstName lastName memberType phone isActive")
    .sort({ memberID: 1 })
    .lean();
  const doc = await generatePDF(res, { title: "Member List" });
  libraryHeader(doc);
  doc.fontSize(11).text(`Generated: ${formatDate(new Date())}  •  Total: ${members.length}`, { align: "right" });
  doc.moveDown(0.5);
  const cols = ["Member ID", "Name", "Type", "Phone", "Status"];
  const widths = [80, 150, 60, 100, 60];
  doc.fontSize(10).fillColor("navy").text(cols.join("  "), doc.page.margins.left, doc.y);
  doc.fillColor("black").moveDown(0.3);
  doc.moveTo(doc.page.margins.left, doc.y).lineTo(550, doc.y).stroke();
  doc.moveDown(0.3);
  members.forEach((m) => {
    tableRow(doc, doc.y, [m.memberID, `${m.firstName} ${m.lastName}`, m.memberType, m.phone, m.isActive ? "Active" : "Inactive"], widths);
  });
  doc.end();
});

exports.exportOverdue = asyncHandler(async (req, res) => {
  const txns = await Transaction.find({ status: "Overdue" })
    .select("transactionCode book member dueDate fineAmount")
    .populate("book", "title accessionNumber")
    .populate("member", "firstName lastName memberID")
    .sort({ dueDate: 1 })
    .lean();
  const doc = await generatePDF(res, { title: "Overdue Report" });
  libraryHeader(doc);
  doc.fontSize(11).text(`Generated: ${formatDate(new Date())}  •  Total: ${txns.length}`, { align: "right" });
  doc.moveDown(0.5);
  const cols = ["Member", "Book", "Due Date", "Fine"];
  const widths = [120, 180, 80, 70];
  doc.fontSize(10).fillColor("navy").text(cols.join("  "), doc.page.margins.left, doc.y);
  doc.fillColor("black").moveDown(0.3);
  doc.moveTo(doc.page.margins.left, doc.y).lineTo(550, doc.y).stroke();
  doc.moveDown(0.3);
  txns.forEach((t) => {
    tableRow(doc, doc.y, [
      `${t.member?.firstName} ${t.member?.lastName} (${t.member?.memberID})`,
      t.book?.title,
      formatDate(t.dueDate),
      formatNGN(t.fineAmount),
    ], widths);
  });
  doc.end();
});

exports.exportTransactions = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.startDate) filter.issueDate = { ...(filter.issueDate || {}), $gte: new Date(req.query.startDate) };
  if (req.query.endDate)   filter.issueDate = { ...(filter.issueDate || {}), $lte: new Date(req.query.endDate) };
  const txns = await Transaction.find(filter)
    .select("transactionCode book member issueDate dueDate status")
    .populate("book", "title accessionNumber")
    .populate("member", "firstName lastName memberID")
    .sort({ issueDate: -1 })
    .limit(BULK_EXPORT_LIMIT)
    .lean();
  const doc = await generatePDF(res, { title: "Transaction History" });
  libraryHeader(doc);
  doc.fontSize(11).text(`Generated: ${formatDate(new Date())}  •  Total: ${txns.length}${txns.length === BULK_EXPORT_LIMIT ? "+" : ""}`, { align: "right" });
  if (req.query.startDate || req.query.endDate) {
    doc.fontSize(9).fillColor("gray").text(`Range: ${formatDate(req.query.startDate) || "…"} → ${formatDate(req.query.endDate) || "…"}`, { align: "right" });
    doc.fillColor("black");
  }
  doc.moveDown(0.5);
  const cols = ["TXN Code", "Member", "Book", "Issue", "Due", "Status"];
  const widths = [85, 120, 150, 60, 60, 60];
  doc.fontSize(10).fillColor("navy").text(cols.join("  "), doc.page.margins.left, doc.y);
  doc.fillColor("black").moveDown(0.3);
  doc.moveTo(doc.page.margins.left, doc.y).lineTo(550, doc.y).stroke();
  doc.moveDown(0.3);
  txns.forEach((t) => {
    tableRow(doc, doc.y, [
      t.transactionCode,
      `${t.member?.firstName} ${t.member?.lastName}`,
      t.book?.title,
      formatDate(t.issueDate),
      formatDate(t.dueDate),
      t.status,
    ], widths);
  });
  doc.end();
});
