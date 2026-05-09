import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { FaUser, FaLock, FaEnvelope, FaChevronRight, FaTimes } from "react-icons/fa";
import "./Login.css";

const API_BASE_URL = "http://localhost:5000/api";

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetOtpCode, setResetOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [resetMessageType, setResetMessageType] = useState("error");
  const [resetOtpSent, setResetOtpSent] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState("");
  const [verifyOtpCode, setVerifyOtpCode] = useState("");
  const [verifyMessage, setVerifyMessage] = useState("");
  const [verifyMessageType, setVerifyMessageType] = useState("error");
  const [verifyOtpSent, setVerifyOtpSent] = useState(false);
  const [verifyEmailLocked, setVerifyEmailLocked] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [adminSetupAvailable, setAdminSetupAvailable] = useState(false);

  useEffect(() => {
    const checkAdminSetupStatus = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/auth/admin-setup-status`);
        setAdminSetupAvailable(Boolean(res.data.requiresSetup));
      } catch (err) {
        console.error(err);
      }
    };

    checkAdminSetupStatus();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address.");
      setLoading(false);
      return;
    }

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const res = await axios.post(`${API_BASE_URL}/auth/login`, {
        email,
        password,
      });

      const role = res.data.user.role?.trim().toLowerCase();
      const normalizedRole = role === "staff" ? "inventory" : role;
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("userId", res.data.user.id || "");
      localStorage.setItem("role", normalizedRole);
      localStorage.setItem("userName", res.data.user.name || "");
      localStorage.setItem("userEmail", res.data.user.email || "");
      localStorage.setItem("userPhoneNumber", res.data.user.phoneNumber || "");
      localStorage.setItem("userAvatar", res.data.user.avatar || "");

      if (normalizedRole === "admin") {
        navigate("/admin", { replace: true });
      } else if (normalizedRole === "inventory") {
        navigate("/inventory", { replace: true });
      } else if (normalizedRole === "cashier") {
        navigate("/pos", { replace: true });
      } else {
        setError("This account role is not supported.");
      }
    } catch (err) {
      const data = err.response?.data;

      if (data?.requiresVerification) {
        setVerifyEmail(data.email || email);
        setVerifyOtpCode("");
        setVerifyMessage(data.message);
        setVerifyOtpSent(true);
        setVerifyEmailLocked(true);
        setShowVerifyModal(true);
        setError("");
      } else {
        setError(data?.message || "Invalid email or password");
      }
    } finally {
      setLoading(false);
    }
  };

  const closeForgotModal = () => {
    setShowForgotModal(false);
    setResetEmail("");
    setResetOtpCode("");
    setNewPassword("");
    setResetMessage("");
    setResetMessageType("error");
    setResetOtpSent(false);
  };

  const closeVerifyModal = () => {
    setShowVerifyModal(false);
    setVerifyEmail("");
    setVerifyOtpCode("");
    setVerifyMessage("");
    setVerifyMessageType("error");
    setVerifyOtpSent(false);
    setVerifyEmailLocked(false);
  };

  const handleRequestResetOtp = async () => {
    if (!resetEmail) {
      setResetMessage("Please enter your email address first.");
      setResetMessageType("error");
      return;
    }

    try {
      const res = await axios.post(`${API_BASE_URL}/auth/forgot-password`, {
        email: resetEmail,
      });
      setResetOtpSent(true);
      setResetMessage(res.data.message || "OTP code sent. Check your email.");
      setResetMessageType("success");
    } catch (error) {
      setResetMessage(error.response?.data?.message || "User not found or server error");
      setResetMessageType("error");
    }
  };

  const handleResetPassword = async () => {
    try {
      const res = await axios.post(`${API_BASE_URL}/auth/reset-password`, {
        email: resetEmail,
        otpCode: resetOtpCode,
        newPassword,
      });
      setResetMessage(res.data.message || "Password reset successful. You can now sign in.");
      setResetMessageType("success");
      setResetOtpCode("");
      setNewPassword("");
      setResetOtpSent(false);
    } catch (error) {
      setResetMessage(error.response?.data?.message || "Could not reset password");
      setResetMessageType("error");
    }
  };

  const handleRequestVerificationOtp = async () => {
    if (!verifyEmail) {
      setVerifyMessage("Please enter your email address first.");
      setVerifyMessageType("error");
      return;
    }

    try {
      const res = await axios.post(`${API_BASE_URL}/auth/resend-verification-otp`, {
        email: verifyEmail,
      });
      setVerifyOtpSent(true);
      setVerifyMessage(res.data.message || "Verification OTP sent. Check your email.");
      setVerifyMessageType("success");
    } catch (error) {
      setVerifyMessage(error.response?.data?.message || "Could not send verification OTP");
      setVerifyMessageType("error");
    }
  };

  const handleVerifyEmail = async () => {
    try {
      const res = await axios.post(`${API_BASE_URL}/auth/verify-email`, {
        email: verifyEmail,
        otpCode: verifyOtpCode,
      });
      setVerifyMessage(res.data.message || "Email verified successfully. You can now sign in.");
      setVerifyMessageType("success");
      setVerifyOtpCode("");
      setVerifyOtpSent(false);
      setVerifyEmailLocked(false);
    } catch (error) {
      setVerifyMessage(error.response?.data?.message || "Could not verify email");
      setVerifyMessageType("error");
    }
  };

  return (
    <div className="imp-auth-page">
      <div className="imp-auth-container">
        <div className="imp-brand-panel">
          <div className="imp-brand-content">
            <div className="imp-logo-space">Mini Mart Inventory System</div>
            <div className="imp-accent-line"></div>
            <h3>Access your dashboard and manage operations with precision and speed.</h3>
          </div>
          <div className="imp-gradient-orb 1"></div>
          <div className="imp-gradient-orb 2"></div>
        </div>

        <div className="imp-form-panel">
          <div className="imp-form-content">
            <div className="imp-form-header">
              <h2> Login Now</h2>
              <p>Welcome back! Please enter your details.</p>
            </div>

            {error && <div className="imp-error-banner">{error}</div>}

            <form onSubmit={handleLogin} className="imp-auth-form">
              <div className="imp-input-group">
                <input
                  type="email"
                  id="loginEmail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={error ? "imp-input-error" : ""}
                  required
                />
                <label htmlFor="loginEmail">Email Address</label>
                <FaUser className="imp-input-icon" />
              </div>

              <div className="imp-input-group imp-password-group">
                <input
                  type={showPassword ? "text" : "password"}
                  id="loginPassword"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <label htmlFor="loginPassword">Password</label>
                <FaLock className="imp-input-icon" />
                <span
                  className="imp-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "HIDE" : "SHOW"}
                </span>
              </div>

              <div className="imp-form-options">
                <span className="imp-forgot-link" onClick={() => setShowForgotModal(true)}>
                  Forgot Password?
                </span>
              </div>

              <button type="submit" className={`imp-login-btn ${loading ? "loading" : ""}`} disabled={loading}>
                {loading ? (
                  <div className="imp-spinner"></div>
                ) : (
                  <>
                    Sign In <FaChevronRight className="imp-btn-icon" />
                  </>
                )}
              </button>

              {adminSetupAvailable ? (
                <div className="imp-admin-setup-cta">
                  <span>Need to create the first admin account?</span>
                  <Link to="/setup-admin" className="imp-inline-link">
                    Sign up as admin
                  </Link>
                </div>
              ) : null}
            </form>

            <div className="imp-footer-text"></div>
          </div>
        </div>
      </div>

      {showForgotModal && (
        <div className="imp-modal-overlay">
          <div className="imp-modal-content">
            <button className="imp-modal-close" onClick={closeForgotModal}><FaTimes /></button>
            <div className="imp-modal-header">
              <FaEnvelope className="imp-modal-icon" />
              <h3>Reset Your Password</h3>
              <p>Enter your email, get the OTP code, then set a new password.</p>
            </div>

            <input
              type="email"
              placeholder="E.g. jane.doe@company.com"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              className="imp-modal-input"
            />

            {resetOtpSent && (
              <>
                <input
                  type="text"
                  placeholder="Enter OTP code"
                  value={resetOtpCode}
                  onChange={(e) => setResetOtpCode(e.target.value)}
                  className="imp-modal-input"
                />
                <input
                  type="password"
                  placeholder="New password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="imp-modal-input"
                />
              </>
            )}

            {resetMessage && (
              <div
                className={
                  resetMessageType === "success"
                    ? "imp-feedback-banner success"
                    : "imp-feedback-banner error"
                }
              >
                {resetMessage}
              </div>
            )}

            <div className="imp-modal-actions">
              {!resetOtpSent ? (
                <button type="button" className="imp-btn-confirm" onClick={handleRequestResetOtp}>
                  Send OTP Code
                </button>
              ) : (
                <button type="button" className="imp-btn-confirm" onClick={handleResetPassword}>
                  Reset Password
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showVerifyModal && (
        <div className="imp-modal-overlay">
          <div className="imp-modal-content">
            <button className="imp-modal-close" onClick={closeVerifyModal}><FaTimes /></button>
            <div className="imp-modal-header">
              <FaEnvelope className="imp-modal-icon" />
              <h3>Verify Your Email</h3>
              <p>{verifyEmailLocked ? "Enter the OTP code sent after your login attempt." : "Enter your email, request the OTP code, then verify your account."}</p>
            </div>

            {!verifyEmailLocked && (
              <input
                type="email"
                placeholder="E.g. jane.doe@company.com"
                value={verifyEmail}
                onChange={(e) => setVerifyEmail(e.target.value)}
                className="imp-modal-input"
              />
            )}

            {verifyOtpSent && (
              <input
                type="text"
                placeholder="Enter OTP code"
                value={verifyOtpCode}
                onChange={(e) => setVerifyOtpCode(e.target.value)}
                className="imp-modal-input"
              />
            )}

            {verifyMessage && (
              <div
                className={
                  verifyMessageType === "success"
                    ? "imp-feedback-banner success"
                    : "imp-feedback-banner error"
                }
              >
                {verifyMessage}
              </div>
            )}

            <div className="imp-modal-actions stacked">
              {!verifyOtpSent ? (
                <button type="button" className="imp-btn-confirm" onClick={handleRequestVerificationOtp}>
                  Send Verification OTP
                </button>
              ) : (
                <>
                  <button type="button" className="imp-btn-confirm" onClick={handleVerifyEmail}>
                    Verify Email
                  </button>
                  <button type="button" className="imp-btn-secondary-modal" onClick={handleRequestVerificationOtp}>
                    Resend Code
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Login;
