import React, { useEffect, useState } from "react";
import axios from "axios";
import API_BASE_URL from "../config/api";
import "./Dashboard.css";

import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import {
  FaBoxes,
  FaMoneyBillWave,
  FaChartLine,
  FaExclamationTriangle,
  FaTruck,
} from "react-icons/fa";

ChartJS.register(
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
);

const getRevenueChartData = (sales) => {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 6);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const revenueTotals = {
    daily: 0,
    weekly: 0,
    monthly: 0,
  };

  sales.forEach((sale) => {
    const saleDate = sale.date ? new Date(sale.date) : null;

    if (!saleDate || Number.isNaN(saleDate.getTime())) {
      return;
    }

    const saleTotal = Number(sale.total ?? sale.price) || 0;

    if (saleDate >= todayStart) {
      revenueTotals.daily += saleTotal;
    }

    if (saleDate >= weekStart) {
      revenueTotals.weekly += saleTotal;
    }

    if (saleDate >= monthStart) {
      revenueTotals.monthly += saleTotal;
    }
  });

  return {
    labels: ["Daily", "Weekly", "Monthly"],
    values: [revenueTotals.daily, revenueTotals.weekly, revenueTotals.monthly],
  };
};

const normalizeProductMovements = (products) =>
  (Array.isArray(products) ? products : [])
    .map((product) => ({
      name: product.name || "Deleted Product",
      units: Number(product.units ?? product.quantity) || 0,
    }))
    .filter((product) => product.units >= 0)
    .slice(0, 5);

const getMovementChartData = (products, colors) => ({
  labels: products.map((product) => product.name),
  datasets: [
    {
      label: "Units Sold",
      data: products.map((product) => product.units),
      backgroundColor: colors,
      borderColor: colors,
      borderWidth: 1,
      borderRadius: 8,
      borderSkipped: false,
      barThickness: 22,
    },
  ],
});

const movementChartOptions = {
  indexAxis: "y",
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (context) => `${Number(context.raw || 0).toLocaleString()} units sold`,
      },
    },
  },
  scales: {
    x: {
      beginAtZero: true,
      grid: { color: "#eef2f7" },
      ticks: {
        color: "#64748b",
        precision: 0,
      },
    },
    y: {
      grid: { display: false },
      ticks: {
        color: "#334155",
        font: { weight: "600" },
      },
    },
  },
};

function Dashboard() {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalSales: 0,
    totalRevenue: 0,
    lowStock: 0,
    totalProfit: 0,
    totalSuppliers: 0,
    fastMovingProducts: [],
    slowMovingProducts: [],
  });

  const [sales, setSales] = useState([]);
  const [fetchError, setFetchError] = useState("");

  useEffect(() => {
    fetchStats();
    fetchSalesInsights();

    const handleRefresh = () => {
      if (document.visibilityState === "visible") {
        fetchStats();
        fetchSalesInsights();
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
      const res = await axios.get(`${API_BASE_URL}/dashboard/stats`, config);
      setStats(res.data);
      setFetchError("");
    } catch (err) {
      console.error(err);
      setFetchError(
        "Could not refresh dashboard data. Retrying when the page becomes active."
      );
    }
  };

  const fetchSalesInsights = async () => {
    try {
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.get(`${API_BASE_URL}/sales`, config);
      const salesData = Array.isArray(res.data) ? res.data : [];
      setSales(salesData);

      setFetchError("");
    } catch (err) {
      console.error(err);
      setFetchError(
        "Could not refresh dashboard data. Retrying when the page becomes active."
      );
    }
  };

  const revenueChart = getRevenueChartData(sales);
  const fastMovingProducts = normalizeProductMovements(stats.fastMovingProducts);
  const slowMovingProducts = normalizeProductMovements(stats.slowMovingProducts);

  const chartData = {
    labels: revenueChart.labels,
    datasets: [
      {
        label: "Revenue (PHP)",
        data: revenueChart.values,
        backgroundColor: ["#2563eb", "#0f766e", "#d97706"],
        borderColor: ["#1d4ed8", "#0f766e", "#b45309"],
        borderWidth: 2,
        borderRadius: 10,
        hoverBackgroundColor: ["#1d4ed8", "#0f766e", "#b45309"],
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => `PHP ${Number(context.raw || 0).toLocaleString()}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { display: false },
        ticks: {
          color: "#64748b",
          callback: (value) => `PHP ${Number(value).toLocaleString()}`,
        },
      },
      x: {
        grid: { display: false },
        ticks: {
          color: "#334155",
          font: { weight: "700" },
        },
      },
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

        <div className="stat-card">
          <div className="stat-icon suppliers">
            <FaTruck />
          </div>
          <div className="stat-info">
            <h3>Total Suppliers</h3>
            <p className="stat-value">{stats.totalSuppliers || 0}</p>
          </div>
        </div>
      </div>

      <div className="dashboard-main-content">
        <div className="chart-section shadow-sm">
          <div className="section-header">
            <div>
              <h3>Revenue Performance</h3>
              <p className="panel-subtitle">Daily, weekly, and monthly sales.</p>
            </div>
          </div>
          <div className="chart-height">
            <Bar data={chartData} options={chartOptions} />
          </div>
        </div>

        <div className="recent-sales-section shadow-sm">
          <div className="section-header">
            <div>
              <h3>Product Movement</h3>
          
            </div>
          </div>
          <div className="movement-chart-stack">
            <div className="movement-chart-card">
              <div className="movement-chart-title">
                <span className="movement-dot fast-dot"></span>
                <strong>Fast Moving Products</strong>
              </div>
              <div className="movement-chart-height">
                {fastMovingProducts.length > 0 ? (
                  <Bar
                    data={getMovementChartData(fastMovingProducts, [
                      "#0f766e",
                      "#14b8a6",
                      "#22c55e",
                      "#65a30d",
                      "#84cc16",
                    ])}
                    options={movementChartOptions}
                  />
                ) : (
                  <div className="dashboard-empty-cell">No fast moving products yet.</div>
                )}
              </div>
            </div>

            <div className="movement-chart-card">
              <div className="movement-chart-title">
                <span className="movement-dot slow-dot"></span>
                <strong>Slow Moving Products</strong>
              </div>
              <div className="movement-chart-height">
                {slowMovingProducts.length > 0 ? (
                  <Bar
                    data={getMovementChartData(slowMovingProducts, [
                      "#475569",
                      "#64748b",
                      "#94a3b8",
                      "#a8a29e",
                      "#78716c",
                    ])}
                    options={movementChartOptions}
                  />
                ) : (
                  <div className="dashboard-empty-cell">No slow moving products yet.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
