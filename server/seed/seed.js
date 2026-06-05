const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("../models/User");
const Category = require("../models/Category");
const Department = require("../models/Department");
const Book = require("../models/Book");
const Member = require("../models/Member");
const Transaction = require("../models/Transaction");

const CATEGORIES = [
  {
    name: "Science and Technology",
    description: "STEM, computing, engineering",
  },
  {
    name: "Arts and Humanities",
    description: "Literature, philosophy, history of art",
  },
  {
    name: "Social Sciences",
    description: "Sociology, psychology, economics, political science",
  },
  {
    name: "Fiction and Literature",
    description: "Novels, short stories, poetry",
  },
  { name: "Law", description: "Nigerian and international law" },
  {
    name: "Medicine and Health",
    description: "Clinical, nursing, public health",
  },
];

const DEPARTMENTS = [
  {
    name: "Computer Science",
    code: "CSC",
    description: "Computing and software engineering",
  },
  {
    name: "Library",
    code: "LIB",
    description: "Library and information services",
  },
  { name: "Research", code: "RES", description: "Research and development" },
  { name: "Law", code: "LAW", description: "Faculty of Law" },
  {
    name: "Medicine",
    code: "MED",
    description: "Faculty of Medicine and Health Sciences",
  },
  {
    name: "General Studies",
    code: "GNS",
    description: "General / cross-departmental",
  },
];

const BOOKS = [
  {
    title: "Introduction to Algorithms",
    author: "Cormen, Leiserson, Rivest, Stein",
    isbn: "9780262033848",
    category: "Science and Technology",
    publisher: "MIT Press",
    yearPublished: 2009,
    edition: "3rd",
    totalCopies: 5,
    shelfLocation: "A1-Shelf1",
  },
  {
    title: "Clean Code",
    author: "Robert C. Martin",
    isbn: "9780132350884",
    category: "Science and Technology",
    publisher: "Prentice Hall",
    yearPublished: 2008,
    edition: "1st",
    totalCopies: 3,
    shelfLocation: "A1-Shelf2",
  },
  {
    title: "Things Fall Apart",
    author: "Chinua Achebe",
    isbn: "9780385474542",
    category: "Fiction and Literature",
    publisher: "Heinemann",
    yearPublished: 1958,
    edition: "1st",
    totalCopies: 6,
    shelfLocation: "B2-Shelf1",
  },
  {
    title: "The Republic",
    author: "Plato",
    isbn: "9780140455113",
    category: "Arts and Humanities",
    publisher: "Penguin Classics",
    yearPublished: -380,
    edition: "Reprint",
    totalCopies: 2,
    shelfLocation: "C1-Shelf1",
  },
  {
    title: "Nigerian Constitutional Law",
    author: "A. B. Weston et al.",
    isbn: "9789781234567",
    category: "Law",
    publisher: "Princeton",
    yearPublished: 2015,
    edition: "2nd",
    totalCopies: 3,
    shelfLocation: "D1-Shelf1",
  },
  {
    title: "Gray's Anatomy for Students",
    author: "Richard Drake, A. Wayne Vogl, Adam W. M. Mitchell",
    isbn: "9780323393041",
    category: "Medicine and Health",
    publisher: "Elsevier",
    yearPublished: 2014,
    edition: "3rd",
    totalCopies: 2,
    shelfLocation: "E1-Shelf1",
  },
  {
    title: "Sociology: A Brief Introduction",
    author: "Richard T. Schaefer",
    isbn: "9780078026719",
    category: "Social Sciences",
    publisher: "McGraw-Hill",
    yearPublished: 2013,
    edition: "11th",
    totalCopies: 4,
    shelfLocation: "F1-Shelf1",
  },
  {
    title: "Half of a Yellow Sun",
    author: "Chimamanda Ngozi Adichie",
    isbn: "9781400095209",
    category: "Fiction and Literature",
    publisher: "Knopf",
    yearPublished: 2006,
    edition: "1st",
    totalCopies: 5,
    shelfLocation: "B2-Shelf2",
  },
  {
    title: "Database System Concepts",
    author: "Silberschatz, Korth, Sudarshan",
    isbn: "9780073523323",
    category: "Science and Technology",
    publisher: "McGraw-Hill",
    yearPublished: 2010,
    edition: "6th",
    totalCopies: 3,
    shelfLocation: "A1-Shelf3",
  },
  {
    title: "Public Health 101",
    author: "Riegelman",
    isbn: "9781284045285",
    category: "Medicine and Health",
    publisher: "Jones & Bartlett",
    yearPublished: 2014,
    edition: "2nd",
    totalCopies: 2,
    shelfLocation: "E1-Shelf2",
  },
];

const MEMBERS = [
  {
    firstName: "Ada",
    lastName: "Okonkwo",
    email: "ada.okonkwo@student.dspg.edu.ng",
    phone: "+2348012345001",
    gender: "Female",
    memberType: "Student",
    department: "Computer Science",
    address: "Otefe, Delta State",
  },
  {
    firstName: "Tunde",
    lastName: "Adebayo",
    email: "tunde.adebayo@staff.dspg.edu.ng",
    phone: "+2348012345002",
    gender: "Male",
    memberType: "Staff",
    department: "Library",
  },
  {
    firstName: "Chika",
    lastName: "Eze",
    email: "chika.eze@external.com",
    phone: "+2348012345003",
    gender: "Female",
    memberType: "External",
    department: "Research",
  },
  {
    firstName: "Sani",
    lastName: "Bello",
    email: "sani.bello@student.dspg.edu.ng",
    phone: "+2348012345004",
    gender: "Male",
    memberType: "Student",
    department: "Law",
  },
  {
    firstName: "Funmi",
    lastName: "Lawal",
    email: "funmi.lawal@staff.dspg.edu.ng",
    phone: "+2348012345005",
    gender: "Female",
    memberType: "Staff",
    department: "Medicine",
  },
];

const seed = async () => {
  const uri =
    process.env.MONGO_URI || "mongodb://localhost:27017/library_management_db";
  await mongoose.connect(uri);
  console.log("[seed] Connected");

  await Promise.all([
    User.deleteMany({}),
    Category.deleteMany({}),
    Department.deleteMany({}),
    Book.deleteMany({}),
    Member.deleteMany({}),
    Transaction.deleteMany({}),
  ]);
  console.log("[seed] Cleared existing data");

  const admin = await User.create({
    fullName: "System Admin",
    email: "admin@library.com",
    password: "Admin@1234",
    role: "admin",
    isActive: true,
  });
  const librarian = await User.create({
    fullName: "Default Librarian",
    email: "librarian@library.com",
    password: "Lib@1234",
    role: "librarian",
    isActive: true,
  });
  console.log("[seed] Users created");

  const categories = await Category.insertMany(
    CATEGORIES.map((c) => ({ ...c, createdBy: admin._id })),
  );
  const catByName = Object.fromEntries(categories.map((c) => [c.name, c._id]));
  console.log(`[seed] ${categories.length} categories created`);

  const departments = await Department.insertMany(
    DEPARTMENTS.map((d) => ({ ...d, createdBy: admin._id })),
  );
  const deptByName = Object.fromEntries(
    departments.map((d) => [d.name, d._id]),
  );
  console.log(`[seed] ${departments.length} departments created`);

  const books = await Book.insertMany(
    BOOKS.map((b, i) => ({
      ...b,
      accessionNumber: `ACC-${String(i + 1).padStart(6, "0")}`,
      availableCopies: b.totalCopies,
      language: "English",
      isActive: true,
      addedBy: librarian._id,
      category: catByName[b.category],
    })),
  );
  console.log(`[seed] ${books.length} books created`);

  const now = new Date();
  const members = [];
  for (let i = 0; i < MEMBERS.length; i++) {
    const m = MEMBERS[i];
    const start = new Date(now);
    start.setFullYear(start.getFullYear() - (i === 3 ? 2 : 0));
    const end = new Date(start);
    end.setFullYear(end.getFullYear() + (i === 3 ? 1 : 1));
    const memberDoc = await Member.create({
      ...m,
      memberID: `LIB-${start.getFullYear()}-${String(i + 1).padStart(5, "0")}`,
      membershipStart: start,
      membershipEnd: end,
      maxBooksAllowed: 3,
      isActive: i !== 3,
      departmentRef: deptByName[m.department] || undefined,
      registeredBy: librarian._id,
    });
    // Create a User account for the member so they can log in
    await User.create({
      fullName: `${m.firstName} ${m.lastName}`,
      email: m.email,
      password: "Member@1234",
      role: "member",
      phone: m.phone,
      isActive: i !== 3,
    }).catch(() => {});
    members.push(memberDoc);
  }
  console.log(
    `[seed] ${members.length} members created (1 with expired membership)`,
  );

  const txs = await Transaction.insertMany([
    {
      transactionCode: "TXN-2026000001",
      book: books[0]._id,
      member: members[0]._id,
      issuedBy: librarian._id,
      issueDate: new Date(now.getTime() - 5 * 86400000),
      dueDate: new Date(now.getTime() + 9 * 86400000),
      status: "Issued",
    },
    {
      transactionCode: "TXN-2026000002",
      book: books[1]._id,
      member: members[1]._id,
      issuedBy: librarian._id,
      issueDate: new Date(now.getTime() - 2 * 86400000),
      dueDate: new Date(now.getTime() + 12 * 86400000),
      status: "Issued",
    },
    {
      transactionCode: "TXN-2026000003",
      book: books[2]._id,
      member: members[2]._id,
      issuedBy: librarian._id,
      issueDate: new Date(now.getTime() - 20 * 86400000),
      dueDate: new Date(now.getTime() - 6 * 86400000),
      status: "Returned",
      returnDate: new Date(now.getTime() - 3 * 86400000),
      fineAmount: 150,
      finePaid: true,
      outstandingFine: 0,
      paymentStatus: "paid",
    },
    {
      transactionCode: "TXN-2026000004",
      book: books[6]._id,
      member: members[0]._id,
      issuedBy: librarian._id,
      issueDate: new Date(now.getTime() - 30 * 86400000),
      dueDate: new Date(now.getTime() - 16 * 86400000),
      status: "Overdue",
      daysOverdue: 16,
      fineAmount: 800,
      finePaid: false,
      outstandingFine: 800,
      paymentStatus: "unpaid",
    },
    {
      transactionCode: "TXN-2026000005",
      book: books[7]._id,
      member: members[1]._id,
      issuedBy: librarian._id,
      issueDate: new Date(now.getTime() - 28 * 86400000),
      dueDate: new Date(now.getTime() - 14 * 86400000),
      status: "Issued",
      renewalCount: 1,
      fineAmount: 0,
      finePaid: false,
      outstandingFine: 0,
      paymentStatus: "paid",
    },
  ]);
  console.log(
    `[seed] ${txs.length} transactions created (2 Issued, 1 Returned, 1 Overdue, 1 Renewed)`,
  );

  await Book.updateOne(
    { _id: books[0]._id },
    { $inc: { availableCopies: -1 } },
  );
  await Book.updateOne(
    { _id: books[1]._id },
    { $inc: { availableCopies: -1 } },
  );
  await Book.updateOne(
    { _id: books[6]._id },
    { $inc: { availableCopies: -1 } },
  );
  await Book.updateOne(
    { _id: books[7]._id },
    { $inc: { availableCopies: -1 } },
  );

  console.log("[seed] Done.");
  console.log("       admin@library.com / Admin@1234");
  console.log("       librarian@library.com / Lib@1234");
  console.log(
    "       member logins (e.g. ada.okonkwo@student.dspg.edu.ng) / Member@1234",
  );
  await mongoose.connection.close();
};

seed().catch((err) => {
  console.error("[seed] Failed:", err);
  process.exit(1);
});
