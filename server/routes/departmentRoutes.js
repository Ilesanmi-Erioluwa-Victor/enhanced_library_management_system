const router = require("express").Router();
const ctrl = require("../controllers/departmentController");
const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

router.route("/")
  .get(protect, ctrl.list)
  .post(protect, authorize("admin"), ctrl.create);

router.route("/:id")
  .put(protect, authorize("admin"), ctrl.update)
  .delete(protect, authorize("admin"), ctrl.remove);

module.exports = router;
