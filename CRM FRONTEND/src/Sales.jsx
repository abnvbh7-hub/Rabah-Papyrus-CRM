import Footer from "/comps/Footer.jsx"
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Sparkles, DollarSign, TrendingUp, Plus, Phone, Edit, ArrowRight, Check, AlertCircle } from "lucide-react";
import { BASE_URL } from "./config.js";
import SalesPipelineChart from "../comps/SalesPipelineChart.jsx";

export default function Sales() {

  const nav = useNavigate();  

  const [deals, setDeals] = useState([]);
  const [users, setUsers] = useState([]);
  const [role, setRole] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newDeal, setNewDeal] = useState({
    deal_name: "",
    company_name: "",
    contact_name: "",
    phone: "",
    email: "",
    deal_value: 0,
    source: "",
    note: ""
  });

  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedDealDetails, setSelectedDealDetails] = useState(null);

  const fetchUserRole = async (token) => {
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

  const fetchUsers = async (token) => {
    try {
      const res = await fetch(`${BASE_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === "success") {
        setUsers(data.users);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDeals = async (token) => {
    try {
      const res = await fetch(`${BASE_URL}/deals`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === "success") {
        setDeals(data.deals || []);
        
        // Update selected deal in modal if it's open
        if (selectedDealDetails) {
            const updatedDeal = data.deals.find(d => d.id === selectedDealDetails.id);
            if (updatedDeal) setSelectedDealDetails(updatedDeal);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      nav("/login");
    } else {
      fetchUserRole(token);
      fetchUsers(token);
      fetchDeals(token);
    }
  }, []);

  const getUserName = (id) => {
    if (!id) return "Unassigned";
    const user = users.find(u => u.employee_id === id || String(u.id) === String(id));
    return user ? `${user.name} (${user.employee_id})` : id;
  };

  const handleRowClick = (deal) => {
    setSelectedDealDetails(deal);
    setShowDetailsModal(true);
  };

  const handleApproveDeal = async (id) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${BASE_URL}/deal/${id}/approve`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === "success") fetchDeals(token);
    } catch (err) { console.error(err); }
  };

  const handleRejectDeal = async (id) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${BASE_URL}/deal/${id}/reject`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === "success") fetchDeals(token);
    } catch (err) { console.error(err); }
  };

  const handleUpdateDealStage = async (deal, newStage, is_closed = false, is_won = false) => {
    const token = localStorage.getItem("token");
    let finalStage = newStage;
    if (is_closed) {
      finalStage = is_won ? "Closed Won" : "Closed Lost";
    }

    try {
      const res = await fetch(`${BASE_URL}/deal/${deal.id}?stage=${encodeURIComponent(finalStage)}&status=${encodeURIComponent(deal.status || "Pending Approval")}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          deal_name: deal.deal_name,
          company_name: deal.company_name,
          contact_name: deal.contact_name,
          phone: deal.phone || "",
          email: deal.email || "",
          deal_value: deal.deal_value || 0,
          source: deal.source || "",
          note: deal.note || "",
          assigned_to: deal.assigned_to || null
        })
      });
      const data = await res.json();
      if (data.status === "success") {
        fetchDeals(token);
        if (selectedDealDetails && selectedDealDetails.id === deal.id) {
           setSelectedDealDetails({...selectedDealDetails, stage: finalStage});
        }
      }
    } catch (err) { console.error(err); }
  };

  const handleUpdateDealStatus = async (deal, newStatus) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${BASE_URL}/deal/${deal.id}?stage=${encodeURIComponent(deal.stage)}&status=${encodeURIComponent(newStatus)}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          deal_name: deal.deal_name,
          company_name: deal.company_name,
          contact_name: deal.contact_name,
          phone: deal.phone || "",
          email: deal.email || "",
          deal_value: deal.deal_value || 0,
          source: deal.source || "",
          note: deal.note || "",
          assigned_to: deal.assigned_to || null
        })
      });
      const data = await res.json();
      if (data.status === "success") {
        fetchDeals(token);
        if (selectedDealDetails && selectedDealDetails.id === deal.id) {
           setSelectedDealDetails({...selectedDealDetails, status: newStatus});
        }
      }
    } catch (err) { console.error(err); }
  };

  const handleReassign = async (dealId, newAssignee) => {
    const deal = deals.find(d => d.id === dealId);
    if (!deal) return;
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${BASE_URL}/deal/${deal.id}?stage=${encodeURIComponent(deal.stage)}&status=${encodeURIComponent(deal.status || "Pending Approval")}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          deal_name: deal.deal_name,
          company_name: deal.company_name,
          contact_name: deal.contact_name,
          phone: deal.phone || "",
          email: deal.email || "",
          deal_value: deal.deal_value || 0,
          source: deal.source || "",
          note: deal.note || "",
          assigned_to: newAssignee
        })
      });
      const data = await res.json();
      if (data.status === "success") {
        fetchDeals(token);
        if (selectedDealDetails && selectedDealDetails.id === dealId) {
           setSelectedDealDetails({...selectedDealDetails, assigned_to: newAssignee});
        }
      } else {
        alert(data.message || "Failed to reassign deal");
      }
    } catch (err) { console.error(err); }
  };

  const handleAddDealSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    try {
      let url = `${BASE_URL}/deal`;
      let method = "POST";
      
      let payload = { 
        deal_name: newDeal.deal_name,
        company_name: newDeal.company_name,
        contact_name: newDeal.contact_name,
        phone: newDeal.phone || "",
        email: newDeal.email || "",
        deal_value: newDeal.deal_value || 0,
        source: newDeal.source || "",
        note: newDeal.note || "",
        assigned_to: null
      };

      if (isEditing && newDeal.id) {
        const originalDeal = deals.find(d => d.id === newDeal.id);
        const stage = originalDeal ? originalDeal.stage : "New";
        const status = originalDeal ? originalDeal.status : "Pending Approval";
        payload.assigned_to = originalDeal ? originalDeal.assigned_to : null;
        
        url = `${BASE_URL}/deal/${newDeal.id}?stage=${encodeURIComponent(stage)}&status=${encodeURIComponent(status)}`;
        method = "PUT";
      }

      const res = await fetch(url, {
        method,
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.status === "success") {
        setShowAddModal(false);
        fetchDeals(token);
        setNewDeal({ deal_name: "", company_name: "", contact_name: "", phone: "", email: "", deal_value: 0, source: "", note: "" });
        setIsEditing(false);
      } else {
        alert(data.message || "Failed to save deal");
      }
    } catch (err) { console.error(err); }
  };

  const handleEditDeal = (deal) => {
    setNewDeal({
      deal_name: deal.deal_name || "",
      company_name: deal.company_name || "",
      contact_name: deal.contact_name || "",
      phone: deal.phone || "",
      email: deal.email || "",
      deal_value: deal.deal_value || 0,
      source: deal.source || "",
      note: deal.note || "",
      id: deal.id
    });
    setIsEditing(true);
    setShowDetailsModal(false);
    setShowAddModal(true);
  };

  const filteredDeals = deals
    .map(deal => ({ ...deal, By: getUserName(deal.assigned_to) }))
    .filter(d => 
      (d.deal_name && d.deal_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (d.company_name && d.company_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (d.By && d.By.toLowerCase().includes(searchTerm.toLowerCase()))
    );

  const isAdmin = role === "admin" || role === "hr";
  const pendingDeals = filteredDeals.filter(d => d.status === "Pending Approval");
  const activeDeals = filteredDeals.filter(d => d.status !== "Pending Approval");

  return (
    <>
      {/* ADD/EDIT DEAL MODAL */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => { setShowAddModal(false); setIsEditing(false); setNewDeal({ deal_name: "", company_name: "", contact_name: "", phone: "", email: "", deal_value: 0, source: "", note: "" }); }}>
          <div className="employee-modal" style={{ padding: "20px" }} onClick={e => e.stopPropagation()}>
            <div className="modal-top">
              <h2>{isEditing ? "Edit Deal" : "Add New Deal"}</h2>
              <button className="close-btn" onClick={() => { setShowAddModal(false); setIsEditing(false); setNewDeal({ deal_name: "", company_name: "", contact_name: "", phone: "", email: "", deal_value: 0, source: "", note: "" }); }}>✕</button>
            </div>
            <form onSubmit={handleAddDealSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <input type="text" placeholder="Deal Name" required className="searchbar" value={newDeal.deal_name} onChange={e => setNewDeal({...newDeal, deal_name: e.target.value})} />
              <input type="text" placeholder="Company Name" required className="searchbar" value={newDeal.company_name} onChange={e => setNewDeal({...newDeal, company_name: e.target.value})} />
              <input type="text" placeholder="Contact Name" required className="searchbar" value={newDeal.contact_name} onChange={e => setNewDeal({...newDeal, contact_name: e.target.value})} />
              <input type="text" placeholder="Phone" className="searchbar" value={newDeal.phone} onChange={e => setNewDeal({...newDeal, phone: e.target.value})} />
              <input type="email" placeholder="Email" className="searchbar" value={newDeal.email} onChange={e => setNewDeal({...newDeal, email: e.target.value})} />
              <input type="number" placeholder="Deal Value (₹)" required className="searchbar" value={newDeal.deal_value} onChange={e => setNewDeal({...newDeal, deal_value: parseInt(e.target.value) || 0})} />
              <input type="text" placeholder="Source" className="searchbar" value={newDeal.source} onChange={e => setNewDeal({...newDeal, source: e.target.value})} />
              <textarea placeholder="Notes" className="searchbar" style={{minHeight: "80px"}} value={newDeal.note} onChange={e => setNewDeal({...newDeal, note: e.target.value})}></textarea>
              <button type="submit" className="btn-premium" style={{ marginTop: "10px" }}>{isEditing ? "Save Changes" : "Submit Deal"}</button>
            </form>
          </div>
        </div>
      )}

      {/* DEAL DETAILS POP-UP MODAL */}
      {showDetailsModal && selectedDealDetails && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="employee-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-top">
              <h2>Deal Snapshot</h2>
              <button className="close-btn" onClick={() => setShowDetailsModal(false)}>✕</button>
            </div>

            <div className="employee-details" style={{ padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(15,23,42,0.08)", paddingBottom: "15px", marginBottom: "15px" }}>
                <div>
                  <h3 style={{ fontSize: "20px", fontWeight: "bold", color: "#0f172a" }}>{selectedDealDetails.deal_name}</h3>
                  <p style={{ color: "#64748b", marginTop: "4px" }}>{selectedDealDetails.company_name}</p>
                </div>
                <div style={{ textAlign: "right", display: "flex", flexDirection: "column", gap: "8px", alignItems: "flex-end" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "bold" }}>STATUS:</span>
                    <select 
                      value={selectedDealDetails.status || "Open"} 
                      onChange={(e) => handleUpdateDealStatus(selectedDealDetails, e.target.value)}
                      style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "12px", background: "#f8fafc", color: "#0f172a", cursor: "pointer" }}
                    >
                      <option value="Open">Open</option>
                      <option value="Pending Approval">Pending Approval</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>
                  <span className={
                    selectedDealDetails.stage.includes("Closed") ? "status-done" : selectedDealDetails.stage === "New" ? "status-todo" : "status-progress"
                  } style={{ whiteSpace: "nowrap", display: "inline-block" }}>
                    {selectedDealDetails.stage}
                  </span>
                  <div style={{ color: "#10b981", fontSize: "16px", fontWeight: "bold", marginTop: "2px" }}>
                    ₹ {selectedDealDetails.deal_value}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "15px", marginBottom: "25px" }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "2px" }}>Contact</span>
                    <strong style={{ color: "#0f172a" }}>{selectedDealDetails.contact_name || "N/A"}</strong>
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "2px" }}>Email</span>
                    <strong style={{ color: "#0f172a" }}>{selectedDealDetails.email || "N/A"}</strong>
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "2px" }}>Phone</span>
                    <strong style={{ color: "#0f172a" }}>{selectedDealDetails.phone || "N/A"}</strong>
                  </div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "20px", borderTop: "1px solid rgba(15,23,42,0.06)", paddingTop: "12px" }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "2px" }}>Product Type</span>
                    <strong style={{ color: "#0f172a" }}>{selectedDealDetails.product_type || "N/A"}</strong>
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "2px" }}>Size / Dimensions</span>
                    <strong style={{ color: "#0f172a" }}>{selectedDealDetails.size || "N/A"}</strong>
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "2px" }}>GSM Weight</span>
                    <strong style={{ color: "#0f172a" }}>{selectedDealDetails.gsm || "N/A"}</strong>
                  </div>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "2px" }}>Paper Color</span>
                    <strong style={{ color: "#0f172a" }}>{selectedDealDetails.color || "N/A"}</strong>
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "2px" }}>Quantity</span>
                    <strong style={{ color: "#0f172a" }}>{selectedDealDetails.quantity || "N/A"}</strong>
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "2px" }}>Handles</span>
                    <strong style={{ color: "#0f172a" }}>{selectedDealDetails.handles || "N/A"}</strong>
                  </div>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "2px" }}>Print Color</span>
                    <strong style={{ color: "#0f172a" }}>{selectedDealDetails.print_color || "N/A"}</strong>
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "2px" }}>Bag Type</span>
                    <strong style={{ color: "#0f172a" }}>{selectedDealDetails.bag_type || "N/A"}</strong>
                  </div>
                  <div style={{ flex: 1 }}>
                    {/* Spacer */}
                  </div>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "20px", borderTop: "1px solid rgba(15,23,42,0.06)", paddingTop: "12px" }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "2px" }}>Created By</span>
                    <strong style={{ color: "#0f172a" }}>{getUserName(selectedDealDetails.created_by)}</strong>
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "2px" }}>Assigned To</span>
                    {isAdmin ? (
                      <select 
                        value={selectedDealDetails.assigned_to || ""} 
                        onChange={(e) => handleReassign(selectedDealDetails.id, e.target.value)}
                        style={{ padding: "4px", borderRadius: "4px", border: "1px solid #cbd5e1", width: "100%", background: "#f8fafc", color: "#0f172a" }}
                      >
                        {users.map(u => (
                          <option key={u.employee_id} value={u.employee_id}>{u.name} ({u.employee_id})</option>
                        ))}
                      </select>
                    ) : (
                      <strong style={{ color: "#0f172a" }}>{getUserName(selectedDealDetails.assigned_to)}</strong>
                    )}
                  </div>
                </div>

                <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid rgba(15,23,42,0.08)" }}>
                  <span style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "4px" }}>Internal Note</span>
                  <p style={{ color: "#0f172a", fontSize: "14px", lineHeight: "1.5" }}>{selectedDealDetails.note || "No notes available for this deal."}</p>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", borderTop: "1px solid rgba(15,23,42,0.08)", paddingTop: "15px", justifyContent: "flex-end" }}>
                
                {selectedDealDetails.status === "Pending Approval" && isAdmin && (
                  <>
                    <button className="btn-premium" style={{ background: "#10b981", border: "1px solid #059669", flex: 1, display: "flex", justifyContent: "center" }} onClick={() => { handleApproveDeal(selectedDealDetails.id); setShowDetailsModal(false); }}>Approve Deal</button>
                    <button className="btn-cancel" style={{ flex: 1, display: "flex", justifyContent: "center" }} onClick={() => { handleRejectDeal(selectedDealDetails.id); setShowDetailsModal(false); }}>Reject Deal</button>
                  </>
                )}

                {!selectedDealDetails.stage.includes("Closed") && (
                  <>
                    <button className="btn-premium" style={{ background: "#10b981", border: "1px solid #059669", flex: 1, display: "flex", justifyContent: "center" }} onClick={() => { handleUpdateDealStage(selectedDealDetails, selectedDealDetails.stage, true, true); setShowDetailsModal(false); }}>Mark Won</button>
                    <button className="btn-cancel" style={{ flex: 1, display: "flex", justifyContent: "center" }} onClick={() => { handleUpdateDealStage(selectedDealDetails, selectedDealDetails.stage, true, false); setShowDetailsModal(false); }}>Mark Lost</button>
                  </>
                )}

                <button
                  className="btn-convert"
                  onClick={() => handleEditDeal(selectedDealDetails)}
                  style={{ display: "flex", alignItems: "center", gap: "6px", justifyContent: "center", flex: 1 }}
                >
                  <Edit size={14} /> Edit Deal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      <div className="main-db">
        <div className="dia">
          <div className="in-scr">
            <div className="dia-x">Orders & Sales</div>
            <div className="dia-y">Manage your sales and orders here</div>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <div className="lr1y">
              <button className="btn-premium" onClick={() => { setIsEditing(false); setNewDeal({ deal_name: "", company_name: "", contact_name: "", phone: "", email: "", deal_value: 0, source: "", note: "" }); setShowAddModal(true); }}>
                <Plus size={14} />
                Add an Order  
              </button>
            </div>
            <div className="lr1y">
              <button className="btn-dark-ai" onClick={() => console.log("AI clicked")}>
                <Sparkles size={14} />
                Visualize with AI
              </button>
            </div>
          </div>
        </div>
        
        <div className="hrow1-x">
          <input 
            type="text" 
            className="searchbar" 
            placeholder="Search orders..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="linimg" size={18} />
        </div>

        <div className="card-mc" style={{ marginBottom: "20px" }}>
          <SalesPipelineChart deals={activeDeals} />
        </div>

        <div className="card-mc">
          <div className="hm-card">
            <div className="hmmc">
              <div className="hm-card-x">Total Revenue</div>
              <div className="hm-card-y">
                ₹ {activeDeals.filter(d => d.stage === "Closed Won").reduce((sum, d) => sum + (d.deal_value || 0), 0)}
              </div>
              <div className="hm-card-z">Est. from closed won orders</div>
            </div>
            <DollarSign className="card-img" size={32} />
          </div>

          <div className="hm-card">
            <div className="hmmc">
              <div className="hm-card-x">Sales Orders</div>
              <div className="hm-card-y">{activeDeals.filter(d => d.stage === "Closed Won").length} Orders</div>
              <div className="hm-card-z">Successfully closed</div>
            </div>
            <TrendingUp className="card-img" size={32} />
          </div>
        </div>

        {isAdmin && pendingDeals.length > 0 && (
          <div className="lr2" style={{ border: "2px solid rgba(245, 158, 11, 0.2)", background: "#fffbeb", width: "100%", marginBottom: "20px" }}>
            <div className="table-header" style={{ display: "flex", alignItems: "center", gap: "8px", color: "#d97706" }}>
              <AlertCircle size={18} />
              Pending Orders Approval Queue
            </div>
            <div style={{ overflowX: "auto" }}>
              <table className="lead-table">
                <thead>
                  <tr>
                    <th>Order Number / Name</th>
                    <th>Company</th>
                    <th>Value</th>
                    <th>Created By</th>
                    <th>Assigned To</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingDeals.map((deal) => (
                    <tr key={deal.id} onClick={() => handleRowClick(deal)} style={{ cursor: "pointer" }}>
                      <td style={{ fontWeight: "600", color: "#0f172a" }}>{deal.deal_name}</td>
                      <td>{deal.company_name}</td>
                      <td style={{ fontWeight: "bold", color: "#10b981" }}>₹ {deal.deal_value}</td>
                      <td style={{ fontWeight: "bold" }}>{getUserName(deal.created_by)}</td>
                      <td>{deal.By}</td>
                      <td>
                        <button className="btn-premium" style={{ background: "#10b981", border: "1px solid #059669", marginRight: "5px", padding: "4px 8px", fontSize: "12px" }} onClick={(e) => { e.stopPropagation(); handleApproveDeal(deal.id); }}>Approve</button>
                        <button className="btn-cancel" style={{ padding: "4px 8px", fontSize: "12px" }} onClick={(e) => { e.stopPropagation(); handleRejectDeal(deal.id); }}>Reject</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="lr2" style={{ width: "100%" }}>
          <div className="table-header">Orders Pipeline</div>
          <div className="kanban-board">
            {/* TO DO */}
            <div className="kanban-column">
              <div className="kanban-title">
                <span>To-Do / New</span>
                <span className="status-todo" style={{ padding: "2px 6px", fontSize: "0.65rem" }}>
                  {activeDeals.filter(d => !d.stage.includes("Closed") && d.stage === "New").length}
                </span>
              </div>
              {activeDeals.filter(d => !d.stage.includes("Closed") && d.stage === "New").map((deal) => (
                <div className="kanban-card" key={deal.id} onClick={() => handleRowClick(deal)}>
                  <div className="kc-name">{deal.deal_name}</div>
                  <div className="kc-company">{deal.company_name}</div>
                  <div className="kc-deal" style={{ color: "#10b981", fontWeight: "bold" }}>₹ {deal.deal_value}</div>
                  <div className="kc-footer">
                    <span>{getUserName(deal.assigned_to)}</span>
                    <div>
                      <button onClick={(e) => { e.stopPropagation(); handleUpdateDealStage(deal, "In Progress"); }} style={{ display: "inline-flex", alignItems: "center", gap: "2px" }}>
                        <ArrowRight size={10} /> Progress
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* IN PROGRESS */}
            <div className="kanban-column">
              <div className="kanban-title">
                <span>In Progress</span>
                <span className="status-progress" style={{ padding: "2px 6px", fontSize: "0.65rem" }}>
                  {activeDeals.filter(d => !d.stage.includes("Closed") && d.stage !== "New").length}
                </span>
              </div>
              {activeDeals.filter(d => !d.stage.includes("Closed") && d.stage !== "New").map((deal) => (
                <div className="kanban-card" key={deal.id} onClick={() => handleRowClick(deal)}>
                  <div className="kc-name">{deal.deal_name}</div>
                  <div className="kc-company">{deal.company_name}</div>
                  <div className="kc-deal" style={{ color: "#10b981", fontWeight: "bold" }}>₹ {deal.deal_value}</div>
                  <div className="kc-footer">
                    <span>{getUserName(deal.assigned_to)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* CLOSED */}
            <div className="kanban-column">
              <div className="kanban-title">
                <span>Closed</span>
                <span className="status-done" style={{ padding: "2px 6px", fontSize: "0.65rem" }}>
                  {activeDeals.filter(d => d.stage.includes("Closed")).length}
                </span>
              </div>
              {activeDeals.filter(d => d.stage.includes("Closed")).map((deal) => (
                <div className="kanban-card closed" key={deal.id} onClick={() => handleRowClick(deal)}>
                  <div className="kc-name">{deal.deal_name}</div>
                  <div className="kc-company">{deal.company_name}</div>
                  <div className="kc-deal" style={{ color: "#64748B", fontWeight: "bold" }}>₹ {deal.deal_value}</div>
                  <div className="kc-footer">
                    <span>{getUserName(deal.assigned_to)}</span>
                    <span style={{ fontSize: "10px", fontWeight: "bold", color: deal.stage === "Closed Won" ? "#10b981" : "#ef4444" }}>
                      {deal.stage === "Closed Won" ? "WON" : "LOST"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lr2" style={{ width: "100%" }}>
          <div className="table-header">Active Orders</div>
          <table className="lead-table">
            <thead>
              <tr>
                <th>Order Number / Name</th>
                <th>Company</th>
                <th>Contact</th>
                <th>Value</th>
                <th>Stage</th>
                <th>Assigned to</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeDeals.map((deal) => (
                <tr key={deal.id} onClick={() => handleRowClick(deal)} style={{ cursor: "pointer" }}>
                  <td style={{ fontWeight: "600", color: "#0f172a" }}>{deal.deal_name}</td>
                  <td>{deal.company_name}</td>
                  <td>{deal.contact_name} <br/><span style={{fontSize: "11px", color: "#64748b"}}>{deal.phone}</span></td>
                  <td style={{ fontWeight: "bold", color: "#10b981" }}>₹ {deal.deal_value}</td>
                  <td>
                    <span className={
                      deal.stage.includes("Closed") ? "status-done" : deal.stage === "New" ? "status-todo" : "status-progress"
                    } style={{ whiteSpace: "nowrap", display: "inline-block" }}>
                      {deal.stage}
                    </span>
                  </td>
                  <td>{getUserName(deal.assigned_to)}</td>
                  <td>
                    {!deal.stage.includes("Closed") ? (
                      <div style={{ display: "flex", gap: "5px" }}>
                        <button className="btn-convert" style={{ padding: "4px 8px", fontSize: "12px", background: "#10b981", border: "1px solid #059669" }} onClick={(e) => { e.stopPropagation(); handleUpdateDealStage(deal, deal.stage, true, true); }}>
                          Won
                        </button>
                        <button className="btn-cancel" style={{ padding: "4px 8px", fontSize: "12px" }} onClick={(e) => { e.stopPropagation(); handleUpdateDealStage(deal, deal.stage, true, false); }}>
                          Lost
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: "12px", color: "#64748b" }}>-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Footer />
      </div>
    </>
  )
}