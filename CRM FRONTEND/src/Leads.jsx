import { useState, useEffect } from "react";
import Footer from "/comps/Footer.jsx";
import "./App.css";
import LeadForm from "/comps/addLead.jsx";
import { useNavigate } from "react-router-dom";
import { Search, Sparkles, Users, Target, Plus, ShieldCheck, ArrowRight, Edit3, Trash2, AlertCircle } from "lucide-react";
import { BASE_URL } from "./config";

export default function Leads() {
  const [overlay, setOverlay] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedLeadDetails, setSelectedLeadDetails] = useState(null);

  const [leads, setLeads] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const nav = useNavigate();
  const isAdmin = role === "admin" || role === "hr";

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      nav("/login");
    } else {
      fetchUserRole();
      fetchUsers();
      fetchLeads();
    }
  }, []);

  const fetchUserRole = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${BASE_URL}/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.payload) {
        setRole(data.payload.role.toLowerCase());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsers = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${BASE_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === "success") {
        setUsers(data.users);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  };

  const fetchLeads = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${BASE_URL}/leads`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === "success") {
        setLeads(data.leads);
        // Refresh details modal lead if it is currently open
        if (selectedLeadDetails) {
            const updatedLead = data.leads.find(l => l.id === selectedLeadDetails.id);
            if (updatedLead) setSelectedLeadDetails(updatedLead);
            else setShowDetailsModal(false);
        }
      } else {
        alert("Failed to fetch leads");
      }
    } catch (error) {
      console.error("Error fetching leads:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyLead = async (lead) => {
    if (!window.confirm(`Verify lead "${lead.name}"?`)) return;
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${BASE_URL}/lead/${lead.id}/verify`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === "success") {
        fetchLeads();
        setShowDetailsModal(false);
      } else {
        alert(data.message || "Verification failed");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleConvertToDeal = async (lead) => {
    if (!lead.is_verified) {
      alert("Lead must be verified before converting to a deal.");
      return;
    }
    if (!window.confirm(`Convert lead "${lead.name}" to a deal?`)) return;
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${BASE_URL}/lead/${lead.id}/deal`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === "success") {
        alert(`Lead "${lead.name}" converted to a pending deal! Awaiting Admin approval.`);
        fetchLeads();
      } else {
        alert(data.message || "Conversion failed");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteLead = async (lead) => {
    if (!window.confirm(`Are you sure you want to delete lead "${lead.name}"?`)) return;
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${BASE_URL}/lead/${lead.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === "success") {
        fetchLeads();
        setShowDetailsModal(false);
      } else {
        alert(data.message || "Deletion failed");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditLead = (lead) => {
    if (!lead.is_verified) {
      alert("Only verified leads can be updated. Admin must verify this lead first.");
      return;
    }
    setSelectedLead(lead);
    setOverlay(true);
    setShowDetailsModal(false);
  };

  const handleRowClick = (lead) => {
    setSelectedLeadDetails(lead);
    setShowDetailsModal(true);
  };

  const getUserName = (id) => {
    if (!id) return "Unassigned";
    const user = users.find(u => u.employee_id === id || String(u.id) === String(id));
    return user ? `${user.name} (${user.employee_id})` : id;
  };

  const filteredLeads = leads.filter(l => 
    (l.name && l.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (l.company_name && l.company_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (l.email && l.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const pendingVerifications = filteredLeads.filter(l => !l.is_verified);
  const mainTableLeads = isAdmin ? filteredLeads.filter(l => l.is_verified) : filteredLeads;

  return (
    <>
      {overlay ? (
        <LeadForm
          closeform={() => { setOverlay(false); setSelectedLead(null); }}
          existingLead={selectedLead}
          refreshLeads={fetchLeads}
          isAdmin={isAdmin}
        />
      ) : (
        <div className="main-db">
          {/* Header */}
          <div className="dia">
            <div className="in-scr">
              <div className="dia-x">Leads Registry</div>
              <div className="dia-y">Manage your pending and active prospects</div>
            </div>
            <div className="leads-btn-row">
              <button className="btn-premium" onClick={() => setOverlay(true)}>
                <Plus size={14} />
                Add Lead
              </button>
              <button className="btn-dark-ai" onClick={() => console.log("AI Insights")}>
                <Sparkles size={14} />
                Visualize with AI
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="hrow1-x">
            <input
              type="text"
              className="searchbar"
              placeholder="Search leads by name, company, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="linimg" size={18} />
          </div>

          {/* Summary Cards */}
          <div className="card-mc">
            <div className="hm-card">
              <div className="hmmc">
                <div className="hm-card-x">Total Leads</div>
                <div className="hm-card-y">{leads.length}</div>
                <div className="hm-card-z-r">Active database</div>
              </div>
              <Users className="card-img" size={32} />
            </div>

            <div className="hm-card">
              <div className="hmmc">
                <div className="hm-card-x">Converted Deals</div>
                <div className="hm-card-y">{leads.filter(l => l.is_converted).length}</div>
                <div className="hm-card-z">Pipeline generated</div>
              </div>
              <Target className="card-img" size={32} />
            </div>
          </div>

          {/* ADMIN PENDING VERIFICATIONS TABLE */}
          {isAdmin && pendingVerifications.length > 0 && (
            <div className="lr2" style={{ border: "2px solid rgba(245, 158, 11, 0.2)", background: "#fffbeb" }}>
              <div className="table-header" style={{ display: "flex", alignItems: "center", gap: "8px", color: "#d97706" }}>
                <AlertCircle size={18} />
                Pending Verifications Queue
              </div>
              <div style={{ overflowX: "auto" }}>
                <table className="lead-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Company</th>
                      <th>Contact</th>
                      <th>Created By</th>
                      <th>Assigned To</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingVerifications.map((lead) => (
                      <tr 
                        key={lead.id} 
                        onClick={() => handleRowClick(lead)}
                        style={{ cursor: "pointer" }}
                      >
                        <td style={{ fontWeight: "600", color: "#0f172a" }}>{lead.name}</td>
                        <td>{lead.company_name}</td>
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            <span>{lead.email}</span>
                            <span style={{ fontSize: "11px", color: "#64748b" }}>{lead.phone}</span>
                          </div>
                        </td>
                        <td style={{ fontWeight: "bold" }}>{getUserName(lead.created_by)}</td>
                        <td>{getUserName(lead.assigned_to)}</td>
                        <td>
                          <span className="status-todo" style={{ background: "#fef3c7", color: "#d97706", border: "1px solid #fde68a", whiteSpace: "nowrap" }}>
                            {lead.db_status?.startsWith("PENDING_") ? `PENDING - ${lead.db_status.replace("PENDING_", "")}` : "PENDING - COLD"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* MAIN LEADS TABLE */}
          <div className="lr2">
            <div className="table-header">Active Leads Pipeline</div>
            {loading ? (
              <p style={{ padding: "20px", color: "#64748b" }}>Loading leads...</p>
            ) : mainTableLeads.length === 0 ? (
              <p style={{ padding: "20px", color: "#64748b" }}>No verified leads found.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="lead-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Company</th>
                      <th>Contact</th>
                      <th>Created By</th>
                      <th>Assigned To</th>
                      <th>Status</th>
                      {!isAdmin && <th>Verified</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {mainTableLeads.map((lead) => (
                      <tr 
                        key={lead.id}
                        onClick={() => handleRowClick(lead)}
                        style={{ cursor: "pointer" }}
                      >
                        <td style={{ fontWeight: "600", color: "#0f172a" }}>{lead.name}</td>
                        <td>{lead.company_name}</td>
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            <span>{lead.email}</span>
                            <span style={{ fontSize: "11px", color: "#64748b" }}>{lead.phone}</span>
                          </div>
                        </td>
                        <td style={{ fontWeight: "bold" }}>{getUserName(lead.created_by)}</td>
                        <td>{getUserName(lead.assigned_to)}</td>
                        <td>
                          <span className={
                            lead.status === "converted" ? "status-done" :
                            lead.db_status === "COLD" ? "status-todo" :
                            "status-progress"
                          }>{lead.status === "converted" ? "WON" : (lead.db_status || lead.status || "NEW").toUpperCase()}</span>
                        </td>
                        
                        {!isAdmin && (
                          <td>
                            {lead.is_verified ? (
                              <span style={{ color: "#10b981", fontWeight: "bold", display: "flex", alignItems: "center", gap: "4px" }}><ShieldCheck size={14}/> Yes</span>
                            ) : (
                              <span style={{ color: "#ef4444", fontWeight: "bold" }}>No</span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* LEAD DETAILS POP-UP MODAL */}
      {showDetailsModal && selectedLeadDetails && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="employee-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-top">
              <h2>Lead Snapshot</h2>
              <button className="close-btn" onClick={() => setShowDetailsModal(false)}>✕</button>
            </div>

            <div className="employee-details" style={{ padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(15,23,42,0.08)", paddingBottom: "15px", marginBottom: "15px" }}>
                <div>
                  <h3 style={{ fontSize: "20px", fontWeight: "bold", color: "#0f172a" }}>{selectedLeadDetails.name}</h3>
                  <p style={{ color: "#64748b", marginTop: "4px" }}>{selectedLeadDetails.company_name}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span className={
                    selectedLeadDetails.status === "converted" ? "status-done" :
                    selectedLeadDetails.db_status === "COLD" ? "status-todo" :
                    "status-progress"
                  }>
                    {selectedLeadDetails.status === "converted" ? "WON" : (selectedLeadDetails.db_status || selectedLeadDetails.status || "NEW").toUpperCase()}
                  </span>
                  {selectedLeadDetails.is_verified && (
                    <div style={{ color: "#10b981", fontSize: "12px", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "4px", marginTop: "8px" }}>
                      <ShieldCheck size={14}/> Verified
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "15px", marginBottom: "25px" }}>
                
                {/* Contact grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                  <div>
                    <span style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "2px" }}>Email</span>
                    <strong style={{ color: "#0f172a" }}>{selectedLeadDetails.email || "N/A"}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "2px" }}>Phone</span>
                    <strong style={{ color: "#0f172a" }}>{selectedLeadDetails.phone || "N/A"}</strong>
                  </div>
                </div>

                {/* Specs grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", borderTop: "1px solid rgba(15,23,42,0.06)", paddingTop: "12px" }}>
                  <div>
                    <span style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "2px" }}>Product Type</span>
                    <strong style={{ color: "#0f172a" }}>{selectedLeadDetails.product_type || "N/A"}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "2px" }}>Sub-Classification</span>
                    <strong style={{ color: "#0f172a" }}>
                      {selectedLeadDetails.priority || "Priority(days)"}
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "2px" }}>Dimensions / Size</span>
                    <strong style={{ color: "#0f172a" }}>{selectedLeadDetails.size || "N/A"}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "2px" }}>GSM Weight</span>
                    <strong style={{ color: "#0f172a" }}>{selectedLeadDetails.gsm ? `${selectedLeadDetails.gsm} GSM` : "N/A"}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "2px" }}>Color</span>
                    <strong style={{ color: "#0f172a" }}>{selectedLeadDetails.color || "N/A"}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "2px" }}>Requested Quantity</span>
                    <strong style={{ color: "#0f172a" }}>{selectedLeadDetails.quantity ? `${selectedLeadDetails.quantity.toLocaleString()} units` : "N/A"}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "2px" }}>Handles</span>
                    <strong style={{ color: "#0f172a" }}>{selectedLeadDetails.handles || "N/A"}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "2px" }}>Print Color</span>
                    <strong style={{ color: "#0f172a" }}>{selectedLeadDetails.print_color || "N/A"}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "2px" }}>Bag Type</span>
                    <strong style={{ color: "#0f172a" }}>{selectedLeadDetails.bag_type || "N/A"}</strong>
                  </div>
                </div>

                {/* Assignment & Metadata grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", borderTop: "1px solid rgba(15,23,42,0.06)", paddingTop: "12px" }}>
                  <div>
                    <span style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "2px" }}>Created By</span>
                    <strong style={{ color: "#0f172a" }}>{getUserName(selectedLeadDetails.created_by)}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "2px" }}>Assigned To</span>
                    <strong style={{ color: "#0f172a" }}>{getUserName(selectedLeadDetails.assigned_to)}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "2px" }}>Source</span>
                    <strong style={{ color: "#0f172a" }}>{selectedLeadDetails.source || "Manual Entry"}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "2px" }}>Location</span>
                    <strong style={{ color: "#0f172a" }}>{selectedLeadDetails.location || "N/A"}</strong>
                  </div>
                </div>

                <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid rgba(15,23,42,0.08)" }}>
                  <span style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "4px" }}>Internal Note</span>
                  <p style={{ color: "#0f172a", fontSize: "14px", lineHeight: "1.5", margin: 0 }}>{selectedLeadDetails.note || "No notes available for this lead."}</p>
                </div>
              </div>

              {/* ACTION BUTTONS MOVED TO POP-UP */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", borderTop: "1px solid rgba(15,23,42,0.08)", paddingTop: "15px", justifyContent: "flex-end" }}>
                
                {/* Admin Verify Button */}
                {!selectedLeadDetails.is_verified && isAdmin && (
                  <button
                    className="btn-premium"
                    onClick={() => handleVerifyLead(selectedLeadDetails)}
                    style={{ background: "#10b981", border: "1px solid #059669", flex: 1, display: "flex", justifyContent: "center" }}
                  >
                    Verify Lead
                  </button>
                )}

                {/* Edit Button */}
                <button
                  className="btn-convert"
                  onClick={() => handleEditLead(selectedLeadDetails)}
                  style={{ display: "flex", alignItems: "center", gap: "6px", justifyContent: "center", flex: 1 }}
                >
                  <Edit3 size={14} /> Edit
                </button>

                {/* Convert Button */}
                {selectedLeadDetails.is_verified && !selectedLeadDetails.is_converted && (
                  <button
                    className="btn-premium"
                    onClick={() => handleConvertToDeal(selectedLeadDetails)}
                    style={{ display: "flex", alignItems: "center", gap: "6px", justifyContent: "center", flex: 1 }}
                  >
                    <ArrowRight size={14} /> Convert
                  </button>
                )}

                {/* Delete/Reject Button */}
                <button
                  className="btn-cancel"
                  onClick={() => handleDeleteLead(selectedLeadDetails)}
                  style={{ display: "flex", alignItems: "center", gap: "6px", justifyContent: "center", flex: 1 }}
                >
                  <Trash2 size={14} /> {selectedLeadDetails.is_verified ? "Delete" : "Reject"}
                </button>
                
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}