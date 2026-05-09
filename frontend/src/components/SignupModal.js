import React, { useState } from "react";
import axios from "axios";

function SignupModal({ onClose, onSuccess }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");

  const token = localStorage.getItem("token");
  const config = {
    headers: { Authorization: `Bearer ${token}` },
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        "http://localhost:5000/api/auth/signup",
        { name, email, password, role },
        config
      );

      alert("User created successfully!");
      onSuccess();  // refresh user list
      onClose();    // close modal
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "Signup failed");
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
    >
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
      >
        <h2>Create User</h2>
        <form onSubmit={handleSignup}>
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            required
          >
            <option value="" disabled>Select Role</option>
            <option value="admin">Admin</option>
            <option value="inventory">Inventory Staff</option>
            <option value="cashier">Cashier / POS</option>
          </select>
          <div className="modal-buttons">
            <button type="submit">Create</button>
            <button type="button" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SignupModal;
