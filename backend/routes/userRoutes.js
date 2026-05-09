const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const auth = require("../middleware/auth");

function normalizeRole(role) {
  const normalizedRole =
    typeof role === "string" ? role.trim().toLowerCase() : "cashier";

  if (normalizedRole === "staff") {
    return "inventory";
  }

  if (normalizedRole === "pos") {
    return "cashier";
  }

  return normalizedRole;
}

function validatePassword(password) {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{8,}$/;
  return passwordRegex.test(password);
}

function sanitizeUser(user) {
  const userObject = user.toObject ? user.toObject() : user;
  delete userObject.password;
  return userObject;
}

function validatePhoneNumber(phoneNumber) {
  if (!phoneNumber) return true;
  return /^[0-9+\-\s()]{7,20}$/.test(phoneNumber);
}

router.get("/", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin only" });
    }

    const users = await User.find().select("-password");
    res.json(users);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
router.post("/create", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin only" });
    }

    const { name, email, password, role } = req.body;
    const allowedRoles = ["admin", "inventory", "cashier"];
    const normalizedRole = normalizeRole(role);

    if (!allowedRoles.includes(normalizedRole)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters and include uppercase, lowercase, and number."
      });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashed,
      role: normalizedRole,
      status: "Pending",
      otpCode: null,
      otpPurpose: null,
      otpExpiresAt: null,
      isVerified: false
    });

    res.json({
      ...user.toObject(),
      password: undefined,
      message: "User created successfully. Verification OTP will be sent on first login."
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put("/me/profile", auth, async (req, res) => {
  try {
    const { name, phoneNumber, avatar } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Name is required" });
    }

    if (!validatePhoneNumber(phoneNumber)) {
      return res.status(400).json({ message: "Please enter a valid phone number" });
    }

    if (avatar && typeof avatar === "string" && avatar.length > 1_500_000) {
      return res.status(400).json({ message: "Profile picture is too large" });
    }

    user.name = name.trim();
    user.phoneNumber = typeof phoneNumber === "string" ? phoneNumber.trim() : "";
    user.avatar = typeof avatar === "string" ? avatar : "";
    await user.save();

    res.json({
      message: "Profile updated successfully",
      user: sanitizeUser(user)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put("/me/password", auth, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: "All password fields are required" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "New passwords do not match" });
    }

    if (!validatePassword(newPassword)) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters and include uppercase, lowercase, and number."
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {

    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin only" });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({ message: "User deleted successfully" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
router.put("/:id", auth, async (req, res) => {
  try {

    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin only" });
    }

    const { status } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    res.json(sanitizeUser(updatedUser));

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
