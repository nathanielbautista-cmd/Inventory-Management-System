import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  FaWallet,
  FaShoppingCart,
  FaBox,
  FaCalendarAlt,
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
  const [salesSummary, setSalesSummary] = useState({
    totalRevenue: 0,
    totalUnits: 0,
  });

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

      const salesData = Array.isArray(salesRes.data) ? salesRes.data : [];

      setSales(salesData);
      setProducts(Array.isArray(productsRes.data) ? productsRes.data : []);
      setSalesSummary({
        totalRevenue: salesData.reduce(
          (acc, sale) => acc + (Number(sale.total) || 0),
          0
        ),
        totalUnits: salesData.reduce((acc, sale) => acc + getSaleUnits(sale), 0),
      });
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

  const dailySales = Object.values(
    sales.reduce((accumulator, sale) => {
      const saleDate = sale.date ? new Date(sale.date) : new Date();
      const dateKey = saleDate.toISOString().split("T")[0];

      if (!accumulator[dateKey]) {
        accumulator[dateKey] = {
          dateKey,
          displayDate: saleDate.toLocaleDateString(),
          totalSales: 0,
          totalUnits: 0,
          totalTransactions: 0,
          sales: [],
        };
      }

      accumulator[dateKey].totalSales += Number(sale.total) || 0;
      accumulator[dateKey].totalUnits += getSaleUnits(sale);
      accumulator[dateKey].totalTransactions += 1;
      accumulator[dateKey].sales.push(sale);

      return accumulator;
    }, {})
  ).sort((firstDay, secondDay) => new Date(secondDay.dateKey) - new Date(firstDay.dateKey));

  if (loading) return <div className="sales-loader">Loading Sales Overview...</div>;

  return (
    <>
      <div className="sales-page">
        <div className="sales-wrapper">
          <div className="sales-header">
            <div>
              <h1>Sales Records</h1>
            </div>
          </div>

          <div className="revenue-grid">
            <div className="rev-card primary">
              <div className="rev-icon">
                <FaWallet />
              </div>
              <div className="rev-details">
                <span>Total Revenue</span>
                <h3>PHP {(salesSummary.totalRevenue || 0).toLocaleString()}</h3>
              </div>
              <div className="rev-trend"></div>
            </div>

            <div className="rev-card">
              <div className="rev-icon">
                <FaShoppingCart />
              </div>
              <div className="rev-details">
                <span>Total items Sold</span>
                <h3>{(salesSummary.totalUnits || 0).toLocaleString()}</h3>
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
              <h3>Daily Sales Transactions</h3>
              <div className="date-filter">
                <FaCalendarAlt /> <span>{dailySales.length} Days</span>
              </div>
            </div>

            <table className="sales-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Transactions</th>
                  <th>Units Sold</th>
                  <th>Total Sales</th>
                </tr>
              </thead>
              <tbody>
                {dailySales.length > 0 ? (
                  dailySales.map((day) => (
                    <tr key={day.dateKey}>
                      <td className="date-cell">{day.displayDate}</td>
                      <td>{day.totalTransactions}</td>
                      <td>{day.totalUnits} pcs</td>
                      <td className="total-cell">PHP {day.totalSales.toLocaleString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" style={{ textAlign: "center", padding: "40px" }}>
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
