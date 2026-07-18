const crypto=require('crypto');
const Shop=require('../models/Shop');
const User=require('../models/User');
const ShopMembership=require('../models/ShopMembership');
const EmployeeInvite=require('../models/EmployeeInvite');
const Order=require('../models/Order');
const Product=require('../models/Product');
const InventoryMovement=require('../models/InventoryMovement');
const {activeProductFilter}=require('../utils/product');
const AuditLog=require('../models/AuditLog');

const defaultPermissions={
 manager:['view_dashboard','manage_orders','manage_products','manage_inventory','manage_customers','view_reports','manage_employees','assign_delivery'],
 cashier:['view_dashboard','create_pos','manage_orders','view_customers','view_invoices'],
 inventory_manager:['view_dashboard','manage_products','manage_inventory','manage_suppliers','manage_purchases'],
 accountant:['view_dashboard','view_reports','manage_expenses','manage_khata','view_invoices'],
 delivery_staff:['view_dashboard','view_assigned_deliveries','update_delivery']
};
async function owned(req,shopId){return Shop.findOne({_id:shopId,ownerId:req.user._id})}
async function membership(req,shopId){
 const shop=await Shop.findById(shopId); if(!shop)return null;
 if(String(shop.ownerId)===String(req.user._id))return {shop,role:'owner',permissions:['*']};
 const m=await ShopMembership.findOne({shopId,userId:req.user._id,status:'active'});
 return m?{shop,role:m.role,permissions:m.permissions||[]}:null;
}
function allowed(access,perm){return access&&(access.role==='owner'||access.permissions.includes('*')||access.permissions.includes(perm))}
exports.myWorkspaces=async(req,res)=>{
 const ownedShops=await Shop.find({ownerId:req.user._id}).lean();
 const ms=await ShopMembership.find({userId:req.user._id,status:'active'}).populate('shopId').lean();
 const workspaces=[...ownedShops.map(s=>({shop:s,role:'owner',permissions:['*']})),...ms.filter(x=>x.shopId).map(x=>({shop:x.shopId,role:x.role,permissions:x.permissions||[]}))];
 res.json({workspaces});
};
exports.invite=async(req,res)=>{
 const shop=await owned(req,req.params.shopId);if(!shop)return res.status(403).json({message:'Only the shop owner can invite employees'});
 const {identifier,role,permissions=[]}=req.body; if(!identifier||!defaultPermissions[role])return res.status(400).json({message:'Valid identifier and employee role are required'});
 const normalized=String(identifier).trim().toLowerCase();
 const existing=await EmployeeInvite.findOne({shopId:shop._id,identifier:normalized,status:'pending'});if(existing)return res.status(409).json({message:'A pending invite already exists'});
 const token=crypto.randomBytes(24).toString('hex');
 const invite=await EmployeeInvite.create({shopId:shop._id,invitedBy:req.user._id,identifier:normalized,role,permissions:permissions.length?permissions:defaultPermissions[role],token,expiresAt:new Date(Date.now()+7*86400000)});
 await AuditLog.create({actorId:req.user._id,action:'EMPLOYEE_INVITED',entityType:'SHOP',entityId:shop._id,metadata:{identifier:normalized,role}}).catch(()=>{});
 res.status(201).json({invite,acceptPath:`/employee/accept/${token}`});
};
exports.invites=async(req,res)=>{const shop=await owned(req,req.params.shopId);if(!shop)return res.status(403).json({message:'Forbidden'});res.json({invites:await EmployeeInvite.find({shopId:shop._id}).sort({createdAt:-1})})};
exports.acceptInvite=async(req,res)=>{
 const invite=await EmployeeInvite.findOne({token:req.params.token,status:'pending'}).populate('shopId');if(!invite)return res.status(404).json({message:'Invite is invalid or no longer active'});
 if(invite.expiresAt<new Date()){invite.status='expired';await invite.save();return res.status(410).json({message:'Invite expired'})}
 const identifiers=[req.user.email?.toLowerCase(),req.user.phone].filter(Boolean); if(!identifiers.includes(invite.identifier))return res.status(403).json({message:'This invite was issued to another email or phone number'});
 const member=await ShopMembership.findOneAndUpdate({shopId:invite.shopId._id,userId:req.user._id},{$set:{role:invite.role,permissions:invite.permissions,status:'active',invitedBy:invite.invitedBy,joinedAt:new Date()}},{new:true,upsert:true,setDefaultsOnInsert:true});
 invite.status='accepted';invite.acceptedBy=req.user._id;invite.acceptedAt=new Date();await invite.save();res.json({membership:member,shop:invite.shopId});
};
exports.employees=async(req,res)=>{const shop=await owned(req,req.params.shopId);if(!shop)return res.status(403).json({message:'Forbidden'});const employees=await ShopMembership.find({shopId:shop._id}).populate('userId','name email phone avatarUrl status').sort({createdAt:-1});res.json({employees})};
exports.updateEmployee=async(req,res)=>{const shop=await owned(req,req.params.shopId);if(!shop)return res.status(403).json({message:'Forbidden'});const m=await ShopMembership.findOne({_id:req.params.membershipId,shopId:shop._id});if(!m)return res.status(404).json({message:'Employee membership not found'});if(req.body.role&&defaultPermissions[req.body.role])m.role=req.body.role;if(Array.isArray(req.body.permissions))m.permissions=req.body.permissions;if(req.body.status)m.status=req.body.status;await m.save();res.json({membership:m})};
exports.dashboard=async(req,res)=>{const access=await membership(req,req.params.shopId);if(!access)return res.status(403).json({message:'No access to this shop'});const [orders,products]=await Promise.all([Order.find({shopId:req.params.shopId}).sort({createdAt:-1}).limit(8),Product.find(activeProductFilter({shopId:req.params.shopId}))]);res.json({access:{role:access.role,permissions:access.permissions},summary:{orders:orders.length,pending:orders.filter(o=>['placed','accepted','preparing'].includes(o.status)).length,products:products.length,lowStock:products.filter(p=>(p.stockQty||0)<=(p.lowStockThreshold||0)).length},recentOrders:orders})};
exports.orders=async(req,res)=>{const access=await membership(req,req.params.shopId);if(!allowed(access,'manage_orders')&&!allowed(access,'view_assigned_deliveries'))return res.status(403).json({message:'Order permission required'});const filter={shopId:req.params.shopId};if(access.role==='delivery_staff')filter.assignedDeliveryUserId=req.user._id;const orders=await Order.find(filter).populate('assignedDeliveryUserId','name phone').sort({createdAt:-1});res.json({orders,access:{role:access.role,permissions:access.permissions}})};
exports.updateOrder=async(req,res)=>{const order=await Order.findById(req.params.orderId);if(!order)return res.status(404).json({message:'Order not found'});const access=await membership(req,order.shopId);if(!access)return res.status(403).json({message:'Forbidden'});if(access.role==='delivery_staff'){if(String(order.assignedDeliveryUserId)!==String(req.user._id))return res.status(403).json({message:'Delivery is not assigned to you'});const allowedStatuses=['picked_up','on_the_way','delivered','failed'];if(!allowedStatuses.includes(req.body.deliveryStatus))return res.status(400).json({message:'Invalid delivery status'});order.deliveryStatus=req.body.deliveryStatus;order.deliveryProofNote=req.body.note||'';if(req.body.deliveryStatus==='delivered'){order.status='completed';order.completedAt=new Date()}order.timeline.push({status:`delivery_${req.body.deliveryStatus}`,note:req.body.note||'',at:new Date()});}else{if(!allowed(access,'manage_orders'))return res.status(403).json({message:'Manage orders permission required'});if(req.body.status)order.status=req.body.status;}await order.save();res.json({order})};
exports.deliveryStaff=async(req,res)=>{const access=await membership(req,req.params.shopId);if(!allowed(access,'assign_delivery'))return res.status(403).json({message:'Delivery assignment permission required'});const staff=await ShopMembership.find({shopId:req.params.shopId,role:'delivery_staff',status:'active'}).populate('userId','name phone email avatarUrl');res.json({staff})};
exports.assignDelivery=async(req,res)=>{const order=await Order.findById(req.params.orderId);if(!order)return res.status(404).json({message:'Order not found'});const access=await membership(req,order.shopId);if(!allowed(access,'assign_delivery'))return res.status(403).json({message:'Delivery assignment permission required'});const m=await ShopMembership.findOne({shopId:order.shopId,userId:req.body.userId,role:'delivery_staff',status:'active'});if(!m)return res.status(400).json({message:'Select an active delivery employee'});order.assignedDeliveryUserId=req.body.userId;order.deliveryStatus='assigned';order.timeline.push({status:'delivery_assigned',note:'Delivery employee assigned',at:new Date()});await order.save();res.json({order})};
exports.pickupCode=async(req,res)=>{const order=await Order.findById(req.params.orderId);if(!order)return res.status(404).json({message:'Order not found'});const access=await membership(req,order.shopId);if(!allowed(access,'manage_orders'))return res.status(403).json({message:'Order permission required'});order.pickupCode=String(Math.floor(100000+Math.random()*900000));await order.save();res.json({pickupCode:order.pickupCode})};
exports.verifyPickup=async(req,res)=>{const order=await Order.findById(req.params.orderId);if(!order)return res.status(404).json({message:'Order not found'});const access=await membership(req,order.shopId);if(!allowed(access,'manage_orders'))return res.status(403).json({message:'Order permission required'});if(!order.pickupCode||order.pickupCode!==String(req.body.code))return res.status(400).json({message:'Invalid pickup code'});order.pickupVerifiedAt=new Date();order.status='completed';order.completedAt=new Date();order.timeline.push({status:'pickup_verified',note:'Pickup code verified',at:new Date()});await order.save();res.json({order})};
