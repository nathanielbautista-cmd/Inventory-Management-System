const router = require("express").Router();
const Product = require("../models/Product");
const StockMovement = require("../models/StockMovement");
const auth = require("../middleware/auth");
const { getOwnerAdminId } = require("../utils/ownership");

function canManageStock(role) {
  return role === "admin" || role === "inventory";
}

async function createStockMovement(req, res, transactionType) {
  try {
    if (!canManageStock(req.user.role)) {
      return res.status(403).json({ message: "Only admin or inventory staff can manage stock" });
    }

    const ownerAdminId = getOwnerAdminId(req);
    const { productId, quantity, notes } = req.body;
    const parsedQuantity = Number(quantity);

    if (!productId) {
      return res.status(400).json({ message: "Product is required" });
    }

    if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
      return res.status(400).json({ message: "Quantity must be a positive whole number" });
    }

    const product = await Product.findOne({ _id: productId, ownerAdminId });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const previousStock = Number(product.stock) || 0;
    const newStock =
      transactionType === "Stock In"
        ? previousStock + parsedQuantity
        : previousStock - parsedQuantity;

    if (newStock < 0) {
      return res.status(400).json({ message: "Stock out quantity exceeds current stock" });
    }

    product.stock = newStock;
    await product.save();

    const movement = await StockMovement.create({
      ownerAdminId,
      product: product._id,
      productName: product.name,
      transactionType,
      quantity: parsedQuantity,
      previousStock,
      newStock,
      notes: notes || "",
      recordedBy: req.user.id || null,
    });

    res.status(201).json(movement);
  } catch (error) {
    console.error("Stock movement error:", error);
    res.status(500).json({ message: "Failed to record stock movement" });
  }
}

router.get("/", auth, async (req, res) => {
  try {
    const movements = await StockMovement.find({ ownerAdminId: getOwnerAdminId(req) })
      .populate("recordedBy", "name email role")
      .sort({ date: -1, createdAt: -1 })
      .limit(500);

    res.json(movements);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch stock movements" });
  }
});

router.post("/stock-in", auth, (req, res) => createStockMovement(req, res, "Stock In"));
router.post("/stock-out", auth, (req, res) => createStockMovement(req, res, "Stock Out"));

module.exports = router;
