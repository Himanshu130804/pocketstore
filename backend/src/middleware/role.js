module.exports = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.platformRole)) {
    return res.status(403).json({ message: "Insufficient permission" });
  }
  next();
};
