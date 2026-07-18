const mongoose=require('mongoose');
const schema=new mongoose.Schema({
 shopId:{type:mongoose.Schema.Types.ObjectId,ref:'Shop',required:true,index:true},
 invitedBy:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},
 identifier:{type:String,required:true,trim:true,lowercase:true},
 role:{type:String,enum:['manager','cashier','inventory_manager','accountant','delivery_staff'],required:true},
 permissions:[String],
 token:{type:String,required:true,unique:true,index:true},
 status:{type:String,enum:['pending','accepted','revoked','expired'],default:'pending'},
 expiresAt:{type:Date,required:true,index:true},
 acceptedBy:{type:mongoose.Schema.Types.ObjectId,ref:'User',default:null},
 acceptedAt:{type:Date,default:null}
},{timestamps:true});
module.exports=mongoose.model('EmployeeInvite',schema);
