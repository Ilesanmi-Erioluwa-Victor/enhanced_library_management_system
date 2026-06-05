const PDFDocument = require("pdfkit");

const sanitizeFilename = (s) =>
  String(s || "document")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80) || "document";

const generatePDF = (res, { title = "Library Document", meta = {} } = {}) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const filename = sanitizeFilename(title) + ".pdf";
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    doc.pipe(res);
    doc.on("end", resolve);
    doc.on("error", reject);
    doc.fontSize(20).text(process.env.LIBRARY_NAME || "Library", { align: "center" });
    doc.moveDown(0.3);
    doc.fontSize(12).text(title, { align: "center" });
    doc.moveDown(1);
    resolve(doc);
  });

module.exports = { generatePDF, sanitizeFilename };
