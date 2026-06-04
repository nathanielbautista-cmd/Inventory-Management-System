require("dotenv").config();

const mongoose = require("mongoose");
const User = require("../models/User");
const Product = require("../models/Product");
const Sale = require("../models/Sale");
const InventoryAudit = require("../models/InventoryAudit");

const adminEmail = process.argv[2]?.trim().toLowerCase();

if (!adminEmail) {
  console.error("Usage: npm run assign-owner-admin -- admin@example.com");
  process.exit(1);
}

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!MONGODB_URI) {
  console.error("Missing MONGODB_URI environment variable.");
  process.exit(1);
}

const missingOwnerQuery = {
  $or: [
    { ownerAdminId: null },
    { ownerAdminId: { $exists: false } },
  ],
};

async function run() {
  await mongoose.connect(MONGODB_URI);

  const admin = await User.findOne({
    email: adminEmail,
    role: "admin",
  });

  if (!admin) {
    throw new Error(`Admin account not found: ${adminEmail}`);
  }

  if (!admin.ownerAdminId) {
    admin.ownerAdminId = admin._id;
    await admin.save();
  }

  const ownerAdminId = admin.ownerAdminId || admin._id;

  const [users, products, sales, audits] = await Promise.all([
    User.updateMany(missingOwnerQuery, { $set: { ownerAdminId } }),
    Product.updateMany(missingOwnerQuery, { $set: { ownerAdminId } }),
    Sale.updateMany(missingOwnerQuery, { $set: { ownerAdminId } }),
    InventoryAudit.updateMany(missingOwnerQuery, { $set: { ownerAdminId } }),
  ]);

  console.log(`Assigned old records to ${admin.email}`);
  console.log(`Users: ${users.modifiedCount}`);
  console.log(`Products: ${products.modifiedCount}`);
  console.log(`Sales: ${sales.modifiedCount}`);
  console.log(`Inventory audits: ${audits.modifiedCount}`);
}

run()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
