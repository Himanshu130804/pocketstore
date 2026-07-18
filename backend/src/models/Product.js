const mongoose = require("mongoose");

const variantSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  sku: { type: String, trim: true },
  barcode: { type: String, trim: true, default: "" },
  pricePaise: { type: Number, min: 0 },
  costPricePaise: { type: Number, default: 0, min: 0 },
  mrpPaise: { type: Number, min: 0 },
  stockQty: { type: Number, default: 0, min: 0 },
  lowStockThreshold: { type: Number, default: 2, min: 0 },
  weightValue: { type: Number, min: 0 },
  weightUnit: { type: String, trim: true, default: "" },
  imageUrl: { type: String, default: "" },
  attributes: { type: Map, of: String, default: {} }
}, { _id: true });

const schema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
  name: { type: String, required: true, trim: true },
  shortDescription: { type: String, trim: true, default: "" },
  brand: { type: String, trim: true, default: "" },
  manufacturer: { type: String, trim: true, default: "" },
  countryOfOrigin: { type: String, trim: true, default: "India" },
  sku: { type: String, required: true, trim: true },
  barcode: { type: String, trim: true, default: "" },
  hsnCode: { type: String, trim: true, default: "" },
  category: { type: String, trim: true, default: "" },
  subcategory: { type: String, trim: true, default: "" },
  description: { type: String, default: "" },
  tags: [{ type: String, trim: true }],
  imageUrl: { type: String, default: "" },
  galleryUrls: [{ type: String }],
  variants: [variantSchema],
  unit: { type: String, default: "piece", trim: true },
  customUnit: { type: String, default: "", trim: true },
  pricePaise: { type: Number, required: true, min: 0 },
  costPricePaise: { type: Number, default: 0, min: 0 },
  mrpPaise: { type: Number, min: 0 },
  gstRate: { type: Number, default: 0, min: 0, max: 100 },
  taxInclusive: { type: Boolean, default: true },
  stockQty: { type: Number, default: 0, min: 0 },
  reservedStockQty: { type: Number, default: 0, min: 0 },
  lowStockThreshold: { type: Number, default: 5, min: 0 },
  reorderLevel: { type: Number, default: 5, min: 0 },
  maxStockLevel: { type: Number, min: 0 },
  fulfilmentModes: [{ type: String, enum: ["walk_in", "pickup", "delivery", "reserve", "express_pickup", "preorder"] }],
  isSeasonal: { type: Boolean, default: false },
  availableFrom: { type: Date },
  availableUntil: { type: Date },
  status: { type: String, enum: ["draft", "published", "hidden", "archived"], default: "published" },
  normalizedSku: { type: String, required: true, trim: true },
  deletedAt: { type: Date, default: null, index: true },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
}, { timestamps: true });


schema.pre("validate", function (next) {
  const normalizeSku = value => String(value || "").trim().toUpperCase().replace(/^[-_\s]+/, "").replace(/\s+/g, "-").replace(/-+/g, "-");
  this.sku = normalizeSku(this.sku);
  this.normalizedSku = this.sku;
  for (const variant of this.variants || []) {
    if (variant.sku) variant.sku = normalizeSku(variant.sku);
  }
  next();
});

schema.virtual("availableStockQty").get(function () {
  return Math.max(0, Number(this.stockQty || 0) - Number(this.reservedStockQty || 0));
});
schema.set("toJSON", { virtuals: true });
schema.set("toObject", { virtuals: true });
schema.index({ shopId: 1, normalizedSku: 1 }, { unique: true });
schema.index({ name: "text", category: "text", subcategory: "text", brand: "text", description: "text", tags: "text" });
module.exports = mongoose.model("Product", schema);
