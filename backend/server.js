require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const authRoutes = require("./routes/auth");

const app = express();

// Allow your Vercel frontend (and localhost while testing) to call this API.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5500,http://127.0.0.1:5500")
  .split(",")
  .map((s) => s.trim());

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS: " + origin));
      }
    }
  })
);
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ status: "The Cryptid Watch Society server is awake and squinting at the treeline." });
});

app.use("/api", authRoutes);

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB Atlas.");
    app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err.message);
    process.exit(1);
  });
