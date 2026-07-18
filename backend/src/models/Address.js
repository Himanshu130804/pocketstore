const mongoose=require('mongoose');
const schema=new mongoose.Schema({
 userId:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,index:true},
 label:{type:String,default:'Home'},name:String,phone:String,
 line1:{type:String,required:true},line2:String,city:{type:String,required:true},state:{type:String,required:true},pincode:{type:String,required:true},
 addressText:{type:String,default:''},
 location:{type:{type:String,enum:['Point'],default:'Point'},coordinates:{type:[Number],default:[0,0]}},
 isDefault:{type:Boolean,default:false}
},{timestamps:true});
schema.index({location:'2dsphere'});
module.exports=mongoose.model('Address',schema);
