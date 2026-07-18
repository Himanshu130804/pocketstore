const jwt = require("jsonwebtoken");
exports.signToken = (user) => jwt.sign(
  { sub: user._id.toString(), role: user.platformRole, tokenVersion: user.tokenVersion || 0 },
  process.env.JWT_SECRET,
  { expiresIn: "7d" }
);
