const mongoose=require("mongoose");
const schema=new mongoose.Schema({
 title:{type:String,required:true,trim:true,maxlength:140}, message:{type:String,required:true,trim:true,maxlength:3000},
 audience:{type:String,enum:["all","customers","shop_owners","admins"],default:"all"},
 status:{type:String,enum:["draft","published","archived"],default:"draft",index:true},
 priority:{type:String,enum:["normal","important","urgent"],default:"normal"},
 startsAt:{type:Date,default:Date.now}, endsAt:{type:Date,default:null}, createdBy:{type:mongoose.Schema.Types.ObjectId,ref:"User",required:true},
 publishedAt:{type:Date,default:null}
},{timestamps:true});
module.exports=mongoose.model("Announcement",schema);
