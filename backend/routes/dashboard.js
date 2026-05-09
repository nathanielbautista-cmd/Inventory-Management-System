const router = require("express").Router();
const Product = require("../models/Product");
const Sale = require("../models/Sale");
const auth = require("../middleware/auth");

router.get("/stats", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin only" });
    }

    const totalProducts = await Product.countDocuments();
    const totalSales = await Sale.countDocuments();
    const analytics = await Sale.aggregate([
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
