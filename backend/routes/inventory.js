const router = require("express").Router();
const Product = require("../models/Product");
const auth = require("../middleware/auth");
router.get("/", auth, async (req, res) => {

  try {

    const products = await Product.find();

    res.json(products);

  } catch (error) {

    res.status(500).json({ message: "Error fetching inventory" });

  }

});

module.exports = router;