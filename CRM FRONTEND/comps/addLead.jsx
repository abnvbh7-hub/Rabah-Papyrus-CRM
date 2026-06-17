import React, { useState, useEffect } from "react";
import { Loader2, User, Mail, Phone, Building2, MapPin, Tag, Briefcase, PlusCircle, Settings2 } from "lucide-react";
import { BASE_URL } from "../src/config";

export default function LeadForm({ closeform, existingLead, refreshLeads, isAdmin }) {
  const [lead, setLead] = useState({
    name: "",
    email: "",
    phone: "",
    company_name: "",
    status: "pending",
    note: "",
    source: "Manual",
    location: "",
    assigned_to: "", 
    priority: "Medium",
    product_type: "",
    size: "",
    color: "",
    gsm: "",
    quantity: 1000,
    handles: "",
    print_color: "",
    bag_type: "",
    followup_date: "",
  });

  const [leadCategory, setLeadCategory] = useState("HOT");
  const [subClassification, setSubClassification] = useState("Priority(days)");
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (existingLead) {
      setLead({
        name: existingLead.name || "",
        email: existingLead.email || "",
        phone: existingLead.phone || "",
        company_name: existingLead.company_name || "",
        status: existingLead.status || "pending",
        note: existingLead.note || "",
        source: existingLead.source || "Manual",
        location: existingLead.location || "",
        assigned_to: existingLead.assigned_to || "",
        priority: existingLead.priority || "Priority(days)",
        product_type: existingLead.product_type || "",
        size: existingLead.size || "",
        color: existingLead.color || "",
        gsm: existingLead.gsm || "",
        quantity: existingLead.quantity || 1000,
        handles: existingLead.handles || "",
        print_color: existingLead.print_color || "",
        bag_type: existingLead.bag_type || "",
        followup_date: existingLead.followup_date || "",
      });

      // Parse DB raw status
      const dbStatus = (existingLead.db_status || "").toUpperCase();
      if (dbStatus.includes("COLD")) {
        setLeadCategory("COLD");
      } else {
        setLeadCategory("HOT");
      }
      setSubClassification(existingLead.priority || "Priority(days)");
    }

    if (isAdmin) {
      fetchUsers();
    }
  }, [existingLead, isAdmin]);

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
      console.error("Error fetching users for reassignment:", err);
    }
  };

  const statuses = ["pending", "active", "converted", "lost"];

  const handleChange = (e) => {
    setLead({ ...lead, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const token = localStorage.getItem("token");
    if (!token) {
      alert("Unauthorized: Please log in again.");
      setLoading(false);
      return;
    }

    try {
      let res;
      let data;

      const payload = {
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        company_name: lead.company_name,
        status: leadCategory,
        note: lead.note,
        source: lead.source,
        location: lead.location || null,
        assigned_to: lead.assigned_to || localStorage.getItem("employee_id"),
        priority: subClassification,
        product_type: lead.product_type,
        size: lead.size,
        color: lead.color,
        gsm: lead.gsm,
        quantity: parseInt(lead.quantity) || 0,
        handles: lead.handles || null,
        print_color: lead.print_color || null,
        bag_type: lead.bag_type || null,
        followup_date: lead.followup_date || null,
      };

      if (existingLead) {
        res = await fetch(`${BASE_URL}/lead/${existingLead.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`${BASE_URL}/lead`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
      }

      data = await res.json();

      if (data.status === "success") {
        if (refreshLeads) refreshLeads();
        closeform();
      } else {
        alert(data.message || "An error occurred.");
      }
    } catch (error) {
      console.error(error);
      alert("Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={closeform}>
      <div className="lfmc" onClick={(e) => e.stopPropagation()} style={{ margin: 0, maxHeight: "90vh", overflowY: "auto", position: "relative" }}>
        
        {/* Form Header */}
        <div className="lf1" style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "16px", borderBottom: "1px solid rgba(15,23,42,0.08)", paddingBottom: "20px", marginBottom: "20px" }}>
          <div style={{ background: "rgba(79, 70, 229, 0.1)", padding: "12px", borderRadius: "12px", color: "#4f46e5" }}>
            {existingLead ? <Settings2 size={28} /> : <PlusCircle size={28} />}
          </div>
          <div style={{ flex: 1 }}>
            <div className="lf1x">{existingLead ? "Edit Lead Profile" : "Add New Lead"}</div>
            <div className="lf1y">
              {existingLead ? "Update lead details and assignments" : "Enter prospective client details"}
            </div>
          </div>
          <button className="close-btn" onClick={closeform}>✕</button>
        </div>

        {/* Form Inputs */}
        <form className="lf2" onSubmit={handleSubmit}>
          <div className="lf2x" style={{ gap: "14px" }}>
            
            <div style={{ position: "relative" }}>
              <User size={16} style={{ position: "absolute", left: "14px", top: "14px", color: "#94a3b8" }} />
              <input
                className="lf2-input"
                style={{ paddingLeft: "42px" }}
                type="text"
                name="name"
                placeholder="Full Name"
                value={lead.name}
                onChange={handleChange}
                required
              />
            </div>

            <div style={{ display: "flex", gap: "14px" }}>
              <div style={{ position: "relative", flex: 1 }}>
                <Mail size={16} style={{ position: "absolute", left: "14px", top: "14px", color: "#94a3b8" }} />
                <input
                  className="lf2-input"
                  style={{ paddingLeft: "42px" }}
                  type="email"
                  name="email"
                  placeholder="Email Address"
                  value={lead.email}
                  onChange={handleChange}
                />
              </div>
              <div style={{ position: "relative", flex: 1 }}>
                <Phone size={16} style={{ position: "absolute", left: "14px", top: "14px", color: "#94a3b8" }} />
                <input
                  className="lf2-input"
                  style={{ paddingLeft: "42px" }}
                  type="tel"
                  name="phone"
                  placeholder="Phone Number"
                  value={lead.phone}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div style={{ position: "relative" }}>
              <Building2 size={16} style={{ position: "absolute", left: "14px", top: "14px", color: "#94a3b8" }} />
              <input
                className="lf2-input"
                style={{ paddingLeft: "42px" }}
                type="text"
                name="company_name"
                placeholder="Company Name"
                value={lead.company_name}
                onChange={handleChange}
                required
              />
            </div>

            <div style={{ display: "flex", gap: "14px" }}>
              <div style={{ position: "relative", flex: 1 }}>
                <Tag size={16} style={{ position: "absolute", left: "14px", top: "14px", color: "#94a3b8" }} />
                <input
                  className="lf2-input"
                  style={{ paddingLeft: "42px" }}
                  type="text"
                  name="source"
                  placeholder="Lead Source (e.g. Website)"
                  value={lead.source}
                  onChange={handleChange}
                />
              </div>
              <div style={{ position: "relative", flex: 1 }}>
                <MapPin size={16} style={{ position: "absolute", left: "14px", top: "14px", color: "#94a3b8" }} />
                <input
                  className="lf2-input"
                  style={{ paddingLeft: "42px" }}
                  type="text"
                  name="location"
                  placeholder="Location (City, Country)"
                  value={lead.location}
                  onChange={handleChange}
                />
              </div>
            </div>
            
            {existingLead && isAdmin && users.length > 0 && (
              <div style={{ display: "flex", gap: "14px" }}>
                <select
                  className="lf2-input"
                  name="assigned_to"
                  value={lead.assigned_to}
                  onChange={handleChange}
                  required
                  style={{ flex: 1, cursor: "pointer", appearance: "none" }}
                >
                  <option value="" disabled>Assign Rep...</option>
                  {users.map((u) => (
                    <option key={u.employee_id} value={u.employee_id}>
                      Rep: {u.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Product Requirements section */}
            <div style={{ borderTop: "1px dashed rgba(15,23,42,0.1)", paddingTop: "15px", marginTop: "5px" }}>
              <h4 style={{ fontSize: "13px", fontWeight: "bold", color: "#4f46e5", marginBottom: "12px" }}>Product Specifications</h4>
              <div style={{ display: "flex", gap: "14px", marginBottom: "14px" }}>
                <div style={{ flex: 1 }}>
                  <input
                    className="lf2-input"
                    type="text"
                    name="product_type"
                    placeholder="Product Type (e.g. Paper Bag)"
                    value={lead.product_type}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <input
                    className="lf2-input"
                    type="text"
                    name="size"
                    placeholder="Size (e.g. 10x15x5 cm)"
                    value={lead.size}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
              <div style={{ display: "flex", gap: "14px", marginBottom: "14px" }}>
                <div style={{ flex: 1 }}>
                  <input
                    className="lf2-input"
                    type="text"
                    name="color"
                    placeholder="Color / Print (e.g. Brown Kraft)"
                    value={lead.color}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <input
                    className="lf2-input"
                    type="text"
                    name="gsm"
                    placeholder="GSM (e.g. 120)"
                    value={lead.gsm}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
              <div style={{ display: "flex", gap: "14px", marginBottom: "14px" }}>
                <div style={{ flex: 1 }}>
                  <input
                    className="lf2-input"
                    type="text"
                    name="handles"
                    placeholder="Handles (e.g. D-Cut, Loop)"
                    value={lead.handles}
                    onChange={handleChange}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <input
                    className="lf2-input"
                    type="text"
                    name="print_color"
                    placeholder="Print Color (e.g. Single, Multi)"
                    value={lead.print_color}
                    onChange={handleChange}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <input
                    className="lf2-input"
                    type="text"
                    name="bag_type"
                    placeholder="Bag Type (e.g. V-Bottom, Flat)"
                    value={lead.bag_type}
                    onChange={handleChange}
                  />
                </div>
              </div>
              <div style={{ display: "flex", gap: "14px" }}>
                <div style={{ flex: 1 }}>
                  <input
                    className="lf2-input"
                    type="number"
                    name="quantity"
                    placeholder="Required Quantity"
                    value={lead.quantity}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div style={{ flex: 1, display: "flex", gap: "10px" }}>
                  <div style={{ flex: 1 }}>
                    <select
                      className="lf2-input"
                      value={leadCategory}
                      onChange={(e) => {
                        const cat = e.target.value;
                        setLeadCategory(cat);
                        setSubClassification(cat === "HOT" ? "Priority(days)" : "Not required");
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      <option value="HOT">Hot Lead</option>
                      <option value="COLD">Cold Lead</option>
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <select
                      className="lf2-input"
                      value={subClassification}
                      onChange={(e) => setSubClassification(e.target.value)}
                      style={{ cursor: "pointer" }}
                    >
                      {leadCategory === "HOT" ? (
                        <>
                          <option value="Priority(days)">Priority (days)</option>
                          <option value="Short term(Weeks- months)">Short term (Weeks-months)</option>
                          <option value="Long term(Months)">Long term (Months)</option>
                        </>
                      ) : (
                        <>
                          <option value="Not required">Not required</option>
                          <option value="Not interested">Not interested</option>
                          <option value="Dilemma">Dilemma</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "14px" }}>
              <div style={{ position: "relative", flex: 1 }}>
                <label style={{ display: "block", fontSize: "11px", fontWeight: "bold", color: "#4f46e5", marginBottom: "4px" }}>Next Follow-up Date (Reminds Sales on Homepage)</label>
                <input
                  className="lf2-input"
                  type="date"
                  name="followup_date"
                  value={lead.followup_date}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div style={{ position: "relative" }}>
              <Briefcase size={16} style={{ position: "absolute", left: "14px", top: "14px", color: "#94a3b8" }} />
              <textarea
                className="lf2-input"
                style={{ paddingLeft: "42px", resize: "none" }}
                name="note"
                placeholder="Internal notes and context regarding this prospect..."
                value={lead.note}
                onChange={handleChange}
                rows={4}
              />
            </div>
          </div>

          {/* Submit Actions */}
          <div className="lf2-submit" style={{ marginTop: "25px", paddingTop: "20px", borderTop: "1px solid rgba(15,23,42,0.08)", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
            <button type="button" className="btn-cancel" onClick={closeform} disabled={loading} style={{ background: "transparent", color: "#64748b", boxShadow: "none", border: "1px solid rgba(15,23,42,0.1)" }}>
              Cancel
            </button>
            <button type="submit" className="btn-premium" disabled={loading} style={{ minWidth: "140px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
              {loading && <Loader2 className="animate-spin" size={14} />}
              {existingLead ? "Save Changes" : "Create Lead"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}