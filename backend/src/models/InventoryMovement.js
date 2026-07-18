const mongoose=require('mongoose');
const schema=new mongoose.Schema({
 shopId:{type:mongoose.Schema.Types.ObjectId,ref:'Shop',required:true,index:true},
 productId:{type:mongoose.Schema.Types.ObjectId,ref:'Product',required:true,index:true},
 productSnapshot:{name:{type:String,default:''},sku:{type:String,default:''},unit:{type:String,default:''}},
 variantId:mongoose.Schema.Types.ObjectId,
 type:{type:String,enum:['opening','purchase','sale','return','damage','expiry','adjustment','reservation','release'],required:true},
 quantity:{type:Number,required:true},
 unitCostPaise:{type:Number,default:0},
 referenceType:String,referenceId:mongoose.Schema.Types.ObjectId,
 note:String,createdBy:{type:mongoose.Schema.Types.ObjectId,ref:'User'}
},{timestamps:true});
schema.index({shopId:1,createdAt:-1});
module.exports=mongoose.model('InventoryMovement',schema);
