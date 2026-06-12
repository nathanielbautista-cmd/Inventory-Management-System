import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { FaExchangeAlt, FaPlus, FaMinus } from "react-icons/fa";
import API_BASE_URL from "../config/api";
import "./Inventory.css";

const getDateInputValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const isRecordInDateRange = (record, dateFrom, dateTo) => {
  const recordDate = record.date || record.createdAt ? new Date(record.date || record.createdAt) : null;

  if (!recordDate || Number.isNaN(recordDate.getTime())) {
    return false;
  }

  if (dateFrom) {
    const fromDate = new Date(`${dateFrom}T00:00:00`);
    if (recordDate < fromDate) return false;
  }

  if (dateTo) {
    const toDate = new Date(`${dateTo}T23:59:59`);
    if (recordDate > toDate) return false;
  }

  return true;
};

const formatMovementNotes = (movement) => {
  const isSale = String(movement.transactionType || "")
    .toLowerCase()
    .includes("sale");
  const notes = movement.notes || "";

  if (!isSale) {
    return notes || "-";
  }

  const cleanedNotes = notes
    .replace(/\btransaction\s*(id|#|no\.?)?\s*[:#-]?\s*[a-f0-9]{24}\b/gi, "")
    .replace(/\b[a-f0-9]{24}\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,;:])/g, "$1")
    .replace(/[-:,\s]+$/g, "")
    .trim();

  return cleanedNotes && !/^sale transaction$/i.test(cleanedNotes)
    ? cleanedNotes
    : "Sale completed";
};

function StockMovements() {
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [formData, setFormData] = useState({
    productId: "",
    quantity: "",
    transactionType: "stock-in",
    notes: "",
  });
  const [message, setMessage] = useState("");
  const [dateFrom, setDateFrom] = useState(() => {
    const start = new Date();
    start.setDate(start.getDate() - 29);
    return getDateInputValue(start);
  });
  const [dateTo, setDateTo] = useState(() => getDateInputValue(new Date()));

  const token = localStorage.getItem("token");

  const fetchData = useCallback(async () => {
    const authConfig = {
      headers: { Authorization: `Bearer ${token}` },
    };
    const [productsRes, movementsRes] = await Promise.all([
      axios.get(`${API_BASE_URL}/products`, authConfig),
      axios.get(`${API_BASE_URL}/stock-movements`, authConfig),
    ]);
    setProducts(Array.isArray(productsRes.data) ? productsRes.data : []);
    setMovements(Array.isArray(movementsRes.data) ? movementsRes.data : []);
  }, [token]);

  useEffect(() => {
    fetchData().catch(() => setMessage("Could not load stock movement data."));
  }, [fetchData]);

  const filteredMovements = movements.filter((movement) =>
    isRecordInDateRange(movement, dateFrom, dateTo)
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");

    try {
      const authConfig = {
        headers: { Authorization: `Bearer ${token}` },
      };
      await axios.post(
        `${API_BASE_URL}/stock-movements/${formData.transactionType}`,
        {
          productId: formData.productId,
          quantity: formData.quantity,
          notes: formData.notes,
        },
        authConfig
      );
      setFormData({ productId: "", quantity: "", transactionType: "stock-in", notes: "" });
      setMessage("Stock movement recorded.");
      fetchData();
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to record stock movement.");
    }
  };

  return (
    <div className="inv-dashboard">
      <div className="inv-container">
        <div className="inv-header">
          <div>
            <h1>Stock Movements</h1>
          </div>
          <div className="inventory-header-actions">
            <div className="inventory-date-range">
              <label>
                <span>From</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                />
              </label>
              <label>
                <span>To</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                />
              </label>
            </div>
            <div className="records-summary-badge">
              <FaExchangeAlt />
              <span>{filteredMovements.length} Records</span>
            </div>
          </div>
        </div>

        {message && <p style={{ color: message.includes("Failed") || message.includes("Could") ? "#b91c1c" : "#15803d" }}>{message}</p>}

        <form className="stock-movement-form" onSubmit={handleSubmit}>
          <select
            value={formData.productId}
            onChange={(event) => setFormData({ ...formData, productId: event.target.value })}
            required
          >
            <option value="">Select product</option>
            {products.map((product) => (
              <option key={product._id} value={product._id}>
                {product.name} ({product.stock} in stock)
              </option>
            ))}
          </select>
          <input
            type="number"
            min="1"
            placeholder="Quantity"
            value={formData.quantity}
            onChange={(event) => setFormData({ ...formData, quantity: event.target.value })}
            required
          />
          <select
            value={formData.transactionType}
            onChange={(event) => setFormData({ ...formData, transactionType: event.target.value })}
          >
            <option value="stock-in">Stock In</option>
            <option value="stock-out">Stock Out</option>
          </select>
          <input
            type="text"
            placeholder="Notes"
            value={formData.notes}
            onChange={(event) => setFormData({ ...formData, notes: event.target.value })}
          />
          <button type="submit" className="export-btn">
            {formData.transactionType === "stock-in" ? <FaPlus /> : <FaMinus />}
            Record
          </button>
        </form>

        <div className="inv-table-card">
          <table className="inv-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Product</th>
                <th>Type</th>
                <th>Quantity</th>
                <th>Stock Change</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {filteredMovements.length > 0 ? (
                filteredMovements.map((movement) => (
                  <tr key={movement._id}>
                    <td>{new Date(movement.date || movement.createdAt).toLocaleString()}</td>
                    <td className="font-bold">{movement.productName}</td>
                    <td>
                      <span className={`status-pill ${movement.transactionType.includes("Out") || movement.transactionType === "Sale" ? "danger" : "verified"}`}>
                        {movement.transactionType}
                      </span>
                    </td>
                    <td>{movement.quantity}</td>
                    <td>{movement.previousStock} to {movement.newStock}</td>
                    <td>{formatMovementNotes(movement)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="empty-state-cell">No stock movement records yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default StockMovements;
