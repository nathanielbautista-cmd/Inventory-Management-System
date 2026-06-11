const router = require("express").Router();
const Supplier = require("../models/Supplier");
const SupplierDelivery = require("../models/SupplierDelivery");
const Product = require("../models/Product");
const StockMovement = require("../models/StockMovement");
const auth = require("../middleware/auth");
const { getOwnerAdminId } = require("../utils/ownership");

function canManageSuppliers(role) {
  return role === "admin" || role === "inventory";
}

router.get("/", auth, async (req, res) => {
  try {
    const suppliers = await Supplier.find({ ownerAdminId: getOwnerAdminId(req) }).sort({ name: 1 });
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch suppliers" });
  }
});

router.post("/", auth, async (req, res) => {
  try {
    if (!canManageSuppliers(req.user.role)) {
      return res.status(403).json({ message: "Only admin or inventory staff can manage suppliers" });
    }

    const supplier = await Supplier.create({
      ownerAdminId: getOwnerAdminId(req),
      name: req.body.name,
      contactPerson: req.body.contactPerson || "",
      address: req.body.address || "",
      contactNumber: req.body.contactNumber || "",
      email: req.body.email || "",
    });

    res.status(201).json(supplier);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.put("/:id", auth, async (req, res) => {
  try {
    if (!canManageSuppliers(req.user.role)) {
      return res.status(403).json({ message: "Only admin or inventory staff can manage suppliers" });
    }

    const { ownerAdminId, ...updates } = req.body;
    const supplier = await Supplier.findOneAndUpdate(
      { _id: req.params.id, ownerAdminId: getOwnerAdminId(req) },
      updates,
      { new: true }
    );

    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    res.json(supplier);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admin can delete suppliers" });
    }

    await Supplier.findOneAndDelete({ _id: req.params.id, ownerAdminId: getOwnerAdminId(req) });
    res.json({ message: "Deleted" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/deliveries", auth, async (req, res) => {
  try {
    const deliveries = await SupplierDelivery.find({ ownerAdminId: getOwnerAdminId(req) })
      .populate("supplier", "name contactPerson")
      .populate("recordedBy", "name email role")
      .sort({ date: -1, createdAt: -1 })
      .limit(500);

    res.json(deliveries);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch supplier deliveries" });
  }
});

router.post("/deliveries", auth, async (req, res) => {
  try {
    if (!canManageSuppliers(req.user.role)) {
      return res.status(403).json({ message: "Only admin or inventory staff can record deliveries" });
    }

    const ownerAdminId = getOwnerAdminId(req);
    const supplier = await Supplier.findOne({ _id: req.body.supplierId, ownerAdminId });

    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    if (!Array.isArray(req.body.items) || req.body.items.length === 0) {
      return res.status(400).json({ message: "At least one delivered product is required" });
    }

    const deliveryItems = [];
    const movementRows = [];
    let totalAmount = 0;

    for (const item of req.body.items) {
      const quantity = Number(item.quantity);
      const costPrice = Number(item.costPrice || 0);

      if (!Number.isInteger(quantity) || quantity <= 0) {
        return res.status(400).json({ message: "Delivery quantity must be a positive whole number" });
      }

      const product = await Product.findOne({ _id: item.productId, ownerAdminId });

      if (!product) {
        return res.status(404).json({ message: `Product not found: ${item.productId}` });
      }

      const previousStock = Number(product.stock) || 0;
      product.stock = previousStock + quantity;
      if (costPrice > 0) {
        product.initialPrice = costPrice;
        product.costPrice = costPrice;
      }
      await product.save();

      const lineTotal = quantity * costPrice;
      totalAmount += lineTotal;
      deliveryItems.push({
        product: product._id,
        productName: product.name,
        quantity,
        costPrice,
        lineTotal,
      });
      movementRows.push({
        ownerAdminId,
        product: product._id,
        productName: product.name,
        transactionType: "Supplier Delivery",
        quantity,
        previousStock,
        newStock: product.stock,
        notes: `Delivery from ${supplier.name}`,
        recordedBy: req.user.id || null,
      });
    }

    const delivery = await SupplierDelivery.create({
      ownerAdminId,
      supplier: supplier._id,
      supplierName: supplier.name,
      items: deliveryItems,
      totalAmount,
      notes: req.body.notes || "",
      recordedBy: req.user.id || null,
    });

    await StockMovement.insertMany(
      movementRows.map((row) => ({
        ...row,
        referenceId: delivery._id,
        date: delivery.date,
      }))
    );

    res.status(201).json(delivery);
  } catch (error) {
    console.error("Supplier delivery error:", error);
    res.status(500).json({ message: "Failed to record supplier delivery" });
  }
});

module.exports = router;
