import React, { useState } from "react";
import "./Admin.css";
import Dashboard from "./Dashboard";
import ManageUsers from "./ManageUsers";
import ManageProducts from "./ManageProducts";
import Inventory from "./Inventory";
import InventoryRecords from "./InventoryRecords";
import Sales from "./Sales";
import ProfileModal from "../components/ProfileModal";

function AdminDashboard() {
  const [activePage, setActivePage] = useState("dashboard");
  const [showInventoryMenu, setShowInventoryMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [userProfile, setUserProfile] = useState({
    name: localStorage.getItem("userName") || "Administrator",
    email: localStorage.getItem("userEmail") || "",
    avatar: localStorage.getItem("userAvatar") || "",
  });
  const userInitial = userProfile.name.trim().charAt(0).toUpperCase() || "A";

  const handleInventoryMenuClick = () => {
    setShowInventoryMenu((current) => !current);
    setActivePage("inventory");
  };

  const renderContent = () => {
    switch (activePage) {
      case "dashboard":
        return <Dashboard onViewAllSales={() => setActivePage("sales")} />;
      case "products":
        return <ManageProducts />;
      case "inventory":
        return <Inventory />;
      case "inventory-records":
        return <InventoryRecords />;
      case "sales":
        return <Sales />;
      case "users":
        return <ManageUsers />;
      default:
        return <Dashboard onViewAllSales={() => setActivePage("sales")} />;
    }
  };

  return (
    <div className="dashboard">
      <div className="sidebar">
        <div>
          <button
            type="button"
            className="sidebar-user-card profile-trigger"
            onClick={() => setShowProfileModal(true)}
          >
            <div className="sidebar-user-avatar">
              {userProfile.avatar ? (
                <img src={userProfile.avatar} alt={userProfile.name} />
              ) : (
                userInitial
              )}
            </div>
            <div className="sidebar-user-meta">
              <strong>{userProfile.name}</strong>
              <span>{userProfile.email}</span>
              <small>Admin</small>
            </div>
          </button>

          <ul>
            <li
              className={activePage === "dashboard" ? "active" : ""}
              onClick={() => setActivePage("dashboard")}
            >
              📊 Dashboard
            </li>
            <li
              className={activePage === "users" ? "active" : ""}
              onClick={() => setActivePage("users")}
            >
              👥 Manage Users
            </li>
            <li
              className={activePage === "products" ? "active" : ""}
              onClick={() => setActivePage("products")}
            >
              🏷️ Manage Products
            </li>
            <li
              className={`sidebar-parent-item ${
                activePage === "inventory" || activePage === "inventory-records" ? "active" : ""
              }`}
              onClick={handleInventoryMenuClick}
            >
              <span>📦 View Inventory</span>
              <span className={`sidebar-caret ${showInventoryMenu ? "open" : ""}`}>▾</span>
            </li>
            {showInventoryMenu ? (
              <li
                className={`sidebar-sub-item ${activePage === "inventory-records" ? "active" : ""}`}
                onClick={() => setActivePage("inventory-records")}
              >
                📋 Record List
              </li>
            ) : null}
            <li
              className={activePage === "sales" ? "active" : ""}
              onClick={() => setActivePage("sales")}
            >
              💰 View Sales Records
            </li>
          </ul>
        </div>

        <button
          className="logout-btnn"
          onClick={() => {
            localStorage.clear();
            window.location.href = "/";
          }}
        >
          🚪 Logout
        </button>
      </div>

      <div className="main">
        <div className="page-content">{renderContent()}</div>
      </div>

      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        roleLabel="System Admin"
        onProfileSaved={(updatedUser) =>
          setUserProfile({
            name: updatedUser.name || "Administrator",
            email: updatedUser.email || "",
            avatar: updatedUser.avatar || "",
          })
        }
      />
    </div>
  );
}

export default AdminDashboard;
