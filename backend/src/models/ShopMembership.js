const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true, index:true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index:true },
  role: { type: String, enum: ["owner", "manager", "cashier", "inventory_manager","accountant","delivery_staff"], required: true },
  permissions: [{type:String}],
  status: { type: String, enum: ["active", "revoked"], default: "active" },
  invitedBy:{type:mongoose.Schema.Types.ObjectId,ref:'User',default:null},
  joinedAt:{type:Date,default:Date.now}
}, { timestamps: true });
schema.index({ shopId: 1, userId: 1 }, { unique: true });
module.exports = mongoose.model("ShopMembership", schema);
