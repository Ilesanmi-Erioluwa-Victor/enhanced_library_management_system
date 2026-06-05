const router = require("express").Router();
const ctrl = require("../controllers/userController");
const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

router.put("/me/password", protect, ctrl.changeOwnPassword);
router.put("/me", protect, ctrl.updateOwnProfile);

router.get("/", protect, authorize("admin"), ctrl.list);
router.post("/", protect, authorize("admin"), ctrl.create);

router.get("/:id", protect, ctrl.get);
router.put("/:id", protect, authorize("admin"), ctrl.update);
router.delete("/:id", protect, authorize("admin"), ctrl.deactivate);

module.exports = router;
