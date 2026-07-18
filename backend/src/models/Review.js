const mongoose=require('mongoose');
const schema=new mongoose.Schema({userId:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,index:true},shopId:{type:mongoose.Schema.Types.ObjectId,ref:'Shop',required:true,index:true},orderId:{type:mongoose.Schema.Types.ObjectId,ref:'Order'},rating:{type:Number,min:1,max:5,required:true},comment:{type:String,trim:true,maxlength:1000},status:{type:String,enum:['published','hidden','flagged','removed'],default:'published',index:true},moderationNote:{type:String,default:''},moderatedBy:{type:mongoose.Schema.Types.ObjectId,ref:'User',default:null},moderatedAt:{type:Date,default:null}},{timestamps:true});
schema.index({userId:1,shopId:1,orderId:1},{unique:true,sparse:true});
module.exports=mongoose.model('Review',schema);
