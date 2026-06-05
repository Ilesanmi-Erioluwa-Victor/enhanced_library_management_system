const router = require("express").Router();
const ctrl = require("../controllers/auditController");
const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

router.use(protect, authorize("admin"));

router.get("/", ctrl.list);

module.exports = router;
