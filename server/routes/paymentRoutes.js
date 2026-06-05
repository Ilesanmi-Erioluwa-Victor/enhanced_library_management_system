const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const c = require("../controllers/paymentController");

router.post("/initiate",          protect, c.initiate);
router.get("/verify/:reference",  protect, c.verify);
router.post("/confirm/:reference", protect, c.confirmInline);
router.post("/cash/request",      protect, c.requestCash);
router.post("/cash/verify/:id",   protect, authorize("admin", "librarian"), c.verifyCash);
router.get("/",                   protect, authorize("admin", "librarian"), c.list);
router.get("/pending",            protect, authorize("admin", "librarian"), c.listPending);
router.get("/member/:memberId",   protect, c.byMember);
router.get("/receipt/:id",        protect, c.receipt);
router.get("/:id",                protect, c.get);
router.post("/webhook/paystack",  c.webhook);

module.exports = router;
