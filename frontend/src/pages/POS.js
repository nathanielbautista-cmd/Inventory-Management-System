import React, { useCallback, useEffect, useState } from "react";
import ReactDOM from "react-dom";
import axios from "axios";
import "./POS.css";

function POS() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastTransaction, setLastTransaction] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("Cash");

  const token = localStorage.getItem("token");
  const categories = ["All", ...new Set(products.map((product) => product.category))];

  const fetchProducts = useCallback(async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/products", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProducts(res.data);
    } catch (err) {
      console.error(err);
    }
  }, [token]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const speak = (text) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.lang = "en-PH";
    window.speechSynthesis.speak(utterance);
  };

  const addToCart = (product) => {
    const existing = cart.find((item) => item._id === product._id);
    if (existing && existing.qty >= product.stock) return;

    if (existing) {
      setCart(
        cart.map((item) =>
          item._id === product._id ? { ...item, qty: item.qty + 1 } : item
        )
      );
      return;
    }

    setCart([...cart, { ...product, qty: 1 }]);
  };

  const updateQty = (id, delta) => {
    setCart(
      cart.map((item) => {
        if (item._id === id) {
          const currentQty = parseInt(item.qty, 10) || 0;
          const newQty = currentQty + delta;
          if (newQty > 0 && newQty <= item.stock) {
            return { ...item, qty: newQty };
          }
        }
        return item;
      })
    );
  };

  const handleManualQtyChange = (id, value, stock) => {
    if (value === "") {
      setCart(
        cart.map((item) => (item._id === id ? { ...item, qty: "" } : item))
      );
      return;
    }

    const parsedQty = parseInt(value, 10);
    if (Number.isNaN(parsedQty)) return;

    const validatedQty = Math.max(1, Math.min(parsedQty, stock));
    setCart(
      cart.map((item) =>
        item._id === id ? { ...item, qty: validatedQty } : item
      )
    );
  };

  const removeFromCart = (id) => {
    setCart(cart.filter((item) => item._id !== id));
  };

  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * (parseInt(item.qty, 10) || 0),
    0
  );

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (selectedCategory === "All" || product.category === selectedCategory)
  );

  const handleCheckout = async () => {
    if (cart.length === 0 || isProcessing) return;

    setIsProcessing(true);
    try {
      await axios.post(
        "http://localhost:5000/api/sales/create",
        {
          items: cart.map((item) => ({
            productId: item._id,
            quantity: item.qty,
          })),
          paymentMethod,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setLastTransaction({
        items: [...cart],
        total: subtotal,
        date: new Date(),
        method: paymentMethod,
      });
      setShowReceipt(true);
      speak(
        `Transaction successful. Total amount is ${subtotal.toLocaleString()} pesos.`
      );
      setCart([]);
      fetchProducts();
    } catch (err) {
      speak("Error during checkout.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <div className="pos-content">
        <div className="pos-left-side">
          <header className="pos-header-pro">
            <div className="welcome-section">
              <h1>Point of Sale</h1>
              <p>
                {new Date().toLocaleDateString("en-PH", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
            <div className="header-actions">
              <div className="search-wrapper">
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </header>

          <div className="category-tabs">
            {categories.map((cat) => (
              <button
                key={cat}
                className={selectedCategory === cat ? "active" : ""}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <section className="product-scroll-area">
            <div className="pos-grid">
              {filteredProducts.map((product) => (
                <div
                  key={product._id}
                  className={`pos-card ${product.stock === 0 ? "out-of-stock" : ""}`}
                  onClick={() => product.stock > 0 && addToCart(product)}
                >
                  <div className="card-badge">PHP {product.price}</div>
                  <div className="pos-img-box">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="pos-product-image"
                      />
                    ) : (
                      product.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="pos-details">
                    <h4>{product.name}</h4>
                    <p className={product.stock <= 10 ? "low-stock-text" : ""}>
                      {product.stock} in stock
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="checkout-sidebar">
          <div className="order-summary-header">
            <h3>Current Order</h3>
            <span className="item-count">{cart.length} items</span>
          </div>

          <div className="cart-list">
            {cart.length === 0 ? (
              <div className="cart-empty">
                <div className="empty-icon"></div>
                <p>Cart is empty</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item._id} className="cart-item-pro">
                  <div className="cart-item-info">
                    <span className="cart-item-name">{item.name}</span>
                    <span className="cart-item-price">
                      PHP{(item.price * (parseInt(item.qty, 10) || 0)).toLocaleString()}
                    </span>
                  </div>
                  <div className="cart-item-actions">
                    <div className="qty-control">
                      <button onClick={() => updateQty(item._id, -1)}>-</button>
                      <input
                        type="text"
                        className="qty-direct-input"
                        value={item.qty}
                        onChange={(e) =>
                          handleManualQtyChange(item._id, e.target.value, item.stock)
                        }
                      />
                      <button onClick={() => updateQty(item._id, 1)}>+</button>
                    </div>
                    <button
                      className="remove-btn"
                      onClick={() => removeFromCart(item._id)}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="checkout-footer">
            <div className="payment-selection">
              <label className="payment-selection-label">Payment Method:</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="payment-selection-select"
              >
                <option value="Cash">Cash</option>
                <option value="GCash">GCash</option>
              </select>
            </div>

            <div className="price-row">
              <span>Total Amount</span>
              <span className="grand-total">PHP {subtotal.toLocaleString()}</span>
            </div>
            <button
              className="confirm-pay-btn"
              onClick={handleCheckout}
              disabled={cart.length === 0 || isProcessing}
            >
              {isProcessing ? "Processing..." : `PAY VIA ${paymentMethod.toUpperCase()}`}
            </button>
          </div>
        </aside>
      </div>

      {showReceipt &&
        ReactDOM.createPortal(
          <div className="receipt-overlay">
            <div className="receipt-modal">
              <h2>Transaction Successful</h2>
              <p>Paid via {lastTransaction?.method}</p>
              <div className="receipt-details">
                {lastTransaction?.items.map((item) => (
                  <div key={item._id} className="r-line">
                    <span>
                      {item.qty}x {item.name}
                    </span>
                    <span>PHP {(item.price * item.qty).toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="r-total">
                <strong>
                  Total Paid: PHP {lastTransaction?.total.toLocaleString()}
                </strong>
              </div>
              <button
                className="close-receipt"
                onClick={() => setShowReceipt(false)}
              >
                DONE
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

export default POS;
