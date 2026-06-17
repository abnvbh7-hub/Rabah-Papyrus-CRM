import Footer from "/comps/Footer.jsx";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Sparkles, FileText, IndianRupee, CheckCircle, Clock, Truck, ShieldCheck, RefreshCw } from "lucide-react";
import { BASE_URL } from "./config";

export default function Accounts() {
  const nav = useNavigate();
  const [role, setRole] = useState("");
  const [invoices, setInvoices] = useState([]);
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [updatingInvoiceId, setUpdatingInvoiceId] = useState(null);
  const [updatingDispatchId, setUpdatingDispatchId] = useState(null);

  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) {
      nav("/login");
      return;
    }
    fetchMe();
    fetchInvoicesAndDeals();
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
      console.error("Error fetching user profile:", err);
    }
  };

  const fetchInvoicesAndDeals = async () => {
    setLoading(true);
    try {
      const invRes = await fetch(`${BASE_URL}/invoices`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const invData = await invRes.json();
      
      const dealRes = await fetch(`${BASE_URL}/deals`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const dealData = await dealRes.json();

      if (invData.status === "success") {
        setInvoices(invData.invoices || []);
      }
      if (dealData.status === "success") {
        setDeals(dealData.deals || []);
      }
    } catch (err) {
      console.error("Error fetching accounting data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentStatusChange = async (invoiceId, newStatus) => {
    setUpdatingInvoiceId(invoiceId);
    try {
      const res = await fetch(`${BASE_URL}/invoice/${invoiceId}/payment`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ payment_status: newStatus })
      });
      const data = await res.json();
      if (data.status === "success") {
        alert("Payment status updated successfully!");
        fetchInvoicesAndDeals();
      } else {
        alert(data.message || "Failed to update payment status");
      }
    } catch (err) {
      console.error("Error updating payment:", err);
    } finally {
      setUpdatingInvoiceId(null);
    }
  };

  const handleDispatchStatusChange = async (orderId, newDispatchStatus) => {
    setUpdatingDispatchId(orderId);
    
    // Find matching deal to get existing parameters for DealUpdate request body
    const matchingDeal = deals.find(d => d.id === orderId);
    if (!matchingDeal) {
      alert("Error: Associated order not found in Registry.");
      setUpdatingDispatchId(null);
      return;
    }

    const payload = {
      deal_name: matchingDeal.deal_name || `ORD-${orderId}`,
      company_name: matchingDeal.company_name || "",
      contact_name: matchingDeal.contact_name || "",
      phone: matchingDeal.phone || "",
      email: matchingDeal.email || "",
      deal_value: parseFloat(matchingDeal.deal_value) || 0,
      source: matchingDeal.source || "Manual",
      note: matchingDeal.note || "",
      assigned_to: matchingDeal.assigned_to ? parseInt(matchingDeal.assigned_to) : null
    };

    try {
      const res = await fetch(`${BASE_URL}/deal/${orderId}?stage=Closed Won&status=${newDispatchStatus}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.status === "success") {
        alert(`Dispatch / Delivery stage updated to ${newDispatchStatus}!`);
        fetchInvoicesAndDeals();
      } else {
        alert(data.message || "Failed to update dispatch stage");
      }
    } catch (err) {
      console.error("Error updating dispatch:", err);
    } finally {
      setUpdatingDispatchId(null);
    }
  };

  // Helper to find the current order status of an invoice
  const getOrderStatus = (orderId) => {
    const d = deals.find(x => x.id === orderId);
    return d ? d.status : "PENDING";
  };

  const filteredInvoices = invoices.filter(inv =>
    inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.order_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isAdminOrHR = role === "admin" || role === "hr";

  // Calculations
  const totalInvoiced = invoices.reduce((sum, inv) => sum + (parseFloat(inv.total_amount) || 0), 0);
  const paidInvoiced = invoices.filter(inv => inv.payment_status === "PAID").reduce((sum, inv) => sum + (parseFloat(inv.total_amount) || 0), 0);
  const pendingInvoiced = invoices.filter(inv => inv.payment_status === "PENDING").reduce((sum, inv) => sum + (parseFloat(inv.total_amount) || 0), 0);

  return (
    <>
      <div className="main-db">
        {/* Header */}
        <div className="dia">
          <div className="in-scr">
            <div className="dia-x">Invoicing & Accounts</div>
            <div className="dia-y">Monitor receivables, update invoice payments, and manage dispatch/delivery logistics</div>
          </div>
          <div>
            <button className="btn-premium" onClick={fetchInvoicesAndDeals} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <RefreshCw size={14} /> Sync Accounts
            </button>
          </div>
        </div>

        {/* Invoice Summary Widgets */}
        <div className="card-mc">
          <div className="hm-card">
            <div className="hmmc">
              <div className="hm-card-x">Total Receivables</div>
              <div className="hm-card-y">₹ {totalInvoiced.toLocaleString("en-IN")}</div>
              <div className="hm-card-z">All generated invoices</div>
            </div>
            <IndianRupee className="card-img" size={32} />
          </div>

          <div className="hm-card">
            <div className="hmmc">
              <div className="hm-card-x">Payments Received</div>
              <div className="hm-card-y">₹ {paidInvoiced.toLocaleString("en-IN")}</div>
              <div className="hm-card-z">Cleared ledger status</div>
            </div>
            <CheckCircle className="card-img" size={32} />
          </div>

          <div className="hm-card">
            <div className="hmmc">
              <div className="hm-card-x">Outstanding Balance</div>
              <div className="hm-card-y">₹ {pendingInvoiced.toLocaleString("en-IN")}</div>
              <div className="hm-card-z-r">Pending clearances</div>
            </div>
            <Clock className="card-img" size={32} />
          </div>
        </div>

        {/* Search */}
        <div className="hrow1-x">
          <input
            type="text"
            className="searchbar"
            placeholder="Search by invoice number, company, or order reference..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="linimg" size={18} />
        </div>

        {/* Invoice Ledger Table */}
        <div className="lr2">
          <div className="table-header">Invoice Registry Logs</div>
          {loading ? (
            <p style={{ padding: "20px", color: "#64748b" }}>Loading accounting records...</p>
          ) : filteredInvoices.length === 0 ? (
            <p style={{ padding: "20px", color: "#64748b" }}>No invoices found in registry.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="lead-table">
                <thead>
                  <tr>
                    <th>Invoice ID / No.</th>
                    <th>Order Ref</th>
                    <th>Client Company</th>
                    <th>Amount Details</th>
                    <th>Generated Date</th>
                    <th>Payment Status</th>
                    <th>Mark Payment</th>
                    <th>Dispatch / Delivery Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((inv) => {
                    const currentOrderStatus = getOrderStatus(inv.order_id);
                    const isPaid = inv.payment_status === "PAID";
                    
                    return (
                      <tr key={inv.id}>
                        <td style={{ fontWeight: "600", color: "#0f172a" }}>{inv.invoice_number}</td>
                        <td>{inv.order_number}</td>
                        <td>{inv.company_name}</td>
                        <td>
                          <div style={{ fontWeight: "bold", color: "#047857" }}>₹ {inv.total_amount}</div>
                          <div style={{ fontSize: "11px", color: "#64748b" }}>Gst (18%): ₹ {inv.gst}</div>
                        </td>
                        <td>
                          {inv.generated_at 
                            ? new Date(inv.generated_at).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" }) 
                            : "N/A"}
                        </td>
                        <td>
                          <span className={
                            inv.payment_status === "PAID" ? "status-done" :
                            inv.payment_status === "PARTIAL" ? "status-progress" : "status-todo"
                          }>
                            {inv.payment_status}
                          </span>
                        </td>
                        <td>
                          <select
                            value={inv.payment_status}
                            onChange={(e) => handlePaymentStatusChange(inv.id, e.target.value)}
                            disabled={!isAdminOrHR || updatingInvoiceId === inv.id}
                            style={{ 
                              padding: "4px 8px", 
                              borderRadius: "4px", 
                              border: "1px solid #cbd5e1", 
                              background: "#f8fafc", 
                              fontSize: "12px", 
                              color: "#0f172a", 
                              cursor: "pointer" 
                            }}
                          >
                            <option value="PENDING">PENDING</option>
                            <option value="PARTIAL">PARTIAL</option>
                            <option value="PAID">PAID</option>
                          </select>
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            {isPaid ? (
                              <select
                                value={currentOrderStatus}
                                onChange={(e) => handleDispatchStatusChange(inv.order_id, e.target.value)}
                                disabled={updatingDispatchId === inv.order_id}
                                style={{ 
                                  padding: "4px 8px", 
                                  borderRadius: "4px", 
                                  border: "1px solid #cbd5e1", 
                                  background: "#f8fafc", 
                                  fontSize: "12px", 
                                  color: "#0f172a", 
                                  cursor: "pointer" 
                                }}
                              >
                                <option value="PAYMENT_RECEIVED">PAYMENT_RECEIVED</option>
                                <option value="DISPATCHED">DISPATCHED</option>
                                <option value="DELIVERED">DELIVERED</option>
                              </select>
                            ) : (
                              <span style={{ fontSize: "11px", color: "#64748b", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                <Truck size={12} /> Awaiting Payment
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
