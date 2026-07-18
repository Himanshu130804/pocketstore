const mongoose=require('mongoose');
const schema=new mongoose.Schema({name:{type:String,required:true,trim:true},scope:{type:String,enum:['shop','product'],default:'shop',index:true},status:{type:String,enum:['active','hidden','pending'],default:'active',index:true},createdBy:{type:mongoose.Schema.Types.ObjectId,ref:'User'},reviewedBy:{type:mongoose.Schema.Types.ObjectId,ref:'User',default:null},reviewNote:{type:String,default:''}},{timestamps:true});
schema.index({name:1,scope:1},{unique:true});
module.exports=mongoose.model('Category',schema);
