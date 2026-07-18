const mongoose=require("mongoose");
const schema=new mongoose.Schema({actorId:{type:mongoose.Schema.Types.ObjectId,ref:"User"},shopId:{type:mongoose.Schema.Types.ObjectId,ref:"Shop",index:true},action:{type:String,required:true,index:true},entityType:String,entityId:mongoose.Schema.Types.ObjectId,reason:{type:String,default:""},oldValue:mongoose.Schema.Types.Mixed,newValue:mongoose.Schema.Types.Mixed,metadata:mongoose.Schema.Types.Mixed,ipAddress:String,userAgent:String,requestId:String},{timestamps:true});
module.exports=mongoose.model("AuditLog",schema);
