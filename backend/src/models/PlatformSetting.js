const mongoose=require("mongoose");
const schema=new mongoose.Schema({
 key:{type:String,default:"global",unique:true},
 maintenanceMode:{type:Boolean,default:false},
 maintenanceMessage:{type:String,default:"PocketStore is temporarily under maintenance."},
 customerRegistration:{type:Boolean,default:true},
 shopOwnerRegistration:{type:Boolean,default:true},
 shopApprovalRequired:{type:Boolean,default:true},
 defaultRetentionDays:{type:Number,default:365,min:30,max:3650},
 deliveryFeeTiers:{type:[{uptoKm:{type:Number,min:0.1},feePaise:{type:Number,min:0}}],default:[{uptoKm:1,feePaise:2000},{uptoKm:2,feePaise:3000},{uptoKm:3,feePaise:5000},{uptoKm:5,feePaise:7000},{uptoKm:10,feePaise:10000}]},
 platformFeePaise:{type:Number,default:0,min:0},
 featureFlags:{
  reviews:{type:Boolean,default:true}, coupons:{type:Boolean,default:false}, khata:{type:Boolean,default:true},
  delivery:{type:Boolean,default:true}, reservations:{type:Boolean,default:true}, employeePortal:{type:Boolean,default:true}
 }
},{timestamps:true});
module.exports=mongoose.model("PlatformSetting",schema);
