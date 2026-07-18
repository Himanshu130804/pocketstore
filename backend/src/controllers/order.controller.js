const mongoose = require("mongoose");
const Product = require("../models/Product");
const Shop = require("../models/Shop");
const Order = require("../models/Order");
const InventoryMovement = require("../models/InventoryMovement");
const { createInvoice } = require("../services/invoice.service");
const { log } = require("../services/audit.service");
const { sendMessage, normalizeIndianPhone } = require("../services/sms.service");
const { normalizePoint, haversineKm, hasUsablePoint, geocodeAddress } = require("../utils/location");
const { calculateOrderCharges } = require("../services/orderPricing.service");
const makeNo=()=>`ORD-${Date.now()}-${Math.floor(Math.random()*1000)}`;
const prepareOrder=async({shopId,items,fulfilmentMode,address,customerLocation})=>{
 const shop=await Shop.findOne({_id:shopId,status:"approved",isLive:true,isOnlineOrderingEnabled:true});
 if(!shop) throw Object.assign(new Error("This shop is currently offline or unavailable for online orders"),{status:409});
 if(!shop.fulfilmentModes.includes(fulfilmentMode)) throw Object.assign(new Error("Fulfilment mode unavailable"),{status:400});
 const orderPoint=normalizePoint(address?.location||customerLocation||address);
 if(!orderPoint) throw Object.assign(new Error("Select or detect your location before placing the order"),{status:400});
 if(!hasUsablePoint(shop.location)) throw Object.assign(new Error("Shop service location is not configured"),{status:409});
 const distanceKm=haversineKm(orderPoint,shop.location);
 if(distanceKm>Number(shop.deliveryRadiusKm||0)) throw Object.assign(new Error(`This shop serves customers within ${shop.deliveryRadiusKm||0} km. Your selected location is ${distanceKm.toFixed(1)} km away.`),{status:403});
 const ids=items.map(i=>i.productId); const products=await Product.find({_id:{$in:ids},shopId,status:"published"});
 if(products.length!==ids.length) throw Object.assign(new Error("One or more products unavailable"),{status:400});
 let subtotal=0; const normalized=[];
 for(const item of items){const p=products.find(x=>x._id.toString()===String(item.productId));const qty=Number(item.quantity);if(!Number.isInteger(qty)||qty<1)throw Object.assign(new Error("Invalid quantity"),{status:400});if(!p.fulfilmentModes.includes(fulfilmentMode))throw Object.assign(new Error(`${p.name} does not support selected mode`),{status:400});const variant=item.variantId?p.variants.id(item.variantId):null;if(item.variantId&&!variant)throw Object.assign(new Error(`Invalid option for ${p.name}`),{status:400});const available=variant?variant.stockQty:p.stockQty;const unitPrice=variant?.pricePaise??p.pricePaise;if(available<qty)throw Object.assign(new Error(`Insufficient stock for ${p.name}`),{status:409});const line=unitPrice*qty;subtotal+=line;normalized.push({productId:p._id,variantId:variant?._id,variantName:variant?.name,name:p.name,sku:variant?.sku||p.sku,quantity:qty,unitPricePaise:unitPrice,lineTotalPaise:line});}
 if(Number(shop.minimumOrderPaise||0)>0&&subtotal<Number(shop.minimumOrderPaise))throw Object.assign(new Error(`Minimum order is ₹${(shop.minimumOrderPaise/100).toFixed(2)}`),{status:409});
 const charges=await calculateOrderCharges({shop,subtotalPaise:subtotal,fulfilmentMode,distanceKm});
 return {shop,orderPoint,distanceKm,normalized,charges};
};
exports.quote=async(req,res,next)=>{try{const prepared=await prepareOrder(req.body);res.json({quote:prepared.charges,shop:{_id:prepared.shop._id,name:prepared.shop.name,gstPercent:prepared.shop.gstPercent,freeDeliveryAbovePaise:prepared.shop.freeDeliveryAbovePaise}})}catch(e){next(e)}};
exports.place = async (req,res,next) => {
 try{
  const { shopId, items, fulfilmentMode, address, notes, customerContact } = req.body;
  const prepared=await prepareOrder(req.body);
  if(fulfilmentMode==="delivery"&&address){
   const addressText=[address.line1,address.area,address.city,address.state,address.pincode].filter(Boolean).join(", ");
   if(addressText){try{const matches=await geocodeAddress(addressText);if(matches?.[0]){const typedPoint=normalizePoint(matches[0]);const mismatchKm=haversineKm(prepared.orderPoint,typedPoint);if(Number.isFinite(mismatchKm)&&mismatchKm>15)return res.status(409).json({message:`The saved map pin is ${mismatchKm.toFixed(1)} km away from the written delivery address. Re-pin this address before ordering.`});}}catch(error){console.warn("Address consistency check skipped:",error.message)}}
  }
  const c=prepared.charges;
  const normalizedAddress=address?{...address,location:prepared.orderPoint}:undefined;
  const order=await Order.create({orderNumber:makeNo(),shopId,customerId:req.user._id,customerContact:customerContact||{name:req.user.name,phone:req.user.phone,email:req.user.email},items:prepared.normalized,fulfilmentMode,address:normalizedAddress,notes,subtotalPaise:c.subtotalPaise,deliveryFeePaise:c.deliveryFeePaise,packagingFeePaise:c.packagingFeePaise,handlingFeePaise:c.handlingFeePaise,platformFeePaise:c.platformFeePaise,taxPaise:c.taxPaise,taxPercent:c.taxPercent,distanceKm:c.distanceKm,pricingBreakdown:c,totalPaise:c.totalPaise,paymentStatus:"pending",source:"online",timeline:[{status:"placed",note:`Order placed from ${prepared.distanceKm.toFixed(1)} km away`} ]});
  res.status(201).json({order});
 }catch(e){next(e)}
};
exports.mine = async (req,res)=>res.json({orders:await Order.find({customerId:req.user._id}).populate("shopId","name slug address fulfilmentModes deliveryRadiusKm").populate("assignedDeliveryUserId","name phone avatarUrl").sort({createdAt:-1})});
exports.mineOne=async(req,res)=>{const order=await Order.findOne({_id:req.params.id,customerId:req.user._id}).populate("shopId","name slug address phone fulfilmentModes deliveryRadiusKm").populate("assignedDeliveryUserId","name phone avatarUrl");if(!order)return res.status(404).json({message:"Order not found"});res.json({order});};
exports.cancelMine=async(req,res)=>{const order=await Order.findOne({_id:req.params.id,customerId:req.user._id});if(!order)return res.status(404).json({message:"Order not found"});if(!["placed","accepted"].includes(order.status))return res.status(409).json({message:"This order can no longer be cancelled because preparation has started"});if(["handover_verified","picked_up","on_the_way","delivered"].includes(order.deliveryStatus))return res.status(409).json({message:"This order has already entered delivery and cannot be cancelled"});const reason=String(req.body.reason||"Customer cancelled the order").trim().slice(0,300);order.status="cancelled";order.deliveryStatus="unassigned";order.assignedDeliveryUserId=null;order.cancelledAt=new Date();order.cancelledBy=req.user._id;order.cancellationReason=reason;order.timeline.push({status:"cancelled",note:reason});await order.save();res.json({order,message:"Order cancelled"});};
exports.shopOrders = async (req,res)=>{
  const shop=await Shop.findOne({_id:req.params.shopId,ownerId:req.user._id}); if(!shop) return res.status(403).json({message:"Not your shop"});
  res.json({orders:await Order.find({shopId:shop._id}).sort({createdAt:-1})});
};
exports.updateStatus = async (req,res,next)=>{
  try {
    const order=await Order.findById(req.params.id); if(!order) return res.status(404).json({message:"Order not found"});
    const shop=await Shop.findOne({_id:order.shopId,ownerId:req.user._id}); if(!shop) return res.status(403).json({message:"Not your order"});
    order.status=req.body.status; order.timeline.push({status:req.body.status,note:req.body.note||""}); await order.save();
    const phone=order.customerContact?.phone;
    if(phone){
      try {
        await sendMessage({
          to: normalizeIndianPhone(phone),
          type: "order_status",
          message: `PocketStore: Order ${order.orderNumber} from ${shop.name} is now ${String(order.status).replaceAll("_"," ")}.`,
          variables: { order_number: order.orderNumber, shop_name: shop.name, order_status: order.status },
        });
      } catch (smsError) { console.error("Order status SMS failed:", smsError.message); }
    }
    res.json({order});
  } catch(error){ next(error); }
};
exports.completeSale = async (req,res,next)=>{
  const session=await mongoose.startSession();
  try { let result; await session.withTransaction(async()=>{
    const order=await Order.findById(req.params.id).session(session); if(!order) throw Object.assign(new Error("Order not found"),{status:404});
    const shop=await Shop.findOne({_id:order.shopId,ownerId:req.user._id}).session(session); if(!shop) throw Object.assign(new Error("Not your order"),{status:403});
    if(order.paymentStatus==="paid") throw Object.assign(new Error("Order already paid"),{status:409});
    for(const item of order.items){ if(item.variantId){ const updated=await Product.findOneAndUpdate({_id:item.productId,shopId:shop._id,variants:{$elemMatch:{_id:item.variantId,stockQty:{$gte:item.quantity}}}},{$inc:{"variants.$.stockQty":-item.quantity}},{new:true,session}); if(!updated) throw Object.assign(new Error(`Insufficient stock for ${item.name} ${item.variantName||""}`),{status:409}); } else { const updated=await Product.findOneAndUpdate({_id:item.productId,shopId:shop._id,stockQty:{$gte:item.quantity}},{$inc:{stockQty:-item.quantity}},{new:true,session}); if(!updated) throw Object.assign(new Error(`Insufficient stock for ${item.name}`),{status:409}); }
      await InventoryMovement.create([{shopId:shop._id,productId:item.productId,variantId:item.variantId,type:"sale",quantity:-Math.abs(item.quantity),referenceType:"Order",referenceId:order._id,note:`Sale ${order.orderNumber}`,createdBy:req.user._id}],{session}); }
    order.paymentStatus="paid"; order.status="completed"; order.completedAt=new Date(); order.paymentMethod=req.body.paymentMethod||order.paymentMethod; await order.save({session});
    const invoice=await createInvoice({order,shop,session}); result={order,invoice};
  });
  await log({actorId:req.user._id,shopId:result.order.shopId,action:"SALE_COMPLETED",entityType:"Order",entityId:result.order._id});
  const phone=result.order.customerContact?.phone;
  if(phone){
    try {
      const amount=(result.order.totalPaise/100).toFixed(2);
      const invoiceUrl=`${process.env.CLIENT_URL || "http://localhost:5173"}/bill/${result.invoice.publicToken}`;
      await sendMessage({
        to: normalizeIndianPhone(phone),
        type: "invoice",
        message: `PocketStore: Payment received at ${result.order.orderNumber}. Amount ₹${amount}. Bill: ${invoiceUrl}`,
        variables: { order_number: result.order.orderNumber, amount, invoice_url: invoiceUrl },
      });
    } catch (smsError) { console.error("Invoice SMS failed:", smsError.message); }
  }
  res.json(result);
  } catch(e){ next(e); } finally { await session.endSession(); }
};
exports.createPos = async (req,res)=>{
  req.body.customerId=null; req.body.source="pos";
  const { shopId, items, fulfilmentMode="walk_in", customerContact }=req.body;
  const shop=await Shop.findOne({_id:shopId,ownerId:req.user._id}); if(!shop) return res.status(403).json({message:"Not your shop"});
  const ids=items.map(i=>i.productId); const products=await Product.find({_id:{$in:ids},shopId}); let subtotal=0; const normalized=[];
  for(const item of items){const p=products.find(x=>x._id.toString()===item.productId); const q=Number(item.quantity); if(!p||p.stockQty<q) return res.status(409).json({message:"Product unavailable"}); const line=p.pricePaise*q; subtotal+=line; normalized.push({productId:p._id,name:p.name,sku:p.sku,quantity:q,unitPricePaise:p.pricePaise,lineTotalPaise:line});}
  const order=await Order.create({orderNumber:makeNo(),shopId,customerContact,items:normalized,fulfilmentMode,subtotalPaise:subtotal,totalPaise:subtotal,source:"pos"}); res.status(201).json({order});
};
