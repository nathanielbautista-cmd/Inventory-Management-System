import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { FaCamera, FaLock, FaTimes, FaUserCircle } from "react-icons/fa";
import "./ProfileModal.css";

function ProfileModal({ isOpen, onClose, roleLabel, onProfileSaved }) {
  const [profile, setProfile] = useState(null);
  const [accountForm, setAccountForm] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    avatar: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [accountMessage, setAccountMessage] = useState({ text: "", type: "" });
  const [passwordMessage, setPasswordMessage] = useState({ text: "", type: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("http://localhost:5000/api/users/me", {
          headers: { Authorization: `Bearer ${token}` },
        });

        setProfile(res.data);
        setAccountForm({
          name: res.data.name || "",
          email: res.data.email || "",
          phoneNumber: res.data.phoneNumber || "",
          avatar: res.data.avatar || "",
        });
        setAccountMessage({ text: "", type: "" });
        setPasswordMessage({ text: "", type: "" });
      } catch (error) {
        setAccountMessage({
          text: error.response?.data?.message || "Could not load profile details.",
          type: "error",
        });
      }
    };

    fetchProfile();
  }, [isOpen]);

  if (!isOpen) return null;

  const avatarInitial = (accountForm.name || profile?.name || "U")
    .trim()
    .charAt(0)
    .toUpperCase();

  const triggerUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setAccountMessage({ text: "Please upload an image file.", type: "error" });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAccountForm((current) => ({
        ...current,
        avatar: typeof reader.result === "string" ? reader.result : "",
      }));
      setAccountMessage({ text: "", type: "" });
    };
    reader.readAsDataURL(file);
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setAccountMessage({ text: "", type: "" });

    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(
        "http://localhost:5000/api/users/me/profile",
        {
          name: accountForm.name,
          phoneNumber: accountForm.phoneNumber,
          avatar: accountForm.avatar,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const updatedUser = res.data.user;
      setProfile(updatedUser);
      localStorage.setItem("userName", updatedUser.name || "");
      localStorage.setItem("userEmail", updatedUser.email || "");
      localStorage.setItem("userPhoneNumber", updatedUser.phoneNumber || "");
      localStorage.setItem("userAvatar", updatedUser.avatar || "");
      setAccountMessage({
        text: res.data.message || "Profile updated successfully.",
        type: "success",
      });

      if (onProfileSaved) {
        onProfileSaved(updatedUser);
      }
    } catch (error) {
      setAccountMessage({
        text: error.response?.data?.message || "Could not update profile.",
        type: "error",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    setSavingPassword(true);
    setPasswordMessage({ text: "", type: "" });

    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(
        "http://localhost:5000/api/users/me/password",
        passwordForm,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setPasswordMessage({
        text: res.data.message || "Password updated successfully.",
        type: "success",
      });
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      setPasswordMessage({
        text: error.response?.data?.message || "Could not change password.",
        type: "error",
      });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="profile-modal-overlay" onClick={onClose}>
      <div
        className="profile-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="profile-modal-header">
          <div>
            <h3>My Profile</h3>
      
          </div>
          <button
            type="button"
            className="profile-modal-close"
            onClick={onClose}
            aria-label="Close profile modal"
          >
            <FaTimes />
          </button>
        </div>

        <div className="profile-modal-body">
          <section className="profile-summary-panel">
            <div className="profile-avatar-stack">
              <div className="profile-avatar-large">
                {accountForm.avatar ? (
                  <img src={accountForm.avatar} alt={accountForm.name} />
                ) : (
                  <span>{avatarInitial}</span>
                )}
              </div>
              <button
                type="button"
                className="profile-avatar-upload"
                onClick={triggerUpload}
              >
                <FaCamera />
                <span>Upload Picture</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                hidden
              />
            </div>

            <div className="profile-summary-copy">
              <small className="profile-summary-eyebrow">Account Settings</small>
              <h3>{accountForm.name || "User"}</h3>
              <p>{accountForm.email || "No email available"}</p>
              <div className="profile-summary-meta">
                <span>{roleLabel}</span>
                {accountForm.phoneNumber ? <span>{accountForm.phoneNumber}</span> : null}
              </div>
            </div>
          </section>

          <div className="profile-detail-panels">
            <section className="profile-detail-panel">
              <div className="panel-title">
                <FaUserCircle />
                <div>
                  <small className="panel-kicker">Profile</small>
                  <h3>Account Info</h3>
                  <p>Update your personal details and profile photo.</p>
                </div>
              </div>

              <form onSubmit={handleProfileSave} className="profile-form">
                <label>
                  <span>Name</span>
                  <input
                    type="text"
                    value={accountForm.name}
                    onChange={(e) =>
                      setAccountForm((current) => ({
                        ...current,
                        name: e.target.value,
                      }))
                    }
                    required
                  />
                </label>

                <label>
                  <span>Email</span>
                  <input type="email" value={accountForm.email} disabled />
                </label>

                <label>
                  <span>Phone Number</span>
                  <input
                    type="text"
                    value={accountForm.phoneNumber}
                    onChange={(e) =>
                      setAccountForm((current) => ({
                        ...current,
                        phoneNumber: e.target.value,
                      }))
                    }
                    placeholder="e.g. 09123456789"
                  />
                </label>

                {accountMessage.text ? (
                  <p className={`profile-form-message ${accountMessage.type}`}>
                    {accountMessage.text}
                  </p>
                ) : null}

                <div className="profile-form-actions">
                  <button
                    type="submit"
                    className="profile-primary-btn"
                    disabled={savingProfile}
                  >
                    {savingProfile ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </section>

            <section className="profile-detail-panel security-panel">
              <div className="panel-title">
                <FaLock />
                <div>
                  <small className="panel-kicker">Security</small>
                  <h3>Security</h3>
                  <p>Change your password and keep access to your account protected.</p>
                </div>
              </div>

              <form onSubmit={handlePasswordSave} className="profile-form">
                <label>
                  <span>Current Password</span>
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) =>
                      setPasswordForm((current) => ({
                        ...current,
                        currentPassword: e.target.value,
                      }))
                    }
                    required
                  />
                </label>

                <label>
                  <span>New Password</span>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) =>
                      setPasswordForm((current) => ({
                        ...current,
                        newPassword: e.target.value,
                      }))
                    }
                    required
                  />
                </label>

                <label>
                  <span>Confirm New Password</span>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) =>
                      setPasswordForm((current) => ({
                        ...current,
                        confirmPassword: e.target.value,
                      }))
                    }
                    required
                  />
                </label>

                {passwordMessage.text ? (
                  <p className={`profile-form-message ${passwordMessage.type}`}>
                    {passwordMessage.text}
                  </p>
                ) : null}

                <div className="profile-form-actions">
                  <button
                    type="submit"
                    className="profile-primary-btn security-btn"
                    disabled={savingPassword}
                  >
                    {savingPassword ? "Updating..." : "Update Password"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfileModal;
