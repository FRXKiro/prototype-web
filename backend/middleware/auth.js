const jwt = require("jsonwebtoken");

// Protects routes by requiring a valid "Bearer <token>" header.
function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "No badge, no entry. Log in first." });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch (err) {
    return res.status(401).json({ message: "That badge expired or is a forgery. Log in again." });
  }
}

module.exports = requireAuth;
