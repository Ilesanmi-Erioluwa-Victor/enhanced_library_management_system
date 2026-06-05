const router = require("express").Router();
const ctrl = require("../controllers/settingsController");
const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

router.get("/", protect, ctrl.getSettings);
router.put("/", protect, authorize("admin"), ctrl.updateSettings);

module.exports = router;
