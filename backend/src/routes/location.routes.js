const r = require("express").Router();
const c = require("../controllers/location.controller");
const auth = require("../middleware/auth");
r.post("/geocode", c.geocode);
r.post("/reverse", c.reverse);
r.get("/me", auth, c.mine);
r.patch("/me", auth, c.saveMine);
module.exports = r;
