const mongoose=require('mongoose');
const schema=new mongoose.Schema({userId:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,unique:true},products:[{type:mongoose.Schema.Types.ObjectId,ref:'Product'}],shops:[{type:mongoose.Schema.Types.ObjectId,ref:'Shop'}]},{timestamps:true});
module.exports=mongoose.model('Wishlist',schema);
