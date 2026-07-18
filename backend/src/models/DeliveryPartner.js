const mongoose=require('mongoose');
const schema=new mongoose.Schema({
 userId:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,unique:true,index:true},
 status:{type:String,enum:['active','suspended','blocked'],default:'active',index:true},
 isOnline:{type:Boolean,default:false,index:true},
 vehicleType:{type:String,enum:['bicycle','bike','scooter','car','other'],default:'bike'},
 vehicleNumber:{type:String,default:''},
 serviceRadiusKm:{type:Number,default:15,min:1,max:50},
 location:{type:{type:String,enum:['Point'],default:'Point'},coordinates:{type:[Number],default:[0,0]}},
 lastLocationAt:{type:Date,default:null},
 rating:{type:Number,default:5,min:0,max:5},
 completedDeliveries:{type:Number,default:0},
 earningsPaise:{type:Number,default:0}
},{timestamps:true});
schema.index({location:'2dsphere'});
module.exports=mongoose.model('DeliveryPartner',schema);
