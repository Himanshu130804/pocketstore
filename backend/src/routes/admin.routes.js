const router = require("express").Router();
const controller = require("../controllers/admin.controller");
const auth = require("../middleware/auth");
const role = require("../middleware/role");

router.use(auth, role("platform_admin", "super_admin"));
router.get("/overview", controller.overview);
router.get("/shops", controller.shops);
router.get("/users", controller.users);
router.get("/admins", controller.admins);
router.get("/products", controller.products);
router.patch("/products/:id/status", controller.setProductStatus);
router.get("/orders", controller.orders);
router.get("/audit-logs", controller.auditLogs);
router.get("/analytics", controller.analytics);
router.patch("/shops/:id/status", controller.setShopStatus);
router.get("/approvals", controller.approvals);
router.patch("/approvals/:id", controller.reviewApproval);
router.patch("/users/:id/status", controller.setUserStatus);
router.patch("/users/:id/promote-admin", controller.promoteAdmin);
router.patch("/users/:id/demote-admin", controller.demoteAdmin);
router.patch("/users/:id/admin-permissions", controller.updateAdminPermissions);

module.exports = router;
