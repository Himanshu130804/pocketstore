const bcrypt = require("bcryptjs");
const User = require("../models/User");

async function bootstrapSuperAdmin() {
  const name = process.env.SUPER_ADMIN_NAME;
  const email = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD;

  if (!name || !email || !password) {
    console.warn("Super Admin bootstrap skipped: SUPER_ADMIN_NAME, SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD are required.");
    return null;
  }

  const existingSuperAdmin = await User.findOne({ platformRole: "super_admin" });
  if (existingSuperAdmin) return existingSuperAdmin;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    existingUser.previousRole = ["customer", "shop_owner"].includes(existingUser.platformRole)
      ? existingUser.platformRole
      : "customer";
    existingUser.platformRole = "super_admin";
    existingUser.status = "active";
    existingUser.isEmailVerified = true;
    existingUser.passwordHash = await bcrypt.hash(password, 12);
    existingUser.tokenVersion += 1;
    await existingUser.save();
    console.log("Initial Super Admin promoted from configured email.");
    return existingUser;
  }

  const user = await User.create({
    name,
    email,
    passwordHash: await bcrypt.hash(password, 12),
    platformRole: "super_admin",
    status: "active",
    isEmailVerified: true,
  });
  console.log("Initial Super Admin created from environment configuration.");
  return user;
}

module.exports = { bootstrapSuperAdmin };
