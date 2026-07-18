require("dotenv").config();
const connectDB = require("./config/db");
const app = require("./app");
const { bootstrapSuperAdmin } = require("./services/bootstrapAdmin.service");

const port = process.env.PORT || 5000;

async function start() {
  await connectDB();
  await bootstrapSuperAdmin();
  app.listen(port, () => console.log(`PocketStore API running on ${port}`));
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
