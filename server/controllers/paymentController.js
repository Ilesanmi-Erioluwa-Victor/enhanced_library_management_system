const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const Payment = require("../models/Payment");
const Transaction = require("../models/Transaction");
const Member = require("../models/Member");
const User = require("../models/User");
const logAudit = require("../utils/auditLogger");
const { buildPagination, buildSearchFilter } = require("../utils/pagination");
const { generatePDF } = require("../utils/pdfGenerator");
const { formatDate, formatNGN } = require("../utils/formatters");
const {
  initializePayment,
  verifyPayment,
  verifyWebhookSignature,
} = require("../utils/paystack");

const TXN_LOOKUP = "transactionCode book member fineAmount outstandingFine paymentStatus status";

const computeOutstanding = async (transactionId) => {
  const [txn, paidAgg] = await Promise.all([
    Transaction.findById(transactionId).select(TXN_LOOKUP).lean(),
    Payment.aggregate([
      { $match: { transaction: new mongoose.Types.ObjectId(transactionId), status: "success" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
  ]);
  if (!txn) return null;
  const paid = paidAgg[0]?.total || 0;
  const outstanding = Math.max(0, (txn.fineAmount || 0) - paid);
  return { txn, paid, outstanding };
};

const persistOutstanding = async (txn) => {
  const outstanding = Math.max(0, (txn.fineAmount || 0) - (txn._paid || 0));
  let paymentStatus = "unpaid";
  if (outstanding === 0 && (txn.fineAmount || 0) > 0) paymentStatus = "paid";
  else if ((txn._paid || 0) > 0 && outstanding > 0) paymentStatus = "partial";
  else if ((txn.fineAmount || 0) === 0) paymentStatus = "paid";
  await Transaction.updateOne(
    { _id: txn._id },
    {
      $set: { outstandingFine: outstanding, paymentStatus, finePaid: outstanding === 0 && (txn.fineAmount || 0) > 0 },
    }
  );
  const updated = await Transaction.findById(txn._id).select(TXN_LOOKUP).lean();
  return updated;
};

const generatePaymentReference = () => {
  const year = new Date().getFullYear();
  const random = Math.floor(10000000 + Math.random() * 89999999);
  return `PAY-${year}${random}`;
};

exports.initiate = asyncHandler(async (req, res) => {
  if (req.user.role !== "member") {
    res.status(403); throw new Error("Only the member themselves can initiate a payment. Use the cash request flow for in-person payments.");
  }
  if (!req.user.memberRef) {
    res.status(403); throw new Error("No member profile is linked to this account. Contact the librarian.");
  }
  const { transactionId, amount, method } = req.body;
  if (!transactionId) { res.status(400); throw new Error("transactionId is required"); }

  const txn = await Transaction.findById(transactionId).select("transactionCode member fineAmount outstandingFine status").lean();
  if (!txn) { res.status(404); throw new Error("Transaction not found"); }
  if (String(txn.member) !== String(req.user.memberRef)) {
    res.status(403); throw new Error("You can only pay for your own transactions");
  }

  const owner = await Member.findById(txn.member).select("email firstName lastName memberID").lean();
  if (!owner) { res.status(404); throw new Error("Member not found for this transaction"); }
  const email = owner.email;
  if (!email) { res.status(400); throw new Error("Your profile has no email on file. Update it in My Profile before paying online."); }

  const currentOutstanding = (txn.outstandingFine != null) ? txn.outstandingFine : (txn.fineAmount || 0);
  if (currentOutstanding <= 0) { res.status(400); throw new Error("No outstanding fine on this transaction"); }

  const requested = amount != null ? Number(amount) : currentOutstanding;
  if (requested <= 0) { res.status(400); throw new Error("Payment amount must be positive"); }
  if (requested > currentOutstanding) {
    res.status(400); throw new Error(`Amount exceeds outstanding fine of ${formatNGN(currentOutstanding)}`);
  }

  const reference = generatePaymentReference();
  const callbackUrl = process.env.PAYMENT_CALLBACK_URL || `${req.protocol}://${req.get("host")}/api/payments/webhook/paystack`;
  const metadata = {
    transactionId: String(txn._id),
    transactionCode: txn.transactionCode,
    memberId: String(owner._id),
    memberID: owner.memberID,
    custom_fields: [
      { display_name: "Transaction", variable_name: "transaction_code", value: txn.transactionCode },
      { display_name: "Member",     variable_name: "member_id",         value: owner.memberID },
    ],
  };

  let paystack;
  try {
    paystack = await initializePayment({
      amount: requested * 100,
      email,
      reference,
      callbackUrl,
      metadata,
    });
  } catch (e) {
    res.status(e.status || 502);
    throw new Error(`Paystack init failed: ${e.message}`);
  }

  const payment = await Payment.create({
    reference,
    transaction: txn._id,
    member: owner._id,
    amount: requested,
    currency: "NGN",
    gateway: "paystack",
    gatewayRef: reference,
    accessCode: paystack.accessCode,
    status: "pending",
    method: method || "card",
    initiatedBy: req.user._id,
    rawResponse: paystack.raw,
  });

  await logAudit({
    req, user: req.user, action: "payment.initiate",
    targetModel: "Payment", targetId: payment._id,
    details: `Member ${owner.memberID} initiated ${formatNGN(requested)} Paystack payment ${reference} for ${txn.transactionCode}`,
  });

  res.status(201).json({
    payment,
    authorizationUrl: paystack.authorizationUrl,
    accessCode: paystack.accessCode,
    reference,
  });
});

exports.verify = asyncHandler(async (req, res) => {
  const { reference } = req.params;
  const payment = await Payment.findOne({ reference }).select("+rawResponse");
  if (!payment) { res.status(404); throw new Error("Payment not found"); }
  if (req.user.role === "member" && (!req.user.memberRef || String(req.user.memberRef) !== String(payment.member))) {
    res.status(403); throw new Error("You can only verify your own payments");
  }

  if (payment.status === "success") {
    const txn = await Transaction.findById(payment.transaction).select(TXN_LOOKUP).lean();
    return res.json({ payment, transaction: txn, alreadyVerified: true });
  }
  if (payment.status === "failed" || payment.status === "cancelled") {
    return res.json({ payment, transaction: null, alreadyFailed: true });
  }

  let result;
  try {
    result = await verifyPayment(reference);
  } catch (e) {
    res.status(e.status || 502);
    throw new Error(`Paystack verify failed: ${e.message}`);
  }

  if (result.status === "success") {
    payment.status = "success";
    payment.gatewayRef = result.gatewayRef || payment.gatewayRef;
    payment.method = mapChannel(result.channel) || payment.method;
    payment.channel = result.channel || payment.channel;
    payment.paidAt = result.paidAt || new Date();
    payment.rawResponse = result.raw;
    await payment.save();

    const paidAgg = await Payment.aggregate([
      { $match: { transaction: payment.transaction, status: "success" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const txn = await Transaction.findById(payment.transaction).select("transactionCode fineAmount");
    const updated = await persistOutstanding({ ...txn.toObject(), _id: txn._id, _paid: paidAgg[0]?.total || 0 });
    await logAudit({
      req, user: req.user, action: "payment.success",
      targetModel: "Payment", targetId: payment._id,
      details: `Payment ${reference} succeeded: ${formatNGN(payment.amount)} via ${payment.channel || "paystack"}`,
    });
    return res.json({ payment, transaction: updated });
  }

  payment.status = result.status === "failed" ? "failed" : "cancelled";
  payment.rawResponse = result.raw;
  await payment.save();
  await logAudit({
    req, user: req.user, action: "payment.failed",
    targetModel: "Payment", targetId: payment._id,
    details: `Payment ${reference} ${payment.status}: ${result.message || "—"}`,
  });
  res.json({ payment, transaction: null });
});

exports.confirmInline = asyncHandler(async (req, res) => {
  const { reference } = req.params;
  const { channel, paidAt, gatewayResponse } = req.body || {};

  const payment = await Payment.findOne({ reference });
  if (!payment) { res.status(404); throw new Error("Payment not found"); }
  if (req.user.role === "member" && (!req.user.memberRef || String(req.user.memberRef) !== String(payment.member))) {
    res.status(403); throw new Error("You can only confirm your own payments");
  }
  if (payment.gateway !== "paystack") {
    res.status(400); throw new Error("Only Paystack inline payments can be confirmed this way");
  }
  if (payment.status === "success") {
    const txn = await Transaction.findById(payment.transaction).select(TXN_LOOKUP).lean();
    return res.json({ payment, transaction: txn, alreadyConfirmed: true });
  }
  if (payment.status === "failed" || payment.status === "cancelled") {
    res.status(400); throw new Error(`This payment was already ${payment.status} on Paystack. Start a new payment to retry.`);
  }

  payment.status = "success";
  payment.method = mapChannel(channel) || payment.method || "card";
  payment.channel = channel || payment.channel || "card";
  payment.paidAt = paidAt ? new Date(paidAt) : new Date();
  payment.rawResponse = {
    ...(payment.rawResponse?.toObject ? payment.rawResponse.toObject() : payment.rawResponse || {}),
    inlineCallback: gatewayResponse || null,
    confirmedAt: new Date().toISOString(),
  };
  await payment.save();

  const paidAgg = await Payment.aggregate([
    { $match: { transaction: payment.transaction, status: "success" } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  const txn = await Transaction.findById(payment.transaction).select("transactionCode fineAmount");
  const updated = await persistOutstanding({ ...txn.toObject(), _id: txn._id, _paid: paidAgg[0]?.total || 0 });

  await logAudit({
    req, user: req.user, action: "payment.success",
    targetModel: "Payment", targetId: payment._id,
    details: `Payment ${reference} confirmed via Paystack inline callback: ${formatNGN(payment.amount)} (${payment.channel})`,
  });

  res.json({ payment, transaction: updated });
});

const mapChannel = (c) => {
  if (!c) return null;
  const k = String(c).toLowerCase();
  if (k === "card") return "card";
  if (k === "bank" || k === "bank_transfer") return "transfer";
  if (k === "ussd") return "ussd";
  if (k === "qr" || k === "qrcode") return "qr";
  return "other";
};

exports.requestCash = asyncHandler(async (req, res) => {
  if (req.user.role !== "member") {
    res.status(403); throw new Error("Only the member themselves can submit a cash payment request.");
  }
  if (!req.user.memberRef) {
    res.status(403); throw new Error("No member profile is linked to this account. Contact the librarian.");
  }
  const { transactionId, amount, method, notes } = req.body;
  if (!transactionId || !amount) { res.status(400); throw new Error("transactionId and amount are required"); }
  const amt = Number(amount);
  if (amt <= 0) { res.status(400); throw new Error("Amount must be positive"); }

  const txn = await Transaction.findById(transactionId).select("transactionCode member fineAmount outstandingFine status");
  if (!txn) { res.status(404); throw new Error("Transaction not found"); }
  if (String(txn.member) !== String(req.user.memberRef)) {
    res.status(403); throw new Error("You can only request payment for your own transactions");
  }
  if (txn.status === "Returned" || txn.status === "Lost") {
    res.status(400); throw new Error("Cannot collect payment for a closed transaction");
  }
  const currentOutstanding = (txn.outstandingFine != null) ? txn.outstandingFine : (txn.fineAmount || 0);
  if (currentOutstanding <= 0) { res.status(400); throw new Error("No outstanding fine on this transaction"); }
  if (amt > currentOutstanding) {
    res.status(400); throw new Error(`Amount exceeds outstanding fine of ${formatNGN(currentOutstanding)}`);
  }

  const reference = generatePaymentReference();
  const payment = await Payment.create({
    reference,
    transaction: txn._id,
    member: txn.member,
    amount: amt,
    currency: "NGN",
    gateway: method === "bank_transfer" ? "bank_transfer" : "cash",
    gatewayRef: reference,
    status: "pending",
    method: method || "cash",
    initiatedBy: req.user._id,
    notes: notes || undefined,
  });

  await logAudit({
    req, user: req.user, action: "payment.cashRequest",
    targetModel: "Payment", targetId: payment._id,
    details: `Member requested ${method || "cash"} payment ${reference} of ${formatNGN(amt)} for ${txn.transactionCode} — awaiting admin verification`,
  });
  res.status(201).json({ payment, transaction: txn });
});

exports.verifyCash = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin" && req.user.role !== "librarian") {
    res.status(403); throw new Error("Only staff can verify cash payments");
  }
  const { id } = req.params;
  const { decision, notes } = req.body || {};
  if (!["approve", "reject"].includes(decision)) {
    res.status(400); throw new Error("decision must be 'approve' or 'reject'");
  }

  const payment = await Payment.findById(id);
  if (!payment) { res.status(404); throw new Error("Payment not found"); }
  if (!["cash", "bank_transfer"].includes(payment.gateway)) {
    res.status(400); throw new Error("Only cash or bank-transfer payments require manual verification");
  }
  if (payment.status !== "pending") {
    res.status(400); throw new Error(`Payment is already ${payment.status}`);
  }

  if (decision === "reject") {
    payment.status = "failed";
    payment.notes = [payment.notes, `Rejected by ${req.user.fullName}: ${notes || "no reason given"}`].filter(Boolean).join(" | ");
    await payment.save();
    await logAudit({
      req, user: req.user, action: "payment.cashReject",
      targetModel: "Payment", targetId: payment._id,
      details: `Rejected cash payment ${payment.reference}: ${notes || "no reason"}`,
    });
    return res.json({ payment });
  }

  payment.status = "success";
  payment.paidAt = new Date();
  if (notes) payment.notes = [payment.notes, `Verified by ${req.user.fullName}: ${notes}`].filter(Boolean).join(" | ");
  await payment.save();

  const paidAgg = await Payment.aggregate([
    { $match: { transaction: payment.transaction, status: "success" } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  const fresh = await Transaction.findById(payment.transaction).select("transactionCode fineAmount");
  const updated = await persistOutstanding({ ...fresh.toObject(), _id: fresh._id, _paid: paidAgg[0]?.total || 0 });
  await logAudit({
    req, user: req.user, action: "payment.cashVerify",
    targetModel: "Payment", targetId: payment._id,
    details: `Verified ${payment.gateway} payment ${payment.reference} of ${formatNGN(payment.amount)} for ${fresh.transactionCode}`,
  });
  res.json({ payment, transaction: updated });
});

exports.webhook = asyncHandler(async (req, res) => {
  const rawBody = req.rawBody || (req.body ? JSON.stringify(req.body) : "");
  const signature = req.headers["x-paystack-signature"];
  if (!verifyWebhookSignature(rawBody, signature)) {
    res.status(401); throw new Error("Invalid webhook signature");
  }
  const event = req.body || {};
  if (event.event !== "charge.success") return res.status(200).json({ received: true, ignored: true });
  const data = event.data || {};
  const reference = data.reference;
  if (!reference) return res.status(200).json({ received: true, ignored: "no reference" });

  const payment = await Payment.findOne({ reference });
  if (!payment) return res.status(200).json({ received: true, ignored: "no payment" });
  if (payment.status === "success") return res.status(200).json({ received: true, idempotent: true });

  payment.status = "success";
  payment.gatewayRef = data.reference || payment.gatewayRef;
  payment.method = mapChannel(data.channel) || payment.method;
  payment.channel = data.channel || payment.channel;
  payment.paidAt = data.paid_at ? new Date(data.paid_at) : new Date();
  payment.rawResponse = data;
  await payment.save();

  const paidAgg = await Payment.aggregate([
    { $match: { transaction: payment.transaction, status: "success" } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  const fresh = await Transaction.findById(payment.transaction).select("transactionCode fineAmount");
  await persistOutstanding({ ...fresh.toObject(), _id: fresh._id, _paid: paidAgg[0]?.total || 0 });

  res.status(200).json({ received: true });
});

exports.list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = buildPagination(req);
  const filter = buildSearchFilter(req, ["reference", "notes"]);
  if (req.query.status)    filter.status   = req.query.status;
  if (req.query.gateway)   filter.gateway  = req.query.gateway;
  if (req.query.method)    filter.method   = req.query.method;
  if (req.query.member)    filter.member   = req.query.member;
  if (req.query.startDate || req.query.endDate) {
    filter.createdAt = {};
    if (req.query.startDate) filter.createdAt.$gte = new Date(req.query.startDate);
    if (req.query.endDate)   filter.createdAt.$lte = new Date(req.query.endDate);
  }
  const [items, total] = await Promise.all([
    Payment.find(filter)
      .select("reference transaction member amount currency gateway status method channel paidAt createdAt")
      .populate("transaction", "transactionCode")
      .populate("member", "firstName lastName memberID memberType email")
      .populate("initiatedBy", "fullName email")
      .sort({ createdAt: -1 })
      .skip(skip).limit(limit).lean(),
    Payment.countDocuments(filter),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) || 1, limit });
});

exports.listPending = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin" && req.user.role !== "librarian") {
    res.status(403); throw new Error("Only staff can view pending payments");
  }
  const items = await Payment.find({ status: "pending", gateway: { $in: ["cash", "bank_transfer"] } })
    .select("reference transaction member amount currency gateway status method channel createdAt notes")
    .populate("transaction", "transactionCode fineAmount")
    .populate("member", "firstName lastName memberID memberType email phone")
    .populate("initiatedBy", "fullName email")
    .sort({ createdAt: -1 })
    .lean();
  res.json(items);
});

exports.byMember = asyncHandler(async (req, res) => {
  if (req.user.role === "member" && (!req.user.memberRef || String(req.user.memberRef) !== String(req.params.memberId))) {
    res.status(403); throw new Error("You can only access your own payments");
  }
  const payments = await Payment.find({ member: req.params.memberId })
    .select("reference transaction amount currency gateway status method channel paidAt createdAt")
    .populate("transaction", "transactionCode fineAmount")
    .sort({ createdAt: -1 })
    .lean();
  res.json(payments);
});

exports.get = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id)
    .populate("transaction", "transactionCode fineAmount")
    .populate("member", "firstName lastName memberID memberType email phone")
    .populate("initiatedBy", "fullName email")
    .lean();
  if (!payment) { res.status(404); throw new Error("Payment not found"); }
  if (req.user.role === "member" && (!req.user.memberRef || String(req.user.memberRef) !== String(payment.member._id))) {
    res.status(403); throw new Error("You can only access your own payments");
  }
  res.json(payment);
});

const libraryHeader = (doc) => {
  doc.fontSize(18).text(process.env.LIBRARY_NAME || "Library", { align: "center" });
  doc.moveDown(0.2);
  doc.fontSize(10).fillColor("gray").text(process.env.LIBRARY_ADDRESS || "", { align: "center" });
  doc.fillColor("black").moveDown(0.8);
};

exports.receipt = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id)
    .populate("transaction", "transactionCode fineAmount book")
    .populate("member", "firstName lastName memberID memberType email phone")
    .populate("initiatedBy", "fullName email")
    .lean();
  if (!payment) { res.status(404); throw new Error("Payment not found"); }
  if (req.user.role === "member" && (!req.user.memberRef || String(req.user.memberRef) !== String(payment.member._id))) {
    res.status(403); throw new Error("You can only access your own payments");
  }
  if (payment.status !== "success") { res.status(400); throw new Error("Receipt is only available for successful payments"); }

  const book = await (async () => {
    if (payment.transaction?.book) {
      return require("../models/Book").findById(payment.transaction.book).select("title accessionNumber author").lean();
    }
    return null;
  })();

  const doc = await generatePDF(res, { title: `Payment Receipt ${payment.reference}` });
  libraryHeader(doc);
  doc.fontSize(14).fillColor("navy").text("OFFICIAL PAYMENT RECEIPT", { align: "center" });
  doc.fillColor("black").moveDown(0.6);

  const meta = [
    ["Receipt No.",      payment.reference],
    ["Date",             formatDate(payment.paidAt || payment.createdAt)],
    ["Status",           payment.status.toUpperCase()],
    ["Gateway",          `${payment.gateway}${payment.channel ? ` (${payment.channel})` : ""}`],
    ["Method",           payment.method || "—"],
  ];
  meta.forEach(([k, v]) => {
    doc.fontSize(9).fillColor("gray").text(k, { continued: true, width: 130 });
    doc.fillColor("black").text(`  ${v}`);
  });
  doc.moveDown(0.6);

  doc.fontSize(11).fillColor("navy").text("Member", { underline: true });
  doc.fillColor("black").moveDown(0.2);
  doc.fontSize(10).text(`Name:      ${payment.member.firstName} ${payment.member.lastName}`);
  doc.text(`Member ID: ${payment.member.memberID}`);
  doc.text(`Type:      ${payment.member.memberType || "—"}`);
  if (payment.member.email) doc.text(`Email:     ${payment.member.email}`);
  if (payment.member.phone) doc.text(`Phone:     ${payment.member.phone}`);
  doc.moveDown(0.6);

  doc.fontSize(11).fillColor("navy").text("Transaction", { underline: true });
  doc.fillColor("black").moveDown(0.2);
  doc.fontSize(10).text(`Code:      ${payment.transaction?.transactionCode || "—"}`);
  if (book) {
    doc.text(`Book:      ${book.title} (${book.accessionNumber})`);
    doc.text(`Author:    ${book.author || "—"}`);
  }
  doc.text(`Fine:      ${formatNGN(payment.transaction?.fineAmount || 0)}`);
  doc.moveDown(0.8);

  doc.fontSize(13).fillColor("navy").text(`Amount Paid: ${formatNGN(payment.amount)}`, { align: "right" });
  doc.fillColor("black").moveDown(1.2);

  if (payment.initiatedBy) {
    doc.fontSize(9).fillColor("gray").text(`Recorded by: ${payment.initiatedBy.fullName} (${payment.initiatedBy.email || "—"})`);
  }
  doc.moveDown(2);
  doc.fontSize(8).fillColor("gray").text("This is a system-generated receipt. No signature is required.", { align: "center" });

  doc.end();
  await logAudit({
    req, user: req.user, action: "payment.receipt",
    targetModel: "Payment", targetId: payment._id,
    details: `Receipt downloaded for payment ${payment.reference}`,
  });
});
