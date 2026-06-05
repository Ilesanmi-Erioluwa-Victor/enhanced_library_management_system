const router = require("express").Router();
const ctrl = require("../controllers/transactionController");
const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

router.post("/issue", protect, authorize("admin", "librarian"), ctrl.issue);
router.post("/return", protect, authorize("admin", "librarian"), ctrl.return);
router.post("/lookup", protect, authorize("admin", "librarian"), ctrl.lookup);
router.post("/renew/:id", protect, authorize("admin", "librarian"), ctrl.renew);
router.post("/lost/:id", protect, authorize("admin", "librarian"), ctrl.markLost);

router.get("/overdue", protect, ctrl.overdue);
router.get("/member/:memberId", protect, ctrl.byMember);

router.route("/")
  .get(protect, ctrl.list);

router.get("/:id", protect, ctrl.get);

module.exports = router;
