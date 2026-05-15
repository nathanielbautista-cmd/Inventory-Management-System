import React, { useEffect, useState } from "react";
import axios from "axios";
import "./Dashboard.css";

import {
  Chart as ChartJS,
  BarElement,
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Bar, Pie } from "react-chartjs-2";
import {
  FaBoxes,
  FaMoneyBillWave,
  FaChartLine,
  FaExclamationTriangle,
} from "react-icons/fa";

ChartJS.register(
  BarElement,
  ArcElement,
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

const getRangeDays = (range) => (range === "30" ? 30 : 7);

const formatLocalDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getRevenueChartData = (sales, range) => {
  const dayCount = getRangeDays(range);
  const now = new Date();
  const startDate = new Date(now);
  startDate.setHours(0, 0, 0, 0);
  startDate.setDate(startDate.getDate() - (dayCount - 1));

  const revenueByDay = new Map();

  for (let index = 0; index < dayCount; index += 1) {
    const currentDay = new Date(startDate);
    currentDay.setDate(startDate.getDate() + index);
    revenueByDay.set(formatLocalDateKey(currentDay), 0);
  }

  sales.forEach((sale) => {
    const saleDate = sale.date ? new Date(sale.date) : null;

    if (!saleDate || Number.isNaN(saleDate.getTime())) {
      return;
    }

    const saleDay = new Date(saleDate);
    saleDay.setHours(0, 0, 0, 0);

    if (saleDay < startDate) {
      return;
    }

    const dateKey = formatLocalDateKey(saleDay);
    const saleTotal = Number(sale.total ?? sale.price) || 0;

    if (revenueByDay.has(dateKey)) {
      revenueByDay.set(dateKey, revenueByDay.get(dateKey) + saleTotal);
    }
  });

  const labels = [];
  const values = [];

  revenueByDay.forEach((value, dateKey) => {
    const [year, month, day] = dateKey.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    labels.push(
      date.toLocaleDateString("en-US", dayCount === 7 ? { weekday: "short" } : { month: "short", day: "numeric" })
    );
    values.push(value);
  });

  return { labels, values };
};

function Dashboard() {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalSales: 0,
    totalRevenue: 0,
    lowStock: 0,
    totalProfit: 0,
  });

  const [topProducts, setTopProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [revenueRange, setRevenueRange] = useState("7");
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

  const fetchSalesInsights = async () => {
    try {
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.get("http://localhost:5000/api/sales", config);
      const salesData = Array.isArray(res.data) ? res.data : [];
      setSales(salesData);

      const groupedProducts = Object.values(
        salesData.reduce((accumulator, sale) => {
          getSaleItems(sale).forEach((item) => {
            const key = item.productName || "Deleted Product";

            if (!accumulator[key]) {
              accumulator[key] = {
                name: key,
                units: 0,
              };
            }

            accumulator[key].units += Number(item.quantity) || 0;
          });

          return accumulator;
        }, {})
      )
        .sort((firstProduct, secondProduct) => secondProduct.units - firstProduct.units)
        .slice(0, 5);

      setTopProducts(groupedProducts);
      setFetchError("");
    } catch (err) {
      console.error(err);
      setFetchError(
        "Could not refresh dashboard data. Retrying when the page becomes active."
      );
    }
  };

  const revenueChart = getRevenueChartData(sales, revenueRange);

  const chartData = {
    labels: revenueChart.labels,
    datasets: [
      {
        label: "Revenue (PHP)",
        data: revenueChart.values,
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
        ticks: { color: "#64748b" },
      },
    },
  };

  const topProductsChartData = {
    labels: topProducts.map((product) => product.name),
    datasets: [
      {
        label: "Units Sold",
        data: topProducts.map((product) => product.units),
        backgroundColor: [
          "#2563eb",
          "#0f766e",
          "#d97706",
          "#7c3aed",
          "#dc2626",
        ],
        borderRadius: 10,
        borderSkipped: false,
      },
    ],
  };

  const topProductsChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          usePointStyle: true,
          pointStyle: "circle",
          boxWidth: 10,
          padding: 18,
          color: "#475569",
          font: {
            size: 12,
            weight: "600",
          },
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => `${context.label}: ${context.raw} pcs`,
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
      </div>

      <div className="dashboard-main-content">
        <div className="chart-section shadow-sm">
          <div className="section-header">
            <h3>Revenue Performance</h3>
            <select
              className="chart-filter"
              value={revenueRange}
              onChange={(event) => setRevenueRange(event.target.value)}
            >
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
            </select>
          </div>
          <div className="chart-height">
            <Bar data={chartData} options={chartOptions} />
          </div>
        </div>

        <div className="recent-sales-section shadow-sm">
          <div className="section-header">
            <div>
              <h3>Most Sold Products</h3>
            </div>
          </div>
          <div className="top-products-panel">
            {topProducts.length > 0 ? (
              <>
                <div className="top-products-chart">
                  <Pie data={topProductsChartData} options={topProductsChartOptions} />
                </div>
              </>
            ) : (
              <div className="dashboard-empty-cell">
                No sales data found.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
