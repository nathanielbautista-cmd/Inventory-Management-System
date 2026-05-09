const Product = require("../models/Product");

const createProduct = async (req, res) => {
  try {
    console.log("BODY RECEIVED:", req.body); // 👈 IMPORTANT DEBUG

    const { name, category, initialPrice, price, stock, status } = req.body;

    const product = new Product({
      name: name,
      category: category,
      initialPrice: Number(initialPrice),
      price: Number(price),
      stock: Number(stock),
      status: status || "Active",
    });

    console.log(req.body);
    const savedProduct = await product.save();

    res.status(201).json(savedProduct);
  } catch (error) {
    console.error("Create Product Error:", error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createProduct };