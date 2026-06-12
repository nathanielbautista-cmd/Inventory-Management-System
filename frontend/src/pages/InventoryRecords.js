import React, { useEffect, useState } from "react";
import axios from "axios";
import { FaClipboardList, FaTimes } from "react-icons/fa";
import API_BASE_URL from "../config/api";
import "./Inventory.css";

const getDateInputValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const isRecordInDateRange = (record, dateFrom, dateTo) => {
  const recordDate = record.createdAt ? new Date(record.createdAt) : null;

  if (!recordDate || Number.isNaN(recordDate.getTime())) {
    return false;
  }

  if (dateFrom) {
    const fromDate = new Date(`${dateFrom}T00:00:00`);
    if (recordDate < fromDate) return false;
  }

  if (dateTo) {
    const toDate = new Date(`${dateTo}T23:59:59`);
    if (recordDate > toDate) return false;
  }

  return true;
};

function formatVariance(variance) {
  return variance > 0 ? `+${variance}` : String(variance);
}

function InventoryRecords() {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [dateFrom, setDateFrom] = useState(() => {
    const start = new Date();
    start.setDate(start.getDate() - 29);
    return getDateInputValue(start);
  });
  const [dateTo, setDateTo] = useState(() => getDateInputValue(new Date()));

  useEffect(() => {
    fetchAuditLogs();

    const handleRefresh = () => {
      if (document.visibilityState === "visible") {
        fetchAuditLogs();
      }
    };

    window.addEventListener("focus", handleRefresh);
    document.addEventListener("visibilitychange", handleRefresh);

    return () => {
      window.removeEventListener("focus", handleRefresh);
      document.removeEventListener("visibilitychange", handleRefresh);
    };
  }, []);

  const fetchAuditLogs = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/inventory-audits`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      setAuditLogs(res.data);
      setFetchError("");
    } catch (err) {
      console.error("Error fetching inventory audits:", err);
      setFetchError("Could not refresh inventory records. Retrying when the page becomes active.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loader-container"><div className="spinner"></div></div>;

  const filteredAuditLogs = auditLogs.filter((log) =>
    isRecordInDateRange(log, dateFrom, dateTo)
  );
  const selectedStaffLogs = selectedStaff
    ? filteredAuditLogs.filter((log) => {
        const selectedStaffId = selectedStaff.auditedBy?._id || selectedStaff.auditedBy?.email || selectedStaff.auditedBy?.name;
        const currentStaffId = log.auditedBy?._id || log.auditedBy?.email || log.auditedBy?.name;
        return selectedStaffId && currentStaffId && selectedStaffId === currentStaffId;
      })
    : [];
  const staffSummaries = Object.values(
    filteredAuditLogs.reduce((accumulator, log) => {
      const staffKey =
        log.auditedBy?._id || log.auditedBy?.email || log.auditedBy?.name || `unknown-${log._id}`;

      if (!accumulator[staffKey]) {
        accumulator[staffKey] = {
          staffKey,
          auditedBy: log.auditedBy || null,
          latestDate: log.createdAt,
          recordCount: 0,
        };
      }

      accumulator[staffKey].recordCount += 1;

      if (new Date(log.createdAt) > new Date(accumulator[staffKey].latestDate)) {
        accumulator[staffKey].latestDate = log.createdAt;
      }

      return accumulator;
    }, {})
  ).sort((firstStaff, secondStaff) => new Date(secondStaff.latestDate) - new Date(firstStaff.latestDate));

  return (
    <div className="inv-dashboard">
      <div className="inv-container">
        <div className="inv-header">
          <div>
            <h1>Inventory Audit Record </h1>
          </div>
          <div className="inventory-header-actions">
            <div className="inventory-date-range">
              <label>
                <span>From</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                />
              </label>
              <label>
                <span>To</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                />
              </label>
            </div>
            <div className="records-summary-badge">
              <FaClipboardList />
              <span>{staffSummaries.length} Staff</span>
            </div>
          </div>
        </div>

        {fetchError && <p style={{ color: "#b91c1c", marginBottom: "12px" }}>{fetchError}</p>}

        <div className="inv-table-card">
          <table className="inv-table">
            <thead>
              <tr>
                <th>Staff Name</th>
                <th>Staff Email</th>
                <th>Latest Date</th>
                <th>Total Records</th>
              </tr>
            </thead>
            <tbody>
              {staffSummaries.length > 0 ? (
                staffSummaries.map((staff) => {
                  const createdAt = new Date(staff.latestDate);

                  return (
                    <tr key={staff.staffKey}>
                      <td>
                        <button
                          type="button"
                          className="staff-name-button"
                          onClick={() => setSelectedStaff(staff)}
                        >
                          {staff.auditedBy?.name || "Unknown User"}
                        </button>
                      </td>
                      <td>{staff.auditedBy?.email || "No email available"}</td>
                      <td>{createdAt.toLocaleDateString()}</td>
                      <td>{staff.recordCount}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="4" className="empty-state-cell">
                    No inventory audit records yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {selectedStaff ? (
          <div className="record-modal-backdrop" onClick={() => setSelectedStaff(null)}>
            <div
              className="record-modal"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="record-modal-header">
                <div>
                  <h2>{selectedStaff.auditedBy?.name || "Unknown User"} Records</h2>
              
                </div>
                <button
                  type="button"
                  className="record-modal-close"
                  onClick={() => setSelectedStaff(null)}
                >
                  <FaTimes />
                </button>
              </div>

              <div className="staff-records-table-wrap">
                <table className="inv-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Product</th>
                      <th>Category</th>
                      <th>Stock Record</th>
                      <th>Physical Count</th>
                      <th>Variance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedStaffLogs.map((log) => (
                      <tr key={log._id}>
                        <td>{new Date(log.createdAt).toLocaleDateString()}</td>
                        <td className="font-bold">{log.productName}</td>
                        <td>{log.category}</td>
                        <td>{log.systemStock}</td>
                        <td>{log.physicalCount}</td>
                        <td>
                          <span
                            className={`status-pill ${
                              log.variance === 0
                                ? "verified"
                                : log.variance > 0
                                ? "warning"
                                : "danger"
                            }`}
                          >
                            {formatVariance(log.variance)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default InventoryRecords;
