import React, { useEffect, useState } from "react";
import Footer from "/comps/Footer.jsx";
import { useNavigate } from "react-router-dom";
import { Search, Sparkles, Users, Briefcase, FileText, Plus, ShieldCheck, ArrowRight, ClipboardList, CheckCircle, Package, AlertTriangle, AlertCircle, ShoppingCart } from "lucide-react";
import { BASE_URL } from "./config";

export default function Customers() {
  const nav = useNavigate();
  const [role, setRole] = useState("");
  const [customers, setCustomers] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modal states
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerModalTab, setCustomerModalTab] = useState("profile"); // profile, leads, orders
  
  const [expandedCustomerId, setExpandedCustomerId] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);
  const [showLeadModal, setShowLeadModal] = useState(false);
  
  // Add Customer States
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    company_name: "",
    contact_person: "",
    phone: "",
    alternate_phone: "",
    email: "",
    address: "",
    gst_number: "",
    notes: ""
  });
  const [submittingCustomer, setSubmittingCustomer] = useState(false);
  
  // Inventory check state
  const [inventoryCheckResult, setInventoryCheckResult] = useState(null);
  const [checkingInventoryId, setCheckingInventoryId] = useState(null);
  
  // Purchase request inside customer details
  const [showPRForm, setShowPRForm] = useState(false);
  const [prForm, setPrForm] = useState({ item_name: "", quantity: 100, vendor_name: "Default Vendor" });
  const [raisingPR, setRaisingPR] = useState(false);

  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) {
      nav("/login");
      return;
    }
    fetchMe();
    fetchCustomers();
    fetchInventory();
  }, [token]);

  const handleAddCustomerSubmit = async (e) => {
    e.preventDefault();
    setSubmittingCustomer(true);
    try {
      const res = await fetch(`${BASE_URL}/customer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newCustomer)
      });
      const data = await res.json();
      if (data.status === "success") {
        alert("Customer added successfully!");
        setShowAddCustomerModal(false);
        setNewCustomer({
          company_name: "",
          contact_person: "",
          phone: "",
          alternate_phone: "",
          email: "",
          address: "",
          gst_number: "",
          notes: ""
        });
        fetchCustomers();
      } else {
        alert(data.detail || data.message || "Failed to add customer");
      }
    } catch (err) {
      console.error(err);
      alert("Error adding customer");
    } finally {
      setSubmittingCustomer(false);
    }
  };

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
      console.error("Error fetching user data:", err);
    }
  };

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/customers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === "success") {
        setCustomers(data.customers || []);
        
        // Update selected customer details if modal is open
        if (selectedCustomer) {
          const updated = data.customers.find(c => c.id === selectedCustomer.id);
          if (updated) setSelectedCustomer(updated);
        }
      }
    } catch (err) {
      console.error("Error fetching customers:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInventory = async () => {
    try {
      const res = await fetch(`${BASE_URL}/inventory`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === "success") {
        setInventory(data.inventory || []);
      }
    } catch (err) {
      console.error("Error fetching inventory:", err);
    }
  };

  const handleRowClick = (cust) => {
    if (expandedCustomerId === cust.id) {
      setExpandedCustomerId(null);
    } else {
      setExpandedCustomerId(cust.id);
    }
  };

  const handleOpenDetailsModal = (cust, e) => {
    e.stopPropagation();
    setSelectedCustomer(cust);
    setCustomerModalTab("profile");
    setInventoryCheckResult(null);
    setShowPRForm(false);
    setShowDetailsModal(true);
  };

  const handleConvertToDeal = async (lead) => {
    if (!lead.is_verified) {
      alert("Lead must be verified before converting to an order.");
      return;
    }
    if (!window.confirm(`Convert this lead to an order?`)) return;
    try {
      const res = await fetch(`${BASE_URL}/lead/${lead.id}/deal`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === "success") {
        alert("Lead successfully converted to Order!");
        fetchCustomers();
      } else {
        alert(data.message || "Conversion failed");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartProduction = async (orderId) => {
    if (!window.confirm("Start production lifecycle for this order?")) return;
    try {
      const res = await fetch(`${BASE_URL}/production/start/${orderId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === "success") {
        alert("Production lifecycle successfully initiated!");
        fetchCustomers();
      } else {
        alert(data.message || "Failed to start production");
      }
    } catch (err) {
      console.error(err);
      alert("Error starting production");
    }
  };

  const checkStockForOrder = (order) => {
    setCheckingInventoryId(order.id);
    // Find matching finished goods item
    const fgName = order.product_type || "Standard Box";
    const fgStockItem = inventory.find(
      i => i.name.toLowerCase() === fgName.toLowerCase() && i.category === "Finished Goods"
    );
    
    const qtyNeeded = parseFloat(order.quantity) || 0;
    const fgCurrentStock = fgStockItem ? fgStockItem.stock : 0;
    
    // Check raw materials status
    const rawItems = inventory.filter(i => i.category === "Raw Material");
    const lowRawMaterials = rawItems.filter(r => r.stock <= r.minimum_stock);

    setInventoryCheckResult({
      orderId: order.id,
      fgName,
      fgSufficient: fgCurrentStock >= qtyNeeded,
      fgCurrentStock,
      qtyNeeded,
      lowRawMaterials: lowRawMaterials.map(r => ({ name: r.name, stock: r.stock, min: r.minimum_stock, unit: r.unit }))
    });
  };

  const handlePRSubmit = async (e) => {
    e.preventDefault();
    setRaisingPR(true);
    try {
      const res = await fetch(`${BASE_URL}/purchase_request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          item_name: prForm.item_name,
          quantity: parseFloat(prForm.quantity) || 100,
          vendor_name: prForm.vendor_name
        })
      });
      const data = await res.json();
      if (data.status === "success") {
        alert("Purchase Request successfully raised!");
        setShowPRForm(false);
        setPrForm({ item_name: "", quantity: 100, vendor_name: "Default Vendor" });
        fetchInventory();
      } else {
        alert(data.message || "Failed to raise Purchase Request");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRaisingPR(false);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.contact_person.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    c.phone.includes(searchTerm)
  );

  return (
    <>
      <div className="main-db">
        {/* Header */}
        <div className="dia">
          <div className="in-scr">
            <div className="dia-x">Customer Profiles</div>
            <div className="dia-y">View customer contact details, leads, and orders in unified profiles</div>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button className="btn-premium" onClick={() => setShowAddCustomerModal(true)} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Plus size={14} /> Add Customer
            </button>
            <button className="btn-dark-ai" onClick={() => console.log("AI analysis on customer database")}>
              <Sparkles size={14} /> AI Segments
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="hrow1-x">
          <input
            type="text"
            className="searchbar"
            placeholder="Search by company, contact, email or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="linimg" size={18} />
        </div>

        {/* Customer Profiles List */}
        <div className="lr2">
          <div className="table-header">Customer Registry</div>
          {loading ? (
            <p style={{ padding: "20px", color: "#64748b" }}>Loading customer directory...</p>
          ) : filteredCustomers.length === 0 ? (
            <p style={{ padding: "20px", color: "#64748b" }}>No customers found.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="lead-table">
                <thead>
                  <tr>
                    <th>Company Name</th>
                    <th>Contact Person</th>
                    <th>Contact Info</th>
                    <th>GST Number</th>
                    <th>Total Leads</th>
                    <th>Total Orders</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((cust) => {
                    const isExpanded = expandedCustomerId === cust.id;
                    return (
                      <React.Fragment key={cust.id}>
                        <tr 
                          onClick={() => handleRowClick(cust)}
                          style={{ cursor: "pointer", background: isExpanded ? "rgba(79, 70, 229, 0.05)" : "none" }}
                        >
                          <td style={{ fontWeight: "600", color: "#0f172a" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span style={{ fontSize: "10px", color: "#4f46e5" }}>{isExpanded ? "▼" : "▶"}</span>
                              {cust.company_name}
                            </div>
                          </td>
                          <td style={{ fontWeight: "500" }}>{cust.contact_person}</td>
                          <td>
                            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                              <span>{cust.email || "N/A"}</span>
                              <span style={{ fontSize: "11px", color: "#64748b" }}>{cust.phone}</span>
                            </div>
                          </td>
                          <td>{cust.gst_number || "N/A"}</td>
                          <td style={{ fontWeight: "bold" }}>
                            <span className="status-progress" style={{ padding: "2px 8px", fontSize: "11px" }}>
                              {cust.leads ? cust.leads.length : 0} Leads
                            </span>
                          </td>
                          <td style={{ fontWeight: "bold" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
                              <span className="status-done" style={{ padding: "2px 8px", fontSize: "11px" }}>
                                {cust.orders ? cust.orders.length : 0} Orders
                              </span>
                              <button 
                                className="btn-convert" 
                                style={{ padding: "2px 6px", fontSize: "11px", whiteSpace: "nowrap" }}
                                onClick={(e) => handleOpenDetailsModal(cust, e)}
                              >
                                Profile
                              </button>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={6} style={{ padding: "20px", background: "#f8fafc", borderBottom: "1px solid rgba(15,23,42,0.08)" }}>
                              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                                
                                {/* Leads Section */}
                                <div style={{ background: "#ffffff", padding: "15px", borderRadius: "8px", border: "1px solid rgba(15,23,42,0.06)" }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                                    <h4 style={{ margin: 0, color: "#0f172a", fontSize: "14px", fontWeight: "bold", display: "flex", alignItems: "center", gap: "6px" }}>
                                      <Briefcase size={15} style={{ color: "#4f46e5" }} />
                                      Leads for {cust.company_name}
                                    </h4>
                                    <span style={{ fontSize: "11px", color: "#64748b" }}>Click on a lead row to view full specifications & hot/cold status</span>
                                  </div>
                                  {(!cust.leads || cust.leads.length === 0) ? (
                                    <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>No leads linked to this customer.</p>
                                  ) : (
                                    <table className="lead-table" style={{ width: "100%", margin: 0, boxShadow: "none", border: "1px solid rgba(15,23,42,0.05)", fontSize: "12px" }}>
                                      <thead>
                                        <tr>
                                          <th>Product</th>
                                          <th>Specs (Size/GSM/Color)</th>
                                          <th>Quantity</th>
                                          <th>Priority</th>
                                          <th>Classification / Status</th>
                                          <th>Action</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {cust.leads.map(lead => (
                                          <tr 
                                            key={lead.id} 
                                            onClick={(e) => { e.stopPropagation(); setSelectedLead(lead); setShowLeadModal(true); }}
                                            style={{ cursor: "pointer" }}
                                          >
                                            <td style={{ fontWeight: "600", color: "#4f46e5" }}>{lead.product_type}</td>
                                            <td>{lead.size} / {lead.gsm}gsm / {lead.color}</td>
                                            <td>{lead.quantity}</td>
                                            <td>
                                              <span className={
                                                lead.priority?.toUpperCase() === "HIGH" ? "status-todo" :
                                                lead.priority?.toUpperCase() === "MEDIUM" ? "status-progress" : "status-done"
                                              } style={{ background: lead.priority?.toUpperCase() === "HIGH" ? "#fecaca" : lead.priority?.toUpperCase() === "MEDIUM" ? "#fef3c7" : "#d1fae5", color: lead.priority?.toUpperCase() === "HIGH" ? "#b91c1c" : lead.priority?.toUpperCase() === "MEDIUM" ? "#b45309" : "#047857", padding: "2px 6px", fontSize: "10px" }}>
                                                {lead.priority}
                                              </span>
                                            </td>
                                            <td>
                                              <span className={
                                                lead.status === "pending" ? "status-todo" :
                                                lead.status === "active" ? "status-progress" :
                                                lead.status === "converted" ? "status-done" : "status-todo"
                                              } style={{ padding: "2px 6px", fontSize: "10px" }}>
                                                {lead.status === "pending" ? "COLD" : lead.status === "active" ? "HOT" : lead.status.toUpperCase()}
                                              </span>
                                            </td>
                                            <td onClick={(e) => e.stopPropagation()}>
                                              {lead.status !== "converted" && (
                                                <button
                                                  className="btn-convert"
                                                  onClick={() => handleConvertToDeal(lead)}
                                                  disabled={!lead.is_verified}
                                                  style={{ 
                                                    display: "inline-flex", 
                                                    alignItems: "center", 
                                                    gap: "4px",
                                                    opacity: lead.is_verified ? 1 : 0.5,
                                                    cursor: lead.is_verified ? "pointer" : "not-allowed",
                                                    padding: "2px 6px",
                                                    fontSize: "11px"
                                                  }}
                                                >
                                                  <ArrowRight size={11} /> Convert
                                                </button>
                                              )}
                                              {!lead.is_verified && (
                                                <span style={{ fontSize: "10px", color: "#ef4444", display: "block" }}>Unverified</span>
                                              )}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  )}
                                </div>

                                {/* Orders Section */}
                                <div style={{ background: "#ffffff", padding: "15px", borderRadius: "8px", border: "1px solid rgba(15,23,42,0.06)" }}>
                                  <h4 style={{ margin: "0 0 12px 0", color: "#0f172a", fontSize: "14px", fontWeight: "bold", display: "flex", alignItems: "center", gap: "6px" }}>
                                    <ShoppingCart size={15} style={{ color: "#10b981" }} />
                                    Orders for {cust.company_name}
                                  </h4>
                                  {(!cust.orders || cust.orders.length === 0) ? (
                                    <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>No orders linked to this customer.</p>
                                  ) : (
                                    <table className="lead-table" style={{ width: "100%", margin: 0, boxShadow: "none", border: "1px solid rgba(15,23,42,0.05)", fontSize: "12px" }}>
                                      <thead>
                                        <tr>
                                          <th>Order Number</th>
                                          <th>Product Specifications</th>
                                          <th>Quantity</th>
                                          <th>Total Amount</th>
                                          <th>Pipeline Step</th>
                                          <th>Approval Status</th>
                                          <th>Actions</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {cust.orders.map(order => (
                                          <tr key={order.id}>
                                            <td style={{ fontWeight: "600", color: "#0f172a" }}>{order.order_number}</td>
                                            <td>{order.product_type} ({order.size} / {order.gsm}gsm / {order.color})</td>
                                            <td style={{ fontWeight: "bold" }}>{order.quantity}</td>
                                            <td style={{ color: "#047857", fontWeight: "bold" }}>₹{order.total_amount.toLocaleString()}</td>
                                            <td>
                                              <span className="status-progress" style={{ background: "rgba(79, 70, 229, 0.08)", color: "#4f46e5", padding: "2px 6px", fontSize: "10px" }}>
                                                {order.stage}
                                              </span>
                                            </td>
                                            <td>
                                              <span className={order.status === "Approved" ? "status-done" : "status-todo"} style={{ padding: "2px 6px", fontSize: "10px" }}>
                                                {order.status}
                                              </span>
                                            </td>
                                            <td>
                                              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                                <button
                                                  className="btn-convert"
                                                  onClick={(e) => { e.stopPropagation(); checkStockForOrder(order); }}
                                                  style={{ padding: "2px 6px", fontSize: "11px", whiteSpace: "nowrap" }}
                                                >
                                                  <Package size={11} /> Check Stock
                                                </button>
                                                {(order.status === "Approved" || role === "production" || role === "admin" || role === "inventory") && order.stage === "New" && (
                                                  <button
                                                    className="btn-premium"
                                                    onClick={(e) => { e.stopPropagation(); handleStartProduction(order.id); }}
                                                    style={{ padding: "2px 6px", fontSize: "11px", whiteSpace: "nowrap", background: "#10b981", border: "none" }}
                                                  >
                                                    Start Production
                                                  </button>
                                                )}
                                                {order.stage === "In Progress" && (
                                                  <span style={{ fontSize: "11px", color: "#4f46e5", fontWeight: "600" }}>
                                                    Prod: {order.status}
                                                  </span>
                                                )}
                                              </div>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  )}
                                </div>

                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Customer Unified Details Modal */}
      {showDetailsModal && selectedCustomer && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="employee-modal large" onClick={(e) => e.stopPropagation()} style={{ maxHeight: "90vh", overflowY: "auto" }}>
            <div className="modal-top">
              <div>
                <h2 style={{ fontSize: "22px", fontWeight: "bold", color: "#0f172a" }}>{selectedCustomer.company_name}</h2>
                <p style={{ color: "#64748b", fontSize: "13px", marginTop: "4px" }}>Profile Registry Snapshot</p>
              </div>
              <button className="close-btn" onClick={() => setShowDetailsModal(false)}>✕</button>
            </div>

            {/* Modal Subtabs */}
            <div style={{ display: "flex", borderBottom: "1px solid rgba(15,23,42,0.08)", marginBottom: "20px", gap: "20px", paddingBottom: "2px" }}>
              <button 
                style={{ background: "none", border: "none", padding: "8px 4px", fontSize: "14px", fontWeight: customerModalTab === "profile" ? "bold" : "500", color: customerModalTab === "profile" ? "#4f46e5" : "#64748b", borderBottom: customerModalTab === "profile" ? "2px solid #4f46e5" : "none", cursor: "pointer" }}
                onClick={() => setCustomerModalTab("profile")}
              >
                Business Profile
              </button>
              <button 
                style={{ background: "none", border: "none", padding: "8px 4px", fontSize: "14px", fontWeight: customerModalTab === "leads" ? "bold" : "500", color: customerModalTab === "leads" ? "#4f46e5" : "#64748b", borderBottom: customerModalTab === "leads" ? "2px solid #4f46e5" : "none", cursor: "pointer" }}
                onClick={() => setCustomerModalTab("leads")}
              >
                Leads Queue ({selectedCustomer.leads ? selectedCustomer.leads.length : 0})
              </button>
              <button 
                style={{ background: "none", border: "none", padding: "8px 4px", fontSize: "14px", fontWeight: customerModalTab === "orders" ? "bold" : "500", color: customerModalTab === "orders" ? "#4f46e5" : "#64748b", borderBottom: customerModalTab === "orders" ? "2px solid #4f46e5" : "none", cursor: "pointer" }}
                onClick={() => setCustomerModalTab("orders")}
              >
                Orders Registry ({selectedCustomer.orders ? selectedCustomer.orders.length : 0})
              </button>
            </div>

            {/* TAB CONTENT: PROFILE */}
            {customerModalTab === "profile" && (
              <div className="employee-details" style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "15px" }}>
                  <div style={{ flex: 1, minWidth: "200px" }} className="emp-field">
                    <span>Contact Person</span>
                    <p>{selectedCustomer.contact_person}</p>
                  </div>
                  <div style={{ flex: 1, minWidth: "200px" }} className="emp-field">
                    <span>GST Registration</span>
                    <p>{selectedCustomer.gst_number || "Unregistered"}</p>
                  </div>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "15px" }}>
                  <div style={{ flex: 1, minWidth: "200px" }} className="emp-field">
                    <span>Email Address</span>
                    <p>{selectedCustomer.email || "N/A"}</p>
                  </div>
                  <div style={{ flex: 1, minWidth: "200px" }} className="emp-field">
                    <span>Primary Phone</span>
                    <p>{selectedCustomer.phone}</p>
                  </div>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "15px" }}>
                  <div style={{ flex: 1, minWidth: "200px" }} className="emp-field">
                    <span>Alt Phone</span>
                    <p>{selectedCustomer.alternate_phone || "N/A"}</p>
                  </div>
                  <div style={{ flex: 1, minWidth: "200px" }} className="emp-field">
                    <span>Registered Date</span>
                    <p>{selectedCustomer.created_at ? new Date(selectedCustomer.created_at).toLocaleDateString() : "N/A"}</p>
                  </div>
                </div>

                <div className="emp-field" style={{ flexDirection: "column", alignItems: "flex-start", gap: "6px" }}>
                  <span>Billing & Delivery Address</span>
                  <p style={{ textAlign: "left", width: "100%", marginTop: "4px", color: "#0f172a" }}>{selectedCustomer.address || "No address details available."}</p>
                </div>

                <div className="emp-field" style={{ flexDirection: "column", alignItems: "flex-start", gap: "6px" }}>
                  <span>Internal Business Notes</span>
                  <p style={{ textAlign: "left", width: "100%", marginTop: "4px", color: "#0f172a" }}>{selectedCustomer.notes || "No custom notes recorded."}</p>
                </div>
              </div>
            )}

            {/* TAB CONTENT: LEADS */}
            {customerModalTab === "leads" && (
              <div style={{ overflowX: "auto" }}>
                <table className="lead-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Spec (Size / GSM / Color)</th>
                      <th>Quantity</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedCustomer.leads && selectedCustomer.leads.map((lead) => (
                      <tr key={lead.id}>
                        <td style={{ fontWeight: "600", color: "#0f172a" }}>{lead.product_type}</td>
                        <td>{lead.size} / {lead.gsm}gsm / {lead.color}</td>
                        <td style={{ fontWeight: "bold" }}>{lead.quantity}</td>
                        <td>
                          <span className={
                            lead.status === "pending" ? "status-todo" :
                            lead.status === "active" ? "status-progress" :
                            lead.status === "converted" ? "status-done" : "status-todo"
                          }>
                            {lead.status.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          {lead.status !== "converted" && (
                            <button
                              className="btn-convert"
                              onClick={() => handleConvertToDeal(lead)}
                              disabled={!lead.is_verified}
                              style={{ 
                                display: "inline-flex", 
                                alignItems: "center", 
                                gap: "4px",
                                opacity: lead.is_verified ? 1 : 0.5,
                                cursor: lead.is_verified ? "pointer" : "not-allowed"
                              }}
                            >
                              <ArrowRight size={12} /> Convert
                            </button>
                          )}
                          {!lead.is_verified && (
                            <span style={{ fontSize: "11px", color: "#ef4444", display: "block", marginTop: "2px" }}>Requires verification</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {(!selectedCustomer.leads || selectedCustomer.leads.length === 0) && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: "center", padding: "15px", color: "#64748b" }}>
                          No leads linked to this customer.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB CONTENT: ORDERS */}
            {customerModalTab === "orders" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div style={{ overflowX: "auto" }}>
                  <table className="lead-table">
                    <thead>
                      <tr>
                        <th>Order Number</th>
                        <th>Product Specs</th>
                        <th>Qty</th>
                        <th>Total Amount</th>
                        <th>Pipeline Step</th>
                        <th>Approval</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedCustomer.orders && selectedCustomer.orders.map((order) => (
                        <tr key={order.id}>
                          <td style={{ fontWeight: "600", color: "#0f172a" }}>{order.order_number}</td>
                          <td>
                            <div style={{ fontSize: "12px", fontWeight: "600" }}>{order.product_type}</div>
                            <div style={{ fontSize: "11px", color: "#64748b", display: "flex", flexDirection: "column", gap: "2px", marginTop: "2px" }}>
                              <span>Size: {order.size} | GSM: {order.gsm}gsm | Color: {order.color}</span>
                              <span style={{ color: "#4f46e5" }}>Handles: {order.handles || "None"} | Print: {order.print_color || "None"} | Type: {order.bag_type || "None"}</span>
                            </div>
                          </td>
                          <td style={{ fontWeight: "bold" }}>{order.quantity}</td>
                          <td style={{ color: "#047857", fontWeight: "bold" }}>₹ {order.total_amount}</td>
                          <td>
                            <span className="status-progress" style={{ background: "rgba(79, 70, 229, 0.08)", color: "#4f46e5" }}>
                              {order.stage}
                            </span>
                          </td>
                          <td>
                            <span className={order.status === "Approved" ? "status-done" : "status-todo"}>
                              {order.status}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                              <button
                                className="btn-convert"
                                onClick={() => checkStockForOrder(order)}
                                style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 8px" }}
                              >
                                <Package size={12} /> Check
                              </button>
                              {(order.status === "Approved" || role === "production" || role === "admin" || role === "inventory") && order.stage === "New" && (
                                <button
                                  className="btn-premium"
                                  onClick={() => handleStartProduction(order.id)}
                                  style={{ padding: "4px 8px", background: "#10b981", border: "none" }}
                                >
                                  Start Production
                                </button>
                              )}
                              {order.stage === "In Progress" && (
                                <span style={{ fontSize: "11px", color: "#4f46e5", fontWeight: "600" }}>
                                  Prod: {order.status}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {(!selectedCustomer.orders || selectedCustomer.orders.length === 0) && (
                        <tr>
                          <td colSpan={7} style={{ textAlign: "center", padding: "15px", color: "#64748b" }}>
                            No orders registry found for this customer.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* STOCK LEVEL RESULTS BLOCK */}
                {inventoryCheckResult && (
                  <div style={{ padding: "15px", borderRadius: "10px", background: "#f8fafc", border: "1px solid rgba(15,23,42,0.08)" }}>
                    <h4 style={{ fontWeight: "bold", fontSize: "14px", color: "#0f172a", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                      <Package size={16} style={{ color: "#4f46e5" }} />
                      Inventory Analysis: Order Stock Readiness
                    </h4>
                    
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {/* Finished goods readiness */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(0,0,0,0.04)", paddingBottom: "8px" }}>
                        <div>
                          <span style={{ fontSize: "12px", color: "#64748b" }}>Finished Goods item:</span>
                          <strong style={{ display: "block", color: "#0f172a" }}>{inventoryCheckResult.fgName}</strong>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <span style={{ fontSize: "12px", color: "#64748b" }}>Required vs In Stock:</span>
                          <div style={{ fontWeight: "bold", color: inventoryCheckResult.fgSufficient ? "#10b981" : "#ef4444" }}>
                            {inventoryCheckResult.qtyNeeded} pcs / {inventoryCheckResult.fgCurrentStock} pcs
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          {inventoryCheckResult.fgSufficient ? (
                            <CheckCircle size={16} style={{ color: "#10b981" }} />
                          ) : (
                            <AlertTriangle size={16} style={{ color: "#f59e0b" }} />
                          )}
                          <span style={{ fontSize: "13px", fontWeight: "600" }}>
                            {inventoryCheckResult.fgSufficient 
                              ? "Finished goods stock is sufficient to dispatch immediately." 
                              : "Finished goods stock is INSUFFICIENT. Raw material levels checked below."}
                          </span>
                        </div>
                      </div>

                      {/* Raw Materials Check */}
                      {!inventoryCheckResult.fgSufficient && (
                        <div style={{ marginTop: "10px", borderTop: "1px dashed rgba(15, 23, 42, 0.1)", paddingTop: "10px" }}>
                          <span style={{ fontSize: "12px", fontWeight: "bold", color: "#64748b", display: "block", marginBottom: "8px" }}>
                            Raw Materials Stock Status:
                          </span>
                          
                          {inventoryCheckResult.lowRawMaterials.length > 0 ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                              <p style={{ fontSize: "12px", color: "#ef4444", fontWeight: "500", display: "flex", alignItems: "center", gap: "4px" }}>
                                <AlertCircle size={14} />
                                Warning: Low raw material stock detected. A Purchase Request is highly recommended.
                              </p>
                              {inventoryCheckResult.lowRawMaterials.map((rm, idx) => (
                                <div key={idx} style={{ display: "flex", justifyContent: "space-between", background: "#fef2f2", padding: "8px 12px", borderRadius: "6px", border: "1px solid #fecaca", fontSize: "12px" }}>
                                  <strong style={{ color: "#b91c1c" }}>{rm.name}</strong>
                                  <span style={{ color: "#b91c1c" }}>
                                    Current: {rm.stock} {rm.unit} (Min limit: {rm.min} {rm.unit})
                                  </span>
                                </div>
                              ))}
                              
                              <button
                                className="btn-premium"
                                style={{ marginTop: "8px", alignSelf: "flex-start", background: "#f59e0b", borderColor: "#d97706", display: "flex", alignItems: "center", gap: "6px" }}
                                onClick={() => {
                                  setPrForm({
                                    item_name: inventoryCheckResult.lowRawMaterials[0].name,
                                    quantity: inventoryCheckResult.lowRawMaterials[0].min * 2,
                                    vendor_name: "Default Vendor"
                                  });
                                  setShowPRForm(true);
                                }}
                              >
                                <ShoppingCart size={13} />
                                Raise PR for {inventoryCheckResult.lowRawMaterials[0].name}
                              </button>
                            </div>
                          ) : (
                            <p style={{ fontSize: "12px", color: "#10b981", fontWeight: "600", display: "flex", alignItems: "center", gap: "4px" }}>
                              <CheckCircle size={14} />
                              Raw materials are fully stocked. Production line is ready to start processing.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* PURCHASE REQUEST SUBFORM */}
                {showPRForm && (
                  <form onSubmit={handlePRSubmit} style={{ padding: "15px", borderRadius: "10px", background: "#fffbeb", border: "1px solid #fde68a" }}>
                    <h4 style={{ fontWeight: "bold", fontSize: "14px", color: "#b45309", marginBottom: "10px" }}>Raise Operational Purchase Request</h4>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "flex-end" }}>
                      <div style={{ flex: 1, minWidth: "150px" }}>
                        <label style={{ fontSize: "11px", color: "#b45309", display: "block", marginBottom: "4px" }}>Material Item Name</label>
                        <input 
                          type="text" 
                          required 
                          className="searchbar" 
                          value={prForm.item_name} 
                          onChange={e => setPrForm({...prForm, item_name: e.target.value})} 
                        />
                      </div>
                      <div style={{ width: "120px" }}>
                        <label style={{ fontSize: "11px", color: "#b45309", display: "block", marginBottom: "4px" }}>Quantity</label>
                        <input 
                          type="number" 
                          required 
                          className="searchbar" 
                          value={prForm.quantity} 
                          onChange={e => setPrForm({...prForm, quantity: parseFloat(e.target.value) || 0})} 
                        />
                      </div>
                      <div style={{ flex: 1, minWidth: "150px" }}>
                        <label style={{ fontSize: "11px", color: "#b45309", display: "block", marginBottom: "4px" }}>Vendor Name</label>
                        <input 
                          type="text" 
                          className="searchbar" 
                          value={prForm.vendor_name} 
                          onChange={e => setPrForm({...prForm, vendor_name: e.target.value})} 
                        />
                      </div>
                      <div style={{ display: "flex", gap: "5px" }}>
                        <button type="submit" disabled={raisingPR} className="btn-premium" style={{ background: "#d97706", borderColor: "#b45309" }}>
                          {raisingPR ? "Sending..." : "Submit PR"}
                        </button>
                        <button type="button" className="btn-cancel" onClick={() => setShowPRForm(false)}>Cancel</button>
                      </div>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lead Details Popup Modal */}
      {showLeadModal && selectedLead && (
        <div className="modal-overlay" onClick={() => { setShowLeadModal(false); setSelectedLead(null); }}>
          <div className="employee-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "600px" }}>
            <div className="modal-top">
              <div>
                <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#0f172a" }}>Lead Specifications</h2>
                <p style={{ color: "#64748b", fontSize: "13px", marginTop: "4px" }}>Full parameters and status tracking</p>
              </div>
              <button className="close-btn" onClick={() => { setShowLeadModal(false); setSelectedLead(null); }}>✕</button>
            </div>

            <div className="employee-details" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "15px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(15,23,42,0.08)", paddingBottom: "12px" }}>
                <div>
                  <h3 style={{ fontSize: "18px", fontWeight: "bold", color: "#0f172a", margin: 0 }}>{selectedLead.name}</h3>
                  <p style={{ color: "#64748b", fontSize: "13px", margin: "4px 0 0 0" }}>{selectedLead.company_name}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span className={
                    selectedLead.status === "pending" ? "status-todo" :
                    selectedLead.status === "active" ? "status-progress" :
                    selectedLead.status === "converted" ? "status-done" : "status-todo"
                  }>
                    {selectedLead.status === "pending" ? "COLD" : selectedLead.status === "active" ? "HOT" : selectedLead.status.toUpperCase()}
                  </span>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                <div className="emp-field">
                  <span>Product Type</span>
                  <p style={{ fontWeight: "600", color: "#0f172a" }}>{selectedLead.product_type || "N/A"}</p>
                </div>
                <div className="emp-field">
                  <span>Priority</span>
                  <p style={{ fontWeight: "600", color: selectedLead.priority?.toUpperCase() === "HIGH" ? "#b91c1c" : selectedLead.priority?.toUpperCase() === "MEDIUM" ? "#b45309" : "#047857" }}>
                    {selectedLead.priority || "MEDIUM"}
                  </p>
                </div>
                <div className="emp-field">
                  <span>Dimensions / Size</span>
                  <p>{selectedLead.size || "N/A"}</p>
                </div>
                <div className="emp-field">
                  <span>GSM Weight</span>
                  <p>{selectedLead.gsm ? `${selectedLead.gsm} GSM` : "N/A"}</p>
                </div>
                <div className="emp-field">
                  <span>Color</span>
                  <p>{selectedLead.color || "N/A"}</p>
                </div>
                <div className="emp-field">
                  <span>Requested Quantity</span>
                  <p style={{ fontWeight: "bold" }}>{selectedLead.quantity ? `${selectedLead.quantity.toLocaleString()} units` : "N/A"}</p>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", borderTop: "1px solid rgba(15,23,42,0.08)", paddingTop: "15px" }}>
                <div className="emp-field">
                  <span>Email Address</span>
                  <p>{selectedLead.email || "N/A"}</p>
                </div>
                <div className="emp-field">
                  <span>Phone Number</span>
                  <p>{selectedLead.phone || "N/A"}</p>
                </div>
                <div className="emp-field">
                  <span>Location</span>
                  <p>{selectedLead.location || "N/A"}</p>
                </div>
                <div className="emp-field">
                  <span>Verification Status</span>
                  <p style={{ color: selectedLead.is_verified ? "#10b981" : "#ef4444", fontWeight: "bold" }}>
                    {selectedLead.is_verified ? "✓ Verified" : "✗ Pending Verification"}
                  </p>
                </div>
              </div>

              {selectedLead.note && (
                <div className="emp-field" style={{ flexDirection: "column", alignItems: "flex-start", gap: "4px", borderTop: "1px solid rgba(15,23,42,0.08)", paddingTop: "15px" }}>
                  <span>Lead Remarks / Requirements</span>
                  <p style={{ textAlign: "left", width: "100%", color: "#334155", margin: "4px 0 0 0" }}>{selectedLead.note}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* ADD CUSTOMER MODAL */}
      {showAddCustomerModal && (
        <div className="modal-overlay" onClick={() => setShowAddCustomerModal(false)}>
          <div className="employee-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "550px" }}>
            <div className="modal-top">
              <h2>Add New Customer</h2>
              <button className="close-btn" onClick={() => setShowAddCustomerModal(false)}>✕</button>
            </div>
            
            <form onSubmit={handleAddCustomerSubmit} style={{ padding: "20px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
                <div>
                  <label style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "4px" }}>Company Name</label>
                  <input
                    type="text"
                    className="lf2-input"
                    value={newCustomer.company_name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, company_name: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "4px" }}>Contact Person *</label>
                  <input
                    type="text"
                    className="lf2-input"
                    value={newCustomer.contact_person}
                    onChange={(e) => setNewCustomer({ ...newCustomer, contact_person: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
                <div>
                  <label style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "4px" }}>Phone *</label>
                  <input
                    type="text"
                    className="lf2-input"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "4px" }}>Alternate Phone</label>
                  <input
                    type="text"
                    className="lf2-input"
                    value={newCustomer.alternate_phone}
                    onChange={(e) => setNewCustomer({ ...newCustomer, alternate_phone: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
                <div>
                  <label style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "4px" }}>Email</label>
                  <input
                    type="email"
                    className="lf2-input"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "4px" }}>GST Number</label>
                  <input
                    type="text"
                    className="lf2-input"
                    value={newCustomer.gst_number}
                    onChange={(e) => setNewCustomer({ ...newCustomer, gst_number: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "4px" }}>Address</label>
                <input
                  type="text"
                  className="lf2-input"
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "4px" }}>Internal Notes</label>
                <textarea
                  className="lf2-input"
                  style={{ minHeight: "80px", resize: "none" }}
                  value={newCustomer.notes}
                  onChange={(e) => setNewCustomer({ ...newCustomer, notes: e.target.value })}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" className="btn-cancel" onClick={() => setShowAddCustomerModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-premium" disabled={submittingCustomer}>
                  {submittingCustomer ? "Adding..." : "Add Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <Footer />
    </>
  );
}
