const crypto = require("crypto");
const Invoice = require("../models/Invoice");
exports.createInvoice = async ({ order, shop, session }) => {
  const invoiceNumber = `INV-${Date.now()}-${Math.floor(Math.random()*1000)}`;
  const publicToken = crypto.randomBytes(18).toString("hex");
  const shopVisibleUntil = new Date(Date.now() + (shop.retentionDays || 365) * 86400000);
  const [invoice] = await Invoice.create([{
    invoiceNumber, publicToken, shopId: order.shopId, orderId: order._id,
    customerId: order.customerId, customerContact: order.customerContact,
    totalPaise: order.totalPaise, shopVisibleUntil
  }], { session });
  return invoice;
};
