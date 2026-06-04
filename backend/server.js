require("dotenv").config();
const dns = require("dns");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

dns.setServers(["8.8.8.8", "1.1.1.1"]);


const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

app.get("/api/health", (req, res) => {
  const databaseStates = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  res.status(200).json({
    status: "ok",
    database: databaseStates[mongoose.connection.readyState] || "unknown",
  });
});

const userRoutes = require("./routes/userRoutes");
app.use("/api/users", userRoutes);

const inventoryRoutes = require("./routes/inventory");
app.use("/api/inventory", inventoryRoutes);

const inventoryAuditRoutes = require("./routes/inventoryAuditRoutes");
app.use("/api/inventory-audits", inventoryAuditRoutes);

const salesRoutes = require("./routes/sales");
app.use("/api/sales", salesRoutes);

const dashboardRoutes = require("./routes/dashboard");
app.use("/api/dashboard", dashboardRoutes);

const PORT = process.env.PORT || 5000;
const LOCAL_MONGO_URI = "mongodb://127.0.0.1:27017/InventorymDB";
const MONGO_URI = "mongodb+srv://atlasAdmin:atlasAdmin123456@inventory.w0tdhcr.mongodb.net/InventorymDB?retryWrites=true&w=majority&appName=Inventory";
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  (process.env.NODE_ENV === "production" ? "" : LOCAL_MONGO_URI);

if (!MONGO_URI) {
  throw new Error("Missing MONGODB_URI environment variable.");
}

if (mongoose.connection.readyState === 0) {
  mongoose.connect(MONGO_URI)
    .then(() => console.log("MongoDB Connected"))
    .catch((error) => console.error("MongoDB connection error:", error.message));
}

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/products", require("./routes/productRoutes"));

if (require.main === module) {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
