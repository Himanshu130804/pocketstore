const normalizeLabel = require("../utils/normalizeLabel");
const Product = require("../models/Product");
const Shop = require("../models/Shop");
const { normalizePoint, haversineKm, hasUsablePoint } = require("../utils/location");
const InventoryMovement = require("../models/InventoryMovement");
const Order = require("../models/Order");
const PurchaseOrder = require("../models/PurchaseOrder");
const { normalizeSku } = require("../utils/product");

async function ownShop(shopId, userId) {
  return Shop.findOne({ _id: shopId, ownerId: userId });
}

const esc = value => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const SEARCH_ALIASES = {
  "for you": [],
  groceries: ["grocery", "groceries", "food", "daily needs"],
  grocery: ["grocery", "groceries", "food", "daily needs"],
  mobiles: ["mobile", "mobiles", "smartphone", "phone", "mobile accessories"],
  mobile: ["mobile", "mobiles", "smartphone", "phone", "mobile accessories"],
  pharmacy: ["pharmacy", "medicine", "medicines", "medical"],
  medicines: ["pharmacy", "medicine", "medicines", "medical"],
  home: ["home", "household", "home essentials"],
};
function searchTerms(value){
  const clean=String(value||"").trim().toLowerCase();
  if(!clean)return [];
  const singular=clean.endsWith("ies")?`${clean.slice(0,-3)}y`:clean.endsWith("s")?clean.slice(0,-1):clean;
  return [...new Set([clean,singular,...(SEARCH_ALIASES[clean]||[]),...(SEARCH_ALIASES[singular]||[])].filter(Boolean))];
}
function regexForTerms(terms){return new RegExp(terms.map(esc).join("|"),"i");}


async function eligibleLiveShops(query = {}) {
  const customerPoint = normalizePoint({ lat: query.lat, lng: query.lng });
  let shops = await Shop.find({ status: "approved", isLive: true, isOnlineOrderingEnabled: true }).lean();
  if (!customerPoint) return [];
  return shops
    .map(shop => ({
      ...shop,
      distanceKm: hasUsablePoint(shop.location) ? haversineKm(customerPoint, shop.location) : null,
    }))
    .filter(shop => shop.distanceKm !== null && shop.distanceKm <= Number(shop.deliveryRadiusKm || 0))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

exports.create = async (req, res) => {
  req.body.category = normalizeLabel(req.body.category);
  req.body.sku = normalizeSku(req.body.sku);
  req.body.subcategory = req.body.subcategory ? normalizeLabel(req.body.subcategory) : "";
  req.body.brand = req.body.brand ? normalizeLabel(req.body.brand) : "";
  req.body.tags = Array.isArray(req.body.tags) ? req.body.tags.map(normalizeLabel).filter(Boolean) : [];
  req.body.fulfilmentModes = [...new Set(Array.isArray(req.body.fulfilmentModes) ? req.body.fulfilmentModes : [])];
  if (!req.body.fulfilmentModes.length) return res.status(400).json({ message: "Select at least one fulfilment option" });
  if (!(await ownShop(req.body.shopId, req.user._id))) return res.status(403).json({ message: "Not your shop" });
  const product = await Product.create(req.body);
  res.status(201).json({ product });
};

exports.update = async (req, res) => {
  if (req.body.category !== undefined) req.body.category = normalizeLabel(req.body.category);
  if (req.body.sku !== undefined) req.body.sku = normalizeSku(req.body.sku);
  if (req.body.subcategory !== undefined) req.body.subcategory = normalizeLabel(req.body.subcategory);
  if (req.body.brand !== undefined) req.body.brand = normalizeLabel(req.body.brand);
  if (req.body.tags !== undefined) req.body.tags = Array.isArray(req.body.tags) ? req.body.tags.map(normalizeLabel).filter(Boolean) : [];
  if (req.body.fulfilmentModes !== undefined) {
    req.body.fulfilmentModes = [...new Set(Array.isArray(req.body.fulfilmentModes) ? req.body.fulfilmentModes : [])];
    if (!req.body.fulfilmentModes.length) return res.status(400).json({ message: "Select at least one fulfilment option" });
  }
  const product = await Product.findById(req.params.id);
  if (!product || product.deletedAt) return res.status(404).json({ message: "Product not found" });
  if (!(await ownShop(product.shopId, req.user._id))) return res.status(403).json({ message: "Not your product" });
  Object.assign(product, req.body);
  await product.save();
  res.json({ product });
};

exports.ownerList = async (req, res) => {
  if (!(await ownShop(req.params.shopId, req.user._id))) return res.status(403).json({ message: "Not your shop" });
  res.json({ products: await Product.find({ shopId: req.params.shopId }).sort({ createdAt: -1 }) });
};

exports.publicList = async (req, res) => {
  const shop = await Shop.findOne({ _id: req.params.shopId, status: "approved", isLive: true, isOnlineOrderingEnabled: true });
  if (!shop) return res.status(404).json({ message: "Shop is currently offline" });
  const customerPoint = normalizePoint({ lat: req.query.lat, lng: req.query.lng });
  if (!customerPoint) return res.status(428).json({ message: "Choose your location to view products served in your area." });
  if (customerPoint) {
    if (!hasUsablePoint(shop.location)) return res.status(409).json({ message: "Shop location is not configured" });
    const distanceKm = haversineKm(customerPoint, shop.location);
    if (distanceKm > Number(shop.deliveryRadiusKm || 0)) return res.status(403).json({ message: `This shop serves customers within ${shop.deliveryRadiusKm || 0} km.` });
  }
  const { q, mode, category, minPrice, maxPrice, sort = "relevance" } = req.query;
  const filter = { shopId: req.params.shopId, status: "published" };
  if (q) filter.$or = [{ name: new RegExp(esc(q), "i") }, { brand: new RegExp(esc(q), "i") }, { category: new RegExp(esc(q), "i") }, { description: new RegExp(esc(q), "i") }];
  if (mode) filter.fulfilmentModes = mode;
  if (category) filter.category = new RegExp(`^${esc(category)}$`, "i");
  if (minPrice || maxPrice) filter.pricePaise = { ...(minPrice ? { $gte: Number(minPrice) * 100 } : {}), ...(maxPrice ? { $lte: Number(maxPrice) * 100 } : {}) };
  const sorting = sort === "price_asc" ? { pricePaise: 1 } : sort === "price_desc" ? { pricePaise: -1 } : sort === "newest" ? { createdAt: -1 } : { name: 1 };
  res.json({ products: await Product.find(filter).sort(sorting) });
};

exports.detail = async (req, res) => {
  const product = await Product.findOne({ _id: req.params.id, status: "published" }).populate("shopId", "name slug logoUrl coverUrl category fulfilmentModes address minimumOrderPaise deliveryRadiusKm returnPolicy pickupInstructions status isLive isOnlineOrderingEnabled");
  if (!product || product.shopId?.status !== "approved" || !product.shopId?.isLive || !product.shopId?.isOnlineOrderingEnabled) return res.status(404).json({ message: "Product not found" });
  const customerPoint = normalizePoint({ lat: req.query.lat, lng: req.query.lng });
  if (!customerPoint) return res.status(428).json({ message: "Choose your location to check product availability." });
  if (customerPoint) {
    const fullShop = await Shop.findById(product.shopId._id).lean();
    if (!hasUsablePoint(fullShop.location)) return res.status(409).json({ message: "Shop location is not configured" });
    const distanceKm = haversineKm(customerPoint, fullShop.location);
    if (distanceKm > Number(fullShop.deliveryRadiusKm || 0)) return res.status(403).json({ message: `This shop serves customers within ${fullShop.deliveryRadiusKm || 0} km.` });
    product.shopId.distanceKm = distanceKm;
  }
  const related = await Product.find({ _id: { $ne: product._id }, shopId: product.shopId._id, status: "published", $or: [{ category: product.category }, { brand: product.brand || "__none__" }] }).limit(8);
  res.json({ product, related });
};

exports.search = async (req, res) => {
  const q = String(req.query.q || "").trim();
  const mode = req.query.mode;
  const category = req.query.category;
  const sort = req.query.sort || "relevance";
  const eligible = await eligibleLiveShops(req.query);
  const eligibleIds = eligible.map(shop => shop._id);
  const shopDistance = new Map(eligible.map(shop => [String(shop._id), shop.distanceKm]));
  const terms = searchTerms(q);
  const recommendationMode = !q || q.toLowerCase() === "for you";
  const rx = recommendationMode ? null : regexForTerms(terms);
  const matchingShops = recommendationMode ? eligible.slice(0, 8) : eligible.filter(shop => rx.test(shop.name || "") || rx.test(shop.category || "") || rx.test(shop.description || "") || (shop.tags || []).some(tag => rx.test(tag))).slice(0, 12);
  const filter = { status: "published", deletedAt: null, shopId: { $in: eligibleIds } };
  if (!recommendationMode) filter.$or = [{ name: rx }, { brand: rx }, { category: rx }, { subcategory: rx }, { description: rx }, { sku: rx }, { tags: rx }];
  if (mode) filter.fulfilmentModes = mode;
  if (category) filter.category = regexForTerms(searchTerms(category));
  let products = await Product.find(filter).populate({ path: "shopId", select: "name slug logoUrl category fulfilmentModes address deliveryRadiusKm" }).limit(80);
  const lower = q.toLowerCase();
  products = products.map(product => {
    let relevance = recommendationMode ? Math.max(0, Number(product.stockQty || 0)) : 0;
    const name = product.name.toLowerCase();
    const categoryName = (product.category || "").toLowerCase();
    const brand = (product.brand || "").toLowerCase();
    if (!recommendationMode) {
      if (name === lower) relevance += 100;
      if (name.startsWith(lower)) relevance += 60;
      if (terms.some(term => name.includes(term))) relevance += 40;
      if (terms.some(term => categoryName === term)) relevance += 50;
      if (terms.some(term => categoryName.includes(term))) relevance += 25;
      if (terms.some(term => brand === term)) relevance += 45;
      if (terms.some(term => brand.includes(term))) relevance += 20;
    }
    if (product.shopId) product.shopId.distanceKm = shopDistance.get(String(product.shopId._id));
    return { product, relevance };
  });
  products.sort((a, b) => sort === "price_asc" ? a.product.pricePaise - b.product.pricePaise : sort === "price_desc" ? b.product.pricePaise - a.product.pricePaise : b.relevance - a.relevance || a.product.name.localeCompare(b.product.name));
  const categories = [...new Set(products.map(item => item.product.category).filter(Boolean))].slice(0, 12);
  res.json({ query: q, products: products.map(item => item.product), shops: matchingShops, categories, locationApplied: !!normalizePoint({ lat: req.query.lat, lng: req.query.lng }) });
};

exports.remove = async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product || product.deletedAt) return res.status(404).json({ message: "Product not found" });
  if (!(await ownShop(product.shopId, req.user._id))) return res.status(403).json({ message: "Not your product" });

  if (product.status !== "archived") {
    product.status = "archived";
    product.deletedAt = new Date();
    product.deletedBy = req.user._id;
    await product.save();
    return res.json({ product, archived: true, message: "Product archived and removed from active inventory, POS and customer listings." });
  }

  const [movementCount, orderCount, purchaseCount] = await Promise.all([
    InventoryMovement.countDocuments({ productId: product._id }),
    Order.countDocuments({ "items.productId": product._id }),
    PurchaseOrder.countDocuments({ "items.productId": product._id }),
  ]);
  if (movementCount || orderCount || purchaseCount) {
    return res.status(409).json({
      message: "This product has transaction history and cannot be permanently deleted. It will remain archived for audit records.",
      references: { inventoryMovements: movementCount, orders: orderCount, purchases: purchaseCount },
    });
  }
  await product.deleteOne();
  res.json({ deleted: true, message: "Product permanently deleted." });
};
