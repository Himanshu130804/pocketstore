const mongoose=require('mongoose');
const itemSchema=new mongoose.Schema({productId:{type:mongoose.Schema.Types.ObjectId,ref:'Product',required:true},name:String,quantity:Number,receivedQty:{type:Number,default:0},unitCostPaise:Number,lineTotalPaise:Number},{_id:true});
const schema=new mongoose.Schema({
 shopId:{type:mongoose.Schema.Types.ObjectId,ref:'Shop',required:true,index:true},supplierId:{type:mongoose.Schema.Types.ObjectId,ref:'Supplier',required:true},number:{type:String,required:true,unique:true},items:[itemSchema],subtotalPaise:Number,status:{type:String,enum:['draft','ordered','partially_received','received','cancelled'],default:'draft'},expectedAt:Date,notes:String,createdBy:{type:mongoose.Schema.Types.ObjectId,ref:'User'}
},{timestamps:true});
module.exports=mongoose.model('PurchaseOrder',schema);
