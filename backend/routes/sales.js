const router = require("express").Router();
const Sale = require("../models/Sale");
const Product = require("../models/Product");
const User = require("../models/User");
const auth = require("../middleware/auth");

function canCreateSales(role) {
  return role === "admin" || role === "cashier";
}

function canViewSales(role) {
  return role === "admin" || role === "cashier";
}

router.post("/create", auth, async (req, res) => {
  try {
    if (!canCreateSales(req.user.role)) {
      return res.status(403).json("Only admin or cashier can create sales");
    }

    const { items, paymentMethod } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json("No sale items provided");
    }

    const saleItems = [];
    let total = 0;

    for (const item of items) {
      const product = await Product.findById(item.productId);

      if (!product) {
        return res.status(404).json(`Product not found: ${item.productId}`);
      }

      const quantity = Number(item.quantity);
      if (!Number.isInteger(quantity) || quantity <= 0) {
        return res.status(400).json(`Invalid quantity for ${product.name}`);
      }

      if (product.stock < quantity) {
        return res.status(400).json(`Not enough stock for ${product.name}`);
      }

      const lineTotal = product.price * quantity;
      total += lineTotal;

      saleItems.push({
        productId: product._id,
        productName: product.name,
        category: product.category,
        quantity,
        price: product.price,
        lineTotal,
      });

      product.stock -= quantity;
      await product.save();
    }

    const user = await User.findById(req.user.id).select("name");
    const primaryItem = saleItems[0];
    const newSale = new Sale({
      soldBy: req.user.id || null,
      soldByName: user?.name || "Unknown Staff",
      productId: primaryItem.productId,
      productName: primaryItem.productName,
      quantity: saleItems.reduce((sum, item) => sum + item.quantity, 0),
      price: total,
      items: saleItems,
      paymentMethod: paymentMethod || "Cash",
      total,
    });

    await newSale.save();

    res.status(200).json(newSale);
  } catch (err) {
    res.status(500).json(err);
  }
});

router.get("/", auth, async (req, res) => {
  try {
    if (!canViewSales(req.user.role)) {
      return res.status(403).json("Only admin or cashier can view sales");
    }

    const sales = await Sale.find()
      .populate("soldBy", "name email role")
      .sort({ date: -1 });
    res.json(sales);
  } catch (err) {
    res.status(500).json(err);
  }
});

module.exports = router;
