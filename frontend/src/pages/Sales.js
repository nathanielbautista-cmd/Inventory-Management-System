import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  FaWallet,
  FaShoppingCart,
  FaCalendarAlt,
  FaDownload,
  FaBox,
  FaTimes,
} from "react-icons/fa";
import "./Sales.css";

const getSaleItems = (sale) => {
  if (Array.isArray(sale.items) && sale.items.length > 0) {
    return sale.items;
  }

  return [
    {
      productName: sale.productName || "Deleted Product",
      quantity: sale.quantity || 0,
      lineTotal: sale.total || 0,
    },
  ];
};

const getSaleSummary = (sale) =>
  getSaleItems(sale)
    .map((item) => `${item.productName} x${item.quantity}`)
    .join(", ");

const getSaleUnits = (sale) =>
  getSaleItems(sale).reduce(
    (acc, item) => acc + (Number(item.quantity) || 0),
    0
  );

function Sales() {
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [selectedSale, setSelectedSale] = useState(null);

  useEffect(() => {
    fetchData();

    const handleRefresh = () => {
      if (document.visibilityState === "visible") {
        fetchData();
      }
    };

    window.addEventListener("focus", handleRefresh);
    document.addEventListener("visibilitychange", handleRefresh);

    return () => {
      window.removeEventListener("focus", handleRefresh);
      document.removeEventListener("visibilitychange", handleRefresh);
    };
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const [salesRes, productsRes] = await Promise.all([
        axios.get("http://localhost:5000/api/sales", config),
        axios.get("http://localhost:5000/api/products", config),
      ]);

      setSales(Array.isArray(salesRes.data) ? salesRes.data : []);
      setProducts(Array.isArray(productsRes.data) ? productsRes.data : []);
      setFetchError("");
      setLoading(false);
    } catch (err) {
      console.error("Data fetch error:", err);
      setFetchError(
        "Could not refresh sales data. Retrying when the page becomes active."
      );
      setLoading(false);
    }
  };

  const handleExportSales = () => {
    if (sales.length === 0) {
      alert("No sales data to export.");
      return;
    }

    const headers = [
      "Date",
      "Items",
      "Quantity",
      "Payment Method",
      "Total Price",
      "Status",
    ];

    const csvRows = sales.map((sale) => {
      const date = sale.date ? new Date(sale.date).toLocaleDateString() : "N/A";
      const items = `"${getSaleSummary(sale)}"`;
      const quantity = getSaleUnits(sale);
      const paymentMethod = sale.paymentMethod || "Cash";
      const total = sale.total || 0;
      const status = "Completed";

      return [date, items, quantity, paymentMethod, total, status].join(",");
    });

    const csvContent = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `Sales_Report_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalRevenue = sales.reduce(
    (acc, sale) => acc + (Number(sale.total) || 0),
    0
  );
  const totalUnits = sales.reduce((acc, sale) => acc + getSaleUnits(sale), 0);
  const totalCapital = products.reduce(
    (acc, product) => acc + Number(product.price) * 0.6 * (Number(product.stock) || 0),
    0
  );

  if (loading) return <div className="sales-loader">Loading Ledger...</div>;

  return (
    <>
      <div className="sales-page">
        <div className="sales-wrapper">
        <div className="sales-header">
          <div>
            <h1>Sales Overview</h1>
            <p>Track your sales performance and revenue metrics.</p>
          </div>
          <button className="sales-download-btn" onClick={handleExportSales}>
            <FaDownload /> Export CSV
          </button>
        </div>

        <div className="revenue-grid">
          <div className="rev-card primary">
            <div className="rev-icon">
              <FaWallet />
            </div>
            <div className="rev-details">
              <span>Total Revenue</span>
              <h3>PHP {(totalRevenue || 0).toLocaleString()}</h3>
            </div>
            <div className="rev-trend"></div>
          </div>

          <div className="rev-card">
            <div className="rev-icon">
              <FaShoppingCart />
            </div>
            <div className="rev-details">
              <span>Units Sold</span>
              <h3>{(totalUnits || 0).toLocaleString()}</h3>
            </div>
          </div>

          <div className="rev-card">
            <div className="rev-icon">
              <FaBox />
            </div>
            <div className="rev-details">
              <span>Total Capital</span>
              <h3>PHP {(totalCapital || 0).toLocaleString()}</h3>
            </div>
          </div>
        </div>

        {fetchError && (
          <p style={{ color: "#b91c1c", marginBottom: "12px" }}>{fetchError}</p>
        )}

        <div className="ledger-card">
          <div className="ledger-header">
            <h3>Transactions</h3>
            <div className="date-filter">
              <FaCalendarAlt /> <span>All Time</span>
            </div>
          </div>

          <table className="sales-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Items</th>
                <th>Quantity</th>
                <th>Payment Method</th>
                <th>Total Price</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sales.length > 0 ? (
                sales.map((sale) => (
                  <tr key={sale._id}>
                    <td className="date-cell">
                      {sale.date ? new Date(sale.date).toLocaleDateString() : "No Date"}
                    </td>
                    <td className="product-cell">
                      <button
                        type="button"
                        className="sale-items-trigger"
                        onClick={() => setSelectedSale(sale)}
                      >
                        <span className="sale-items-primary">
                          {getSaleItems(sale)[0]?.productName || "Deleted Product"}
                        </span>
                        <span className="sale-items-meta">
                          {getSaleItems(sale).length > 1
                            ? `+${getSaleItems(sale).length - 1} more items`
                            : "View details"}
                        </span>
                      </button>
                    </td>
                    <td>{getSaleUnits(sale)} pcs</td>
                    <td>{sale.paymentMethod || "Cash"}</td>
                    <td className="total-cell">
                      PHP {(Number(sale.total) || 0).toLocaleString()}
                    </td>
                    <td>
                      <span className="sale-status-tag">Completed</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: "40px" }}>
                    No sales data found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>

      {selectedSale && (
        <div
          className="sales-modal-overlay"
          onClick={() => setSelectedSale(null)}
        >
          <div
            className="sales-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="sales-modal-close"
              onClick={() => setSelectedSale(null)}
            >
              <FaTimes />
            </button>

            <div className="sales-modal-header">
              <h3>Transaction Details</h3>
              <p>
                {selectedSale.date
                  ? new Date(selectedSale.date).toLocaleString()
                  : "No Date"}
              </p>
            </div>

            <div className="sales-modal-summary">
              <div>
                <span>Payment Method</span>
                <strong>{selectedSale.paymentMethod || "Cash"}</strong>
              </div>
              <div>
                <span>Total Items</span>
                <strong>{getSaleUnits(selectedSale)} pcs</strong>
              </div>
              <div>
                <span>Total Amount</span>
                <strong>PHP {(Number(selectedSale.total) || 0).toLocaleString()}</strong>
              </div>
            </div>

            <div className="sales-modal-items">
              {getSaleItems(selectedSale).map((item, index) => (
                <div key={`${item.productName}-${index}`} className="sales-modal-item">
                  <div>
                    <strong>{item.productName}</strong>
                    <p>{item.category || "Uncategorized"}</p>
                  </div>
                  <div className="sales-modal-item-values">
                    <span>{item.quantity} pcs</span>
                    <strong>
                      PHP {(
                        Number(item.lineTotal) ||
                        Number(item.price) * Number(item.quantity) ||
                        0
                      ).toLocaleString()}
                    </strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Sales;
