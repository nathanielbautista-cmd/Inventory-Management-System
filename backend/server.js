require("dotenv").config();

const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");


const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok" });
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
const MONGODB_DIRECT_URI = process.env.MONGODB_DIRECT_URI?.trim();
const MONGODB_URI = process.env.MONGODB_URI?.trim();
const LEGACY_MONGO_URI = process.env.MONGO_URI?.trim();

const ATLAS_DIRECT_FALLBACKS = {
  "inventory.w0tdhcr.mongodb.net": {
    hosts: [
      "ac-3qxhocd-shard-00-00.w0tdhcr.mongodb.net:27017",
      "ac-3qxhocd-shard-00-01.w0tdhcr.mongodb.net:27017",
      "ac-3qxhocd-shard-00-02.w0tdhcr.mongodb.net:27017",
    ],
    options: {
      ssl: "true",
      authSource: "admin",
      replicaSet: "atlas-mxfl3d-shard-0",
    },
  },
};

function buildDirectMongoUri(uri) {
  try {
    const parsedUri = new URL(uri);

    if (parsedUri.protocol !== "mongodb+srv:") {
      return null;
    }

    const fallback = ATLAS_DIRECT_FALLBACKS[parsedUri.hostname];
    if (!fallback) {
      return null;
    }

    const params = new URLSearchParams(parsedUri.search);
    Object.entries(fallback.options).forEach(([key, value]) => {
      if (!params.has(key)) {
        params.set(key, value);
      }
    });

    const credentials = parsedUri.password
      ? `${parsedUri.username}:${parsedUri.password}@`
      : `${parsedUri.username}@`;

    return `mongodb://${credentials}${fallback.hosts.join(",")}${parsedUri.pathname}?${params.toString()}`;
  } catch (error) {
    return null;
  }
}

const MONGO_URI =
  MONGODB_DIRECT_URI ||
  buildDirectMongoUri(MONGODB_URI) ||
  MONGODB_URI ||
  LEGACY_MONGO_URI ||
  (process.env.NODE_ENV === "production" ? "" : LOCAL_MONGO_URI);

if (!MONGO_URI) {
  throw new Error("Missing MONGODB_URI environment variable.");
}

async function connectToMongo() {
  const options = { serverSelectionTimeoutMS: 10000 };

  try {
    await mongoose.connect(MONGO_URI, options);
    console.log("MongoDB Connected");
  } catch (error) {
    if (isAuthenticationError(error)) {
      console.error("MongoDB authentication failed. Check the database user and password in backend/.env.");
      return;
    }

    console.error("MongoDB connection error:", error.message);
  }
}

function isAuthenticationError(error) {
  return /auth|authentication/i.test(error.message);
}

if (mongoose.connection.readyState === 0) {
  connectToMongo();
}

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/products", require("./routes/productRoutes"));

if (require.main === module) {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
