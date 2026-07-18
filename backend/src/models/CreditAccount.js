const mongoose=require('mongoose');
const entrySchema=new mongoose.Schema({type:{type:String,enum:['credit_sale','payment','adjustment'],required:true},amountPaise:{type:Number,required:true},orderId:{type:mongoose.Schema.Types.ObjectId,ref:'Order'},note:String,createdBy:{type:mongoose.Schema.Types.ObjectId,ref:'User'},at:{type:Date,default:Date.now}},{_id:true});
const schema=new mongoose.Schema({shopId:{type:mongoose.Schema.Types.ObjectId,ref:'Shop',required:true,index:true},customerId:{type:mongoose.Schema.Types.ObjectId,ref:'User'},customerContact:{name:String,phone:String,email:String},balancePaise:{type:Number,default:0},creditLimitPaise:{type:Number,default:0},entries:[entrySchema],status:{type:String,enum:['active','blocked'],default:'active'}},{timestamps:true});
schema.index({shopId:1,'customerContact.phone':1});
module.exports=mongoose.model('CreditAccount',schema);
