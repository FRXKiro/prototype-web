const mongoose = require("mongoose");

// A "field agent" is just our fun name for a registered user.
const UserSchema = new mongoose.Schema(
  {
    codename: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 24
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    specialty: {
      type: String,
      default: "Unconfirmed Sightings"
    },
    believeScore: {
      type: Number,
      default: 12 // everyone starts as a skeptic
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
