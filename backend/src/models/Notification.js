const mongoose=require('mongoose');
const schema=new mongoose.Schema({userId:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,index:true},title:{type:String,required:true},message:{type:String,required:true},type:{type:String,default:'general'},link:String,isRead:{type:Boolean,default:false}},{timestamps:true});
module.exports=mongoose.model('Notification',schema);
