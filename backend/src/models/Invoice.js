const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true, unique: true },
  publicToken: { type: String, required: true, unique: true },
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, unique: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
  customerContact: { name: String, phone: String, email: String },
  totalPaise: Number,
  issuedAt: { type: Date, default: Date.now },
  shopVisibleUntil: Date,
  anonymizedAt: Date
}, { timestamps: true });
module.exports = mongoose.model("Invoice", schema);
