import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { FaChevronRight, FaEnvelope, FaLock, FaUser } from "react-icons/fa";
import "./AdminSetup.css";

const API_BASE_URL = "http://localhost:5000/api";

function AdminSetup() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [status, setStatus] = useState("checking");
  const [pendingEmail, setPendingEmail] = useState("");
  const [emailConfigured, setEmailConfigured] = useState(true);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("error");
  const [loading, setLoading] = useState(false);

  const applyAuth = (data) => {
    localStorage.setItem("token", data.token);
    localStorage.setItem("userId", data.user.id || "");
    localStorage.setItem("role", data.user.role || "admin");
    localStorage.setItem("userName", data.user.name || "");
    localStorage.setItem("userEmail", data.user.email || "");
    localStorage.setItem("userPhoneNumber", data.user.phoneNumber || "");
    localStorage.setItem("userAvatar", data.user.avatar || "");
  };

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/auth/admin-setup-status`);
        setEmailConfigured(Boolean(res.data.emailConfigured));
        setPendingEmail(res.data.pendingAdminEmail || "");

        if (res.data.mode === "pending-verification") {
          setStatus("verify");
          setEmail(res.data.pendingAdminEmail || "");
          return;
        }

        if (res.data.mode === "available") {
          setStatus("available");
          return;
        }

        setStatus("closed");
      } catch (error) {
        console.error(error);
        setStatus("error");
        setMessage("Could not check admin setup status.");
        setMessageType("error");
      }
    };

    checkStatus();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      setMessageType("error");
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post(`${API_BASE_URL}/auth/setup-admin`, {
        name,
        email,
        password,
      });

      setMessage(res.data.message || "Check your email for the OTP code.");
      setMessageType("success");
      setPendingEmail(res.data.email || email);
      setEmail(res.data.email || email);
      setStatus("verify");
    } catch (error) {
      const data = error.response?.data;
      setMessage(data?.message || "Failed to create admin account.");
      setMessageType("error");

      if (data?.requiresVerification) {
        setPendingEmail(data.email || email);
        setEmail(data.email || email);
        setStatus("verify");
      } else if (error.response?.status === 403) {
        setStatus("closed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      setLoading(true);
      const res = await axios.post(`${API_BASE_URL}/auth/setup-admin/verify`, {
        email,
        otpCode,
      });

      applyAuth(res.data);
      navigate("/admin", { replace: true });
    } catch (error) {
      setMessage(error.response?.data?.message || "Could not verify email.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setMessage("");

    try {
      setLoading(true);
      const res = await axios.post(`${API_BASE_URL}/auth/setup-admin/resend-otp`, {
        email: email || pendingEmail,
      });
      setMessage(res.data.message || "Verification OTP sent.");
      setMessageType("success");
    } catch (error) {
      setMessage(error.response?.data?.message || "Could not resend OTP.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="imp-auth-page admin-setup-page">
      <div className="imp-auth-container">
        <div className="imp-brand-panel">
          <div className="imp-brand-content">
            <div className="imp-logo-space">Mini Mart Inventory System</div>
            <div className="imp-accent-line"></div>
            <h3>Create and verify the first administrator account for this deployment.</h3>
          </div>
          <div className="imp-gradient-orb 1"></div>
          <div className="imp-gradient-orb 2"></div>
        </div>

        <div className="imp-form-panel">
          <div className="imp-form-content">
            <div className="imp-form-header">
              <h2>Admin Setup</h2>
              <p>
                {status === "verify"
                  ? "Enter the OTP code sent to the admin email address."
                  : "This page works only until the first admin account exists."}
              </p>
            </div>

            {message ? (
              <div className={`imp-feedback-banner ${messageType}`}>
                {message}
              </div>
            ) : null}

            {status === "checking" ? (
              <p className="admin-setup-note">Checking setup availability...</p>
            ) : null}

            {status === "error" ? (
              <p className="admin-setup-note">Please try again in a moment.</p>
            ) : null}

            {status === "closed" ? (
              <div className="admin-setup-closed">
                <p>The first admin account has already been created.</p>
                <Link to="/" className="admin-setup-link">
                  Back to login
                </Link>
              </div>
            ) : null}

            {status === "available" && !emailConfigured ? (
              <div className="admin-setup-closed">
                <p>Email OTP is not configured on the server yet.</p>
                <p className="admin-setup-note">
                  Add your SMTP settings in the backend `.env` before creating the first admin.
                </p>
                <Link to="/" className="admin-setup-link">
                  Back to login
                </Link>
              </div>
            ) : null}

            {status === "available" && emailConfigured ? (
              <form onSubmit={handleSubmit} className="imp-auth-form">
                <div className="imp-input-group">
                  <input
                    type="text"
                    id="setupName"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                  <label htmlFor="setupName">Full Name</label>
                  <FaUser className="imp-input-icon" />
                </div>

                <div className="imp-input-group">
                  <input
                    type="email"
                    id="setupEmail"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <label htmlFor="setupEmail">Email Address</label>
                  <FaUser className="imp-input-icon" />
                </div>

                <div className="imp-input-group">
                  <input
                    type="password"
                    id="setupPassword"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <label htmlFor="setupPassword">Password</label>
                  <FaLock className="imp-input-icon" />
                </div>

                <div className="imp-input-group">
                  <input
                    type="password"
                    id="setupConfirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <label htmlFor="setupConfirmPassword">Confirm Password</label>
                  <FaLock className="imp-input-icon" />
                </div>

                <p className="admin-setup-note">
                  Password must be at least 8 characters and include uppercase,
                  lowercase, and a number.
                </p>

                <button
                  type="submit"
                  className={`imp-login-btn ${loading ? "loading" : ""}`}
                  disabled={loading}
                >
                  {loading ? (
                    <div className="imp-spinner"></div>
                  ) : (
                    <>
                      Create Admin <FaChevronRight className="imp-btn-icon" />
                    </>
                  )}
                </button>

                <Link to="/" className="admin-setup-link">
                  Back to login
                </Link>
              </form>
            ) : null}

            {status === "verify" ? (
              <form onSubmit={handleVerify} className="imp-auth-form">
                <div className="imp-input-group">
                  <input
                    type="email"
                    id="verifyAdminEmail"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <label htmlFor="verifyAdminEmail">Email Address</label>
                  <FaUser className="imp-input-icon" />
                </div>

                <div className="imp-input-group">
                  <input
                    type="text"
                    id="verifyAdminOtp"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    required
                  />
                  <label htmlFor="verifyAdminOtp">OTP Code</label>
                  <FaEnvelope className="imp-input-icon" />
                </div>

                <p className="admin-setup-note">
                  We sent a verification code to {pendingEmail || email}.
                </p>

                <button
                  type="submit"
                  className={`imp-login-btn ${loading ? "loading" : ""}`}
                  disabled={loading}
                >
                  {loading ? (
                    <div className="imp-spinner"></div>
                  ) : (
                    <>
                      Verify Email <FaChevronRight className="imp-btn-icon" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className="imp-btn-secondary-modal admin-setup-resend"
                  onClick={handleResendOtp}
                  disabled={loading}
                >
                  Resend OTP
                </button>

                <Link to="/" className="admin-setup-link">
                  Back to login
                </Link>
              </form>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminSetup;
