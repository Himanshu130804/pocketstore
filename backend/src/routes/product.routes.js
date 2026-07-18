const r=require("express").Router(); const c=require("../controllers/product.controller"); const auth=require("../middleware/auth"); const role=require("../middleware/role");
r.get("/search",c.search);
r.get("/:id/public",c.detail);
r.get("/shop/:shopId/public",c.publicList);
r.get("/shop/:shopId",auth,role("shop_owner"),c.ownerList);
r.post("/",auth,role("shop_owner"),c.create);
r.patch("/:id",auth,role("shop_owner"),c.update);
r.delete("/:id",auth,role("shop_owner"),c.remove);
module.exports=r;
