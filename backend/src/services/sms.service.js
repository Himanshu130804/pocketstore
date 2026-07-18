const sms = require("./sms");

const normalizeIndianPhone = (value = "") => {
  const digits = String(value).replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  if (String(value).trim().startsWith("+") && digits.length >= 10 && digits.length <= 15) return `+${digits}`;
  throw Object.assign(new Error("Enter a valid phone number"), { status: 400 });
};

module.exports = {
  ...sms,
  normalizeIndianPhone,
  toMsg91Mobile: (value) => normalizeIndianPhone(value).replace(/^\+/, ""),
};
