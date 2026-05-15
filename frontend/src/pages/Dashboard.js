import React, { useEffect, useState } from "react";
import axios from "axios";
import "./Dashboard.css";

import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import {
  FaBoxes,
  FaMoneyBillWave,
  FaChartLine,
  FaExclamationTriangle,
} from "react-icons/fa";

ChartJS.register(
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler
);

const getSaleItems = (sale) => {
  if (Array.isArray(sale.items) && sale.items.length > 0) {
    return sale.items;
  }

  return [
    {
      productName: sale.productName || "Deleted Product",
      quantity: sale.quantity || 0,
    },
  ];
};

function Dashboard({ onViewAllSales }) {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalSales: 0,
    totalRevenue: 0,
    lowStock: 0,
    totalProfit: 0,
  });

  const [recentSales, setRecentSales] = useState([]);
  const [fetchError, setFetchError] = useState("");

  useEffect(() => {
    fetchStats();
    fetchRecentSales();

    const handleRefresh = () => {
      if (document.visibilityState === "visible") {
        fetchStats();
        fetchRecentSales();
      }
    };

    window.addEventListener("focus", handleRefresh);
    document.addEventListener("visibilitychange", handleRefresh);

    return () => {
      window.removeEventListener("focus", handleRefresh);
      document.removeEventListener("visibilitychange", handleRefresh);
    };
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.get("http://localhost:5000/api/dashboard/stats", config);
      setStats(res.data);
      setFetchError("");
    } catch (err) {
      console.error(err);
      setFetchError(
        "Could not refresh dashboard data. Retrying when the page becomes active."
      );
    }
  };

  const fetchRecentSales = async () => {
    try {
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.get("http://localhost:5000/api/sales", config);
      setRecentSales(res.data.slice(0, 5));
      setFetchError("");
    } catch (err) {
      console.error(err);
      setFetchError(
        "Could not refresh dashboard data. Retrying when the page becomes active."
      );
    }
  };

  const chartData = {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    datasets: [
      {
        label: "Revenue (PHP)",
        data: [1200, 2100, 1500, 3000, 2500, 4000, 3500],
        backgroundColor: "rgba(79, 70, 229, 0.8)",
        borderColor: "#4f46e5",
        borderWidth: 2,
        borderRadius: 8,
        hoverBackgroundColor: "#4f46e5",
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      y: { beginAtZero: true, grid: { display: false } },
      x: { grid: { display: false } },
    },
  };

  return (
    <div className="dashboard-wrapper fade-in">
      <header className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
        </div>
        <div className="date-pill">{new Date().toDateString()}</div>
      </header>

      {fetchError && <p style={{ color: "#b91c1c", marginBottom: "12px" }}>{fetchError}</p>}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon inventory">
            <FaBoxes />
          </div>
          <div className="stat-info">
            <h3>Total Products</h3>
            <p className="stat-value">{stats.totalProducts}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon sales">
            <FaMoneyBillWave />
          </div>
          <div className="stat-info">
            <h3>Total Revenue</h3>
            <p className="stat-value">PHP {stats.totalRevenue.toLocaleString()}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon profit">
            <FaChartLine />
          </div>
          <div className="stat-info">
            <h3>Net Profit</h3>
            <p className="stat-value text-success">
              PHP {(stats.totalRevenue * 0.2).toLocaleString()}
            </p>
            <span className="growth-indicator">Estimated 20% Margin</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon warning">
            <FaExclamationTriangle />
          </div>
          <div className="stat-info">
            <h3>Low Stock</h3>
            <p className={`stat-value ${stats.lowStock > 0 ? "text-danger" : ""}`}>
              {stats.lowStock}
            </p>
          </div>
        </div>
      </div>

      <div className="dashboard-main-content">
        <div className="chart-section shadow-sm">
          <div className="section-header">
            <h3>Revenue Performance</h3>
            <select className="chart-filter">
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
            </select>
          </div>
          <div className="chart-height">
            <Bar data={chartData} options={chartOptions} />
          </div>
        </div>

        <div className="recent-sales-section shadow-sm">
          <div className="section-header">
            <h3>Recent Transactions</h3>
            <button className="view-all-btn" onClick={onViewAllSales}>
              View All
            </button>
          </div>
          <div className="table-fix">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>Items</th>
                  <th>Amount</th>
                  <th>Payment</th>
                </tr>
              </thead>
              <tbody>
                {recentSales.map((sale) => (
                  <tr key={sale._id}>
                    <td>
                      <div className="p-cell">
                        <span className="p-img">{getSaleItems(sale)[0]?.productName?.charAt(0)}</span>
                        <div className="recent-sale-copy">
                          <strong>
                            {getSaleItems(sale)[0]?.productName || "Deleted Product"}
                          </strong>
                          <span>
                            {getSaleItems(sale).length > 1
                              ? `+${getSaleItems(sale).length - 1} more items`
                              : "Single item order"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="fw-bold">PHP {sale.total?.toLocaleString()}</td>
                    <td>
                      <span className="badge-paid">{sale.paymentMethod || "Cash"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
