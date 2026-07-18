const mongoose=require("mongoose");
const schema=new mongoose.Schema({
 referenceType:{type:String,enum:["shop","product","order","review","user","payment","other"],default:"other"},
 referenceId:{type:mongoose.Schema.Types.ObjectId,default:null}, shopId:{type:mongoose.Schema.Types.ObjectId,ref:"Shop",default:null,index:true},
 reportedBy:{type:mongoose.Schema.Types.ObjectId,ref:"User",required:true,index:true}, againstUserId:{type:mongoose.Schema.Types.ObjectId,ref:"User",default:null},
 category:{type:String,enum:["fraud","quality","delivery","payment","abuse","privacy","counterfeit","other"],default:"other"},
 subject:{type:String,required:true,trim:true,maxlength:180}, description:{type:String,required:true,trim:true,maxlength:4000},
 status:{type:String,enum:["open","investigating","waiting_user","resolved","dismissed"],default:"open",index:true},
 priority:{type:String,enum:["low","medium","high","critical"],default:"medium",index:true},
 assignedTo:{type:mongoose.Schema.Types.ObjectId,ref:"User",default:null}, resolution:{type:String,default:"",maxlength:3000},
 timeline:[{status:String,note:String,by:{type:mongoose.Schema.Types.ObjectId,ref:"User"},at:{type:Date,default:Date.now}}]
},{timestamps:true});
module.exports=mongoose.model("Complaint",schema);
