const mongoose=require('mongoose');
const schema=new mongoose.Schema({shopId:{type:mongoose.Schema.Types.ObjectId,ref:'Shop',required:true,index:true},category:{type:String,required:true},title:{type:String,required:true},amountPaise:{type:Number,required:true,min:0},paymentMethod:{type:String,enum:['cash','upi','card','bank','other'],default:'cash'},expenseDate:{type:Date,default:Date.now},note:String,createdBy:{type:mongoose.Schema.Types.ObjectId,ref:'User'}},{timestamps:true});
module.exports=mongoose.model('Expense',schema);
