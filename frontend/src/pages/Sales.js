import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  FaWallet,
  FaShoppingCart,
  FaBox,
  FaCalendarAlt,
} from "react-icons/fa";
import API_BASE_URL from "../config/api";
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

const getSaleUnits = (sale) =>
  getSaleItems(sale).reduce(
    (acc, item) => acc + (Number(item.quantity) || 0),
    0
  );

const getDateInputValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const isSaleInDateRange = (sale, dateFrom, dateTo) => {
  const saleDate = sale.date ? new Date(sale.date) : null;

  if (!saleDate || Number.isNaN(saleDate.getTime())) {
    return false;
  }

  if (dateFrom) {
    const fromDate = new Date(`${dateFrom}T00:00:00`);
    if (saleDate < fromDate) return false;
  }

  if (dateTo) {
    const toDate = new Date(`${dateTo}T23:59:59`);
    if (saleDate > toDate) return false;
  }

  return true;
};

const formatSaleDateTime = (value) => {
  const saleDate = value ? new Date(value) : null;

  if (!saleDate || Number.isNaN(saleDate.getTime())) {
    return "No date";
  }

  return saleDate.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const getTransactionItemsLabel = (sale) =>
  getSaleItems(sale)
    .map((item) => `${item.quantity || 0}x ${item.productName || "Deleted Product"}`)
    .join(", ");

const getTransactionCategories = (sale) =>
  Array.from(
    new Set(getSaleItems(sale).map((item) => item.category || "Uncategorized"))
  ).join(", ");

function Sales() {
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [dateFrom, setDateFrom] = useState(() => {
    const start = new Date();
    start.setDate(start.getDate() - 29);
    return getDateInputValue(start);
  });
  const [dateTo, setDateTo] = useState(() => getDateInputValue(new Date()));

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
        axios.get(`${API_BASE_URL}/sales`, config),
        axios.get(`${API_BASE_URL}/products`, config),
      ]);

      const salesData = Array.isArray(salesRes.data) ? salesRes.data : [];

      setSales(salesData);
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

  const totalCapital = products.reduce(
    (acc, product) =>
      acc + Number(product.price) * 0.6 * (Number(product.stock) || 0),
    0
  );

  const filteredSales = sales
    .filter((sale) => isSaleInDateRange(sale, dateFrom, dateTo))
    .sort((firstSale, secondSale) => new Date(secondSale.date) - new Date(firstSale.date));
  const filteredSummary = {
    totalRevenue: filteredSales.reduce(
      (acc, sale) => acc + (Number(sale.total) || 0),
      0
    ),
    totalUnits: filteredSales.reduce((acc, sale) => acc + getSaleUnits(sale), 0),
  };

  if (loading) return <div className="sales-loader">Loading Sales Overview...</div>;

  return (
    <>
      <div className="sales-page">
        <div className="sales-wrapper">
          <div className="sales-header">
            <div>
              <h1>Sales Records</h1>
            </div>
            <div className="sales-date-range">
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
          </div>

          <div className="revenue-grid">
            <div className="rev-card primary">
              <div className="rev-icon">
                <FaWallet />
              </div>
              <div className="rev-details">
                <span>Total Revenue</span>
                <h3>PHP {(filteredSummary.totalRevenue || 0).toLocaleString()}</h3>
              </div>
              <div className="rev-trend"></div>
            </div>

            <div className="rev-card">
              <div className="rev-icon">
                <FaShoppingCart />
              </div>
              <div className="rev-details">
                <span>Total items Sold</span>
                <h3>{(filteredSummary.totalUnits || 0).toLocaleString()}</h3>
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

          <div className="ledger-card sales-info-card">
            <div className="ledger-header">
              <h3>Transaction History</h3>
              <div className="date-filter">
                <FaCalendarAlt /> <span>{filteredSales.length} Transactions</span>
              </div>
            </div>

            <table className="sales-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Transaction ID</th>
                  <th>Cashier</th>
                  <th>Items</th>
                  <th>Category</th>
                  <th>Units Sold</th>
                  <th>Payment</th>
                  <th>Total Sales</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.length > 0 ? (
                  filteredSales.map((sale) => (
                    <tr key={sale._id}>
                      <td className="date-cell">{formatSaleDateTime(sale.date)}</td>
                      <td className="transaction-cell">{sale._id || "Pending"}</td>
                      <td>{sale.soldByName || sale.soldBy?.name || "Unknown Staff"}</td>
                      <td className="items-cell">{getTransactionItemsLabel(sale)}</td>
                      <td>{getTransactionCategories(sale)}</td>
                      <td>{getSaleUnits(sale)} pcs</td>
                      <td>{sale.paymentMethod || "Cash"}</td>
                      <td className="total-cell">PHP {Number(sale.total || sale.price || 0).toLocaleString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" style={{ textAlign: "center", padding: "40px" }}>
                      No sales data found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

export default Sales;
