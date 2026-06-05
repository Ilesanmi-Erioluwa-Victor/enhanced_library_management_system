const mongoose = require("mongoose");

const bookSchema = new mongoose.Schema(
  {
    accessionNumber: { type: String, unique: true },
    title:           { type: String, required: true, trim: true },
    author:          { type: String, required: true, trim: true },
    isbn:            { type: String, unique: true, sparse: true, trim: true },
    category:        { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true, index: true },
    publisher:       { type: String, trim: true },
    yearPublished:   { type: Number },
    edition:         { type: String, trim: true },
    totalCopies:     { type: Number, required: true, min: 1 },
    availableCopies: { type: Number, required: true, min: 0 },
    shelfLocation:   { type: String, trim: true },
    description:     { type: String },
    coverImage:      { type: String },
    language:        { type: String, default: "English", index: true },
    isActive:        { type: Boolean, default: true, index: true },
    addedBy:         { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

bookSchema.index({ title: "text", author: "text", isbn: "text", accessionNumber: "text" });
bookSchema.index({ category: 1, isActive: 1, availableCopies: 1 });
bookSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Book", bookSchema);
