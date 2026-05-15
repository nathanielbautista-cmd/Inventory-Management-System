import React, { useEffect, useState } from "react";
import axios from "axios";
import { FaUserPlus, FaSearch, FaUserEdit, FaTrashAlt, FaTimes, FaShieldAlt, FaCheckCircle, FaExclamationCircle } from "react-icons/fa";
import "./ManageUsers.css";

const formatRoleLabel = (role) => {
  const normalizedRole = (role || "").trim().toLowerCase();

  if (normalizedRole === "admin") return "System Admin";
  if (normalizedRole === "inventory" || normalizedRole === "staff") {
    return "Inventory Staff";
  }
  if (normalizedRole === "cashier" || normalizedRole === "pos") {
    return "Cashier";
  }

  return role || "Unknown";
};

const isStrongPassword = (password) =>
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{8,}$/.test(password);

function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [deleteUser, setDeleteUser] = useState(null);
  const [fetchError, setFetchError] = useState("");
  const [feedback, setFeedback] = useState({ message: "", type: "", visible: false });

  const showFeedback = (msg, type = "success") => {
    setFeedback({ message: msg, type, visible: true });
    setTimeout(() => {
      setFeedback(prev => ({ ...prev, visible: false }));
    }, 4000);
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.get("http://localhost:5000/api/users", config);
      setUsers(Array.isArray(res.data) ? res.data : []);
      setFetchError("");
    } catch (error) {
      console.error("Fetch failed", error);
      setFetchError("Could not refresh users. Retrying when the page becomes active.");
    }
  };

  useEffect(() => {
    fetchUsers();

    const handleRefresh = () => {
      if (document.visibilityState === "visible") {
        fetchUsers();
      }
    };

    window.addEventListener("focus", handleRefresh);
    document.addEventListener("visibilitychange", handleRefresh);

    return () => {
      window.removeEventListener("focus", handleRefresh);
      document.removeEventListener("visibilitychange", handleRefresh);
    };
  }, []);

  const filteredUsers = users.filter(user => 
    (user.name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) || 
    (user.email?.toLowerCase() || "").includes(searchTerm.toLowerCase())
  );

  const handleUpdate = async (id, status) => {
    try {
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.put(`http://localhost:5000/api/users/${id}`, { status }, config);
      showFeedback("User status updated successfully!", "success");
      fetchUsers();
      setEditUser(null);
    } catch (error) { 
      showFeedback("Failed to update user.", "error");
    }
  };

  const handleConfirmDelete = async (id) => {
    try {
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.delete(`http://localhost:5000/api/users/${id}`, config);
      showFeedback("User has been removed.", "success");
      fetchUsers();
      setDeleteUser(null);
    } catch (error) { 
      showFeedback("Could not delete user.", "error");
    }
  };

  return (
     <div className="manage-wrapper">
    <div className={`toast-wrapper ${feedback.visible ? "show" : ""}`}>
      <div className={`toast-notification ${feedback.type}`}>
        {feedback.type === "success" ? <FaCheckCircle /> : <FaExclamationCircle />}
        <span>{feedback.message}</span>
      </div>
    </div>

    <div className="manage-header">
    </div>

      <div className="manage-users-content">
        <div className="admin-header">
          <div>
            <h1>User Control Center</h1>
          </div>
          <button className="imp-btn-primary" onClick={() => setShowAddModal(true)}>
            <FaUserPlus /> <span>Create User</span>
          </button>
        </div>

        <div className="action-bar">
          <div className="search-box">
            <FaSearch className="search-icon" />
            <input 
              type="text" 
              placeholder="Search by name or email..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="user-stats">
            Total Users: <strong>{users.length}</strong>
          </div>
        </div>

        {fetchError && <p style={{ color: "#b91c1c", marginBottom: "12px" }}>{fetchError}</p>}

        <div className="table-card">
          <table className="imp-table">
            <thead>
              <tr>
                <th>Profile</th>
                <th>Role</th>
                <th>Status</th>
                <th>Date Joined</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user._id}>
                  <td>
                    <div className="user-profile-cell">
                      <div className="user-avatar">{user.name ? user.name.charAt(0) : "?"}</div>
                      <div className="user-info">
                        <span className="user-name">{user.name || "N/A"}</span>
                        <span className="user-email">{user.email}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`role-tag ${user.role === "staff" ? "inventory" : user.role}`}>
                      {formatRoleLabel(user.role)}
                    </span>
                  </td>
                  <td>
                    <span className={`status-pill ${user.status?.toLowerCase() || 'active'}`}>
                      {user.status || "Active"}
                    </span>
                  </td>
                  <td>{user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : "---"}</td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn-edit" title="Edit" onClick={() => setEditUser(user)}>
                        <FaUserEdit />
                      </button>
                      <button className="btn-delete" title="Delete" onClick={() => setDeleteUser(user)}>
                        <FaTrashAlt />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredUsers.length === 0 && <p style={{textAlign: 'center', padding: '20px'}}>No users found.</p>}
        </div>
      </div>

      {showAddModal && (
        <SignupModal 
          onClose={() => setShowAddModal(false)} 
          onSuccess={(msg) => { fetchUsers(); showFeedback(msg, "success"); }} 
          onError={(msg) => showFeedback(msg, "error")}
          existingUsers={users} 
        />
      )}
      {editUser && <EditModal user={editUser} onClose={() => setEditUser(null)} onUpdate={handleUpdate} />}
      {deleteUser && <DeleteModal user={deleteUser} onClose={() => setDeleteUser(null)} onDelete={handleConfirmDelete} />}
    </div>
  );
}

const SignupModal = ({ onClose, onSuccess, onError, existingUsers }) => {
  const [formData, setFormData] = useState({ name: "", email: "", password: "", role: "inventory" });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const emailExists = existingUsers.some(u => u.email.toLowerCase() === formData.email.toLowerCase());
    if (emailExists) {
      onError("This email is already in use.");
      return;
    }

    if (!isStrongPassword(formData.password)) {
      onError("Password must be at least 8 characters and include uppercase, lowercase, and number.");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.post("http://localhost:5000/api/users/create", formData, config);
      onSuccess("New user account created. OTP will be sent when the user logs in."); 
      onClose();
    } catch (error) { 
      onError(error.response?.data?.message || "Server error during creation."); 
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="imp-modal-overlay">
      <div className="imp-modal-card">
        <div className="modal-header">
          <h3>Create New User</h3>
          <FaTimes className="close-icon" onClick={onClose} />
        </div>
        <form onSubmit={submit} className="modal-form">
          <input type="text" placeholder="Name" required onChange={e => setFormData({...formData, name: e.target.value})} />
          <input type="email" placeholder="Email Address" required onChange={e => setFormData({...formData, email: e.target.value})} />
          <input type="password" placeholder=" Password" required onChange={e => setFormData({...formData, password: e.target.value})} />
          <p style={{ margin: "-6px 0 8px", fontSize: "0.8rem", color: "#64748b" }}>
            Use at least 8 characters with uppercase, lowercase, and number.
          </p>
          <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
            <option value="admin">System Admin</option>
            <option value="inventory">Inventory Staff</option>
            <option value="cashier">Cashier / POS</option>
          </select>
          <button type="submit" className="imp-btn-primary full-width" disabled={loading}>
            {loading ? "Processing..." : "Create User"}
          </button>
        </form>
      </div>
    </div>
  );
};

const EditModal = ({ user, onClose, onUpdate }) => {
    const [status, setStatus] = useState(user.status || "Active");
    return (
      <div className="imp-modal-overlay">
        <div className="imp-modal-card small">
          <h3>Update Access</h3>
          <p>Modify status for <strong>{user.name}</strong></p>
          <select value={status} className="modal-select" onChange={(e) => setStatus(e.target.value)}>
            <option value="Active">Active</option>
            <option value="Disabled">Disabled (No Access)</option>
          </select>
          <div className="modal-footer">
            <button className="imp-btn-secondary" onClick={onClose}>Cancel</button>
            <button className="imp-btn-primary" onClick={() => onUpdate(user._id, status)}>Save Changes</button>
          </div>
        </div>
      </div>
    );
};

const DeleteModal = ({ user, onClose, onDelete }) => (
    <div className="imp-modal-overlay">
      <div className="imp-modal-card small danger">
        <FaShieldAlt className="danger-icon" />
        <h3>Delete User</h3>
        <p>This action is permanent. Are you sure you want to remove <strong>{user.name}</strong>?</p>
        <div className="modal-footer">
          <button className="imp-btn-secondary" onClick={onClose}>Cancel</button>
          <button className="imp-btn-danger" onClick={() => onDelete(user._id)}>Confirm Delete</button>
        </div>
      </div>
    </div>
);

export default ManageUsers;
