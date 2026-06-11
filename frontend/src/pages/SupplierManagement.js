import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { FaTruck, FaPlus } from "react-icons/fa";
import API_BASE_URL from "../config/api";
import "./Inventory.css";

function SupplierManagement() {
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [supplierForm, setSupplierForm] = useState({
    name: "",
    contactPerson: "",
    address: "",
    contactNumber: "",
    email: "",
  });
  const [deliveryForm, setDeliveryForm] = useState({
    supplierId: "",
    productId: "",
    quantity: "",
    costPrice: "",
    notes: "",
  });
  const [message, setMessage] = useState("");

  const token = localStorage.getItem("token");

  const fetchData = useCallback(async () => {
    const authConfig = {
      headers: { Authorization: `Bearer ${token}` },
    };
    const [suppliersRes, productsRes, deliveriesRes] = await Promise.all([
      axios.get(`${API_BASE_URL}/suppliers`, authConfig),
      axios.get(`${API_BASE_URL}/products`, authConfig),
      axios.get(`${API_BASE_URL}/suppliers/deliveries`, authConfig),
    ]);
    setSuppliers(Array.isArray(suppliersRes.data) ? suppliersRes.data : []);
    setProducts(Array.isArray(productsRes.data) ? productsRes.data : []);
    setDeliveries(Array.isArray(deliveriesRes.data) ? deliveriesRes.data : []);
  }, [token]);

  useEffect(() => {
    fetchData().catch(() => setMessage("Could not load supplier data."));
  }, [fetchData]);

  const saveSupplier = async (event) => {
    event.preventDefault();
    try {
      const authConfig = {
        headers: { Authorization: `Bearer ${token}` },
      };
      await axios.post(`${API_BASE_URL}/suppliers`, supplierForm, authConfig);
      setSupplierForm({ name: "", contactPerson: "", address: "", contactNumber: "", email: "" });
      setMessage("Supplier saved.");
      fetchData();
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to save supplier.");
    }
  };

  const recordDelivery = async (event) => {
    event.preventDefault();
    try {
      const authConfig = {
        headers: { Authorization: `Bearer ${token}` },
      };
      await axios.post(
        `${API_BASE_URL}/suppliers/deliveries`,
        {
          supplierId: deliveryForm.supplierId,
          notes: deliveryForm.notes,
          items: [
            {
              productId: deliveryForm.productId,
              quantity: deliveryForm.quantity,
              costPrice: deliveryForm.costPrice,
            },
          ],
        },
        authConfig
      );
      setDeliveryForm({ supplierId: "", productId: "", quantity: "", costPrice: "", notes: "" });
      setMessage("Delivery recorded and stock updated.");
      fetchData();
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to record delivery.");
    }
  };

  return (
    <div className="inv-dashboard">
      <div className="inv-container">
        <div className="inv-header">
          <div>
            <h1>Supplier Management</h1>
          </div>
          <div className="records-summary-badge">
            <FaTruck />
            <span>{suppliers.length} Suppliers</span>
          </div>
        </div>

        {message && <p style={{ color: message.includes("Failed") || message.includes("Could") ? "#b91c1c" : "#15803d" }}>{message}</p>}

        <div className="supplier-grid">
          <form className="stock-movement-form stacked" onSubmit={saveSupplier}>
            <h3>Supplier Details</h3>
            {["name", "contactPerson", "address", "contactNumber", "email"].map((field) => (
              <input
                key={field}
                type={field === "email" ? "email" : "text"}
                placeholder={{
                  name: "Supplier Name",
                  contactPerson: "Contact Person",
                  address: "Address",
                  contactNumber: "Contact Number",
                  email: "Email",
                }[field]}
                value={supplierForm[field]}
                onChange={(event) => setSupplierForm({ ...supplierForm, [field]: event.target.value })}
                required={field === "name"}
              />
            ))}
            <button type="submit" className="export-btn"><FaPlus /> Save Supplier</button>
          </form>

          <form className="stock-movement-form stacked" onSubmit={recordDelivery}>
            <h3>Record Delivery</h3>
            <select value={deliveryForm.supplierId} onChange={(event) => setDeliveryForm({ ...deliveryForm, supplierId: event.target.value })} required>
              <option value="">Select supplier</option>
              {suppliers.map((supplier) => <option key={supplier._id} value={supplier._id}>{supplier.name}</option>)}
            </select>
            <select value={deliveryForm.productId} onChange={(event) => setDeliveryForm({ ...deliveryForm, productId: event.target.value })} required>
              <option value="">Select product</option>
              {products.map((product) => <option key={product._id} value={product._id}>{product.name}</option>)}
            </select>
            <input type="number" min="1" placeholder="Quantity" value={deliveryForm.quantity} onChange={(event) => setDeliveryForm({ ...deliveryForm, quantity: event.target.value })} required />
            <input type="number" min="0" step="0.01" placeholder="Cost Price" value={deliveryForm.costPrice} onChange={(event) => setDeliveryForm({ ...deliveryForm, costPrice: event.target.value })} />
            <input type="text" placeholder="Notes" value={deliveryForm.notes} onChange={(event) => setDeliveryForm({ ...deliveryForm, notes: event.target.value })} />
            <button type="submit" className="export-btn"><FaTruck /> Record Delivery</button>
          </form>
        </div>

        <div className="inv-table-card">
          <table className="inv-table">
            <thead>
              <tr>
                <th>Supplier</th>
                <th>Contact Person</th>
                <th>Contact Number</th>
                <th>Email</th>
                <th>Address</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((supplier) => (
                <tr key={supplier._id}>
                  <td className="font-bold">{supplier.name}</td>
                  <td>{supplier.contactPerson || "-"}</td>
                  <td>{supplier.contactNumber || "-"}</td>
                  <td>{supplier.email || "-"}</td>
                  <td>{supplier.address || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="audit-records-section">
          <div className="audit-records-header">
            <h2>Supplier Deliveries</h2>
          </div>
          <div className="inv-table-card">
            <table className="inv-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Supplier</th>
                  <th>Items</th>
                  <th>Total Amount</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.length > 0 ? deliveries.map((delivery) => (
                  <tr key={delivery._id}>
                    <td>{new Date(delivery.date || delivery.createdAt).toLocaleString()}</td>
                    <td className="font-bold">{delivery.supplierName}</td>
                    <td>{delivery.items?.map((item) => `${item.productName} (${item.quantity})`).join(", ")}</td>
                    <td>PHP {Number(delivery.totalAmount || 0).toLocaleString()}</td>
                    <td>{delivery.notes || "-"}</td>
                  </tr>
                )) : (
                  <tr><td colSpan="5" className="empty-state-cell">No supplier deliveries yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SupplierManagement;
