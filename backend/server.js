require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");



const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

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
const MONGO_URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  "mongodb://127.0.0.1:27017/InventorymDB";

mongoose.connect(MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((error) => console.error("MongoDB connection error:", error.message));

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/products", require("./routes/productRoutes"));

if (require.main === module) {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
