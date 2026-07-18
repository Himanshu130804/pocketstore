const mongoose=require('mongoose');
const schema=new mongoose.Schema({
 shopId:{type:mongoose.Schema.Types.ObjectId,ref:'Shop',required:true,index:true},
 name:{type:String,required:true,trim:true},phone:String,email:String,gstin:String,address:String,notes:String,
 status:{type:String,enum:['active','inactive'],default:'active'},balanceDuePaise:{type:Number,default:0}
},{timestamps:true});
schema.index({shopId:1,name:1});
module.exports=mongoose.model('Supplier',schema);
