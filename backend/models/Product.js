const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  brand: {
    type: String,
    default: "",
  },
  description: {
    type: String,
    default: "",
  },
  initialPrice: {
    type: Number,
    required: true,
  },
  costPrice: {
    type: Number,
    default: 0,
  },
  price: {
    type: Number,
    required: true,
  },
  unitPrice: {
    type: Number,
    default: 0,
  },
  stock: {
    type: Number,
    required: true,
  },
  reorderLevel: {
    type: Number,
    default: 10,
  },
  image: {
    type: String,
    default: "",
  },
  status: {
    type: String,
    enum: ["Active", "Inactive"],
    default: "Active",
  },
  ownerAdminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
}, { timestamps: true });

module.exports = mongoose.model("Product", productSchema);
