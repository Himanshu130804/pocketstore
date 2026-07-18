const multer=require("multer");
const path=require("path");
const fs=require("fs");
const dir=path.join(__dirname,"../../uploads");
fs.mkdirSync(dir,{recursive:true});
const storage=multer.diskStorage({destination:(_,__,cb)=>cb(null,dir),filename:(req,file,cb)=>{const safe=file.originalname.replace(/[^a-zA-Z0-9._-]/g,"-");cb(null,`${Date.now()}-${Math.random().toString(36).slice(2,8)}-${safe}`)}});
const fileFilter=(_,file,cb)=>file.mimetype.startsWith("image/")?cb(null,true):cb(new Error("Only image files are allowed"));
module.exports=multer({storage,fileFilter,limits:{fileSize:5*1024*1024}});
