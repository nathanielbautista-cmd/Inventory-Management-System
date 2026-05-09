import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import StaffDashboard from "./pages/StaffDashboard";
import POS from "./pages/POS";
import InventoryAudit from "./pages/InventoryAudit";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Navigate to="/" replace />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/staff" element={<Navigate to="/" replace />} />
        <Route path="/inventory" element={<StaffDashboard />}>
          <Route index element={<InventoryAudit />} />
        </Route>
        <Route path="/pos" element={<StaffDashboard />}>
          <Route index element={<POS />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
