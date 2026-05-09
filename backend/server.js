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

const salesRoutes = require("./routes/sales");
app.use("/api/sales", salesRoutes);

const dashboardRoutes = require("./routes/Dashboard");
app.use("/api/dashboard", dashboardRoutes);

mongoose.connect("mongodb://127.0.0.1:27017/InventorymDB")
  .then(() => console.log("MongoDB Connected"));

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/products", require("./routes/productRoutes"));

app.listen(5000, () => console.log("Server running on port 5000"));
