const mongoose = require("mongoose");

const saleItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    },
    productName: String,
    category: String,
    quantity: Number,
    price: Number,
    lineTotal: Number,
  },
  { _id: false }
);

const SaleSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product"
  },
  productName: String,
  quantity: Number,
  price: Number,
  items: {
    type: [saleItemSchema],
    default: [],
  },
  paymentMethod: {
    type: String,
    default: "Cash",
  },
  total: Number,
  date: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Sale", SaleSchema);
