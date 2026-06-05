const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const connectDB = require("./config/db");
const { startOverdueScheduler } = require("./jobs/overdueScheduler");
const errorMiddleware = require("./middleware/errorMiddleware");

const authRoutes = require("./routes/authRoutes");
const bookRoutes = require("./routes/bookRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const departmentRoutes = require("./routes/departmentRoutes");
const memberRoutes = require("./routes/memberRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const userRoutes = require("./routes/userRoutes");
const reportRoutes = require("./routes/reportRoutes");
const auditRoutes = require("./routes/auditRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const paymentRoutes = require("./routes/paymentRoutes");

const app = express();

app.use(cors({ origin: "*", credentials: true }));
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf && buf.toString("utf8");
    },
  }),
);
app.use(
  express.urlencoded({
    extended: true,
    verify: (req, _res, buf) => {
      req.rawBody = buf && buf.toString("utf8");
    },
  }),
);
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.get("/api/health", (req, res) =>
  res.json({ status: "ok", timestamp: new Date().toISOString() }),
);

app.use("/api/auth", authRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/members", memberRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/users", userRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/payments", paymentRoutes);

app.use(errorMiddleware);

const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();
  startOverdueScheduler();
  app.listen(PORT, () => {
    console.log(`[server] Listening on http://localhost:${PORT}`);
  });
};

start();
