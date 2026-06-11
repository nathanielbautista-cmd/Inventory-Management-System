import React, { useEffect, useState } from "react";
import axios from "axios";
import { FaChartBar, FaBoxes, FaExclamationTriangle, FaTruck } from "react-icons/fa";
import API_BASE_URL from "../config/api";
import "./Inventory.css";

function Reports() {
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/reports/summary`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then((res) => setReport(res.data))
      .catch(() => setError("Could not load reports."));
  }, []);

  if (!report && !error) return <div className="loader-container"><div className="spinner"></div></div>;

  const cards = [
    ["Daily Sales", report?.dailySales?.amount || 0, report?.dailySales?.transactions || 0],
    ["Weekly Sales", report?.weeklySales?.amount || 0, report?.weeklySales?.transactions || 0],
    ["Monthly Sales", report?.monthlySales?.amount || 0, report?.monthlySales?.transactions || 0],
  ];

  return (
    <div className="inv-dashboard">
      <div className="inv-container">
        <div className="inv-header">
          <div>
            <h1>Reports</h1>
          </div>
          <div className="records-summary-badge">
            <FaChartBar />
            <span>Sales and Inventory</span>
          </div>
        </div>

        {error && <p style={{ color: "#b91c1c" }}>{error}</p>}

        <div className="analytics-grid">
          {cards.map(([label, amount, transactions]) => (
            <div className="stat-card" key={label}>
              <div className="stat-icon green"><FaChartBar /></div>
              <div className="stat-info">
                <span>{label}</span>
                <h3>PHP {Number(amount).toLocaleString()}</h3>
                <span>{transactions} transactions</span>
              </div>
            </div>
          ))}
          <div className="stat-card">
            <div className="stat-icon blue"><FaBoxes /></div>
            <div className="stat-info">
              <span>Current Inventory</span>
              <h3>{report?.currentInventory?.length || 0}</h3>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon orange"><FaExclamationTriangle /></div>
            <div className="stat-info">
              <span>Low Stock Products</span>
              <h3>{report?.lowStockProducts?.length || 0}</h3>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green"><FaTruck /></div>
            <div className="stat-info">
              <span>Supplier Deliveries</span>
              <h3>{report?.supplierDeliveries?.length || 0}</h3>
            </div>
          </div>
        </div>

        <ReportTable title="Best Selling Products" rows={report?.bestSellingProducts || []} columns={["name", "quantity", "revenue"]} />
        <ReportTable title="Fast Moving Products" rows={report?.fastMovingProducts || []} columns={["name", "quantity"]} />
        <ReportTable title="Slow Moving Products" rows={report?.slowMovingProducts || []} columns={["name", "quantity"]} />
        <InventoryTable title="Low Stock Products" rows={report?.lowStockProducts || []} />
        <MovementTable title="Stock Movement" rows={report?.stockMovements || []} />
        <DeliveryTable title="Supplier Deliveries" rows={report?.supplierDeliveries || []} />
      </div>
    </div>
  );
}

function ReportTable({ title, rows, columns }) {
  return (
    <section className="audit-records-section">
      <div className="audit-records-header"><h2>{title}</h2></div>
      <div className="inv-table-card">
        <table className="inv-table">
          <thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
          <tbody>
            {rows.length ? rows.map((row, index) => (
              <tr key={`${title}-${index}`}>
                {columns.map((column) => <td key={column}>{column === "revenue" ? `PHP ${Number(row[column] || 0).toLocaleString()}` : row[column]}</td>)}
              </tr>
            )) : <tr><td colSpan={columns.length} className="empty-state-cell">No data available.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function InventoryTable({ title, rows }) {
  return (
    <ReportTable
      title={title}
      rows={rows.map((product) => ({
        name: product.name,
        stock: product.stock,
        reorderLevel: product.reorderLevel ?? 10,
      }))}
      columns={["name", "stock", "reorderLevel"]}
    />
  );
}

function MovementTable({ title, rows }) {
  return (
    <ReportTable
      title={title}
      rows={rows.map((movement) => ({
        date: new Date(movement.date || movement.createdAt).toLocaleDateString(),
        productName: movement.productName,
        transactionType: movement.transactionType,
        quantity: movement.quantity,
      }))}
      columns={["date", "productName", "transactionType", "quantity"]}
    />
  );
}

function DeliveryTable({ title, rows }) {
  return (
    <ReportTable
      title={title}
      rows={rows.map((delivery) => ({
        date: new Date(delivery.date || delivery.createdAt).toLocaleDateString(),
        supplierName: delivery.supplierName,
        totalAmount: `PHP ${Number(delivery.totalAmount || 0).toLocaleString()}`,
      }))}
      columns={["date", "supplierName", "totalAmount"]}
    />
  );
}

export default Reports;
