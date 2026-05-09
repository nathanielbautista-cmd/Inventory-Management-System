import React, { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { FaMicrophone, FaSpinner } from "react-icons/fa";
import "./InventoryAudit.css";

function InventoryAudit() {
  const [products, setProducts] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [countInputs, setCountInputs] = useState({});
  const [activeVoiceProductId, setActiveVoiceProductId] = useState(null);
  const recognitionRef = useRef(null);

  const token = localStorage.getItem("token");

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

  const extractCountFromSpeech = (speechResult) => {
    const digitMatch = speechResult.match(/\d+/);
    if (digitMatch) return digitMatch[0];

    const wordToNumber = {
      zero: 0,
      one: 1,
      two: 2,
      three: 3,
      four: 4,
      five: 5,
      six: 6,
      seven: 7,
      eight: 8,
      nine: 9,
      ten: 10,
      eleven: 11,
      twelve: 12,
      thirteen: 13,
      fourteen: 14,
      fifteen: 15,
      sixteen: 16,
      seventeen: 17,
      eighteen: 18,
      nineteen: 19,
      twenty: 20,
      thirty: 30,
      forty: 40,
      fifty: 50,
      sixty: 60,
      seventy: 70,
      eighty: 80,
      ninety: 90,
      hundred: 100,
    };

    const normalizedWords = speechResult
      .toLowerCase()
      .replace(/[^a-z\s-]/g, " ")
      .split(/[\s-]+/)
      .filter(Boolean);

    let total = 0;
    let current = 0;

    normalizedWords.forEach((word) => {
      const value = wordToNumber[word];
      if (value === undefined) return;

      if (value === 100) {
        current = current === 0 ? value : current * value;
        return;
      }

      current += value;
    });

    total += current;
    return total > 0 || normalizedWords.includes("zero") ? String(total) : "";
  };

  const updateCountInput = (productId, value) => {
    if (value === "" || /^\d+$/.test(value)) {
      setCountInputs((current) => ({ ...current, [productId]: value }));
    }
  };

  const handleRecordAudit = (productId, physicalCount) => {
    if (physicalCount === "" || physicalCount < 0) return;

    const product = products.find((item) => item._id === productId);
    const count = parseInt(physicalCount, 10);
    const variance = count - product.stock;

    const newLog = {
      name: product.name,
      system: product.stock,
      physical: count,
      variance,
      time: new Date().toLocaleTimeString(),
    };

    setAuditLogs((currentLogs) => [newLog, ...currentLogs]);

    const feedbackText =
      variance === 0
        ? `Recorded ${product.name}. Stock is perfect.`
        : `Recorded ${product.name}. Variance is ${variance}.`;
    speak(feedbackText);
    setCountInputs((current) => ({ ...current, [productId]: "" }));
  };

  const startVoiceCommand = (productId, productName) => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      speak("Speech to text is not supported in this browser.");
      return;
    }

    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-PH";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;
    setActiveVoiceProductId(productId);
    speak(`Counting ${productName}`);

    recognition.onresult = (event) => {
      const speechResult = event.results[0][0].transcript;
      const parsedCount = extractCountFromSpeech(speechResult);

      if (!parsedCount) {
        speak(`I could not detect a number for ${productName}. Please try again.`);
        return;
      }

      updateCountInput(productId, parsedCount);
      handleRecordAudit(productId, parsedCount);
    };

    recognition.onerror = () => {
      speak(`Voice capture failed for ${productName}. Please try again.`);
    };

    recognition.onend = () => {
      setActiveVoiceProductId(null);
      recognitionRef.current = null;
    };

    recognition.start();
  };

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const lowStockItems = products.filter(
    (product) => product.stock > 0 && product.stock <= 10
  ).length;
  const outOfStockItems = products.filter((product) => product.stock === 0).length;

  return (
    <div className="inventory-audit-section animate-slide-up">
      <header className="audit-header-fancy">
        <div className="welcome-section">
          <h1>Inventory Audit</h1>
        </div>
        <div className="audit-stats-container">
          <div
            className="mini-stat"
            onClick={() => speak(`Total items in inventory is ${products.length}`)}
          >
            <span className="label">Total Items</span>
            <span className="value">{products.length}</span>
          </div>
          <div
            className="mini-stat warning"
            onClick={() => speak(`You have ${lowStockItems} low stock items`)}
          >
            <span className="label">Low Stock</span>
            <span className="value">{lowStockItems}</span>
          </div>
          <div
            className="mini-stat danger"
            onClick={() =>
              speak(`There are ${outOfStockItems} items out of stock`)
            }
          >
            <span className="label">Out of Stock</span>
            <span className="value">{outOfStockItems}</span>
          </div>
        </div>
      </header>

      <div className="audit-table-container">
        <table className="audit-table">
          <thead>
            <tr>
              <th>Product</th>
              <th className="text-center">Stock Record</th>
              <th className="text-center">Status</th>
              <th>Physical Count (Observe)</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const isOut = product.stock === 0;
              const isLow = product.stock > 0 && product.stock <= 10;

              return (
                <tr
                  key={product._id}
                  className={isOut ? "row-out" : isLow ? "row-low" : ""}
                >
                  <td>
                    <div className="p-cell">
                      <div className="p-icon">{product.name.charAt(0).toUpperCase()}</div>
                      <div>
                        <div
                          className="p-name"
                          onClick={() =>
                            speak(
                              `${product.name} stock is ${product.stock} status is ${
                                isOut ? "empty" : isLow ? "low stock" : "in stock"
                              }`
                            )
                          }
                        >
                          {product.name}
                        </div>
                        <div className="p-category">{product.category}</div>
                      </div>
                    </div>
                  </td>
                  <td className="text-center">
                    <span className="accounting-count">{product.stock}</span>
                  </td>
                  <td className="text-center">
                    <span
                      className={`status-pill ${
                        isOut ? "pill-danger" : isLow ? "pill-warning" : "pill-success"
                      }`}
                    >
                      {isOut ? "Empty" : isLow ? "Low Stock" : "In Stock"}
                    </span>
                  </td>
                  <td>
                    <div className="audit-input-group">
                      <input
                        type="number"
                        placeholder="Counted"
                        className="audit-qty-field"
                        inputMode="numeric"
                        min="0"
                        step="1"
                        value={countInputs[product._id] ?? ""}
                        onChange={(e) =>
                          updateCountInput(product._id, e.target.value)
                        }
                        onKeyDown={(e) => {
                          const allowedKeys = [
                            "Backspace",
                            "Delete",
                            "ArrowLeft",
                            "ArrowRight",
                            "Tab",
                            "Enter",
                          ];

                          if (
                            !allowedKeys.includes(e.key) &&
                            !/^\d$/.test(e.key)
                          ) {
                            e.preventDefault();
                            return;
                          }

                          if (e.key === "Enter") {
                            handleRecordAudit(product._id, countInputs[product._id] ?? "");
                          }
                        }}
                        onPaste={(e) => {
                          const pastedText = e.clipboardData.getData("text");
                          if (!/^\d+$/.test(pastedText)) {
                            e.preventDefault();
                          }
                        }}
                      />
                      <button
                        className="voice-mic-btn"
                        onClick={() => startVoiceCommand(product._id, product.name)}
                        aria-label={`Start voice count for ${product.name}`}
                        title={`Speak the physical count for ${product.name}`}
                        type="button"
                      >
                        {activeVoiceProductId === product._id ? (
                          <FaSpinner className="voice-icon-spinning" />
                        ) : (
                          <FaMicrophone />
                        )}
                      </button>
                      <button
                        className="audit-sync-btn"
                        type="button"
                        onClick={() => {
                          handleRecordAudit(product._id, countInputs[product._id] ?? "");
                        }}
                      >
                        Record
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="variance-history">
        <h3>   Record List</h3>
        <table className="variance-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Product</th>
              <th>Stocks</th>
              <th>Counted</th>
              <th>Variance</th>
            </tr>
          </thead>
          <tbody>
            {auditLogs.map((log, index) => (
              <tr key={index}>
                <td>{log.time}</td>
                <td>{log.name}</td>
                <td>{log.system}</td>
                <td>{log.physical}</td>
                <td
                  className={
                    log.variance < 0
                      ? "variance-negative"
                      : log.variance > 0
                      ? "variance-positive"
                      : "variance-neutral"
                  }
                >
                  {log.variance}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default InventoryAudit;
