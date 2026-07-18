const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Otp = require("../models/Otp");
const { signToken } = require("../utils/token");
const { sendOtp, verifyOtp, normalizeIndianPhone } = require("../services/sms.service");

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  avatarUrl: user.avatarUrl,
  platformRole: user.platformRole,
  status: user.status,
});

const normalizeDestination = (destination) => {
  const value = String(destination || "").trim();
  if (!value) throw new Error("Phone number is required");
  if (value.includes("@")) return value.toLowerCase();
  return normalizeIndianPhone(value);
};

exports.requestOtp = async (req, res, next) => {
  try {
    const purpose = req.body.purpose || "register";
    if (!["register", "reset_password", "verify", "login"].includes(purpose)) {
      return res.status(400).json({ message: "Invalid OTP purpose" });
    }

    const destination = normalizeDestination(req.body.destination);
    if (destination.includes("@")) {
      return res.status(400).json({ message: "SMS verification requires a phone number" });
    }

    if (purpose === "register" && await User.findOne({ phone: destination })) {
      return res.status(409).json({ message: "Phone number is already registered" });
    }

    if (purpose === "reset_password" && !(await User.findOne({ phone: destination }))) {
      return res.json({ message: "If the number is registered, an OTP has been sent" });
    }

    const recent = await Otp.countDocuments({
      destination,
      purpose,
      createdAt: { $gt: new Date(Date.now() - 15 * 60 * 1000) },
    });
    if (recent >= 5) {
      return res.status(429).json({ message: "Too many OTP requests. Try again later." });
    }

    const result = await sendOtp({
      to: destination,
      purpose,
      expiresInMinutes: Number(process.env.OTP_EXPIRY_MINUTES || 10),
    });

    res.json({
      message: purpose === "reset_password"
        ? "If the number is registered, an OTP has been sent"
        : "OTP sent by SMS",
      ...(result.devOtp ? { devOtp: result.devOtp } : {}),
    });
  } catch (error) {
    next(error);
  }
};

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role = "customer", otp } = req.body;
    const phone = normalizeIndianPhone(req.body.phone);
    if (!name || !password || !otp) return res.status(400).json({ message: "Name, phone, password and OTP are required" });
    if (password.length < 8) return res.status(400).json({ message: "Password must be at least 8 characters" });
    const otpValid = await verifyOtp({ to: phone, purpose: "register", otp });
    if (!otpValid) return res.status(400).json({ message: "Invalid or expired OTP" });
    const emailValue = email ? String(email).trim().toLowerCase() : undefined;
    const duplicate = await User.findOne({ $or: [{ phone }, ...(emailValue ? [{ email: emailValue }] : [])] });
    if (duplicate) return res.status(409).json({ message: "Account already exists" });
    const user = await User.create({
      name: String(name).trim(),
      email: emailValue,
      phone,
      passwordHash: await bcrypt.hash(password, 12),
      platformRole: role === "shop_owner" ? "shop_owner" : "customer",
      isEmailVerified: false,
      isPhoneVerified: true,
    });
    await Otp.deleteMany({ destination: phone, purpose: "register" });
    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  } catch (error) { next(error); }
};

exports.login = async (req, res) => {
  const { identifier, password } = req.body;
  const raw = String(identifier || "").trim();
  let phone = null;
  try { if (!raw.includes("@")) phone = normalizeIndianPhone(raw); } catch {}
  const user = await User.findOne({ $or: [{ email: raw.toLowerCase() }, ...(phone ? [{ phone }] : [])] });
  if (!user || !(await bcrypt.compare(String(password || ""), user.passwordHash))) return res.status(401).json({ message: "Invalid credentials" });
  if (user.status !== "active") return res.status(403).json({ message: `Account is ${user.status}` });
  res.json({ token: signToken(user), user: publicUser(user) });
};

exports.resetPassword = async (req, res, next) => {
  try {
    const phone = normalizeIndianPhone(req.body.phone);
    const { otp, newPassword } = req.body;
    if (!otp || !newPassword) return res.status(400).json({ message: "OTP and new password are required" });
    if (String(newPassword).length < 8) return res.status(400).json({ message: "Password must be at least 8 characters" });
    const otpValid = await verifyOtp({ to: phone, purpose: "reset_password", otp });
    if (!otpValid) return res.status(400).json({ message: "Invalid or expired OTP" });
    const user = await User.findOne({ phone });
    if (!user) return res.status(400).json({ message: "Invalid reset request" });
    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.tokenVersion += 1;
    await user.save();
    await Otp.deleteMany({ destination: phone, purpose: "reset_password" });
    res.json({ message: "Password reset successfully. You can now log in." });
  } catch (error) { next(error); }
};

exports.me = async (req, res) => res.json({ user: req.user });
exports.updateProfile = async (req, res) => {
  const allowed = ["name", "email", "phone", "bio", "city", "language", "notificationPreferences"];
  const patch = {};
  for (const key of allowed) if (req.body[key] !== undefined) patch[key] = req.body[key];
  if (patch.phone) patch.phone = normalizeIndianPhone(patch.phone);
  if (patch.email) patch.email = String(patch.email).toLowerCase();
  const user = await User.findByIdAndUpdate(req.user._id, patch, { new: true, runValidators: true }).select("-passwordHash");
  res.json({ user });
};
