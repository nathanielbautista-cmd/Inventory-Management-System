import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import API_BASE_URL from "../config/api";
import "./Dashboard.css";

import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  PieController,
  ArcElement,
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
  CategoryScale,
  LinearScale,
  PieController,
  ArcElement,
  Tooltip,
  Legend
);

const getSaleItems = (sale) => {
  if (Array.isArray(sale.items) && sale.items.length > 0) {
    return sale.items;
  }

  return [
    {
      productName: sale.productName || sale.name || "Deleted Product",
      category: sale.category || "Uncategorized",
      quantity: sale.quantity || 0,
      lineTotal: sale.total || sale.price || 0,
    },
  ];
};

const getDateInputValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getItemTotal = (item, sale) => {
  const lineTotal = Number(item.lineTotal ?? item.total);

  if (!Number.isNaN(lineTotal) && lineTotal > 0) {
    return lineTotal;
  }

  return (
    (Number(item.price) || 0) * (Number(item.quantity) || 0) ||
    Number(sale.total ?? sale.price) ||
    0
  );
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

const getSaleCategoryOptions = (sales) =>
  Array.from(
    new Set(
      sales.flatMap((sale) =>
        getSaleItems(sale).map((item) => item.category || "Uncategorized")
      )
    )
  ).sort((firstCategory, secondCategory) =>
    firstCategory.localeCompare(secondCategory)
  );

const getFilteredSaleEntries = (sales, dateFrom, dateTo, category) =>
  sales.flatMap((sale) => {
    if (!isSaleInDateRange(sale, dateFrom, dateTo)) {
      return [];
    }

    const saleDate = new Date(sale.date);
    return getSaleItems(sale)
      .filter(
        (item) =>
          category === "All" || (item.category || "Uncategorized") === category
      )
      .map((item) => ({
        date: saleDate,
        productName: item.productName || item.name || "Deleted Product",
        category: item.category || "Uncategorized",
        quantity: Number(item.quantity) || 0,
        total: getItemTotal(item, sale),
      }));
  });

const getPeriodKey = (date, period) => {
  if (period === "monthly") {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }

  if (period === "weekly") {
    const weekStart = new Date(date);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    return getDateInputValue(weekStart);
  }

  return getDateInputValue(date);
};

const formatPeriodLabel = (periodKey, period) => {
  const date =
    period === "monthly"
      ? new Date(`${periodKey}-01T00:00:00`)
      : new Date(`${periodKey}T00:00:00`);

  if (period === "monthly") {
    return date.toLocaleDateString("en-PH", { month: "short", year: "numeric" });
  }

  if (period === "weekly") {
    return `Week of ${date.toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
    })}`;
  }

  return date.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
};

const getRevenueChartData = (entries, period) => {
  const totals = entries.reduce((acc, entry) => {
    const key = getPeriodKey(entry.date, period);
    acc[key] = (acc[key] || 0) + entry.total;
    return acc;
  }, {});

  const sortedKeys = Object.keys(totals).sort();

  return {
    labels: sortedKeys.map((key) => formatPeriodLabel(key, period)),
    values: sortedKeys.map((key) => totals[key]),
  };
};

const getTopSoldProducts = (entries) => {
  const productTotals = entries.reduce((acc, entry) => {
    const productName = entry.productName || "Deleted Product";
    acc[productName] = (acc[productName] || 0) + entry.quantity;
    return acc;
  }, {});

  return Object.entries(productTotals)
    .map(([name, units]) => ({ name, units }))
    .filter((product) => product.units > 0)
    .sort((firstProduct, secondProduct) => secondProduct.units - firstProduct.units)
    .slice(0, 5);
};

const getRevenueSubtitle = (period, dateFrom, dateTo, category) => {
  const periodLabel = {
    daily: "Daily",
    weekly: "Weekly",
    monthly: "Monthly",
  }[period];

  const dateLabel =
    dateFrom && dateTo ? `${dateFrom} to ${dateTo}` : "selected dates";
  const categoryLabel = category === "All" ? "all categories" : category;

  return `${periodLabel} sales for ${categoryLabel}, ${dateLabel}.`;
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

const revenueColors = ["#2563eb", "#0f766e", "#d97706", "#7c3aed", "#dc2626"];
const revenueHoverColors = ["#1d4ed8", "#0f766e", "#b45309", "#6d28d9", "#b91c1c"];
const productPieColors = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];
const productPieBorderColors = ["#1d4ed8", "#059669", "#d97706", "#dc2626", "#7c3aed"];

const getChartPalette = (colors, count) =>
  Array.from({ length: count }, (_, index) => colors[index % colors.length]);

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
  const [revenuePeriod, setRevenuePeriod] = useState("daily");
  const [dateFrom, setDateFrom] = useState(() => {
    const start = new Date();
    start.setDate(start.getDate() - 29);
    return getDateInputValue(start);
  });
  const [dateTo, setDateTo] = useState(() => getDateInputValue(new Date()));
  const [selectedCategory, setSelectedCategory] = useState("All");

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

  const categoryOptions = useMemo(() => getSaleCategoryOptions(sales), [sales]);
  const filteredSaleEntries = useMemo(
    () => getFilteredSaleEntries(sales, dateFrom, dateTo, selectedCategory),
    [sales, dateFrom, dateTo, selectedCategory]
  );
  const revenueChart = getRevenueChartData(filteredSaleEntries, revenuePeriod);
  const topSoldProducts = getTopSoldProducts(filteredSaleEntries);
  const mostSoldProduct = topSoldProducts[0];
  const fastMovingProducts = normalizeProductMovements(stats.fastMovingProducts);
  const slowMovingProducts = normalizeProductMovements(stats.slowMovingProducts);

  const chartData = {
    labels: revenueChart.labels,
    datasets: [
      {
        label: "Revenue (PHP)",
        data: revenueChart.values,
        backgroundColor: getChartPalette(revenueColors, revenueChart.values.length),
        borderColor: getChartPalette(revenueHoverColors, revenueChart.values.length),
        borderWidth: 2,
        borderRadius: 10,
        hoverBackgroundColor: getChartPalette(
          revenueHoverColors,
          revenueChart.values.length
        ),
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

  const topProductsPieData = {
    labels: topSoldProducts.map((product) => product.name),
    datasets: [
      {
        label: "Units Sold",
        data: topSoldProducts.map((product) => product.units),
        backgroundColor: getChartPalette(
          productPieColors,
          topSoldProducts.length
        ),
        borderColor: getChartPalette(
          productPieBorderColors,
          topSoldProducts.length
        ),
        borderWidth: 2,
      },
    ],
  };

  const topProductsPieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          boxWidth: 12,
          color: "#334155",
          font: { weight: "600" },
          padding: 14,
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

  return (
    <div className="dashboard-wrapper fade-in">
      <header className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
        </div>
        <div className="date-pill">{new Date().toDateString()}</div>
      </header>

      {fetchError && (
        <p style={{ color: "#b91c1c", marginBottom: "12px" }}>
          {fetchError}
        </p>
      )}

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
              <p className="panel-subtitle">
                {getRevenueSubtitle(
                  revenuePeriod,
                  dateFrom,
                  dateTo,
                  selectedCategory
                )}
              </p>
            </div>
            <div className="dashboard-filter-bar">
              <label>
                <span>View</span>
                <select
                  value={revenuePeriod}
                  onChange={(event) => setRevenuePeriod(event.target.value)}
                >
                  <option value="daily">Daily Sales</option>
                  <option value="weekly">Weekly Sales</option>
                  <option value="monthly">Monthly Sales</option>
                </select>
              </label>
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
                  <option value="All">All Categories</option>
                  {categoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          <div className="chart-height">
            {revenueChart.values.length > 0 ? (
              <Bar data={chartData} options={chartOptions} />
            ) : (
              <div className="dashboard-empty-cell">
                No revenue found for the selected filters.
              </div>
            )}
          </div>
        </div>

        <div className="dashboard-side-stack">
          <div className="recent-sales-section shadow-sm">
            <div className="section-header">
              <div>
                <h3>Most Sold Product</h3>
                <p className="panel-subtitle">
                  {mostSoldProduct
                    ? `${mostSoldProduct.name} leads with ${mostSoldProduct.units.toLocaleString()} units sold.`
                    : "No products sold for the selected filters."}
                </p>
              </div>
            </div>
            <div className="top-products-chart">
              {topSoldProducts.length > 0 ? (
                <Pie data={topProductsPieData} options={topProductsPieOptions} />
              ) : (
                <div className="dashboard-empty-cell">
                  No product sales found for the selected filters.
                </div>
              )}
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
    </div>
  );
}

export default Dashboard;
