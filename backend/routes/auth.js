const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const requireAuth = require("../middleware/auth");

const router = express.Router();

const SPECIALTIES = [
  "Blurry Photo Analysis",
  "Footprint Forensics",
  "Night Vision Ops",
  "Howl Transcription",
  "Snack Logistics",
  "Tinfoil Hat Engineering"
];

function pickSpecialty() {
  return SPECIALTIES[Math.floor(Math.random() * SPECIALTIES.length)];
}

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

// POST /api/auth/register
router.post("/auth/register", async (req, res) => {
  try {
    const { codename, email, password } = req.body;

    if (!codename || !email || !password) {
      return res.status(400).json({ message: "Codename, email, and password are all required, agent." });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password needs at least 6 characters. Bigfoot isn't impressed by weak security." });
    }

    const existing = await User.findOne({ $or: [{ email: email.toLowerCase() }, { codename }] });
    if (existing) {
      return res.status(409).json({ message: "That codename or email is already on file at HQ." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      codename,
      email: email.toLowerCase(),
      passwordHash,
      specialty: pickSpecialty()
    });

    const token = signToken(user._id);
    res.status(201).json({
      message: `Welcome to the Society, ${codename}.`,
      token,
      user: { codename: user.codename, specialty: user.specialty, believeScore: user.believeScore }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "HQ's server tripped over a tent cable. Try again." });
  }
});

// POST /api/auth/login
router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: pickExcuse() });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ message: pickExcuse() });
    }

    const token = signToken(user._id);
    res.json({
      message: `Access granted. Good hunting, ${user.codename}.`,
      token,
      user: { codename: user.codename, specialty: user.specialty, believeScore: user.believeScore }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "HQ's server tripped over a tent cable. Try again." });
  }
});

function pickExcuse() {
  const excuses = [
    "Nice try, but our Sasquatch detector says that's not you.",
    "Incorrect. A raccoon in a trench coat tried this exact password yesterday too.",
    "Access denied. Have you considered that you might be a cryptid yourself?",
    "Wrong credentials. Somewhere, a yeti is laughing at you.",
    "Nope. Even the ghost in server room 3 is shaking its head."
  ];
  return excuses[Math.floor(Math.random() * excuses.length)];
}

// GET /api/auth/me  (protected)
router.get("/auth/me", requireAuth, async (req, res) => {
  const user = await User.findById(req.userId).select("-passwordHash");
  if (!user) return res.status(404).json({ message: "Agent file not found." });
  res.json({ user });
});

// POST /api/auth/believe  (protected) - the "Believe" button easter egg backend
router.post("/auth/believe", requireAuth, async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ message: "Agent file not found." });
  user.believeScore = Math.min(100, user.believeScore + Math.ceil(Math.random() * 8));
  await user.save();
  res.json({ believeScore: user.believeScore });
});

// GET /api/roster  (public - list of field agents)
router.get("/roster", async (req, res) => {
  const users = await User.find().select("codename specialty believeScore createdAt").sort({ createdAt: -1 }).limit(50);
  res.json({ users });
});

module.exports = router;
