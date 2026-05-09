const router = require("express").Router();
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { sendOtpEmail, isEmailConfigured } = require("../utils/email");

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function buildOtpFields(purpose) {
  return {
    otpCode: generateOtp(),
    otpPurpose: purpose,
    otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000)
  };
}

function isOtpValid(user, otpCode, purpose) {
  return (
    user.otpCode &&
    user.otpCode === otpCode &&
    user.otpPurpose === purpose &&
    user.otpExpiresAt &&
    user.otpExpiresAt.getTime() > Date.now()
  );
}

function validatePassword(password) {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{8,}$/;
  return passwordRegex.test(password);
}

async function hasAdminAccount() {
  const adminCount = await User.countDocuments({ role: "admin" });
  return adminCount > 0;
}

async function getAdminSetupState() {
  const verifiedAdmin = await User.findOne({
    role: "admin",
    isVerified: true,
    status: "Active",
  });

  if (verifiedAdmin) {
    return { mode: "closed" };
  }

  const pendingAdmin = await User.findOne({
    role: "admin",
    isVerified: false,
    status: "Pending",
  }).sort({ createdAt: -1 });

  if (pendingAdmin) {
    return {
      mode: "pending-verification",
      pendingAdminEmail: pendingAdmin.email,
    };
  }

  return { mode: "available" };
}

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

async function normalizeUserRole(user) {
  const normalizedRole = normalizeRole(user.role);
  if (user.role !== normalizedRole) {
    user.role = normalizedRole;
    await user.save();
  }
}

router.post("/signup", async (req, res) => {
  try {
    return res.status(403).json({
      message: "Public signup is disabled. Only admins can create users."
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: error.message });
  }
});

router.get("/admin-setup-status", async (req, res) => {
  try {
    const setupState = await getAdminSetupState();
    res.json({
      requiresSetup: setupState.mode !== "closed",
      mode: setupState.mode,
      pendingAdminEmail: setupState.pendingAdminEmail || "",
      emailConfigured: isEmailConfigured(),
    });
  } catch (error) {
    console.error("Admin setup status error:", error);
    res.status(500).json({ message: "Failed to check admin setup status" });
  }
});

router.post("/setup-admin", async (req, res) => {
  try {
    const setupState = await getAdminSetupState();

    if (setupState.mode === "closed") {
      return res.status(403).json({ message: "Admin setup is already completed" });
    }

    if (!isEmailConfigured()) {
      return res.status(400).json({
        message: "Email OTP is not configured on the server."
      });
    }

    if (setupState.mode === "pending-verification") {
      return res.status(409).json({
        message: "A pending admin account already exists. Verify that account to continue.",
        requiresVerification: true,
        email: setupState.pendingAdminEmail,
      });
    }

    const { name, email, password } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Name is required" });
    }

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: "Please enter a valid email address" });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters and include uppercase, lowercase, and number."
      });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await User.create({
      name: name.trim(),
      email: email.toLowerCase(),
      password: hashedPassword,
      role: "admin",
      status: "Pending",
      isVerified: false,
      ...buildOtpFields("verify-email"),
    });

    await sendOtpEmail({
      to: admin.email,
      name: admin.name,
      otpCode: admin.otpCode,
      subject: "Verify your admin account",
      intro: "Use this OTP code to verify your first admin account."
    });

    res.status(201).json({
      message: "Admin account created. Check your email for the OTP code.",
      requiresVerification: true,
      email: admin.email,
    });
  } catch (error) {
    console.error("Admin setup error:", error);
    res.status(500).json({ message: "Failed to create admin account" });
  }
});

router.post("/setup-admin/resend-otp", async (req, res) => {
  try {
    if (!isEmailConfigured()) {
      return res.status(400).json({ message: "Email OTP is not configured on the server." });
    }

    const setupState = await getAdminSetupState();

    if (setupState.mode !== "pending-verification") {
      return res.status(400).json({ message: "There is no pending admin account to verify." });
    }

    const email = typeof req.body.email === "string" ? req.body.email.toLowerCase() : "";
    const admin = await User.findOne({
      role: "admin",
      email,
      isVerified: false,
      status: "Pending",
    });

    if (!admin) {
      return res.status(404).json({ message: "Pending admin account not found" });
    }

    const otpFields = buildOtpFields("verify-email");
    admin.otpCode = otpFields.otpCode;
    admin.otpPurpose = otpFields.otpPurpose;
    admin.otpExpiresAt = otpFields.otpExpiresAt;
    await admin.save();

    await sendOtpEmail({
      to: admin.email,
      name: admin.name,
      otpCode: admin.otpCode,
      subject: "Verify your admin account",
      intro: "Use this OTP code to verify your first admin account."
    });

    res.json({ message: "Verification OTP sent to email" });
  } catch (error) {
    console.error("Resend admin setup OTP error:", error);
    res.status(500).json({ message: "Failed to send verification OTP email" });
  }
});

router.post("/setup-admin/verify", async (req, res) => {
  try {
    const { email, otpCode } = req.body;
    const admin = await User.findOne({
      role: "admin",
      email: typeof email === "string" ? email.toLowerCase() : email,
    });

    if (!admin) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!isOtpValid(admin, otpCode, "verify-email")) {
      return res.status(400).json({ message: "Invalid or expired OTP code" });
    }

    admin.isVerified = true;
    admin.status = "Active";
    admin.otpCode = null;
    admin.otpPurpose = null;
    admin.otpExpiresAt = null;
    await admin.save();

    const token = jwt.sign(
      { id: admin._id, role: admin.role },
      process.env.JWT_SECRET || "secretkey",
      { expiresIn: "1d" }
    );

    res.json({
      message: "Email verified successfully",
      token,
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        phoneNumber: admin.phoneNumber || "",
        avatar: admin.avatar || "",
        role: admin.role,
      },
    });
  } catch (error) {
    console.error("Verify admin setup email error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    await normalizeUserRole(user);

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect password" });
    }

    if (user.status === "Pending") {
      if (!isEmailConfigured()) {
        return res.status(403).json({ message: "Account not verified, and email OTP is not configured on the server." });
      }

      const otpFields = buildOtpFields("verify-email");
      user.otpCode = otpFields.otpCode;
      user.otpPurpose = otpFields.otpPurpose;
      user.otpExpiresAt = otpFields.otpExpiresAt;
      await user.save();

      await sendOtpEmail({
        to: user.email,
        name: user.name,
        otpCode: user.otpCode,
        subject: "Verify your account",
        intro: "Use this OTP code to verify your account."
      });

      return res.status(403).json({
        message: "Account not verified. An OTP code was sent to your email.",
        requiresVerification: true,
        email: user.email
      });
    }

    if (user.status === "Disabled") {
      return res.status(403).json({ message: "Account disabled" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || "secretkey",
      { expiresIn: "1d" }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber || "",
        avatar: user.avatar || "",
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/resend-verification-otp", async (req, res) => {
  try {
    if (!isEmailConfigured()) {
      return res.status(400).json({ message: "Email OTP is not configured on the server." });
    }

    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await normalizeUserRole(user);

    if (user.isVerified) {
      return res.status(400).json({ message: "Account is already verified" });
    }

    const otpFields = buildOtpFields("verify-email");
    user.otpCode = otpFields.otpCode;
    user.otpPurpose = otpFields.otpPurpose;
    user.otpExpiresAt = otpFields.otpExpiresAt;
    await user.save();

    await sendOtpEmail({
      to: user.email,
      name: user.name,
      otpCode: user.otpCode,
      subject: "Verify your account",
      intro: "Use this OTP code to verify your account."
    });

    res.json({ message: "Verification OTP sent to email" });
  } catch (error) {
    console.error("Resend verification OTP error:", error);
    res.status(500).json({ message: "Failed to send verification OTP email" });
  }
});

router.post("/verify-email", async (req, res) => {
  try {
    const { email, otpCode } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await normalizeUserRole(user);

    if (!isOtpValid(user, otpCode, "verify-email")) {
      return res.status(400).json({ message: "Invalid or expired OTP code" });
    }

    user.isVerified = true;
    user.status = "Active";
    user.otpCode = null;
    user.otpPurpose = null;
    user.otpExpiresAt = null;
    await user.save();

    res.json({ message: "Email verified successfully" });
  } catch (error) {
    console.error("Verify email error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    if (!isEmailConfigured()) {
      return res.status(400).json({ message: "Forgot password OTP is not configured on the server." });
    }

    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await normalizeUserRole(user);

    const otpFields = buildOtpFields("reset-password");
    user.otpCode = otpFields.otpCode;
    user.otpPurpose = otpFields.otpPurpose;
    user.otpExpiresAt = otpFields.otpExpiresAt;
    await user.save();

    await sendOtpEmail({
      to: user.email,
      name: user.name,
      otpCode: user.otpCode,
      subject: "Reset your password",
      intro: "Use this OTP code to reset your password."
    });

    res.json({ message: "Password reset OTP sent to email" });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Failed to send password reset OTP email" });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { email, otpCode, newPassword } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await normalizeUserRole(user);

    if (!validatePassword(newPassword)) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters and include uppercase, lowercase, and number."
      });
    }

    if (!isOtpValid(user, otpCode, "reset-password")) {
      return res.status(400).json({ message: "Invalid or expired OTP code" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.otpCode = null;
    user.otpPurpose = null;
    user.otpExpiresAt = null;
    await user.save();

    res.json({ message: "Password reset successful" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
