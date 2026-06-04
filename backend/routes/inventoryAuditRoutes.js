const router = require("express").Router();
const auth = require("../middleware/auth");
const InventoryAudit = require("../models/InventoryAudit");
const Product = require("../models/Product");
const { getOwnerAdminId } = require("../utils/ownership");

router.get("/", auth, async (req, res) => {
  try {
    const logs = await InventoryAudit.find({ ownerAdminId: getOwnerAdminId(req) })
      .populate("auditedBy", "name email role")
      .sort({ createdAt: -1 })
      .limit(200);

    res.json(logs);
  } catch (error) {
    console.error("Fetch inventory audits error:", error);
    res.status(500).json({ message: "Failed to fetch inventory audit logs" });
  }
});

router.post("/", auth, async (req, res) => {
  try {
    const { productId, physicalCount } = req.body;
    const parsedCount = Number(physicalCount);

    if (!productId) {
      return res.status(400).json({ message: "Product is required" });
    }

    if (!Number.isInteger(parsedCount) || parsedCount < 0) {
      return res.status(400).json({ message: "Physical count must be a non-negative whole number" });
    }

    const ownerAdminId = getOwnerAdminId(req);
    const product = await Product.findOne({
      _id: productId,
      ownerAdminId,
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const variance = parsedCount - product.stock;

    const auditLog = await InventoryAudit.create({
      product: product._id,
      productName: product.name,
      category: product.category,
      systemStock: product.stock,
      physicalCount: parsedCount,
      variance,
      auditedBy: req.user.id || null,
      ownerAdminId,
    });

    const populatedAuditLog = await InventoryAudit.findById(auditLog._id).populate(
      "auditedBy",
      "name email role"
    );

    res.status(201).json(populatedAuditLog);
  } catch (error) {
    console.error("Create inventory audit error:", error);
    res.status(500).json({ message: "Failed to save inventory audit record" });
  }
});

module.exports = router;
