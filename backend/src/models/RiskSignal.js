const mongoose=require("mongoose");
const schema=new mongoose.Schema({
 type:{type:String,enum:["high_cancellations","refund_spike","duplicate_contact","suspicious_billing","review_abuse","inventory_anomaly","manual"],required:true,index:true},
 severity:{type:String,enum:["low","medium","high","critical"],default:"medium",index:true},
 shopId:{type:mongoose.Schema.Types.ObjectId,ref:"Shop",default:null,index:true}, userId:{type:mongoose.Schema.Types.ObjectId,ref:"User",default:null,index:true},
 entityType:String,entityId:mongoose.Schema.Types.ObjectId,title:{type:String,required:true},description:{type:String,required:true},
 status:{type:String,enum:["open","reviewing","resolved","dismissed"],default:"open",index:true},
 assignedTo:{type:mongoose.Schema.Types.ObjectId,ref:"User",default:null},resolutionNote:{type:String,default:""},detectedAt:{type:Date,default:Date.now}
},{timestamps:true});
module.exports=mongoose.model("RiskSignal",schema);
