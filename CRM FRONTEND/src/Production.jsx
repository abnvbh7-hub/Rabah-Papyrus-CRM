import Footer from "/comps/Footer.jsx";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Sparkles, Settings, Calendar, RefreshCw, FileText, CheckCircle, Clock, Play } from "lucide-react";
import { BASE_URL } from "./config";

export default function Production() {
  const nav = useNavigate();
  const [role, setRole] = useState("");
  const [production, setProduction] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Update modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedProd, setSelectedProd] = useState(null);
  const [prodForm, setProdForm] = useState({ status: "PENDING", expected_completion_date: "", remarks: "" });
  const [updating, setUpdating] = useState(false);

  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedDetails, setSelectedDetails] = useState(null);

  const handleRowClick = (prod) => {
    setSelectedDetails(prod);
    setShowDetailsModal(true);
  };

  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) {
      nav("/login");
      return;
    }
    fetchMe();
    fetchProduction();
  }, [token]);

  const fetchMe = async () => {
    try {
      const res = await fetch(`${BASE_URL}/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.payload) {
        setRole(data.payload.role.toLowerCase());
      }
    } catch (err) {
      console.error("Error fetching user info:", err);
    }
  };

  const fetchProduction = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/production`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === "success") {
        setProduction(data.production || []);
      }
    } catch (err) {
      console.error("Error fetching production queue:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateClick = (prod) => {
    setSelectedProd(prod);
    setProdForm({
      status: prod.status || "PENDING",
      expected_completion_date: prod.expected_completion_date ? prod.expected_completion_date.split("T")[0] : "",
      remarks: prod.remarks || ""
    });
    setShowModal(true);
  };

  const handleProdSubmit = async (e) => {
    e.preventDefault();
    setUpdating(true);
    try {
      const res = await fetch(`${BASE_URL}/production/${selectedProd.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(prodForm)
      });
      const data = await res.json();
      if (data.status === "success") {
        alert("Production stage updated successfully!");
        setShowModal(false);
        setSelectedProd(null);
        fetchProduction();
      } else {
        alert(data.message || "Failed to update production");
      }
    } catch (err) {
      console.error("Error updating production:", err);
    } finally {
      setUpdating(false);
    }
  };

  const filteredProduction = production.filter(prod =>
    prod.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prod.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (prod.product_type && prod.product_type.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const isAdmin = role === "admin";
  const isProductionUser = role === "production" || isAdmin;

  // Stats helper
  const getStat = (status) => production.filter(p => p.status === status).length;

  return (
    <>
      <div className="main-db">
        {/* Header */}
        <div className="dia">
          <div className="in-scr">
            <div className="dia-x">Production Pipeline</div>
            <div className="dia-y">Manage manufacturing queues, update stages (Printing, Pasting, Packing), and monitor expected completion dates</div>
          </div>
          <div>
            <button className="btn-premium" onClick={fetchProduction} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <RefreshCw size={14} /> Sync Pipeline
            </button>
          </div>
        </div>

        {/* Dashboard summary widgets */}
        <div className="card-mc">
          <div className="hm-card">
            <div className="hmmc">
              <div className="hm-card-x">Pending Stage</div>
              <div className="hm-card-y">{getStat("PENDING")}</div>
              <div className="hm-card-z-r">Queue to start</div>
            </div>
            <Clock className="card-img" size={32} />
          </div>

          <div className="hm-card">
            <div className="hmmc">
              <div className="hm-card-x">Printing / Pasting</div>
              <div className="hm-card-y">{getStat("PRINTING") + getStat("PASTING")}</div>
              <div className="hm-card-z">In manufacturing</div>
            </div>
            <Play className="card-img" size={32} />
          </div>

          <div className="hm-card">
            <div className="hmmc">
              <div className="hm-card-x">Packing stage</div>
              <div className="hm-card-y">{getStat("PACKING")}</div>
              <div className="hm-card-z">Final wrap up</div>
            </div>
            <FileText className="card-img" size={32} />
          </div>

          <div className="hm-card">
            <div className="hmmc">
              <div className="hm-card-x">Completed today</div>
              <div className="hm-card-y">{getStat("COMPLETED")}</div>
              <div className="hm-card-z">Ready for billing</div>
            </div>
            <CheckCircle className="card-img" size={32} />
          </div>
        </div>

        {/* Search */}
        <div className="hrow1-x">
          <input
            type="text"
            className="searchbar"
            placeholder="Search by order number, client company or product specification..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="linimg" size={18} />
        </div>

        {/* Production Queue Table */}
        <div className="lr2">
          <div className="table-header">Active Manufacturing Queue</div>
          {loading ? (
            <p style={{ padding: "20px", color: "#64748b" }}>Loading production runs...</p>
          ) : filteredProduction.length === 0 ? (
            <p style={{ padding: "20px", color: "#64748b" }}>No active production queue records found.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="lead-table">
                <thead>
                  <tr>
                    <th>Order Ref</th>
                    <th>Client Name</th>
                    <th>Specification</th>
                    <th>Quantity</th>
                    <th>Target Date</th>
                    <th>Status Stage</th>
                    <th>Remarks</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProduction.map((prod) => (
                    <tr key={prod.id}>
                      <td style={{ fontWeight: "600", color: "#0f172a" }}>{prod.order_number}</td>
                      <td>{prod.company_name}</td>
                      <td>
                        <div style={{ fontSize: "12px" }}>{prod.product_type}</div>
                        <div style={{ fontSize: "11px", color: "#64748b" }}>{prod.size} / {prod.gsm}gsm / {prod.color}</div>
                      </td>
                      <td style={{ fontWeight: "bold" }}>{prod.quantity}</td>
                      <td>
                        {prod.expected_completion_date 
                          ? new Date(prod.expected_completion_date).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" }) 
                          : "Unassigned"}
                      </td>
                      <td>
                        <span className={
                          prod.status === "COMPLETED" ? "status-done" :
                          prod.status === "PENDING" ? "status-todo" : "status-progress"
                        }>
                          {prod.status}
                        </span>
                      </td>
                      <td style={{ fontSize: "12px", color: "#64748b" }}>{prod.remarks || "No remarks"}</td>
                      <td style={{ display: "flex", gap: "6px" }}>
                        <button
                          className="btn-convert"
                          style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#f1f5f9", color: "#0f172a", border: "1px solid #cbd5e1" }}
                          onClick={() => handleRowClick(prod)}
                        >
                          <FileText size={12} /> View
                        </button>
                        <button
                          className="btn-convert"
                          style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                          onClick={() => handleUpdateClick(prod)}
                          disabled={!isProductionUser}
                        >
                          <Settings size={12} /> Update
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Production Status Modal */}
      {showModal && selectedProd && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="employee-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-top">
              <h2>Staging: Update Production Status</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleProdSubmit} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              <div className="emp-field">
                <span>Order Reference</span>
                <p>{selectedProd.order_number} ({selectedProd.company_name})</p>
              </div>

              <div>
                <label style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "6px" }}>Current Stage Step</label>
                <select 
                  className="searchbar"
                  value={prodForm.status}
                  onChange={e => setProdForm({ ...prodForm, status: e.target.value })}
                >
                  <option value="PENDING">PENDING</option>
                  <option value="PRINTING">PRINTING</option>
                  <option value="PASTING">PASTING</option>
                  <option value="PACKING">PACKING</option>
                  <option value="OUT FOR DELIVERY">OUT FOR DELIVERY</option>
                  <option value="COMPLETED">COMPLETED</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "6px" }}>Expected Completion Date</label>
                <input 
                  type="date"
                  className="searchbar"
                  value={prodForm.expected_completion_date}
                  onChange={e => setProdForm({ ...prodForm, expected_completion_date: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "6px" }}>Remarks / Notes</label>
                <textarea 
                  className="searchbar"
                  style={{ minHeight: "100px", resize: "none" }}
                  placeholder="Record step updates or potential delay issues..."
                  value={prodForm.remarks}
                  onChange={e => setProdForm({ ...prodForm, remarks: e.target.value })}
                />
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <button type="submit" className="btn-premium" style={{ flex: 1 }} disabled={updating}>
                  {updating ? "Saving..." : "Save Status Info"}
                </button>
                <button type="button" className="btn-cancel" style={{ flex: 1 }} onClick={() => setShowModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Production Details Modal */}
      {showDetailsModal && selectedDetails && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="employee-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: "600px" }}>
            <div className="modal-top" style={{ borderBottom: "1px solid rgba(15,23,42,0.08)", paddingBottom: "15px", marginBottom: "15px" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "bold" }}>Production Order Details</h2>
                <p style={{ color: "#64748b", margin: "4px 0 0 0", fontSize: "14px" }}>Order Ref: {selectedDetails.order_number}</p>
              </div>
              <button className="close-btn" onClick={() => setShowDetailsModal(false)}>✕</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              {/* Client & Status */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                <div>
                  <span style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "2px" }}>Client / Company</span>
                  <strong style={{ color: "#0f172a" }}>{selectedDetails.company_name}</strong>
                </div>
                <div>
                  <span style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "2px" }}>Current Stage Status</span>
                  <span className={
                    selectedDetails.status === "COMPLETED" ? "status-done" :
                    selectedDetails.status === "PENDING" ? "status-todo" : "status-progress"
                  } style={{ display: "inline-block", marginTop: "2px" }}>
                    {selectedDetails.status}
                  </span>
                </div>
              </div>

              {/* Specifications Section */}
              <div style={{ borderTop: "1px dashed rgba(15,23,42,0.1)", paddingTop: "15px" }}>
                <h4 style={{ fontSize: "13px", fontWeight: "bold", color: "#4f46e5", margin: "0 0 12px 0" }}>Product Requirements</h4>
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "15px", marginBottom: "12px" }}>
                  <div>
                    <span style={{ fontSize: "11px", color: "#64748b", display: "block" }}>Product Type</span>
                    <span style={{ fontSize: "14px", fontWeight: "600", color: "#0f172a" }}>{selectedDetails.product_type || "N/A"}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: "11px", color: "#64748b", display: "block" }}>Dimensions / Size</span>
                    <span style={{ fontSize: "14px", fontWeight: "600", color: "#0f172a" }}>{selectedDetails.size || "N/A"}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: "11px", color: "#64748b", display: "block" }}>GSM Weight</span>
                    <span style={{ fontSize: "14px", fontWeight: "600", color: "#0f172a" }}>{selectedDetails.gsm || "N/A"} GSM</span>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "15px" }}>
                  <div>
                    <span style={{ fontSize: "11px", color: "#64748b", display: "block" }}>Paper Color</span>
                    <span style={{ fontSize: "14px", fontWeight: "600", color: "#0f172a" }}>{selectedDetails.color || "N/A"}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: "11px", color: "#64748b", display: "block" }}>Handles Spec</span>
                    <span style={{ fontSize: "14px", fontWeight: "600", color: "#0f172a" }}>{selectedDetails.handles || "N/A"}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: "11px", color: "#64748b", display: "block" }}>Print Color</span>
                    <span style={{ fontSize: "14px", fontWeight: "600", color: "#0f172a" }}>{selectedDetails.print_color || "N/A"}</span>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "15px", marginTop: "12px" }}>
                  <div>
                    <span style={{ fontSize: "11px", color: "#64748b", display: "block" }}>Bag Type</span>
                    <span style={{ fontSize: "14px", fontWeight: "600", color: "#0f172a" }}>{selectedDetails.bag_type || "N/A"}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: "11px", color: "#64748b", display: "block" }}>Target Quantity</span>
                    <span style={{ fontSize: "14px", fontWeight: "bold", color: "#0f172a" }}>{selectedDetails.quantity} units</span>
                  </div>
                  <div>
                    {/* Spacer */}
                  </div>
                </div>
              </div>

              {/* Timeline Dates */}
              <div style={{ borderTop: "1px dashed rgba(15,23,42,0.1)", paddingTop: "15px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "15px" }}>
                <div>
                  <span style={{ fontSize: "11px", color: "#64748b", display: "block" }}>Started At</span>
                  <span style={{ fontSize: "13px", color: "#0f172a" }}>
                    {selectedDetails.started_at 
                      ? new Date(selectedDetails.started_at).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" }) 
                      : "Not Started"}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: "11px", color: "#64748b", display: "block" }}>Expected Target Date</span>
                  <span style={{ fontSize: "13px", color: "#0f172a" }}>
                    {selectedDetails.expected_completion_date 
                      ? new Date(selectedDetails.expected_completion_date).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" }) 
                      : "Unassigned"}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: "11px", color: "#64748b", display: "block" }}>Completed At</span>
                  <span style={{ fontSize: "13px", color: "#0f172a" }}>
                    {selectedDetails.completed_at 
                      ? new Date(selectedDetails.completed_at).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" }) 
                      : "In Production"}
                  </span>
                </div>
              </div>

              {/* Remarks / Notes */}
              <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid rgba(15,23,42,0.08)", marginTop: "5px" }}>
                <span style={{ fontSize: "11px", color: "#64748b", display: "block", marginBottom: "4px" }}>Production Remarks</span>
                <p style={{ color: "#0f172a", fontSize: "13px", margin: 0, lineHeight: "1.5" }}>{selectedDetails.remarks || "No remarks recorded for this run."}</p>
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "20px", borderTop: "1px solid rgba(15,23,42,0.08)", paddingTop: "15px" }}>
              <button className="btn-cancel" style={{ width: "100%" }} onClick={() => setShowDetailsModal(false)}>
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}
