const User = require("../models/User");
const { geocodeAddress, reverseGeocode, normalizePoint } = require("../utils/location");

exports.geocode = async (req, res) => {
  const results = await geocodeAddress(req.body.address);
  res.json({ results });
};

exports.reverse = async (req, res) => {
  const result = await reverseGeocode(req.body.lat, req.body.lng);
  res.json({ result });
};

exports.mine = async (req, res) => {
  const user = await User.findById(req.user._id).select("savedLocation");
  res.json({ location: user?.savedLocation || null });
};

exports.saveMine = async (req, res) => {
  const point = normalizePoint(req.body);
  if (!point) return res.status(400).json({ message: "Valid latitude and longitude are required." });
  const savedLocation = {
    label: String(req.body.label || "My location").trim(),
    addressText: String(req.body.addressText || req.body.label || "").trim(),
    source: ["detected", "manual", "address"].includes(req.body.source) ? req.body.source : "manual",
    location: point,
    updatedAt: new Date(),
  };
  const user = await User.findByIdAndUpdate(req.user._id, { savedLocation }, { new: true }).select("savedLocation");
  res.json({ location: user.savedLocation });
};
