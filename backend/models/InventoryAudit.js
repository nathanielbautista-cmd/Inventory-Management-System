const mongoose = require("mongoose");

const inventoryAuditSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    systemStock: {
      type: Number,
      required: true,
      min: 0,
    },
    physicalCount: {
      type: Number,
      required: true,
      min: 0,
    },
    variance: {
      type: Number,
      required: true,
    },
    auditedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("InventoryAudit", inventoryAuditSchema);
