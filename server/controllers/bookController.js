const asyncHandler = require("express-async-handler");
const Book = require("../models/Book");
const Category = require("../models/Category");
const Transaction = require("../models/Transaction");
const logAudit = require("../utils/auditLogger");
const { buildPagination, buildSearchFilter } = require("../utils/pagination");
const generateAccessionNo = require("../utils/generateAccessionNo");

const VALID_SORT = {
  "title-asc":  { title: 1 },
  "title-desc": { title: -1 },
  "author-asc": { author: 1 },
  "year-desc":  { yearPublished: -1 },
  "year-asc":   { yearPublished: 1 },
  "newest":     { createdAt: -1 },
};

exports.create = asyncHandler(async (req, res) => {
  const { title, author, isbn, category, publisher, yearPublished, edition, totalCopies, shelfLocation, description, language } = req.body;
  if (!title || !author || !category || !totalCopies) {
    res.status(400);
    throw new Error("title, author, category, and totalCopies are required");
  }
  const [cat, dup, accessionNumber] = await Promise.all([
    Category.findById(category).lean(),
    isbn ? Book.findOne({ isbn: isbn.trim() }).lean() : Promise.resolve(null),
    generateAccessionNo(),
  ]);
  if (!cat) { res.status(400); throw new Error("Invalid category"); }
  if (dup) { res.status(409); throw new Error("A book with this ISBN already exists"); }

  const book = await Book.create({
    accessionNumber,
    title: title.trim(),
    author: author.trim(),
    isbn: isbn ? isbn.trim() : undefined,
    category,
    publisher, yearPublished, edition,
    totalCopies,
    availableCopies: totalCopies,
    shelfLocation,
    description,
    language: language || "English",
    addedBy: req.user._id,
  });
  await logAudit({ req, user: req.user, action: "book.create", targetModel: "Book", targetId: book._id, details: `Created book ${book.title} (${book.accessionNumber})` });
  res.status(201).json(book);
});

exports.list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = buildPagination(req);
  const filter = { isActive: true, ...buildSearchFilter(req, ["title", "author", "isbn", "accessionNumber"]) };
  if (req.query.category) filter.category = req.query.category;
  if (req.query.language) filter.language = req.query.language;
  if (req.query.availability === "available") filter.availableCopies = { $gt: 0 };
  if (req.query.availability === "unavailable") filter.availableCopies = 0;
  const sort = VALID_SORT[req.query.sort] || { createdAt: -1 };

  const [items, total] = await Promise.all([
    Book.find(filter)
      .populate("category", "name")
      .populate("addedBy", "fullName")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Book.countDocuments(filter),
  ]);

  res.json({ items, total, page, pages: Math.ceil(total / limit) || 1, limit });
});

exports.available = asyncHandler(async (req, res) => {
  const items = await Book.find({ isActive: true, availableCopies: { $gt: 0 } })
    .select("title author accessionNumber availableCopies category")
    .populate("category", "name")
    .sort({ title: 1 })
    .lean();
  res.json(items);
});

exports.get = asyncHandler(async (req, res) => {
  const book = await Book.findById(req.params.id)
    .populate("category", "name description")
    .populate("addedBy", "fullName email")
    .lean();
  if (!book) { res.status(404); throw new Error("Book not found"); }

  const [history, currentlyIssued] = await Promise.all([
    Transaction.find({ book: book._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("member", "firstName lastName memberID")
      .lean(),
    Transaction.find({ book: book._id, status: { $in: ["Issued", "Overdue"] } })
      .select("transactionCode issueDate dueDate status daysOverdue member")
      .populate("member", "firstName lastName memberID phone email")
      .lean(),
  ]);
  res.json({ book, history, currentlyIssued });
});

exports.update = asyncHandler(async (req, res) => {
  const book = await Book.findById(req.params.id);
  if (!book) { res.status(404); throw new Error("Book not found"); }
  const { title, author, isbn, category, publisher, yearPublished, edition, totalCopies, shelfLocation, description, language, isActive } = req.body;

  if (category) {
    const cat = await Category.findById(category).lean();
    if (!cat) { res.status(400); throw new Error("Invalid category"); }
    book.category = category;
  }
  if (isbn && isbn.trim() !== book.isbn) {
    const dup = await Book.findOne({ isbn: isbn.trim(), _id: { $ne: book._id } }).lean();
    if (dup) { res.status(409); throw new Error("Another book has this ISBN"); }
    book.isbn = isbn.trim();
  }
  if (title !== undefined) book.title = title.trim();
  if (author !== undefined) book.author = author.trim();
  if (publisher !== undefined) book.publisher = publisher;
  if (yearPublished !== undefined) book.yearPublished = yearPublished;
  if (edition !== undefined) book.edition = edition;
  if (shelfLocation !== undefined) book.shelfLocation = shelfLocation;
  if (description !== undefined) book.description = description;
  if (language !== undefined) book.language = language;
  if (isActive !== undefined) book.isActive = !!isActive;
  if (totalCopies !== undefined && Number(totalCopies) !== book.totalCopies) {
    const diff = Number(totalCopies) - book.totalCopies;
    book.totalCopies = Number(totalCopies);
    book.availableCopies = Math.max(0, book.availableCopies + diff);
  }
  await book.save();
  await logAudit({ req, user: req.user, action: "book.update", targetModel: "Book", targetId: book._id, details: `Updated book ${book.title} (${book.accessionNumber})` });
  res.json(book);
});

exports.softDelete = asyncHandler(async (req, res) => {
  const [book, active] = await Promise.all([
    Book.findById(req.params.id).lean(),
    Transaction.countDocuments({ book: req.params.id, status: { $in: ["Issued", "Overdue"] } }),
  ]);
  if (!book) { res.status(404); throw new Error("Book not found"); }
  if (active > 0) {
    res.status(400);
    throw new Error(`Cannot deactivate: ${active} active loan(s) reference this book`);
  }
  await Book.updateOne({ _id: req.params.id }, { $set: { isActive: false } });
  await logAudit({ req, user: req.user, action: "book.deactivate", targetModel: "Book", targetId: book._id, details: `Deactivated book ${book.title}` });
  res.json({ message: "Book deactivated" });
});

exports.uploadCover = asyncHandler(async (req, res) => {
  if (!req.file) { res.status(400); throw new Error("No image file provided"); }
  const book = await Book.findByIdAndUpdate(
    req.params.id,
    { $set: { coverImage: `/uploads/${req.file.filename}` } },
    { new: true, projection: "title coverImage accessionNumber" }
  ).lean();
  if (!book) { res.status(404); throw new Error("Book not found"); }
  await logAudit({ req, user: req.user, action: "book.uploadCover", targetModel: "Book", targetId: book._id, details: `Uploaded cover for ${book.title}` });
  res.json({ coverImage: book.coverImage });
});
