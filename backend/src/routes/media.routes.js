const r=require("express").Router();const auth=require("../middleware/auth");const role=require("../middleware/role");const upload=require("../middleware/upload");const c=require("../controllers/media.controller");
r.post("/avatar",auth,upload.single("image"),c.avatar);
r.post("/shops/:id/logo",auth,role("shop_owner"),upload.single("image"),c.shopLogo);
r.post("/shops/:id/cover",auth,role("shop_owner"),upload.single("image"),c.shopCover);
r.post("/products/:id/image",auth,role("shop_owner"),upload.single("image"),c.productImage);
r.post("/products/:id/gallery",auth,role("shop_owner"),upload.array("images",8),c.productGallery);
module.exports=r;
