const normalizeLabel=require("../utils/normalizeLabel");
const Shop = require("../models/Shop");
const ShopMembership = require("../models/ShopMembership");
const ApprovalRequest = require("../models/ApprovalRequest");
const { log } = require("../services/audit.service");
const { normalizePoint, haversineKm, hasUsablePoint } = require("../utils/location");
const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");
exports.create = async (req, res) => {
  req.body.category=normalizeLabel(req.body.category);
  const base = slugify(req.body.name || "shop");
  const location=normalizePoint(req.body.location||req.body);
  const shop = await Shop.create({ ...req.body, ...(location?{location}:{}), ownerId: req.user._id, slug: `${base}-${Date.now().toString().slice(-6)}`, status: "pending" });
  await ShopMembership.create({ shopId: shop._id, userId: req.user._id, role: "owner" });
  await ApprovalRequest.create({ shopId: shop._id, requestedBy: req.user._id, type: "shop_registration", payload: req.body });
  await log({ actorId: req.user._id, shopId: shop._id, action: "SHOP_SUBMITTED", entityType: "Shop", entityId: shop._id });
  res.status(201).json({ shop });
};
exports.mine = async (req, res) => res.json({ shops: await Shop.find({ ownerId: req.user._id }).sort({ createdAt: -1 }) });
exports.publicList = async (req, res) => {
  const { q, mode, city, lat, lng } = req.query;
  const filter = { status: "approved", isLive: true, isOnlineOrderingEnabled: true };
  if (q) filter.$or = [{ name: new RegExp(q, "i") }, { category: new RegExp(q, "i") }, { description: new RegExp(q, "i") }, { tags: new RegExp(q, "i") }];
  if (mode) filter.fulfilmentModes = mode;
  if (city) filter["address.city"] = new RegExp(city, "i");
  const customerPoint = normalizePoint({ lat, lng });
  if (!customerPoint) return res.json({ shops: [], locationRequired: true });
  let shops = await Shop.find(filter).limit(200).lean();
  if (customerPoint) {
    shops = shops.map(shop => ({ ...shop, distanceKm: hasUsablePoint(shop.location) ? haversineKm(customerPoint, shop.location) : null }))
      .filter(shop => shop.distanceKm !== null && shop.distanceKm <= Number(shop.deliveryRadiusKm || 0))
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }
  res.json({ shops, locationRequired: !customerPoint });
};
exports.getPublic = async (req, res) => {
  const shop = await Shop.findOne({ slug: req.params.slug, status: "approved", isLive: true, isOnlineOrderingEnabled: true }).lean();
  if (!shop) return res.status(404).json({ message: "Shop not found" });
  const customerPoint = normalizePoint({ lat: req.query.lat, lng: req.query.lng });
  if (!customerPoint) return res.status(428).json({ message: "Choose your location to check this shop’s service area." });
  if (customerPoint) {
    if (!hasUsablePoint(shop.location)) return res.status(409).json({ message: "This shop has not configured its service location yet." });
    const distanceKm = haversineKm(customerPoint, shop.location);
    if (distanceKm > Number(shop.deliveryRadiusKm || 0)) return res.status(403).json({ message: `This shop serves customers within ${shop.deliveryRadiusKm || 0} km.`, distanceKm });
    shop.distanceKm = distanceKm;
  }
  res.json({ shop });
};
exports.update = async (req, res) => {
  const shop = await Shop.findOne({ _id: req.params.id, ownerId: req.user._id });
  if (!shop) return res.status(404).json({ message: "Shop not found" });
  const sensitive = ["name","category","address","phone","email"];
  const sensitivePayload = Object.fromEntries(Object.entries(req.body).filter(([k]) => sensitive.includes(k)));
  const instantPayload = Object.fromEntries(Object.entries(req.body).filter(([k]) => !sensitive.includes(k) && k !== "isLive" && k !== "location"));
  const point=normalizePoint(req.body.location||req.body);
  if(point) instantPayload.location=point;
  Object.assign(shop, instantPayload); await shop.save();
  if (Object.keys(sensitivePayload).length) await ApprovalRequest.create({ shopId: shop._id, requestedBy: req.user._id, type: "sensitive_shop_update", payload: sensitivePayload });
  res.json({ shop, approvalSubmitted: !!Object.keys(sensitivePayload).length });
};

exports.setLiveStatus = async (req, res) => {
  const shop = await Shop.findOne({ _id: req.params.id, ownerId: req.user._id });
  if (!shop) return res.status(404).json({ message: "Shop not found" });
  const next = Boolean(req.body.isLive);
  if (next && shop.status !== "approved") {
    return res.status(409).json({ message: "Only an approved shop can be made live." });
  }
  if (next && !shop.isOnlineOrderingEnabled) {
    return res.status(409).json({ message: "Enable online ordering before making the shop live." });
  }
  if (next && (!hasUsablePoint(shop.location) || Number(shop.deliveryRadiusKm || 0) <= 0)) {
    return res.status(409).json({ message: "Set the shop location and service radius before making it live." });
  }
  shop.isLive = next;
  await shop.save();
  await log({ actorId: req.user._id, shopId: shop._id, action: next ? "SHOP_WENT_LIVE" : "SHOP_WENT_OFFLINE", entityType: "Shop", entityId: shop._id });
  res.json({ shop, message: next ? "Your shop is now live for customers." : "Your shop is offline. You can continue managing it." });
};
