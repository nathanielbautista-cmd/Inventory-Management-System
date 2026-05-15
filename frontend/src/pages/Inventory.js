import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  FaBoxes,
  FaMoneyBillWave,
  FaSearch,
  FaFileDownload,
  FaExclamationTriangle
} from "react-icons/fa";
import "./Inventory.css";

function Inventory() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [fetchError, setFetchError] = useState("");

  useEffect(() => {
    fetchInventory();

    const handleRefresh = () => {
      if (document.visibilityState === "visible") {
        fetchInventory();
      }
    };

    window.addEventListener("focus", handleRefresh);
    document.addEventListener("visibilitychange", handleRefresh);

    return () => {
      window.removeEventListener("focus", handleRefresh);
      document.removeEventListener("visibilitychange", handleRefresh);
    };
  }, []);

  const fetchInventory = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/inventory", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      setProducts(res.data);
      setFetchError("");
      setLoading(false);
    } catch (err) {
      console.error("Error fetching inventory:", err);
      setFetchError("Could not refresh inventory. Retrying when the page becomes active.");
      setLoading(false);
    }
  };

  
  const handleExport = () => {
    if (products.length === 0) {
      alert("No data available to export");
      return;
    }

    
    const headers = ["Product Name", "Category", "Price", "Stock Level"];

    
    const csvRows = products.map((p) => [
      `"${p.name}"`,
      `"${p.category}"`,
      p.price,
      p.stock
    ].join(","));

    
    const csvContent = [headers.join(","), ...csvRows].join("\n");

    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Inventory_Report_${new Date().toLocaleDateString()}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  
  const totalValue = products.reduce((acc, p) => acc + (p.price * p.stock), 0);
  const lowStockCount = products.filter((p) => p.stock > 0 && p.stock <= 10).length;

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="loader-container"><div className="spinner"></div></div>;

  return (
    <div className="inv-dashboard">
      <div className="inv-container">
        {/* Header Area */}
        <div className="inv-header">
          <div>
            <h1>Inventory</h1>

          </div>
          <button className="export-btn" onClick={handleExport}>
            <FaFileDownload /> Export Report
          </button>
        </div>

        {/* Analytics Grid */}
        <div className="analytics-grid">
          <div className="stat-card">
            <div className="stat-icon blue"><FaBoxes /></div>
            <div className="stat-info">
              <span>Total Items</span>
              <h3>{products.length}</h3>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green"><FaMoneyBillWave /></div>
            <div className="stat-info">
              <span>Inventory Value</span>
              <h3>PHP {totalValue.toLocaleString()}</h3>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon orange"><FaExclamationTriangle /></div>
            <div className="stat-info">
              <span>Low Stock Alerts</span>
              <h3 className={lowStockCount > 0 ? "warning-text" : ""}>{lowStockCount}</h3>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="inv-actions">
          <div className="inv-search">
            <FaSearch />
            <input
              type="text"
              placeholder="Quick search by name or category..."
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {fetchError && <p style={{ color: "#b91c1c", marginBottom: "12px" }}>{fetchError}</p>}

        {/* Table View */}
        <div className="inv-table-card">
          <table className="inv-table">
            <thead>
              <tr>
                <th>Product Details</th>
                <th>Category</th>
                <th>Unit Price</th>
                <th>Current Stock</th>
                <th>Health Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((p) => (
                <tr key={p._id}>
                  <td className="font-bold">{p.name}</td>
                  <td><span className="cat-badge">{p.category}</span></td>
                  <td>PHP {p.price.toLocaleString()}</td>
                  <td>
                    <div className="stock-level-cell">
                      <strong>{p.stock}</strong>
                      <div className="stock-bar-bg">
                        <div
                          className={`stock-bar-fill ${p.stock <= 10 ? "low" : "ok"}`}
                          style={{ width: `${Math.min((p.stock / 100) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td>
                    {p.stock > 10 ? (
                      <span className="status-pill verified">In Stock</span>
                    ) : p.stock > 0 ? (
                      <span className="status-pill warning">Low Stock</span>
                    ) : (
                      <span className="status-pill danger">Out of Stock</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Inventory;
