const router = require("express").Router();
const Product = require("../models/Product");
const auth = require("../middleware/auth");
router.post("/", auth, async (req, res) => {
  console.log("POST /api/products hit");
  console.log("Request Body:", req.body);
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json("Only admin allowed");
    }

    console.log("BODY RECEIVED:", req.body);

    const { name, category, initialPrice, price, stock, status, image } =
      req.body;

    const product = await Product.create({
      name,
      category,
      initialPrice,
      price,
      stock,
      image,
      status,
    });

    res.status(201).json(product);
  } catch (err) {
    console.error("Create Product Error:", err);
    res.status(400).json(err.message);
  }
});
router.get("/", auth, async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    res.status(400).json(err.message);
  }
});
router.put("/:id", auth, async (req, res) => {
  try {
    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
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

    await Product.findByIdAndDelete(req.params.id);
    res.json("Deleted");
  } catch (err) {
    res.status(400).json(err.message);
  }
});

module.exports = router;
