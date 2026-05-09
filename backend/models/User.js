const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, "Please enter a valid email."]
  },

  phoneNumber: {
    type: String,
    default: ""
  },

  avatar: {
    type: String,
    default: ""
  },

  password: {
    type: String,
    required: true,
    minlength: 6,
  },

  role: {
    type: String,
    enum: ["admin", "inventory", "cashier"],
    default: "cashier",
  },

  status: {
    type: String,
    enum: ["Active", "Disabled", "Pending"],
    default: "Pending",
  },

  otpCode: {
    type: String,
    default: null
  },

  otpExpiresAt: {
    type: Date,
    default: null
  },

  otpPurpose: {
    type: String,
    enum: ["verify-email", "reset-password", null],
    default: null
  },

  isVerified: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
