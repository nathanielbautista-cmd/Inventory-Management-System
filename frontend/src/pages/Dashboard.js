import React, { useEffect, useState } from "react";
import axios from "axios";
import API_BASE_URL from "../config/api";
import "./Dashboard.css";

import {
  Chart as ChartJS,
  BarElement,
  ArcElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Pie } from "react-chartjs-2";
import {
  FaBoxes,
  FaMoneyBillWave,
  FaChartLine,
  FaExclamationTriangle,
  FaTruck,
} from "react-icons/fa";

ChartJS.register(
  BarElement,
  ArcElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
);

const getSaleItems = (sale) => {
  if (Array.isArray(sale.items) && sale.items.length > 0) {
    return sale.items;
  }

  return [
    {
      productName: sale.productName || "Deleted Product",
      category: sale.category || "Uncategorized",
      quantity: sale.quantity || 0,
    },
  ];
};

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

const saleHasCategory = (sale, category) =>
  category === "All" ||
  getSaleItems(sale).some((item) => (item.category || "Uncategorized") === category);

const formatShortDate = (date) =>
  date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

const formatMonthLabel = (date) =>
  date.toLocaleDateString("en-US", { month: "short", year: "numeric" });

const getWeekStart = (date) => {
  const weekStart = new Date(date);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  return weekStart;
};

const getRevenueChartData = (sales, period) => {
  const revenueByPeriod = new Map();

  sales.forEach((sale) => {
    const saleDate = sale.date ? new Date(sale.date) : null;

    if (!saleDate || Number.isNaN(saleDate.getTime())) {
      return;
    }

    const saleTotal = Number(sale.total ?? sale.price) || 0;
    let key = "";
    let label = "";
    let sortDate = new Date(saleDate);

    if (period === "monthly") {
      sortDate = new Date(saleDate.getFullYear(), saleDate.getMonth(), 1);
      key = `${sortDate.getFullYear()}-${String(sortDate.getMonth() + 1).padStart(2, "0")}`;
      label = formatMonthLabel(sortDate);
    } else if (period === "weekly") {
      sortDate = getWeekStart(saleDate);
      const weekEnd = new Date(sortDate);
      weekEnd.setDate(sortDate.getDate() + 6);
      key = getDateInputValue(sortDate);
      label = `${formatShortDate(sortDate)} - ${formatShortDate(weekEnd)}`;
    } else {
      sortDate.setHours(0, 0, 0, 0);
      key = getDateInputValue(sortDate);
      label = formatShortDate(sortDate);
    }

    if (!revenueByPeriod.has(key)) {
      revenueByPeriod.set(key, {
        label,
        sortValue: sortDate.getTime(),
        total: 0,
      });
    }

    revenueByPeriod.get(key).total += saleTotal;
  });

  const rows = Array.from(revenueByPeriod.values()).sort(
    (firstRow, secondRow) => firstRow.sortValue - secondRow.sortValue
  );

  return rows.length > 0
    ? {
        labels: rows.map((row) => row.label),
        values: rows.map((row) => row.total),
      }
    : { labels: ["No sales"], values: [0] };
};

const normalizeProductMovements = (products) =>
  (Array.isArray(products) ? products : [])
    .map((product) => ({
      name: product.name || "Deleted Product",
      units: Number(product.units ?? product.quantity) || 0,
    }))
    .filter((product) => product.units >= 0)
    .slice(0, 5);

const getProductMovements = (sales) =>
  Object.values(
    sales.reduce((accumulator, sale) => {
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
  );

const getTopProductsChartData = (products) => ({
  labels: products.map((product) => product.name),
  datasets: [
    {
      label: "Units Sold",
      data: products.map((product) => product.units),
      backgroundColor: ["#2563eb", "#0f766e", "#d97706", "#7c3aed", "#dc2626"],
      borderColor: "#ffffff",
      borderWidth: 3,
      hoverOffset: 8,
    },
  ],
});

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
        padding: 16,
        color: "#475569",
        font: {
          size: 12,
          weight: "600",
        },
      },
    },
    tooltip: {
      callbacks: {
        label: (context) =>
          `${context.label}: ${Number(context.raw || 0).toLocaleString()} units sold`,
      },
    },
  },
};

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
  const [dateFrom, setDateFrom] = useState(() => {
    const start = new Date();
    start.setDate(start.getDate() - 6);
    return getDateInputValue(start);
  });
  const [dateTo, setDateTo] = useState(() => getDateInputValue(new Date()));
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [revenuePeriod, setRevenuePeriod] = useState("daily");
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

  const categoryOptions = [
    "All",
    ...Array.from(
      new Set(
        sales
          .flatMap((sale) => getSaleItems(sale))
          .map((item) => item.category || "Uncategorized")
      )
    ).sort(),
  ];
  const filteredSales = sales.filter(
    (sale) =>
      isSaleInDateRange(sale, dateFrom, dateTo) &&
      saleHasCategory(sale, selectedCategory)
  );
  const productMovements = getProductMovements(filteredSales);
  const revenueChart = getRevenueChartData(filteredSales, revenuePeriod);
  const topProducts = normalizeProductMovements(
    productMovements.sort((firstProduct, secondProduct) => secondProduct.units - firstProduct.units)
  );
  const fastMovingProducts = normalizeProductMovements(
    [...productMovements].sort((firstProduct, secondProduct) => secondProduct.units - firstProduct.units)
  );
  const slowMovingProducts = normalizeProductMovements(
    [...productMovements]
      .filter((product) => product.units > 0)
      .sort((firstProduct, secondProduct) => firstProduct.units - secondProduct.units)
  );

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
        <div className="dashboard-filter-bar">
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
          <label>
            <span>Category</span>
            <select
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
            >
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
        </div>
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
            </div>
            <select
              className="chart-filter"
              value={revenuePeriod}
              onChange={(event) => setRevenuePeriod(event.target.value)}
            >
              <option value="daily">Daily Sales</option>
              <option value="weekly">Weekly Sales</option>
              <option value="monthly">Monthly Sales</option>
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
              <div className="top-products-chart">
                <Pie
                  data={getTopProductsChartData(topProducts)}
                  options={topProductsChartOptions}
                />
              </div>
            ) : (
              <div className="dashboard-empty-cell">No product sales found.</div>
            )}
          </div>
        </div>
      </div>

      <div className="movement-insights-grid">
        <div className="chart-section shadow-sm">
          <div className="section-header">
            <div>
              <h3>Fast Moving Products</h3>
            </div>
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

        <div className="chart-section shadow-sm">
          <div className="section-header">
            <div>
              <h3>Slow Moving Products</h3>
            </div>
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
  );
}

export default Dashboard;
