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
  initialPrice: {
    type: Number,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  stock: {
    type: Number,
    required: true,
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
}, { timestamps: true });

module.exports = mongoose.model("Product", productSchema);
