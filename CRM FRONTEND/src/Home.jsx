import BarChart from "../comps/BarChart.jsx";
import PieChart from "../comps/PieChart.jsx";
import Footer from "../comps/Footer.jsx";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup as LeafletPopup, useMap } from "react-leaflet";
import L from "leaflet";
import { Search, Users, TrendingUp, Target, Activity, MapPin, Calendar, Briefcase, Bell, ClipboardList, CheckCircle } from "lucide-react";
import { BASE_URL } from "./config";

const defaultIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Helper component to dynamically recenter Leaflet map when coords change
function RecenterMap({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
  }, [lat, lng, map]);
  return null;
}

export default function Home() {
  const nav = useNavigate();
  const [Name, setName] = useState("");
  const [type, setType] = useState("loading");
  const [status, setStatus] = useState(null);
  const [user, setUser] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [personalStats, setPersonalStats] = useState({ present: 0, absent: 0 });
  const [employees, setEmployees] = useState([]);
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState(null);
  const [indents, setIndents] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [showAddReminderModal, setShowAddReminderModal] = useState(false);
  const [newReminderTitle, setNewReminderTitle] = useState("");
  const [newReminderDesc, setNewReminderDesc] = useState("");
  const [newReminderTime, setNewReminderTime] = useState("");
  const [creatingReminder, setCreatingReminder] = useState(false);

  // Check authentication
  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      nav("/login");
    }
  }, [nav]);

  // Fetch logged in user
  async function fetchUser() {
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(
        `${BASE_URL}/me`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();
      console.log(data);
      if (data.payload) {
        setUser(data.payload);
        setName(data.payload.name);
        setType(data.payload.role.toLowerCase());
        setStatus(data.payload.verified);
        
        if (data.payload.verified === false) {
          localStorage.removeItem("token");
          nav('/under_review');
        } else {
          // Fetch personal attendance stats if not admin
          if (data.payload.role.toLowerCase() !== "admin") {
            fetchPersonalStats(data.payload.employee_id, token);
            // Automatically sync location on mount/login
            triggerAutoLocationSync(data.payload.employee_id, token);
          }
          if (data.payload.role.toLowerCase() === "hr" || data.payload.role.toLowerCase() === "admin") {
            fetchEmployees(token);
          }
          if (data.payload.role.toLowerCase() === "admin") {
            fetchIndents(token);
          }
          fetchLeads(token);
          fetchStats(token);
          fetchAlerts(token);
        }
      }
    }
    catch (err) {
      console.error(err);
    }
  }

  const fetchAlerts = async (token) => {
    try {
      const res = await fetch(`${BASE_URL}/alerts`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === "success") {
        setAlerts(data.alerts || []);
      }
    } catch (err) {
      console.error("Error fetching alerts in Home:", err);
    }
  };

  const handleCreateReminder = async (e) => {
    e.preventDefault();
    if (!newReminderTitle || !newReminderTime) {
      alert("Please fill in title and reminder time.");
      return;
    }
    const token = localStorage.getItem("token");
    setCreatingReminder(true);
    try {
      const res = await fetch(`${BASE_URL}/reminder`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: newReminderTitle,
          description: newReminderDesc,
          remind_at: newReminderTime
        })
      });
      const data = await res.json();
      if (data.status === "success") {
        alert("Reminder created successfully!");
        setNewReminderTitle("");
        setNewReminderDesc("");
        setNewReminderTime("");
        setShowAddReminderModal(false);
        fetchAlerts(token);
      } else {
        alert(data.message || "Failed to create reminder");
      }
    } catch (err) {
      console.error(err);
      alert("Error creating reminder.");
    } finally {
      setCreatingReminder(false);
    }
  };

  const handleDeleteReminder = async (reminderId) => {
    if (!window.confirm("Are you sure you want to dismiss this reminder?")) return;
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${BASE_URL}/reminder/${reminderId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === "success") {
        fetchAlerts(token);
      } else {
        alert(data.message || "Failed to dismiss reminder");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const renderAlertsHub = () => {
    return (
      <div className="lr2" style={{ border: "2px solid rgba(79, 70, 229, 0.15)", background: "#ffffff", padding: "20px", borderRadius: "12px", margin: "25px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(15, 23, 42, 0.08)", paddingBottom: "12px", marginBottom: "15px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "16px", fontWeight: "bold", color: "#1e1b4b" }}>
            <Bell size={18} className="animate-bounce" style={{ color: "#4f46e5" }} />
            Alerts & Reminders Hub
          </div>
          <button
            onClick={() => setShowAddReminderModal(true)}
            className="btn-premium"
            style={{ padding: "6px 14px", fontSize: "12px" }}
          >
            + Add Reminder
          </button>
        </div>

        {/* List of Alerts */}
        {alerts.length === 0 ? (
          <div style={{ padding: "20px", textAlign: "center", color: "#64748b", background: "#f8fafc", borderRadius: "8px" }}>
            No active alerts or reminders at this time.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {alerts.map((alertItem) => {
              let bgColor = "#f0fdf4";
              let textColor = "#166534";
              let borderColor = "#bbf7d0";

              if (alertItem.severity === "danger") {
                bgColor = "#fef2f2";
                textColor = "#991b1b";
                borderColor = "#fecaca";
              } else if (alertItem.severity === "warning") {
                bgColor = "#fffbeb";
                textColor = "#92400e";
                borderColor = "#fef3c7";
              } else if (alertItem.severity === "info") {
                bgColor = "#eff6ff";
                textColor = "#1e40af";
                borderColor = "#dbeafe";
              }

              return (
                <div
                  key={alertItem.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: bgColor,
                    color: textColor,
                    border: `1px solid ${borderColor}`,
                    padding: "12px 16px",
                    borderRadius: "8px",
                    boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)"
                  }}
                >
                  <div style={{ textAlign: "left" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "10px", textTransform: "uppercase", fontWeight: "bold", background: borderColor, padding: "2px 6px", borderRadius: "4px", color: textColor }}>
                        {alertItem.category}
                      </span>
                      <strong style={{ fontSize: "14px" }}>{alertItem.title}</strong>
                    </div>
                    <div style={{ fontSize: "13px", marginTop: "4px", opacity: 0.9 }}>
                      {alertItem.description}
                    </div>
                    {alertItem.date && alertItem.date !== "Now" && alertItem.date !== "Pending" && alertItem.date !== "Awaiting" && alertItem.date !== "No date" && (
                      <div style={{ fontSize: "11px", marginTop: "2px", opacity: 0.7, display: "flex", alignItems: "center", gap: "4px" }}>
                        <Calendar size={10} />
                        {alertItem.date}
                      </div>
                    )}
                  </div>

                  {alertItem.type === "reminder" && (
                    <button
                      onClick={() => handleDeleteReminder(alertItem.raw_id)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: textColor,
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: "bold",
                        padding: "4px 8px",
                        borderRadius: "4px"
                      }}
                      onMouseEnter={(e) => e.target.style.background = borderColor}
                      onMouseLeave={(e) => e.target.style.background = "transparent"}
                    >
                      Dismiss
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const fetchStats = async (token) => {
    try {
      const res = await fetch(`${BASE_URL}/dashboard/stats`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === "success") {
        setStats(data);
      }
    } catch (err) {
      console.error("Error fetching stats in Home:", err);
    }
  };

  const fetchLeads = async (token) => {
    try {
      const res = await fetch(`${BASE_URL}/leads`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === "success") {
        setLeads(data.leads);
      }
    } catch (err) {
      console.error("Error fetching leads in Home:", err);
    }
  };

  const fetchEmployees = async (token) => {
    try {
      const res = await fetch(`${BASE_URL}/users`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === "success") {
        setEmployees(data.users);
      }
    } catch (err) {
      console.error("Error fetching employees in Home:", err);
    }
  };

  const fetchIndents = async (token) => {
    try {
      const res = await fetch(`${BASE_URL}/indents`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === "success") {
        setIndents(data.indents || []);
      }
    } catch (err) {
      console.error("Error fetching indents in Home:", err);
    }
  };

  const getUserName = (id) => {
    if (!id) return "Unassigned";
    const emp = employees.find(e => e.employee_id === id || String(e.id) === String(id));
    return emp ? `${emp.name} (${emp.employee_id})` : id;
  };

  const handleVerifyLead = async (leadId) => {
    if (!window.confirm("Verify this lead?")) return;
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${BASE_URL}/lead/${leadId}/verify`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === "success") {
        alert("Lead verified successfully!");
        fetchLeads(token);
        fetchStats(token);
      } else {
        alert(data.message || "Failed to verify lead");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleApproveIndent = async (indentId) => {
    if (!window.confirm("Approve this indent? Stock levels will be updated.")) return;
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${BASE_URL}/indent/${indentId}/approve`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === "success") {
        alert("Indent approved!");
        fetchIndents(token);
        fetchStats(token);
      } else {
        alert(data.message || "Failed to approve indent");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejectIndent = async (indentId) => {
    if (!window.confirm("Reject this indent?")) return;
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${BASE_URL}/indent/${indentId}/reject`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === "success") {
        alert("Indent rejected.");
        fetchIndents(token);
        fetchStats(token);
      } else {
        alert(data.message || "Failed to reject indent");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Auto sync location
  const triggerAutoLocationSync = (employeeId, token) => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          if (!employeeId || !token) return;
          try {
            await fetch(`${BASE_URL}/update_location?employee_id=${employeeId}`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({
                lat: position.coords.latitude,
                lon: position.coords.longitude
              })
            });
            // Update local user state with the synced coords
            setUser(prev => prev ? {
              ...prev,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              location_updated: new Date().toISOString()
            } : null);
          } catch (err) {
            console.error("Auto location sync error:", err);
          }
        },
        (error) => {
          console.log("Auto location update declined or error:", error);
        },
        { enableHighAccuracy: true }
      );
    }
  };

  // Fetch attendance stats for current month
  const fetchPersonalStats = async (empId, token) => {
    const today = new Date();
    const month = today.getMonth() + 1;
    const year = today.getFullYear();

    try {
      const res = await fetch(`${BASE_URL}/attendance/${empId}?month=${month}&year=${year}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === "success" && data.attendance) {
        const monthlyData = {};
        
        // Mark weekdays up to today as absent by default
        let lastDay = today.getDate();
        for (let i = 1; i <= lastDay; i++) {
          const d = new Date(year, month - 1, i);
          if (d.getDay() !== 0 && d.getDay() !== 6) { // skip weekends
            monthlyData[d.toDateString()] = false;
          }
        }

        data.attendance.forEach(log => {
          if (log.attendance_date) {
            const [y, m, d] = log.attendance_date.split('-');
            const localDate = new Date(y, m - 1, d).toDateString();
            monthlyData[localDate] = (log.status && log.status.toLowerCase() === 'present') || !!log.checkin_time;
          }
        });
        
        setPersonalStats({
          present: Object.values(monthlyData).filter(v => v === true).length,
          absent: Object.values(monthlyData).filter(v => v === false).length
        });
      }
    } catch (err) {
      console.error("Error fetching personal attendance stats:", err);
    }
  };

  // Manual location sync trigger
  const syncLocationManual = async () => {
    const token = localStorage.getItem("token");
    if (!token || !user?.employee_id) return;

    setSyncing(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const res = await fetch(`${BASE_URL}/update_location?employee_id=${user.employee_id}`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({
                lat: position.coords.latitude,
                lon: position.coords.longitude
              })
            });
            const data = await res.json();
            if (data.status === "success") {
              setUser(prev => prev ? {
                ...prev,
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                location_updated: new Date().toISOString()
              } : null);
              alert("Location coordinates synced successfully!");
            } else {
              alert(data.message || "Failed to update location on the server.");
            }
          } catch (err) {
            console.error("Manual location sync error:", err);
            alert("An error occurred during location synchronization.");
          } finally {
            setSyncing(false);
          }
        },
        (error) => {
          alert("Please enable location services in your browser to sync coordinates.");
          setSyncing(false);
        },
        { enableHighAccuracy: true }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  return (
    <>
      {type === "admin" && (
        <div className="main-db">
          {/* Search */}
          <div className="hrow1-x">
            <input
              type="text"
              className="searchbar"
              placeholder="Search everywhere..."
            />
            <Search className="linimg" size={18} />
          </div>

          {/* Header */}
          <div className="dia">
            <div className="in-scr">
              <div className="dia-x">Overview</div>
              <div className="dia-y">
                {Name}, here's what's happening with your contacts today
              </div>
            </div>
          </div>

          {/* Cards */}
          <div className="card-mc">
            {/* Leads */}
            <div className="hm-card">
              <div className="hmmc">
                <div className="hm-card-x">Leads</div>
                <div className="hm-card-y">{stats?.admin_stats?.total_leads ?? leads.length}</div>
                <div className="hm-card-z">
                  Total prospects
                </div>
              </div>
              <Users className="card-img" size={28} />
            </div>

            {/* Sales */}
            <div className="hm-card">
              <div className="hmmc">
                <div className="hm-card-x">Sales</div>
                <div className="hm-card-y">{(stats?.admin_stats?.total_sales ?? 0).toLocaleString('en-IN')}₹</div>
                <div className="hm-card-z">
                  Total order revenue
                </div>
              </div>
              <TrendingUp className="card-img" size={28} />
            </div>

            {/* Conversion */}
            <div className="hm-card">
              <div className="hmmc">
                <div className="hm-card-x">
                  Conversion <br />
                  Rate
                </div>
                <div className="hm-card-y">
                  {stats?.admin_stats?.total_leads > 0 ? Math.round((stats.admin_stats.converted_leads / stats.admin_stats.total_leads) * 100) : 0}%
                </div>
                <div className="hm-card-z">
                  Based on all leads
                </div>
              </div>
              <Target className="card-img" size={28} />
            </div>

            {/* Outstanding Receivables */}
            <div className="hm-card">
              <div className="hmmc">
                <div className="hm-card-x">
                  Outstanding <br />
                  Receivables
                </div>
                <div className="hm-card-y">{(stats?.admin_stats?.outstanding_balance ?? 0).toLocaleString('en-IN')}₹</div>
                <div className="hm-card-z">
                  Unpaid invoices amount
                </div>
              </div>
              <Activity className="card-img" size={28} />
            </div>
          </div>

          {/* Admin Verification and Approval Queue Widgets */}
          {type === "admin" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "25px", margin: "25px 0" }}>
              {/* Lead Verification Queue */}
              {leads.filter(l => !l.is_verified).length > 0 && (
                <div className="lr2" style={{ border: "2px solid rgba(245, 158, 11, 0.2)", background: "#fffbeb", padding: "20px", borderRadius: "12px" }}>
                  <div className="table-header" style={{ display: "flex", alignItems: "center", gap: "8px", color: "#d97706", fontSize: "16px", fontWeight: "bold", borderBottom: "1px solid rgba(217, 119, 6, 0.1)", paddingBottom: "10px", marginBottom: "15px" }}>
                    <Users size={18} />
                    Pending Lead Verifications Queue
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table className="lead-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Company</th>
                          <th>Requirements</th>
                          <th>Assigned To</th>
                          <th>Class</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leads.filter(l => !l.is_verified).map((lead) => (
                          <tr key={lead.id}>
                            <td style={{ fontWeight: "600", color: "#0f172a" }}>{lead.name}</td>
                            <td>{lead.company_name}</td>
                            <td>
                              <div style={{ fontSize: "12px" }}>{lead.product_type}</div>
                              <div style={{ fontSize: "11px", color: "#64748b" }}>Qty: {lead.quantity} | {lead.size}</div>
                            </td>
                            <td>{getUserName(lead.assigned_to) || "Unassigned"}</td>
                            <td>
                              <span className="status-todo" style={{ background: "#fef3c7", color: "#d97706", border: "1px solid #fde68a" }}>
                                {lead.db_status?.replace("PENDING_", "") || "COLD"}
                              </span>
                            </td>
                            <td>
                              <button
                                className="btn-premium"
                                onClick={() => handleVerifyLead(lead.id)}
                                style={{ background: "#10b981", border: "none", padding: "4px 10px", fontSize: "12px" }}
                              >
                                Verify & Approve
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Indent Approval Queue */}
              {indents.filter(ind => ind.status === "PENDING").length > 0 && (
                <div className="lr2" style={{ border: "2px solid rgba(79, 70, 229, 0.2)", background: "#f5f3ff", padding: "20px", borderRadius: "12px" }}>
                  <div className="table-header" style={{ display: "flex", alignItems: "center", gap: "8px", color: "#4f46e5", fontSize: "16px", fontWeight: "bold", borderBottom: "1px solid rgba(79, 70, 229, 0.1)", paddingBottom: "10px", marginBottom: "15px" }}>
                    <ClipboardList size={18} />
                    Pending Material Indent Approvals
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table className="lead-table">
                      <thead>
                        <tr>
                          <th>Material Name</th>
                          <th>Quantity</th>
                          <th>Requested By</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {indents.filter(ind => ind.status === "PENDING").map((ind) => (
                          <tr key={ind.id}>
                            <td style={{ fontWeight: "600", color: "#0f172a" }}>{ind.item_name}</td>
                            <td style={{ fontWeight: "bold" }}>{ind.quantity}</td>
                            <td>{ind.requester_name || ind.requested_by || "System"}</td>
                            <td>
                              <div style={{ display: "flex", gap: "10px" }}>
                                <button
                                  className="btn-premium"
                                  onClick={() => handleApproveIndent(ind.id)}
                                  style={{ background: "#10b981", border: "none", padding: "4px 10px", fontSize: "12px" }}
                                >
                                  Approve
                                </button>
                                <button
                                  className="btn-cancel"
                                  onClick={() => handleRejectIndent(ind.id)}
                                  style={{ padding: "4px 10px", fontSize: "12px" }}
                                >
                                  Reject
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {renderAlertsHub()}

          {/* Charts */}
          <div className="card-mc">
            <BarChart leads={leads} />
            <PieChart employees={employees} />
          </div>

          {/* Footer */}
          <Footer />
        </div>
      )}

      {type !== "admin" && type !== "loading" && (
        <div className="main-db">
          {/* Header */}
          <div className="dia">
            <div className="in-scr">
              <div className="dia-x">Welcome back, {Name}!</div>
              <div className="dia-y">
                Employee ID: <strong style={{ color: "#4f46e5" }}>{user?.employee_id}</strong> | Role: <span style={{ textTransform: "capitalize", fontWeight: "bold" }}>{type}</span>
              </div>
            </div>
            <div className="lr1y">
              <span className="emp-status-yes" style={{ fontSize: "12px", padding: "6px 12px", background: "#ecfdf5", color: "#047857", borderRadius: "8px", fontWeight: "bold" }}>
                ✓ Active Profile
              </span>
            </div>
          </div>

          {/* DYNAMIC ROLE-SPECIFIC STATISTICS CARDS */}
          <div className="card-mc">
            {/* Sales Guy Cards */}
            {type === "sales" && (
              <>
                <div className="hm-card">
                  <div className="hmmc">
                    <div className="hm-card-x">My Active Leads</div>
                    <div className="hm-card-y">{stats?.sales_stats?.my_active_leads ?? 0} Leads</div>
                    <div className="hm-card-z">Current pipeline</div>
                  </div>
                  <Users className="card-img" size={28} />
                </div>

                <div className="hm-card">
                  <div className="hmmc">
                    <div className="hm-card-x">Pipeline Value</div>
                    <div className="hm-card-y">{(stats?.sales_stats?.my_pipeline_value ?? 0).toLocaleString('en-IN')}₹</div>
                    <div className="hm-card-z">Estimated total value</div>
                  </div>
                  <TrendingUp className="card-img" size={28} />
                </div>

                <div className="hm-card">
                  <div className="hmmc">
                    <div className="hm-card-x">Conversion Rate</div>
                    <div className="hm-card-y">
                      {stats?.sales_stats?.my_total_leads > 0 ? Math.round((stats.sales_stats.my_converted_leads / stats.sales_stats.my_total_leads) * 100) : 0}% Win
                    </div>
                    <div className="hm-card-z">My performance</div>
                  </div>
                  <Target className="card-img" size={28} />
                </div>

                <div className="hm-card">
                  <div className="hmmc">
                    <div className="hm-card-x">My Total Leads</div>
                    <div className="hm-card-y">{stats?.sales_stats?.my_total_leads ?? 0} Leads</div>
                    <div className="hm-card-z">Assigned to me</div>
                  </div>
                  <Activity className="card-img" size={28} />
                </div>
              </>
            )}

            {/* HR Guy Cards */}
            {type === "hr" && (
              <>
                <div className="hm-card">
                  <div className="hmmc">
                    <div className="hm-card-x">Active Staff</div>
                    <div className="hm-card-y">{stats?.hr_stats?.total_employees ?? employees.length} Employees</div>
                    <div className="hm-card-z">Active roster</div>
                  </div>
                  <Users className="card-img" size={28} />
                </div>

                <div className="hm-card">
                  <div className="hmmc">
                    <div className="hm-card-x">Today's Checkins</div>
                    <div className="hm-card-y">{stats?.hr_stats?.today_checkins ?? 0} Checked-In</div>
                    <div className="hm-card-z">Attendance for today</div>
                  </div>
                  <Activity className="card-img" size={28} />
                </div>

                <div className="hm-card">
                  <div className="hmmc">
                    <div className="hm-card-x">Pending Registrations</div>
                    <div className="hm-card-y">{stats?.hr_stats?.pending_approvals ?? 0} Approvals</div>
                    <div className="hm-card-z">Awaiting verification</div>
                  </div>
                  <Target className="card-img" size={28} />
                </div>

                <div className="hm-card">
                  <div className="hmmc">
                    <div className="hm-card-x">Payroll Status</div>
                    <div className="hm-card-y">Processed</div>
                    <div className="hm-card-z">Standard monthly status</div>
                  </div>
                  <TrendingUp className="card-img" size={28} />
                </div>
              </>
            )}

            {/* Production Cards */}
            {type === "production" && (
              <>
                <div className="hm-card">
                  <div className="hmmc">
                    <div className="hm-card-x">Pending Orders</div>
                    <div className="hm-card-y">{stats?.production_stats?.pending_count ?? 0} Orders</div>
                    <div className="hm-card-z">Awaiting manufacturing</div>
                  </div>
                  <ClipboardList className="card-img" size={28} />
                </div>
                <div className="hm-card">
                  <div className="hmmc">
                    <div className="hm-card-x">In Progress</div>
                    <div className="hm-card-y">
                      {((stats?.production_stats?.printing_count ?? 0) + 
                        (stats?.production_stats?.pasting_count ?? 0) + 
                        (stats?.production_stats?.packing_count ?? 0))} Jobs
                    </div>
                    <div className="hm-card-z">Printing/Pasting/Packing</div>
                  </div>
                  <Activity className="card-img" size={28} />
                </div>
                <div className="hm-card">
                  <div className="hmmc">
                    <div className="hm-card-x">Packing Stage</div>
                    <div className="hm-card-y">{stats?.production_stats?.packing_count ?? 0} Jobs</div>
                    <div className="hm-card-z">Final assembly QA</div>
                  </div>
                  <CheckCircle className="card-img" size={28} />
                </div>
                <div className="hm-card">
                  <div className="hmmc">
                    <div className="hm-card-x">Completed Jobs</div>
                    <div className="hm-card-y">{stats?.production_stats?.completed_count ?? 0} Orders</div>
                    <div className="hm-card-z">Ready for billing & dispatch</div>
                  </div>
                  <Bell className="card-img" size={28} />
                </div>
              </>
            )}

            {/* Inventory Cards */}
            {type === "inventory" && (
              <>
                <div className="hm-card">
                  <div className="hmmc">
                    <div className="hm-card-x">Total Catalog Items</div>
                    <div className="hm-card-y">{stats?.inventory_stats?.total_items ?? 0} Items</div>
                    <div className="hm-card-z">Raw materials & FG</div>
                  </div>
                  <ClipboardList className="card-img" size={28} />
                </div>
                <div className="hm-card">
                  <div className="hmmc">
                    <div className="hm-card-x">Low Stock Items</div>
                    <div className="hm-card-y" style={{ color: "#f59e0b" }}>{stats?.inventory_stats?.low_stock_count ?? 0} Alerts</div>
                    <div className="hm-card-z">Under threshold</div>
                  </div>
                  <Activity className="card-img" size={28} />
                </div>
                <div className="hm-card">
                  <div className="hmmc">
                    <div className="hm-card-x">Out of Stock</div>
                    <div className="hm-card-y" style={{ color: "#ef4444" }}>{stats?.inventory_stats?.out_of_stock_count ?? 0} Items</div>
                    <div className="hm-card-z">Requires immediate PR</div>
                  </div>
                  <CheckCircle className="card-img" size={28} />
                </div>
                <div className="hm-card">
                  <div className="hmmc">
                    <div className="hm-card-x">Pending Purchase Request</div>
                    <div className="hm-card-y">{stats?.inventory_stats?.pending_pr_count ?? 0} PRs</div>
                    <div className="hm-card-z">Awaiting admin approval</div>
                  </div>
                  <Bell className="card-img" size={28} />
                </div>
              </>
            )}

            {/* Generic Fallback Cards */}
            {type !== "sales" && type !== "hr" && type !== "production" && type !== "inventory" && (
              <>
                <div className="hm-card">
                  <div className="hmmc">
                    <div className="hm-card-x">My Tasks</div>
                    <div className="hm-card-y">6 Pending</div>
                    <div className="hm-card-z">2 marked high priority</div>
                  </div>
                  <ClipboardList className="card-img" size={28} />
                </div>

                <div className="hm-card">
                  <div className="hmmc">
                    <div className="hm-card-x">Q2 Milestones</div>
                    <div className="hm-card-y">85% Done</div>
                    <div className="hm-card-z">On track for target</div>
                  </div>
                  <CheckCircle className="card-img" size={28} />
                </div>

                <div className="hm-card">
                  <div className="hmmc">
                    <div className="hm-card-x">Scheduled Meetings</div>
                    <div className="hm-card-y">4 Sessions</div>
                    <div className="hm-card-z">Next starting at 3:00 PM</div>
                  </div>
                  <Activity className="card-img" size={28} />
                </div>

                <div className="hm-card">
                  <div className="hmmc">
                    <div className="hm-card-x">System Alerts</div>
                    <div className="hm-card-y">5 Unread</div>
                    <div className="hm-card-z">1 critical update req.</div>
                  </div>
                  <Bell className="card-img" size={28} />
                </div>
              </>
            )}
          </div>

          {/* Location Sync & Attendance Stats Grid */}
          <div className="card-mc">
            {/* Last Known Location */}
            <div className="hm-card" style={{ flex: "1 1 calc(50% - 10px)" }}>
              <div className="hmmc" style={{ width: "100%" }}>
                <div className="hm-card-x">My Last Location Sync</div>
                <div className="hm-card-y" style={{ fontSize: "1.1rem", margin: "5px 0", color: "#0f172a", wordBreak: "break-all" }}>
                  {user?.latitude && user?.longitude ? (
                    `${parseFloat(user.latitude).toFixed(6)}, ${parseFloat(user.longitude).toFixed(6)}`
                  ) : (
                    "Syncing location coordinates..."
                  )}
                </div>
                <div className="hm-card-z" style={{ color: "#64748b" }}>
                  Updated: {user?.location_updated ? new Date(user.location_updated.replace(" ", "T") + "Z").toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "N/A"}
                </div>
                <button 
                  onClick={syncLocationManual}
                  className="btn-accent-premium"
                  style={{ marginTop: "12px", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                  disabled={syncing}
                >
                  <MapPin size={14} />
                  {syncing ? "Syncing..." : "Sync Location Now"}
                </button>
              </div>
              <MapPin className="card-img" size={28} />
            </div>

            {/* Attendance Quick Stats */}
            <div className="hm-card" style={{ flex: "1 1 calc(50% - 10px)" }}>
              <div className="hmmc" style={{ width: "100%" }}>
                <div className="hm-card-x">Attendance Overview ({new Date().toLocaleString('default', { month: 'long' })})</div>
                <div style={{ display: "flex", gap: "20px", marginTop: "10px", marginBottom: "10px" }}>
                  <div>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>Days Present</span>
                    <div style={{ fontSize: "1.8rem", fontWeight: "bold", color: "#10b981" }}>{personalStats.present}</div>
                  </div>
                  <div style={{ borderLeft: "1px solid rgba(15, 23, 42, 0.08)", paddingLeft: "20px" }}>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>Days Absent</span>
                    <div style={{ fontSize: "1.8rem", fontWeight: "bold", color: "#ef4444" }}>{personalStats.absent}</div>
                  </div>
                </div>
                <button 
                  onClick={() => nav("/attendance")}
                  className="btn-premium"
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                >
                  <Calendar size={14} />
                  View Attendance Calendar
                </button>
              </div>
              <Calendar className="card-img" size={28} />
            </div>
          </div>

          {renderAlertsHub()}

          {/* Interactive Live Map */}
          <div className="lr2" style={{ padding: "20px" }}>
            <div className="table-header" style={{ marginBottom: "15px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "none", padding: "0 0 10px 0" }}>
              <span>My Live Location Map</span>
              {user?.latitude && user?.longitude && (
                <button 
                  onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${user.latitude},${user.longitude}`, "_blank")}
                  className="btn-premium"
                  style={{ padding: "6px 12px", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <MapPin size={12} />
                  Open in Google Maps
                </button>
              )}
            </div>
            
            {user && user.latitude && user.longitude ? (
              <div style={{ height: "350px", width: "100%", borderRadius: "10px", overflow: "hidden", border: "1px solid rgba(15, 23, 42, 0.08)" }}>
                <MapContainer center={[parseFloat(user.latitude), parseFloat(user.longitude)]} zoom={14} style={{ height: "100%", width: "100%" }}>
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={[parseFloat(user.latitude), parseFloat(user.longitude)]} icon={defaultIcon}>
                    <LeafletPopup>
                      <strong>{Name}</strong> <br />
                      Last synced location.
                    </LeafletPopup>
                  </Marker>
                  <RecenterMap lat={parseFloat(user.latitude)} lng={parseFloat(user.longitude)} />
                </MapContainer>
              </div>
            ) : (
              <div style={{ padding: "40px", textAlign: "center", color: "#64748b", background: "#f8fafc", borderRadius: "10px", border: "1px solid rgba(15, 23, 42, 0.08)" }}>
                Waiting for Geolocation lock. Please ensure browser location permissions are granted.
              </div>
            )}
          </div>

          <Footer />
        </div>
      )}
      {showAddReminderModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(15, 23, 42, 0.6)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 9999,
          backdropFilter: "blur(4px)"
        }}>
          <div style={{
            background: "#ffffff",
            padding: "25px",
            borderRadius: "12px",
            width: "450px",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
          }}>
            <div style={{ fontSize: "18px", fontWeight: "bold", color: "#0f172a", marginBottom: "15px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Add New Reminder</span>
              <button onClick={() => setShowAddReminderModal(false)} style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#64748b" }}>×</button>
            </div>
            <form onSubmit={handleCreateReminder}>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", color: "#475569", marginBottom: "4px" }}>Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Lead Follow-up Call"
                  value={newReminderTitle}
                  onChange={(e) => setNewReminderTitle(e.target.value)}
                  required
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                />
              </div>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", color: "#475569", marginBottom: "4px" }}>Description</label>
                <textarea
                  placeholder="Enter details..."
                  value={newReminderDesc}
                  onChange={(e) => setNewReminderDesc(e.target.value)}
                  rows={3}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                />
              </div>
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", color: "#475569", marginBottom: "4px" }}>Remind Me At *</label>
                <input
                  type="datetime-local"
                  value={newReminderTime}
                  onChange={(e) => setNewReminderTime(e.target.value)}
                  required
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                />
              </div>
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setShowAddReminderModal(false)}
                  className="btn-cancel"
                  style={{ padding: "8px 16px" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingReminder}
                  className="btn-premium"
                  style={{ padding: "8px 16px" }}
                >
                  {creatingReminder ? "Creating..." : "Save Reminder"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}