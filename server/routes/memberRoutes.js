const router = require("express").Router();
const ctrl = require("../controllers/memberController");
const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const upload = require("../middleware/uploadMiddleware");

router.route("/")
  .get(protect, ctrl.list)
  .post(protect, authorize("admin", "librarian"), ctrl.create);

router.get("/lookup", protect, ctrl.findByEmail);
router.get("/:id/history", protect, ctrl.history);
router.get("/:id/outstanding", protect, ctrl.outstanding);
router.post("/:id/photo", protect, authorize("admin", "librarian"), upload.single("photo"), ctrl.uploadPhoto);

router.route("/:id")
  .get(protect, ctrl.get)
  .put(protect, authorize("admin", "librarian"), ctrl.update)
  .delete(protect, authorize("admin"), ctrl.deactivate);

module.exports = router;
