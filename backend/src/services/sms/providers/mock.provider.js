const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const Otp = require("../../../models/Otp");

const generateOtp = (length = 6) => {
  const digits = Math.max(4, Math.min(Number(length) || 6, 8));
  const max = 10 ** digits;
  const min = 10 ** (digits - 1);
  return String(crypto.randomInt(min, max));
};

async function sendOtp({ to, purpose, expiresInMinutes = 10 }) {
  const otp = process.env.DEV_OTP || generateOtp(process.env.OTP_LENGTH || 6);
  const codeHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

  await Otp.deleteMany({ destination: to, purpose, usedAt: null });
  await Otp.create({ destination: to, purpose, codeHash, expiresAt });

  console.log("\n========================================");
  console.log("PocketStore Mock SMS");
  console.log(`To      : ${to}`);
  console.log(`Purpose : ${purpose}`);
  console.log(`OTP     : ${otp}`);
  console.log(`Expires : ${expiresInMinutes} minutes`);
  console.log("========================================\n");

  return {
    provider: "mock",
    message: "OTP generated in backend terminal",
    devOtp: otp,
  };
}

async function verifyOtp({ to, purpose, otp }) {
  const record = await Otp.findOne({
    destination: to,
    purpose,
    usedAt: null,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });

  if (!record || !(await bcrypt.compare(String(otp), record.codeHash))) return false;
  record.usedAt = new Date();
  await record.save();
  return true;
}

async function sendMessage({ to, message, type = "notification" }) {
  console.log("\n========================================");
  console.log("PocketStore Mock Notification");
  console.log(`To   : ${to}`);
  console.log(`Type : ${type}`);
  console.log(`Text : ${message}`);
  console.log("========================================\n");
  return { provider: "mock", status: "logged" };
}

module.exports = { sendOtp, verifyOtp, sendMessage };
