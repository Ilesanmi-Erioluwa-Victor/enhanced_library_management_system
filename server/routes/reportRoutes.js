const router = require("express").Router();
const ctrl = require("../controllers/reportController");
const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

router.use(protect);

router.get("/dashboard", authorize("admin", "librarian"), ctrl.dashboard);
router.get("/summary", authorize("admin", "librarian"), ctrl.summary);
router.get("/books-by-category", authorize("admin", "librarian"), ctrl.booksByCategory);
router.get("/top-borrowed", authorize("admin", "librarian"), ctrl.topBorrowed);
router.get("/monthly-issues", authorize("admin", "librarian"), ctrl.monthlyIssues);

router.use(authorize("admin"));

router.get("/member-activity", ctrl.memberActivity);
router.get("/overdue-summary", ctrl.overdueSummary);
router.get("/export/books", ctrl.exportBooks);
router.get("/export/members", ctrl.exportMembers);
router.get("/export/overdue", ctrl.exportOverdue);
router.get("/export/transactions", ctrl.exportTransactions);

module.exports = router;
