const router = require("express").Router();
const Product = require("../models/Product");
const auth = require("../middleware/auth");
const { getOwnerAdminId, ownerQuery } = require("../utils/ownership");
router.post("/", auth, async (req, res) => {
  console.log("POST /api/products hit");
  console.log("Request Body:", req.body);
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json("Only admin allowed");
    }

    console.log("BODY RECEIVED:", req.body);

    const {
      name,
      category,
      brand,
      description,
      initialPrice,
      costPrice,
      price,
      unitPrice,
      barcode,
      stock,
      reorderLevel,
      status,
      image,
    } = req.body;

    const normalizedCost = Number(costPrice ?? initialPrice);
    const normalizedPrice = Number(unitPrice ?? price);

    const product = await Product.create({
      name,
      category,
      brand,
      description,
      initialPrice: normalizedCost,
      costPrice: normalizedCost,
      price: normalizedPrice,
      unitPrice: normalizedPrice,
      barcode,
      stock: Number(stock),
      reorderLevel: Number(reorderLevel ?? 10),
      image,
      status,
      ownerAdminId: getOwnerAdminId(req),
    });

    res.status(201).json(product);
  } catch (err) {
    console.error("Create Product Error:", err);
    res.status(400).json(err.message);
  }
});
router.get("/", auth, async (req, res) => {
  try {
    const products = await Product.find(ownerQuery(req));
    res.json(products);
  } catch (err) {
    res.status(400).json(err.message);
  }
});
router.put("/:id", auth, async (req, res) => {
  try {
    const { ownerAdminId, ...updates } = req.body;

    if (updates.costPrice !== undefined || updates.initialPrice !== undefined) {
      const normalizedCost = Number(updates.costPrice ?? updates.initialPrice);
      updates.initialPrice = normalizedCost;
      updates.costPrice = normalizedCost;
    }

    if (updates.unitPrice !== undefined || updates.price !== undefined) {
      const normalizedPrice = Number(updates.unitPrice ?? updates.price);
      updates.price = normalizedPrice;
      updates.unitPrice = normalizedPrice;
    }

    if (updates.stock !== undefined) updates.stock = Number(updates.stock);
    if (updates.reorderLevel !== undefined) updates.reorderLevel = Number(updates.reorderLevel);

    const updated = await Product.findOneAndUpdate(
      {
        _id: req.params.id,
        ownerAdminId: getOwnerAdminId(req),
      },
      updates,
      { new: true }
    );

    res.json(updated);
  } catch (err) {
    res.status(400).json(err.message);
  }
});
router.delete("/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json("Only admin allowed");
    }

    await Product.findOneAndDelete({
      _id: req.params.id,
      ownerAdminId: getOwnerAdminId(req),
    });
    res.json("Deleted");
  } catch (err) {
    res.status(400).json(err.message);
  }
});

module.exports = router;
