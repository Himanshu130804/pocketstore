const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, lowercase: true, trim: true, sparse: true, unique: true },
  phone: { type: String, trim: true, sparse: true, unique: true },
  passwordHash: { type: String, required: true },
  platformRole: {
    type: String,
    enum: ["customer", "shop_owner", "platform_admin", "super_admin"],
    default: "customer",
    index: true,
  },
  previousRole: {
    type: String,
    enum: ["customer", "shop_owner", null],
    default: null,
  },
  adminPermissions: [{
    type: String,
    enum: [
      "manage_users",
      "manage_shops",
      "review_approvals",
      "manage_products",
      "manage_orders",
      "manage_complaints",
      "manage_reviews",
      "manage_categories",
      "manage_settings",
      "view_audit_logs",
      "send_announcements",
      "view_risk_signals",
      "export_data",
      "manage_admins",
    ],
  }],
  status: {
    type: String,
    enum: ["active", "inactive", "suspended", "banned"],
    default: "active",
    index: true,
  },
  isEmailVerified: { type: Boolean, default: false },
  isPhoneVerified: { type: Boolean, default: false },
  promotedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  promotedAt: { type: Date, default: null },
  adminRemovedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  adminRemovedAt: { type: Date, default: null },
  avatarUrl: { type: String, default: "" },
  bio: { type: String, default: "", maxlength: 500 },
  city: { type: String, default: "" },
  language: { type: String, default: "English" },
  notificationPreferences: { orders: { type: Boolean, default: true }, offers: { type: Boolean, default: true }, account: { type: Boolean, default: true } },
  savedLocation: {
    label: { type: String, default: "" },
    addressText: { type: String, default: "" },
    source: { type: String, enum: ["detected", "manual", "address"], default: "manual" },
    location: { type: { type: String, enum: ["Point"], default: "Point" }, coordinates: { type: [Number], default: [0, 0] } },
    updatedAt: { type: Date, default: null },
  },
  tokenVersion: { type: Number, default: 0 },
}, { timestamps: true });

schema.pre("validate", function validateIdentifier(next) {
  if (!this.email && !this.phone) return next(new Error("Email or phone required"));
  next();
});

module.exports = mongoose.model("User", schema);
