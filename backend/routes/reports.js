const router = require("express").Router();
const mongoose = require("mongoose");
const Product = require("../models/Product");
const Sale = require("../models/Sale");
const StockMovement = require("../models/StockMovement");
const SupplierDelivery = require("../models/SupplierDelivery");
const auth = require("../middleware/auth");
const { getOwnerAdminId } = require("../utils/ownership");

function ownerObjectId(req) {
  return new mongoose.Types.ObjectId(getOwnerAdminId(req));
}

function startOfDay(date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

router.get("/summary", auth, async (req, res) => {
  try {
    const ownerAdminId = getOwnerAdminId(req);
    const ownerId = ownerObjectId(req);
    const now = new Date();
    const dailyStart = startOfDay(now);
    const weeklyStart = startOfDay(now);
    weeklyStart.setDate(weeklyStart.getDate() - 6);
    const monthlyStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const salesTotals = await Sale.aggregate([
      { $match: { ownerAdminId: ownerId } },
      {
        $facet: {
          daily: [
            { $match: { date: { $gte: dailyStart } } },
            { $group: { _id: null, amount: { $sum: "$total" }, transactions: { $sum: 1 } } },
          ],
          weekly: [
            { $match: { date: { $gte: weeklyStart } } },
            { $group: { _id: null, amount: { $sum: "$total" }, transactions: { $sum: 1 } } },
          ],
          monthly: [
            { $match: { date: { $gte: monthlyStart } } },
            { $group: { _id: null, amount: { $sum: "$total" }, transactions: { $sum: 1 } } },
          ],
        },
      },
    ]);

    const productSales = await Sale.aggregate([
      { $match: { ownerAdminId: ownerId } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          name: { $first: "$items.productName" },
          quantity: { $sum: "$items.quantity" },
          revenue: { $sum: "$items.lineTotal" },
        },
      },
      { $sort: { quantity: -1 } },
    ]);

    const currentInventory = await Product.find({ ownerAdminId }).sort({ name: 1 });
    const lowStockProducts = currentInventory.filter(
      (product) => Number(product.stock) <= Number(product.reorderLevel ?? 10)
    );
    const stockMovements = await StockMovement.find({ ownerAdminId })
      .sort({ date: -1, createdAt: -1 })
      .limit(100);
    const supplierDeliveries = await SupplierDelivery.find({ ownerAdminId })
      .sort({ date: -1, createdAt: -1 })
      .limit(100);

    res.json({
      dailySales: salesTotals[0]?.daily[0] || { amount: 0, transactions: 0 },
      weeklySales: salesTotals[0]?.weekly[0] || { amount: 0, transactions: 0 },
      monthlySales: salesTotals[0]?.monthly[0] || { amount: 0, transactions: 0 },
      currentInventory,
      lowStockProducts,
      stockMovements,
      fastMovingProducts: productSales.slice(0, 5),
      slowMovingProducts: productSales.slice().reverse().slice(0, 5),
      bestSellingProducts: productSales.slice(0, 5),
      supplierDeliveries,
    });
  } catch (error) {
    console.error("Reports error:", error);
    res.status(500).json({ message: "Failed to generate reports" });
  }
});

module.exports = router;
