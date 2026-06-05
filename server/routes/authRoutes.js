const router = require("express").Router();
const ctrl = require("../controllers/authController");
const protect = require("../middleware/authMiddleware");

router.post("/login", ctrl.login);
router.post("/logout", protect, ctrl.logout);
router.post("/forgot-password", ctrl.forgotPassword);
router.post("/reset-password/:token", ctrl.resetPassword);
router.get("/me", protect, ctrl.me);

module.exports = router;
