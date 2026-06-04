const router = require("express").Router();
const mongoose = require("mongoose");
const Product = require("../models/Product");
const Sale = require("../models/Sale");
const auth = require("../middleware/auth");
const { getOwnerAdminId } = require("../utils/ownership");

router.get("/stats", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin only" });
    }

    const ownerAdminId = getOwnerAdminId(req);
    const ownerObjectId = new mongoose.Types.ObjectId(ownerAdminId);
    const totalProducts = await Product.countDocuments({ ownerAdminId });
    const totalSales = await Sale.countDocuments({ ownerAdminId });
    const analytics = await Sale.aggregate([
      {
        $match: { ownerAdminId: ownerObjectId },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$total" },
          totalProfit: { $sum: "$profit" } 
        }
      }
    ]);

    const stats = analytics[0] || { totalRevenue: 0, totalProfit: 0 };

    const lowStock = await Product.countDocuments({
      ownerAdminId,
      stock: { $lte: 10 } 
    });

    res.json({
      totalProducts,
      totalSales,
      totalRevenue: stats.totalRevenue,
      totalProfit: stats.totalProfit,
      lowStock
    });

  } catch (err) {
    res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
});

module.exports = router;
