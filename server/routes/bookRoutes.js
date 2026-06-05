const router = require("express").Router();
const ctrl = require("../controllers/bookController");
const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const upload = require("../middleware/uploadMiddleware");

router.get("/available", protect, ctrl.available);
router.route("/")
  .get(protect, ctrl.list)
  .post(protect, authorize("admin", "librarian"), ctrl.create);

router.route("/:id")
  .get(protect, ctrl.get)
  .put(protect, authorize("admin", "librarian"), ctrl.update)
  .delete(protect, authorize("admin"), ctrl.softDelete);

router.post("/:id/cover", protect, authorize("admin", "librarian"), upload.single("cover"), ctrl.uploadCover);

module.exports = router;
