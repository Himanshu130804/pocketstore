const Shop = require("../models/Shop");
const User = require("../models/User");
const ApprovalRequest = require("../models/ApprovalRequest");
const Product = require("../models/Product");
const Order = require("../models/Order");
const Invoice = require("../models/Invoice");
const AuditLog = require("../models/AuditLog");
const { log } = require("../services/audit.service");

const safeUserSelect = "name email phone platformRole previousRole adminPermissions status isEmailVerified isPhoneVerified createdAt promotedAt";

exports.overview = async (req, res) => res.json({
  counts: {
    shops: await Shop.countDocuments(),
    pendingShops: await Shop.countDocuments({ status: "pending" }),
    users: await User.countDocuments(),
    admins: await User.countDocuments({ platformRole: { $in: ["platform_admin", "super_admin"] } }),
    approvals: await ApprovalRequest.countDocuments({ status: "pending" }),
  },
});

exports.shops = async (req, res) => res.json({
  shops: await Shop.find().populate("ownerId", "name email phone").sort({ createdAt: -1 }),
});

exports.users = async (req, res) => {
  const users = await User.find().select(safeUserSelect).sort({ createdAt: -1 });
  res.json({ users });
};

exports.admins = async (req, res) => {
  const admins = await User.find({ platformRole: { $in: ["platform_admin", "super_admin"] } })
    .select(safeUserSelect)
    .sort({ createdAt: -1 });
  res.json({ admins });
};

exports.setShopStatus = async (req, res) => {
  const allowed = ["approved", "suspended", "banned", "inactive"];
  if (!allowed.includes(req.body.status)) return res.status(400).json({ message: "Invalid shop status" });
  const shop = await Shop.findByIdAndUpdate(
    req.params.id,
    { status: req.body.status, rejectionReason: req.body.reason || "" },
    { new: true }
  );
  if (!shop) return res.status(404).json({ message: "Shop not found" });
  await log({
    actorId: req.user._id,
    shopId: shop._id,
    action: `SHOP_${String(req.body.status).toUpperCase()}`,
    entityType: "Shop",
    entityId: shop._id,
    metadata: { reason: req.body.reason || "" },
  });
  res.json({ shop });
};

exports.approvals = async (req, res) => res.json({
  approvals: await ApprovalRequest.find({ status: "pending" })
    .populate("shopId", "name")
    .populate("requestedBy", "name email"),
});

exports.reviewApproval = async (req, res) => {
  if (!["approved", "rejected"].includes(req.body.status)) {
    return res.status(400).json({ message: "Invalid approval status" });
  }
  const ar = await ApprovalRequest.findById(req.params.id);
  if (!ar) return res.status(404).json({ message: "Request not found" });
  if (ar.status !== "pending") return res.status(409).json({ message: "Request already reviewed" });

  ar.status = req.body.status;
  ar.reviewNote = req.body.note || "";
  ar.reviewedBy = req.user._id;
  ar.reviewedAt = new Date();
  await ar.save();

  const shop = await Shop.findById(ar.shopId);
  if (shop && req.body.status === "approved") {
    if (ar.type === "shop_registration") shop.status = "approved";
    else if (ar.type === "sensitive_shop_update") Object.assign(shop, ar.payload);
    else if (ar.type === "verification") shop.verificationStatus = "verified";
    await shop.save();
  } else if (shop && ar.type === "shop_registration") {
    shop.status = "rejected";
    shop.rejectionReason = req.body.note || "Rejected by administrator";
    await shop.save();
  }

  await log({
    actorId: req.user._id,
    shopId: shop?._id,
    action: `APPROVAL_${req.body.status.toUpperCase()}`,
    entityType: "ApprovalRequest",
    entityId: ar._id,
    metadata: { note: req.body.note || "" },
  });
  res.json({ approval: ar, shop });
};

exports.setUserStatus = async (req, res) => {
  const allowed = ["active", "inactive", "suspended", "banned"];
  if (!allowed.includes(req.body.status)) return res.status(400).json({ message: "Invalid user status" });
  const target = await User.findById(req.params.id);
  if (!target) return res.status(404).json({ message: "User not found" });
  if (target.platformRole === "super_admin" && req.user.platformRole !== "super_admin") {
    return res.status(403).json({ message: "Only a Super Admin can manage a Super Admin account" });
  }
  if (String(target._id) === String(req.user._id) && req.body.status !== "active") {
    return res.status(400).json({ message: "You cannot deactivate your own account" });
  }
  target.status = req.body.status;
  target.tokenVersion += 1;
  await target.save();
  await log({
    actorId: req.user._id,
    action: `USER_${req.body.status.toUpperCase()}`,
    entityType: "User",
    entityId: target._id,
  });
  res.json({ user: await User.findById(target._id).select(safeUserSelect) });
};

exports.promoteAdmin = async (req, res) => {
  if (req.user.platformRole !== "super_admin") {
    return res.status(403).json({ message: "Only a Super Admin can promote administrators" });
  }
  const target = await User.findById(req.params.id);
  if (!target) return res.status(404).json({ message: "User not found" });
  if (target.status !== "active") return res.status(400).json({ message: "Only active users can be promoted" });
  if (!target.isEmailVerified && !target.isPhoneVerified) {
    return res.status(400).json({ message: "User must verify an email or phone before promotion" });
  }
  if (["platform_admin", "super_admin"].includes(target.platformRole)) {
    return res.status(409).json({ message: "User is already an administrator" });
  }

  target.previousRole = target.platformRole;
  target.platformRole = "platform_admin";
  target.adminPermissions = Array.isArray(req.body.permissions) ? req.body.permissions : [];
  target.promotedBy = req.user._id;
  target.promotedAt = new Date();
  target.adminRemovedBy = null;
  target.adminRemovedAt = null;
  target.tokenVersion += 1;
  await target.save();

  await log({
    actorId: req.user._id,
    action: "USER_PROMOTED_TO_ADMIN",
    entityType: "User",
    entityId: target._id,
    metadata: { permissions: target.adminPermissions, previousRole: target.previousRole },
  });
  res.json({ user: await User.findById(target._id).select(safeUserSelect) });
};

exports.demoteAdmin = async (req, res) => {
  if (req.user.platformRole !== "super_admin") {
    return res.status(403).json({ message: "Only a Super Admin can remove administrator access" });
  }
  const target = await User.findById(req.params.id);
  if (!target) return res.status(404).json({ message: "User not found" });
  if (String(target._id) === String(req.user._id)) {
    return res.status(400).json({ message: "You cannot remove your own administrator access" });
  }
  if (target.platformRole === "super_admin") {
    return res.status(403).json({ message: "The environment-created Super Admin cannot be demoted here" });
  }
  if (target.platformRole !== "platform_admin") {
    return res.status(400).json({ message: "User is not a Platform Admin" });
  }

  target.platformRole = target.previousRole || "customer";
  target.previousRole = null;
  target.adminPermissions = [];
  target.adminRemovedBy = req.user._id;
  target.adminRemovedAt = new Date();
  target.tokenVersion += 1;
  await target.save();

  await log({
    actorId: req.user._id,
    action: "ADMIN_ACCESS_REMOVED",
    entityType: "User",
    entityId: target._id,
    metadata: { restoredRole: target.platformRole, reason: req.body.reason || "" },
  });
  res.json({ user: await User.findById(target._id).select(safeUserSelect) });
};


exports.products = async (req, res) => {
  const products = await Product.find()
    .populate("shopId", "name status")
    .sort({ createdAt: -1 });
  res.json({ products });
};

exports.setProductStatus = async (req, res) => {
  const allowed = ["draft", "published", "hidden", "archived"];
  if (!allowed.includes(req.body.status)) return res.status(400).json({ message: "Invalid product status" });
  const product = await Product.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
  if (!product) return res.status(404).json({ message: "Product not found" });
  await log({ actorId: req.user._id, shopId: product.shopId, action: `PRODUCT_${req.body.status.toUpperCase()}`, entityType: "Product", entityId: product._id });
  res.json({ product });
};

exports.orders = async (req, res) => {
  const orders = await Order.find()
    .populate("shopId", "name")
    .populate("customerId", "name email phone")
    .sort({ createdAt: -1 });
  res.json({ orders });
};

exports.auditLogs = async (req, res) => {
  const logs = await AuditLog.find()
    .populate("actorId", "name email platformRole")
    .populate("shopId", "name")
    .sort({ createdAt: -1 })
    .limit(500);
  res.json({ logs });
};

exports.analytics = async (req, res) => {
  const [orderSummary, paymentSummary, shopGrowth, userGrowth] = await Promise.all([
    Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 }, valuePaise: { $sum: "$totalPaise" } } }]),
    Order.aggregate([{ $group: { _id: "$paymentStatus", count: { $sum: 1 }, valuePaise: { $sum: "$totalPaise" } } }]),
    Shop.aggregate([{ $group: { _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    User.aggregate([{ $group: { _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
  ]);
  const totals = {
    grossOrderValuePaise: await Order.aggregate([{ $match: { paymentStatus: "paid" } }, { $group: { _id: null, total: { $sum: "$totalPaise" } } }]).then(r => r[0]?.total || 0),
    orders: await Order.countDocuments(),
    products: await Product.countDocuments(),
    invoices: await Invoice.countDocuments(),
  };
  res.json({ totals, orderSummary, paymentSummary, shopGrowth, userGrowth });
};

exports.updateAdminPermissions=async(req,res)=>{if(req.user.platformRole!=="super_admin")return res.status(403).json({message:"Only Super Admin can edit permissions"});const target=await User.findById(req.params.id);if(!target||target.platformRole!=="platform_admin")return res.status(404).json({message:"Platform Admin not found"});const allowed=["manage_users","manage_shops","review_approvals","manage_products","manage_orders","manage_complaints","manage_reviews","manage_categories","manage_settings","view_audit_logs","send_announcements","view_risk_signals","export_data","manage_admins"];target.adminPermissions=[...new Set((req.body.permissions||[]).filter(p=>allowed.includes(p)))];target.tokenVersion+=1;await target.save();await log({actorId:req.user._id,action:"ADMIN_PERMISSIONS_UPDATED",entityType:"User",entityId:target._id,newValue:{permissions:target.adminPermissions},reason:req.body.reason||""});res.json({user:await User.findById(target._id).select(safeUserSelect)});};
