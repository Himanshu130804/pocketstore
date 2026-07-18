const User=require('../models/User');
const Address=require('../models/Address');
const Wishlist=require('../models/Wishlist');
const Review=require('../models/Review');
const Notification=require('../models/Notification');
const SupportTicket=require('../models/SupportTicket');
const Order=require('../models/Order');
const Invoice=require('../models/Invoice');
const ReturnRequest=require('../models/ReturnRequest');
const { normalizePoint }=require('../utils/location');

exports.dashboard=async(req,res)=>{
 const [orders,invoices,wishlist,notifications,addresses]=await Promise.all([
  Order.find({customerId:req.user._id}).populate('shopId','name slug').sort({createdAt:-1}).limit(5),
  Invoice.find({customerId:req.user._id}).populate('shopId','name slug').sort({createdAt:-1}).limit(5),
  Wishlist.findOne({userId:req.user._id}).populate({path:'products',populate:{path:'shopId',select:'name slug'}}).populate('shops','name slug category'),
  Notification.find({userId:req.user._id}).sort({createdAt:-1}).limit(8),
  Address.countDocuments({userId:req.user._id})
 ]);
 const allOrders=await Order.find({customerId:req.user._id});
 const spent=allOrders.filter(o=>o.paymentStatus==='paid').reduce((a,o)=>a+(o.totalPaise||0),0);
 res.json({summary:{orders:allOrders.length,activeOrders:allOrders.filter(o=>!['completed','cancelled'].includes(o.status)).length,bills:await Invoice.countDocuments({customerId:req.user._id}),wishlist:(wishlist?.products?.length||0)+(wishlist?.shops?.length||0),addresses,spentPaise:spent},recentOrders:orders,recentBills:invoices,wishlist:wishlist||{products:[],shops:[]},notifications});
};
exports.updateProfile=async(req,res)=>{const allowed=['name','phone','email','bio','city','language','notificationPreferences'];const patch={};for(const k of allowed)if(req.body[k]!==undefined)patch[k]=req.body[k];const user=await User.findByIdAndUpdate(req.user._id,patch,{new:true,runValidators:true}).select('-passwordHash');res.json({user});};
exports.addresses=async(req,res)=>res.json({addresses:await Address.find({userId:req.user._id}).sort({isDefault:-1,createdAt:-1})});
exports.addAddress=async(req,res)=>{const point=normalizePoint(req.body.location||req.body);if(!point)return res.status(400).json({message:'Pin this address using Detect live location or Find typed address before saving.'});if(req.body.isDefault)await Address.updateMany({userId:req.user._id},{isDefault:false});const payload={...req.body,userId:req.user._id,location:point};const address=await Address.create(payload);if(req.body.isDefault&&point)await User.findByIdAndUpdate(req.user._id,{savedLocation:{label:req.body.label||'Default address',addressText:req.body.addressText||[req.body.line1,req.body.line2,req.body.city,req.body.state,req.body.pincode].filter(Boolean).join(', '),source:'address',location:point,updatedAt:new Date()}});res.status(201).json({address});};
exports.updateAddress=async(req,res)=>{if(req.body.isDefault)await Address.updateMany({userId:req.user._id},{isDefault:false});const payload={...req.body};const point=normalizePoint(req.body.location||req.body);if(point)payload.location=point;const address=await Address.findOneAndUpdate({_id:req.params.id,userId:req.user._id},payload,{new:true,runValidators:true});if(!address)return res.status(404).json({message:'Address not found'});if(req.body.isDefault&&point)await User.findByIdAndUpdate(req.user._id,{savedLocation:{label:req.body.label||'Default address',addressText:req.body.addressText||[req.body.line1,req.body.line2,req.body.city,req.body.state,req.body.pincode].filter(Boolean).join(', '),source:'address',location:point,updatedAt:new Date()}});res.json({address});};
exports.deleteAddress=async(req,res)=>{await Address.deleteOne({_id:req.params.id,userId:req.user._id});res.json({message:'Address removed'});};
exports.wishlist=async(req,res)=>{const wishlist=await Wishlist.findOne({userId:req.user._id}).populate({path:'products',match:{status:{$ne:'archived'}},populate:{path:'shopId',select:'name slug isLive status'}}).populate({path:'shops',select:'name slug category address fulfilmentModes isLive status'});const value=wishlist?wishlist.toObject():{products:[],shops:[]};value.products=(value.products||[]).filter(Boolean);value.shops=(value.shops||[]).filter(Boolean);res.json({wishlist:value});};
exports.toggleWishlist=async(req,res)=>{const {type,id}=req.body;if(!['shop','product'].includes(type))return res.status(400).json({message:'Invalid wishlist type'});if(!require('mongoose').isValidObjectId(id))return res.status(400).json({message:'Invalid wishlist item'});const field=type==='shop'?'shops':'products';let w=await Wishlist.findOne({userId:req.user._id});if(!w)w=await Wishlist.create({userId:req.user._id,products:[],shops:[]});const exists=(w[field]||[]).some(x=>String(x)===String(id));if(exists)await Wishlist.updateOne({_id:w._id},{$pull:{[field]:id}});else await Wishlist.updateOne({_id:w._id},{$addToSet:{[field]:id}});res.json({added:!exists});};
exports.notifications=async(req,res)=>res.json({notifications:await Notification.find({userId:req.user._id}).sort({createdAt:-1})});
exports.readNotification=async(req,res)=>{await Notification.findOneAndUpdate({_id:req.params.id,userId:req.user._id},{isRead:true});res.json({message:'Marked read'});};
exports.reviews=async(req,res)=>{
 const reviews=await Review.find({userId:req.user._id}).populate('shopId','name slug').sort({createdAt:-1});
 const reviewedIds=reviews.map(r=>r.orderId).filter(Boolean);
 const eligibleOrders=await Order.find({customerId:req.user._id,status:'completed',_id:{$nin:reviewedIds}}).populate('shopId','name slug').sort({completedAt:-1,createdAt:-1});
 res.json({reviews,eligibleOrders});
};
exports.addReview=async(req,res)=>{
 const rating=Number(req.body.rating);
 if(!Number.isInteger(rating)||rating<1||rating>5)return res.status(400).json({message:'Choose a rating from 1 to 5'});
 const order=await Order.findOne({_id:req.body.orderId,customerId:req.user._id,status:'completed'});
 if(!order)return res.status(400).json({message:'Only completed orders can be reviewed'});
 const existing=await Review.findOne({userId:req.user._id,orderId:order._id});
 if(existing)return res.status(409).json({message:'You already reviewed this order'});
 const review=await Review.create({userId:req.user._id,shopId:order.shopId,orderId:order._id,rating,comment:String(req.body.comment||'').trim()});
 await review.populate('shopId','name slug');
 res.status(201).json({review});
};
exports.tickets=async(req,res)=>res.json({tickets:await SupportTicket.find({userId:req.user._id}).sort({createdAt:-1})});
exports.addTicket=async(req,res)=>{const ticket=await SupportTicket.create({...req.body,userId:req.user._id});res.status(201).json({ticket});};

exports.returnRequests=async(req,res)=>res.json({returns:await ReturnRequest.find({customerId:req.user._id}).populate('orderId','orderNumber totalPaise').populate('shopId','name slug').sort({createdAt:-1})});
exports.createReturnRequest=async(req,res)=>{const order=await Order.findOne({_id:req.body.orderId,customerId:req.user._id,status:'completed'});if(!order)return res.status(400).json({message:'Only completed orders can be returned'});const existing=await ReturnRequest.findOne({orderId:order._id,customerId:req.user._id,status:{$nin:['rejected','closed']}});if(existing)return res.status(409).json({message:'A return request already exists'});const requested=req.body.items?.length?req.body.items:order.items.map(i=>({productId:i.productId,name:i.name,quantity:i.quantity,amountPaise:i.lineTotalPaise}));const rr=await ReturnRequest.create({shopId:order.shopId,orderId:order._id,customerId:req.user._id,type:req.body.type||'return',reason:req.body.reason,items:requested,timeline:[{status:'requested',note:req.body.reason}]});res.status(201).json({returnRequest:rr});};

const Complaint=require('../models/Complaint');
exports.complaints=async(req,res)=>res.json({complaints:await Complaint.find({reportedBy:req.user._id}).populate('shopId','name slug').sort({createdAt:-1})});
exports.createComplaint=async(req,res)=>{const complaint=await Complaint.create({...req.body,reportedBy:req.user._id,timeline:[{status:'open',note:'Complaint submitted',by:req.user._id}]});res.status(201).json({complaint});};
