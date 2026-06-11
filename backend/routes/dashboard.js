const router = require("express").Router();
const mongoose = require("mongoose");
const Product = require("../models/Product");
const Sale = require("../models/Sale");
const Supplier = require("../models/Supplier");
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
    const totalSuppliers = await Supplier.countDocuments({ ownerAdminId });
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

    const allProducts = await Product.find({ ownerAdminId }).select("stock reorderLevel");
    const lowStock = allProducts.filter(
      (product) => Number(product.stock) <= Number(product.reorderLevel ?? 10)
    ).length;

    const productSales = await Sale.aggregate([
      { $match: { ownerAdminId: ownerObjectId } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          name: { $first: "$items.productName" },
          units: { $sum: "$items.quantity" },
        },
      },
      { $sort: { units: -1 } },
    ]);

    res.json({
      totalProducts,
      totalSales,
      totalSuppliers,
      totalRevenue: stats.totalRevenue,
      totalProfit: stats.totalProfit,
      lowStock,
      fastMovingProducts: productSales.slice(0, 5),
      slowMovingProducts: productSales.slice().reverse().slice(0, 5)
    });

  } catch (err) {
    res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
});

module.exports = router;
