import React, { useEffect, useState } from "react";
import axios from "axios";
import ReactDOM from "react-dom";
import {
  FaPlus, FaEdit, FaTrash, FaSearch,
  FaBox, FaArrowRight, FaCheckCircle, FaExclamationCircle
} from "react-icons/fa";
import "./ManageProducts.css";

function ManageProducts() {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [fetchError, setFetchError] = useState("");
  const [feedback, setFeedback] = useState({ message: "", type: "", visible: false });

  const [formData, setFormData] = useState({
    name: "",
    category: "",
    initialPrice: "",
    price: "",
    stock: "",
    image: "",
    status: "Active",
  });

  const showFeedback = (msg, type = "success") => {
    setFeedback({ message: msg, type, visible: true });
    setTimeout(() => {
      setFeedback((prev) => ({ ...prev, visible: false }));
    }, 4000);
  };

  const fetchProducts = async () => {
    try {
      const config = {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      };
      const res = await axios.get("http://localhost:5000/api/products", config);
      setProducts(res.data);
      setFetchError("");
    } catch (err) {
      console.error(err);
      setFetchError("Could not refresh products. Retrying when the page becomes active.");
    }
  };

  useEffect(() => {
    fetchProducts();

    const handleRefresh = () => {
      if (document.visibilityState === "visible") {
        fetchProducts();
      }
    };

    window.addEventListener("focus", handleRefresh);
    document.addEventListener("visibilitychange", handleRefresh);

    return () => {
      window.removeEventListener("focus", handleRefresh);
      document.removeEventListener("visibilitychange", handleRefresh);
    };
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) {
      setFormData((current) => ({ ...current, image: "" }));
      return;
    }

    if (!file.type.startsWith("image/")) {
      showFeedback("Please select a valid image file.", "error");
      e.target.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showFeedback("Image must be 2MB or smaller.", "error");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormData((current) => ({
        ...current,
        image: typeof reader.result === "string" ? reader.result : "",
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const initialPriceNum = parseFloat(formData.initialPrice);
    const priceNum = parseFloat(formData.price);
    const stockNum = parseInt(formData.stock);

    if (isNaN(initialPriceNum) || isNaN(priceNum) || isNaN(stockNum)) {
      return showFeedback("Invalid values detected.", "error");
    }
    if (priceNum < initialPriceNum) {
      return showFeedback("Selling Price cannot be lower than Capital!", "error");
    }

    const dataToSend = {
      ...formData,
      initialPrice: initialPriceNum,
      price: priceNum,
      stock: stockNum,
      profit: priceNum - initialPriceNum,
    };

    try {
      const config = {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      };
      if (editingProduct) {
        await axios.put(`http://localhost:5000/api/products/${editingProduct._id}`, dataToSend, config);
        showFeedback("Product updated successfully!", "success");
      } else {
        await axios.post("http://localhost:5000/api/products", dataToSend, config);
        showFeedback("Product created successfully!", "success");
      }
      closeModal();
      fetchProducts();
    } catch (err) {
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data ||
        "Error saving product to database.";
      showFeedback(String(errorMessage), "error");
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || "",
      category: product.category || "",
      initialPrice: product.initialPrice ?? "",
      price: product.price ?? "",
      stock: product.stock ?? "",
      image: product.image || "",
      status: product.status || "Active",
    });
    setShowModal(true);
  };

  const confirmDelete = async () => {
    try {
      const config = {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      };
      await axios.delete(`http://localhost:5000/api/products/${selectedProduct._id}`, config);
      showFeedback("Product deleted successfully.", "success");
      setShowDeleteModal(false);
      fetchProducts();
    } catch (err) {
      showFeedback("Delete failed. Please try again.", "error");
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setFormData({
      name: "",
      category: "",
      initialPrice: "",
      price: "",
      stock: "",
      image: "",
      status: "Active",
    });
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="manage-wrapper">
      {/* ITO ANG FEEDBACK - Naka-isolate ito sa taas */}
      <div className={`toast-wrapper ${feedback.visible ? "show" : ""}`}>
        <div className={`toast-notification ${feedback.type}`}>
          {feedback.type === "success" ? <FaCheckCircle /> : <FaExclamationCircle />}
          <span>{feedback.message}</span>
        </div>
      </div>

      <div className="manage-header">
        {/* ... rest of your header code ... */}
      </div>

      {/* ... rest of your table code ... */}

      <div className="manage-header">
        <div className="title-section">
          <h1>Product Management</h1>
          <p>Create, update, and organize your inventory items.</p>
        </div>
        <button className="add-btn" onClick={() => setShowModal(true)}>
          <FaPlus /> Add Product
        </button>
      </div>

      <div className="action-bar">
        <div className="search-box">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="stats-mini">
          Total Products: <strong>{products.length}</strong>
        </div>
      </div>

      {fetchError && <p style={{ color: "#b91c1c", marginBottom: "12px" }}>{fetchError}</p>}

      <div className="table-responsive">
        <table className="modern-table">
          <thead>
            <tr>
              <th>Item Details</th>
              <th>Category</th>
              <th>Pricing (Capital - Sale)</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((p) => (
              <tr key={p._id}>
                <td className="item-name-cell">
                  <div className="item-icon product-thumb">
                    {p.image ? (
                      <img src={p.image} alt={p.name} className="product-thumb-image" />
                    ) : (
                      <FaBox />
                    )}
                  </div>
                  <span>{p.name}</span>
                </td>
                <td><span className="cat-pill">{p.category}</span></td>
                <td>
                  <div className="price-flow">
                    <span className="cap-price">PHP {p.initialPrice}</span>
                    <FaArrowRight className="flow-arrow" />
                    <span className="sell-price">PHP {p.price}</span>
                  </div>
                </td>
                <td>
                  <div className={`stock-count ${p.stock < 10 ? "critical" : ""}`}>
                    {p.stock}
                  </div>
                </td>
                <td>
                  <span className={`status-badge ${p.status.toLowerCase()}`}>
                    {p.status}
                  </span>
                </td>
                <td className="action-btns">
                  <button className="edit-btn-sm" onClick={() => handleEdit(p)}><FaEdit /></button>
                  <button className="delete-btn-sm" onClick={() => { setSelectedProduct(p); setShowDeleteModal(true); }}><FaTrash /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ADD / EDIT MODAL */}
      {showModal && ReactDOM.createPortal(
        <div className="modal-overlay" onClick={closeModal}>
          <div className="glass-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editingProduct ? "Update Item" : "New Inventory Item"}</h3>
            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <label>Product Name</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} required />
              </div>
              <div className="input-row">
                <div className="input-group">
                  <label>Category</label>
                  <input type="text" name="category" value={formData.category} onChange={handleChange} required />
                </div>
                <div className="input-group">
                  <label>Initial Price</label>
                  <input type="number" name="initialPrice" value={formData.initialPrice} onChange={handleChange} required />
                </div>
              </div>
              <div className="input-row">
                <div className="input-group">
                  <label>Selling Price</label>
                  <input type="number" name="price" value={formData.price} onChange={handleChange} required />
                </div>
                <div className="input-group">
                  <label>Stock</label>
                  <input type="number" name="stock" value={formData.stock} onChange={handleChange} required />
                </div>
              </div>
              <div className="input-group">
                <label>Product Image</label>
                <input type="file" accept="image/*" onChange={handleImageChange} />
                <small className="input-helper">Upload a clear product image up to 2MB.</small>
                {formData.image && (
                  <div className="product-preview">
                    <img
                      src={formData.image}
                      alt="Product preview"
                      className="product-preview-image"
                    />
                  </div>
                )}
              </div>
              <div className="input-group">
                <label>Status</label>
                <select name="status" value={formData.status} onChange={handleChange}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="submit" className="save-btn">Confirm Save</button>
                <button type="button" className="cancel-btn" onClick={closeModal}>Cancel</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteModal && ReactDOM.createPortal(
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="glass-modal delete-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="delete-icon-circle"><FaTrash /></div>
            <h3>Remove Product?</h3>
            <p>Are you sure you want to delete <strong>{selectedProduct?.name}</strong>? This action cannot be undone.</p>
            <div className="modal-actions">
              <button className="confirm-delete-btn" onClick={confirmDelete}>Yes, Delete</button>
              <button className="cancel-btn" onClick={() => setShowDeleteModal(false)}>Keep Product</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default ManageProducts;
