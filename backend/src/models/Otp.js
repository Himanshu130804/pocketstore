const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  destination: { type: String, required: true, index: true },
  purpose: { type: String, enum: ["register", "login", "verify", "reset_password"], default: "register" },
  codeHash: { type: String, required: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  usedAt: Date
}, { timestamps: true });
module.exports = mongoose.model("Otp", schema);
