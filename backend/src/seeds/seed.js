require("dotenv").config();
const connectDB = require("../config/db");
const { bootstrapSuperAdmin } = require("../services/bootstrapAdmin.service");

(async () => {
  await connectDB();
  await bootstrapSuperAdmin();
  console.log("Bootstrap complete. No demo customer, owner, shop, or product data was created.");
  process.exit(0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
