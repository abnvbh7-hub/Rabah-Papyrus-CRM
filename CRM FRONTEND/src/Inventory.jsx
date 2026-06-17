import Footer from "/comps/Footer.jsx"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { 
  Search, Sparkles, Boxes, AlertTriangle, AlertCircle, Plus, RefreshCw, 
  FileText, Settings, ChevronDown, ChevronUp, ShoppingBag, CheckCircle, 
  XCircle, Archive, ClipboardList, Layers, TrendingUp
} from "lucide-react";
import { BASE_URL } from "./config";

// Hardcoded size and specification charts
const BAG_SIZES = [
  { size: "8×3×14", weight: 0.022, perKg: 45, pieces30kg: 1350 },
  { size: "8×3×12", weight: 0.018, perKg: 55, pieces30kg: 1650 },
  { size: "8×3×10", weight: 0.015, perKg: 66, pieces30kg: 1980 },
  { size: "8×3×8",  weight: 0.013, perKg: 76, pieces30kg: 2280 },
  { size: "8×4×10", weight: 0.016, perKg: 62, pieces30kg: 1860 },

  { size: "10×4×16", weight: 0.027, perKg: 37, pieces30kg: 1110 },
  { size: "10×4×14", weight: 0.024, perKg: 41, pieces30kg: 1230 },
  { size: "10×4×12", weight: 0.021, perKg: 47, pieces30kg: 1410 },
  { size: "10×4×10", weight: 0.018, perKg: 55, pieces30kg: 1650 },

  { size: "12×4×16", weight: 0.033, perKg: 30, pieces30kg: 900 },
  { size: "12×4×14", weight: 0.030, perKg: 33, pieces30kg: 990 },
  { size: "12×4×12", weight: 0.026, perKg: 38, pieces30kg: 1140 },
  { size: "12×4×10", weight: 0.023, perKg: 43, pieces30kg: 1290 },

  { size: "14×4×16", weight: 0.051, perKg: 19, pieces30kg: 570 },
  { size: "14×4×14", weight: 0.047, perKg: 21, pieces30kg: 630 },
  { size: "14×4×12", weight: 0.041, perKg: 24, pieces30kg: 720 },
  { size: "14×4×10", weight: 0.034, perKg: 29, pieces30kg: 870 },
];

const TISSUES_SIZES = [
  { size: "30×30", type: "Soft", high: 27, low: 25 },
  { size: "30×27", type: "Soft", high: 26, low: 25 },
  { size: "27×27", type: "Soft", high: 25, low: 23 },

  { size: "30×30", type: "Hard", high: 26, low: 24 },
  { size: "30×27", type: "Hard", high: 25, low: 23 },
  { size: "27×27", type: "Hard", high: 24, low: 22 },
  { size: "22×22", type: "Hard", high: 22, low: 21 },
];

export default function Inventory() {
  const nav = useNavigate();
  const [activeTab, setActiveTab] = useState("raw_materials"); // "raw_materials" or "indents"
  const [role, setRole] = useState("");
  const [userId, setUserId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  // Raw database tables
  const [inventory, setInventory] = useState([]);
  const [purchaseRequests, setPurchaseRequests] = useState([]);

  // Accordion status for indents categories
  const [expandedCategory, setExpandedCategory] = useState(null);

  // Modals state
  const [showItemModal, setShowItemModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemForm, setItemForm] = useState({
    type: "Reel",
    color: "",
    centimeters: "",
    current_stock: 0,
    minimum_stock: 0,
    unit: "kg"
  });

  const [showPRModal, setShowPRModal] = useState(false);
  const [prForm, setPrForm] = useState({
    item_name: "",
    quantity: 0,
    vendor_name: ""
  });

  const [showIndentInventoryModal, setShowIndentInventoryModal] = useState(false);
  const [selectedIndentItem, setSelectedIndentItem] = useState(null);
  const [indentInventoryForm, setIndentInventoryForm] = useState({
    category: "Medical pouches",
    color: "White",
    size: "8×3×14",
    tissueType: "Soft",
    customName: "",
    current_stock: 0,
    minimum_stock: 100,
    unit: "Units"
  });
  const [savingIndentInventory, setSavingIndentInventory] = useState(false);

  const token = localStorage.getItem("token");

  // Check authentication
  useEffect(() => {
    if (!token) {
      nav("/login");
      return;
    }
    fetchMe();
  }, [token]);

  // Load backend data
  useEffect(() => {
    if (!token || !role) return;
    loadAllData();
  }, [role, token]);

  const fetchMe = async () => {
    try {
      const res = await fetch(`${BASE_URL}/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.payload) {
        setRole(data.payload.role.toLowerCase());
        setUserId(data.payload.employee_id);
      }
    } catch (err) {
      console.error(err);
      nav("/login");
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchInventory(),
        fetchPurchaseRequests()
      ]);
    } catch (err) {
      console.error("Error loading inventory data:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInventory = async () => {
    const res = await fetch(`${BASE_URL}/inventory`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.status === "success") {
      setInventory(data.inventory || []);
    }
  };

  const fetchPurchaseRequests = async () => {
    const res = await fetch(`${BASE_URL}/purchase_requests`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.status === "success") {
      setPurchaseRequests(data.purchase_requests || []);
    }
  };


  // Helper parser for Raw Material edit modal pre-fills
  const parseRawMaterialName = (name) => {
    if (name.startsWith("Reel")) {
      const match = name.match(/Reel \(([^,]+),\s*([^)]+)cm\)/) || name.match(/Reel \(([^,)]+)\)/);
      return {
        type: "Reel",
        color: match ? match[1] : "Kraft",
        centimeters: match && match[2] ? match[2] : "102"
      };
    } else if (name.startsWith("Sheets")) {
      const match = name.match(/Sheets \(([^)]+)\)/);
      return {
        type: "Sheets",
        color: match ? match[1] : "Kraft",
        centimeters: ""
      };
    } else if (["Glue", "Colors", "Handles"].includes(name)) {
      return {
        type: name,
        color: "",
        centimeters: ""
      };
    }
    return {
      type: "Reel",
      color: name,
      centimeters: ""
    };
  };

  // Create or update raw material stock item
  const handleItemSubmit = async (e) => {
    e.preventDefault();
    let finalName = "";
    if (itemForm.type === "Reel") {
      finalName = `Reel (${itemForm.color || "Kraft"}, ${itemForm.centimeters || "102"}cm)`;
    } else if (itemForm.type === "Sheets") {
      finalName = `Sheets (${itemForm.color || "Kraft"})`;
    } else {
      finalName = itemForm.type;
    }

    const payload = {
      item_name: finalName,
      category: "Raw Material",
      current_stock: parseFloat(itemForm.current_stock) || 0,
      minimum_stock: parseFloat(itemForm.minimum_stock) || 0,
      unit: itemForm.unit || "kg"
    };

    const isEditing = !!selectedItem;
    const url = isEditing 
      ? `${BASE_URL}/inventory/item/${selectedItem.id}` 
      : `${BASE_URL}/inventory/item`;
    const method = isEditing ? "PUT" : "POST";

    try {
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
        alert(data.message);
        setShowItemModal(false);
        setSelectedItem(null);
        fetchInventory();
      } else {
        alert(data.message || "Failed to save item");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving raw material item");
    }
  };

  // Raise purchase request
  const handlePRSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${BASE_URL}/purchase_request`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(prForm)
      });
      const data = await res.json();
      if (data.status === "success") {
        alert(data.message);
        setShowPRModal(false);
        setPrForm({ item_name: "", quantity: 0, vendor_name: "" });
        fetchPurchaseRequests();
      } else {
        alert(data.message || "Failed to raise purchase request");
      }
    } catch (err) {
      console.error(err);
      alert("Error submitting purchase request");
    }
  };

  // Approve or reject purchase requests (Admin & Accountant/Accounts allowed)
  const handlePRStatus = async (id, approve) => {
    const action = approve ? "approve" : "reject";
    if (!window.confirm(`Are you sure you want to ${action} this purchase request?`)) return;
    try {
      const res = await fetch(`${BASE_URL}/purchase_request/${id}/${action}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === "success") {
        alert(data.message);
        loadAllData();
      } else {
        alert(data.message || "Action failed");
      }
    } catch (err) {
      console.error(err);
      alert("Error updating purchase request status");
    }
  };

  // Submit indent inventory details directly to inventory table
  const handleIndentInventorySubmit = async (e) => {
    e.preventDefault();
    setSavingIndentInventory(true);

    let finalItemName = "";

    if (indentInventoryForm.category === "Medical pouches") {
      finalItemName = `Medical pouches (${indentInventoryForm.color}, ${indentInventoryForm.size})`;
    } else if (indentInventoryForm.category === "Tissues") {
      finalItemName = `Tissues (${indentInventoryForm.size}, ${indentInventoryForm.tissueType})`;
    } else if (indentInventoryForm.category === "Custom") {
      finalItemName = indentInventoryForm.customName;
    } else {
      // V bottoms, Square bottom without handle, Square bottom with handle
      finalItemName = `${indentInventoryForm.category} (${indentInventoryForm.size})`;
    }

    const payload = {
      item_name: finalItemName,
      category: "Indents",
      current_stock: parseFloat(indentInventoryForm.current_stock) || 0,
      minimum_stock: parseFloat(indentInventoryForm.minimum_stock) || 0,
      unit: indentInventoryForm.unit || "Units"
    };

    const isEditing = !!selectedIndentItem;
    const url = isEditing 
      ? `${BASE_URL}/inventory/item/${selectedIndentItem.id}` 
      : `${BASE_URL}/inventory/item`;
    const method = isEditing ? "PUT" : "POST";

    try {
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
        alert(data.message || "Indent details saved successfully!");
        setShowIndentInventoryModal(false);
        setSelectedIndentItem(null);
        fetchInventory();
      } else {
        alert(data.message || "Failed to save indent details");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving indent details");
    } finally {
      setSavingIndentInventory(false);
    }
  };

  // Helper to parse indent name for modal pre-fills
  const parseIndentName = (name) => {
    if (name.startsWith("Medical pouches")) {
      const match = name.match(/Medical pouches \(([^,]+),\s*([^)]+)\)/);
      return {
        category: "Medical pouches",
        color: match ? match[1] : "White",
        size: match ? match[2] : "8×3×14",
        tissueType: "Soft",
        customName: ""
      };
    } else if (name.startsWith("Tissues")) {
      const match = name.match(/Tissues \(([^,]+),\s*([^)]+)\)/);
      return {
        category: "Tissues",
        color: "White",
        size: match ? match[1] : "30×30",
        tissueType: match ? match[2] : "Soft",
        customName: ""
      };
    } else {
      // V bottoms, Square bottom without handle, Square bottom with handle
      const categories = [
        "V bottoms", 
        "Square bottom without handle", 
        "Square bottom with handle"
      ];
      const category = categories.find(c => name.startsWith(c));
      if (category) {
        const match = name.match(/\(([^)]+)\)/);
        return {
          category,
          color: "White",
          size: match ? match[1] : "8×3×14",
          tissueType: "Soft",
          customName: ""
        };
      }
      return {
        category: "Custom",
        color: "White",
        size: "",
        tissueType: "Soft",
        customName: name
      };
    }
  };

  const getSubcategoryItem = (categoryName, specifications) => {
    let finalName = "";
    if (categoryName === "Medical pouches") {
      finalName = `Medical pouches (${specifications.color}, ${specifications.size})`;
    } else if (categoryName === "Tissues") {
      finalName = `Tissues (${specifications.size}, ${specifications.type})`;
    } else {
      finalName = `${categoryName} (${specifications.size})`;
    }
    return inventory.find(i => i.name.toLowerCase() === finalName.toLowerCase());
  };

  // Helper to resolve stock count for specific subcategories
  const getSubcategoryStock = (categoryName, specifications) => {
    const item = getSubcategoryItem(categoryName, specifications);
    return item ? item.stock : 0;
  };

  // Filters
  const filteredRawMaterials = inventory.filter(item => 
    (item.category === "Raw Material" || item.category === "Raw Materials") &&
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPurchases = purchaseRequests.filter(pr => 
    pr.item_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredIndents = inventory.filter(item => 
    (item.category === "Indents" || item.category === "Finished Goods") &&
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isAdminOrAccountant = role === "admin" || role === "accountant" || role === "accounts";
  const isInventoryStaff = role === "inventory" || role === "admin";

  return (
    <>
      <div className="main-db">
        {/* HEADER */}
        <div className="dia">
          <div className="in-scr">
            <div className="dia-x">Inventory & Indents Control Center</div>
            <div className="dia-y">Monitor raw material stocks, finished goods indents, and supplier requisitions</div>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            {activeTab === "raw_materials" && isInventoryStaff && (
              <button 
                className="btn-premium" 
                onClick={() => { 
                  setSelectedItem(null); 
                  setItemForm({ type: "Reel", color: "Kraft", centimeters: "102", current_stock: 0, minimum_stock: 0, unit: "kg" }); 
                  setShowItemModal(true); 
                }}
              >
                <Plus size={14} /> Add Raw Material
              </button>
            )}
            {activeTab === "raw_materials" && (
              <button 
                className="btn-premium" 
                style={{ background: "rgba(79, 70, 229, 0.1)", color: "#4f46e5", border: "1px solid rgba(79, 70, 229, 0.2)" }}
                onClick={() => { 
                  setPrForm({ item_name: "", quantity: 0, vendor_name: "" }); 
                  setShowPRModal(true); 
                }}
              >
                <Plus size={14} /> Raise Purchase PR
              </button>
            )}
            {activeTab === "indents" && isInventoryStaff && (
              <button 
                className="btn-premium" 
                onClick={() => { 
                  setSelectedIndentItem(null);
                  setIndentInventoryForm({ category: "Medical pouches", color: "White", size: "8×3×14", tissueType: "Soft", customName: "", current_stock: 0, minimum_stock: 100, unit: "Units" }); 
                  setShowIndentInventoryModal(true); 
                }}
              >
                <Plus size={14} /> Add Indent Product
              </button>
            )}
            <button className="btn-dark-ai" onClick={() => alert("AI insights: Raw material lead times are stable. Paper Reel (120GSM) is running low in secondary warehouses.")}>
              <Sparkles size={14} /> AI Forecasts
            </button>
          </div>
        </div>

        {/* SECTION switcher */}
        <div style={{ display: "flex", borderBottom: "1px solid rgba(15,23,42,0.08)", marginBottom: "20px", gap: "25px", paddingBottom: "5px" }}>
          <button 
            style={{ 
              background: "none", 
              border: "none", 
              padding: "10px 5px", 
              fontSize: "16px", 
              fontWeight: activeTab === "raw_materials" ? "bold" : "500", 
              color: activeTab === "raw_materials" ? "#4f46e5" : "#64748b", 
              borderBottom: activeTab === "raw_materials" ? "3px solid #4f46e5" : "none", 
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
            onClick={() => { setActiveTab("raw_materials"); setSearchTerm(""); }}
          >
            <Boxes size={18} />
            Raw Materials Stock
          </button>
          <button 
            style={{ 
              background: "none", 
              border: "none", 
              padding: "10px 5px", 
              fontSize: "16px", 
              fontWeight: activeTab === "indents" ? "bold" : "500", 
              color: activeTab === "indents" ? "#4f46e5" : "#64748b", 
              borderBottom: activeTab === "indents" ? "3px solid #4f46e5" : "none", 
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
            onClick={() => { setActiveTab("indents"); setSearchTerm(""); }}
          >
            <ClipboardList size={18} />
            Indents Stock
          </button>
        </div>

        {/* SEARCH BAR */}
        <div className="hrow1-x" style={{ marginBottom: "20px" }}>
          <input 
            type="text" 
            className="searchbar" 
            placeholder={activeTab === "raw_materials" ? "Search raw materials & requisitions..." : "Search indents & finished goods..."} 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="linimg" size={18} />
        </div>

        {/* ==========================================
            TAB CONTENT: RAW MATERIALS
            ========================================== */}
        {activeTab === "raw_materials" && (
          <>
            {/* RAW MATERIALS SUMMARY */}
            <div className="card-mc" style={{ marginBottom: "25px" }}>
              <div className="hm-card">
                <div className="hmmc">
                  <div className="hm-card-x">Unique Materials</div>
                  <div className="hm-card-y">{filteredRawMaterials.length} Items</div>
                  <div className="hm-card-z">Active raw catalog</div>
                </div>
                <Boxes className="card-img" size={32} />
              </div>

              <div className="hm-card">
                <div className="hmmc">
                  <div className="hm-card-x">Low Stock Alert</div>
                  <div className="hm-card-y">{filteredRawMaterials.filter(i => i.stock <= i.minimum_stock && i.stock > 0).length} Items</div>
                  <div className="hm-card-z-r">Needs purchase order</div>
                </div>
                <AlertTriangle className="card-img" size={32} />
              </div>

              <div className="hm-card">
                <div className="hmmc">
                  <div className="hm-card-x">Pending Stock Requests</div>
                  <div className="hm-card-y">{filteredPurchases.filter(pr => pr.status === "PENDING").length} Requests</div>
                  <div className="hm-card-z">Awaiting approval</div>
                </div>
                <TrendingUp className="card-img" size={32} />
              </div>
            </div>

            {/* RAW MATERIALS TABLE */}
            <div className="lr2" style={{ marginBottom: "35px" }}>
              <div className="table-header">Raw Material Inventory</div>
              <table className="lead-table">
                <thead>
                  <tr>
                    <th>Material Type</th>
                    <th>Full Specifications</th>
                    <th>Current Stock</th>
                    <th>Minimum Stock</th>
                    <th>Status</th>
                    {isInventoryStaff && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredRawMaterials.map((item) => {
                    const parsed = parseRawMaterialName(item.name);
                    return (
                      <tr key={item.id}>
                        <td style={{ fontWeight: "600", color: "#4f46e5" }}>{parsed.type}</td>
                        <td style={{ fontWeight: "500", color: "#0f172a" }}>
                          {parsed.type === "Reel" && `Color: ${parsed.color}, Size: ${parsed.centimeters}cm`}
                          {parsed.type === "Sheets" && `Color: ${parsed.color}`}
                          {["Glue", "Colors", "Handles"].includes(parsed.type) && `Standard Grade`}
                        </td>
                        <td style={{ fontWeight: "bold" }}>{item.stock} {item.unit}</td>
                        <td style={{ color: "#64748b" }}>{item.minimum_stock} {item.unit}</td>
                        <td>
                          <span className={
                            item.status === "In Stock" ? "status-done" : 
                            item.status === "Low Stock" ? "status-progress" : "status-todo"
                          }>
                            {item.status}
                          </span>
                        </td>
                        {isInventoryStaff && (
                          <td>
                            <button 
                              className="btn-convert" 
                              style={{ marginRight: "6px" }}
                              onClick={() => {
                                setSelectedItem(item);
                                const parsedSpecs = parseRawMaterialName(item.name);
                                setItemForm({
                                  type: parsedSpecs.type,
                                  color: parsedSpecs.color,
                                  centimeters: parsedSpecs.centimeters,
                                  current_stock: item.stock,
                                  minimum_stock: item.minimum_stock,
                                  unit: item.unit
                                });
                                setShowItemModal(true);
                              }}
                            >
                              Edit Stock
                            </button>
                            <button 
                              className="btn-convert"
                              style={{ background: "rgba(16, 185, 129, 0.1)", color: "#047857", border: "1px solid rgba(16, 185, 129, 0.2)" }}
                              onClick={() => {
                                setPrForm({ 
                                  item_name: item.name, 
                                  quantity: Math.max(0, item.minimum_stock * 2 - item.stock), 
                                  vendor_name: "Default Vendor" 
                                });
                                setShowPRModal(true);
                              }}
                            >
                              Request Stock
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  {filteredRawMaterials.length === 0 && (
                    <tr>
                      <td colSpan={isInventoryStaff ? 6 : 5} style={{ textAlign: "center", padding: "20px", color: "#64748b" }}>
                        No raw material items found. Add items to catalog.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* RAW STOCK PURCHASE REQUESTS */}
            <div className="lr2">
              <div className="table-header">Raw Material Stock Purchase Requests</div>
              <table className="lead-table">
                <thead>
                  <tr>
                    <th>Requested Material</th>
                    <th>Quantity Requested</th>
                    <th>Vendor Name</th>
                    <th>Requested By</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPurchases.map((pr) => (
                    <tr key={pr.id}>
                      <td style={{ fontWeight: "600", color: "#0f172a" }}>{pr.item_name}</td>
                      <td style={{ fontWeight: "bold" }}>{pr.quantity}</td>
                      <td>{pr.vendor_name || "Default Vendor"}</td>
                      <td>{pr.requested_by}</td>
                      <td>
                        <span className={
                          pr.status === "APPROVED" ? "status-done" :
                          pr.status === "PENDING" ? "status-progress" : "status-todo"
                        } style={{
                          background: pr.status === "APPROVED" ? "#d1fae5" : pr.status === "PENDING" ? "#fef3c7" : "#fee2e2",
                          color: pr.status === "APPROVED" ? "#047857" : pr.status === "PENDING" ? "#d97706" : "#b91c1c",
                        }}>
                          {pr.status}
                        </span>
                      </td>
                      <td>
                        {pr.status === "PENDING" ? (
                          isAdminOrAccountant ? (
                            <div style={{ display: "flex", gap: "8px" }}>
                              <button 
                                className="btn-premium" 
                                style={{ background: "#10b981", border: "none", padding: "4px 8px", fontSize: "12px" }}
                                onClick={() => handlePRStatus(pr.id, true)}
                              >
                                Approve
                              </button>
                              <button 
                                className="btn-cancel" 
                                style={{ padding: "4px 8px", fontSize: "12px" }}
                                onClick={() => handlePRStatus(pr.id, false)}
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span style={{ color: "#64748b", fontSize: "12px" }}>Awaiting Admin/Accountant</span>
                          )
                        ) : (
                          <span style={{ color: "#64748b", fontSize: "12px" }}>Processed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredPurchases.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", padding: "20px", color: "#64748b" }}>
                        No stock requests found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ==========================================
            TAB CONTENT: INDENTS & FINISHED GOODS
            ========================================== */}
        {activeTab === "indents" && (
          <>
            {/* INDENTS STOCK TABLE */}
            <div className="lr2" style={{ marginBottom: "35px" }}>
              <div className="table-header">Indents Stock Inventory</div>
              <table className="lead-table">
                <thead>
                  <tr>
                    <th>Indent Item</th>
                    <th>Specifications</th>
                    <th>Available Quantity</th>
                    <th>Minimum Stock</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIndents.map((item) => {
                    const parsed = parseIndentName(item.name);
                    return (
                      <tr key={item.id}>
                        <td style={{ fontWeight: "600", color: "#4f46e5" }}>{parsed.category}</td>
                        <td style={{ fontWeight: "500", color: "#0f172a" }}>
                          {parsed.category === "Medical pouches" && `Color: ${parsed.color}, Size: ${parsed.size}`}
                          {parsed.category === "Tissues" && `Grade: ${parsed.tissueType}, Size: ${parsed.size}`}
                          {parsed.category === "Custom" && `${parsed.customName}`}
                          {!["Medical pouches", "Tissues", "Custom"].includes(parsed.category) && `Size: ${parsed.size}`}
                        </td>
                        <td style={{ fontWeight: "bold" }}>{item.stock} {item.unit}</td>
                        <td style={{ color: "#64748b" }}>{item.minimum_stock} {item.unit}</td>
                        <td>
                          <span className={
                            item.status === "In Stock" ? "status-done" : 
                            item.status === "Low Stock" ? "status-progress" : "status-todo"
                          }>
                            {item.status}
                          </span>
                        </td>
                        <td>
                          {isInventoryStaff ? (
                            <button 
                              className="btn-convert" 
                              onClick={() => {
                                setSelectedIndentItem(item);
                                const parsedSpecs = parseIndentName(item.name);
                                setIndentInventoryForm({
                                  category: parsedSpecs.category,
                                  color: parsedSpecs.color,
                                  size: parsedSpecs.size,
                                  tissueType: parsedSpecs.tissueType,
                                  customName: parsedSpecs.customName,
                                  current_stock: item.stock,
                                  minimum_stock: item.minimum_stock,
                                  unit: item.unit
                                });
                                setShowIndentInventoryModal(true);
                              }}
                            >
                              Update Stock
                            </button>
                          ) : (
                            <span style={{ fontSize: "12px", color: "#64748b" }}>View Only</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredIndents.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", padding: "20px", color: "#64748b" }}>
                        No indents found in stock. Add indents to catalog.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* ACCORDION CATEGORIES */}
            <div style={{ marginBottom: "35px" }}>
              <div className="table-header" style={{ marginBottom: "15px" }}>Finished Goods Stock by Category</div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                
                {/* 1. MEDICAL POUCHES */}
                <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", background: "#fff", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
                  <div 
                    style={{ padding: "15px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", background: expandedCategory === "medical" ? "#f8fafc" : "#fff" }}
                    onClick={() => setExpandedCategory(expandedCategory === "medical" ? null : "medical")}
                  >
                    <div>
                      <strong style={{ fontSize: "16px", color: "#0f172a" }}>Medical Pouches</strong>
                      <span style={{ marginLeft: "12px", fontSize: "12px", background: "#e2e8f0", padding: "2px 8px", borderRadius: "12px", color: "#475569" }}>White & Brown colors, all sizes</span>
                    </div>
                    {expandedCategory === "medical" ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                  {expandedCategory === "medical" && (
                    <div style={{ padding: "15px 20px", borderTop: "1px solid #edf2f7", overflowX: "auto" }}>
                      <table className="lead-table" style={{ width: "100%" }}>
                        <thead>
                          <tr>
                            <th>Size</th>
                            <th>Color</th>
                            <th>Weight (kg)</th>
                            <th>Per Kg Pieces</th>
                            <th>30kg Pieces</th>
                            <th>Current Stock</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {BAG_SIZES.flatMap(b => [
                            { size: b.size, color: "White", weight: b.weight, perKg: b.perKg, pieces30kg: b.pieces30kg },
                            { size: b.size, color: "Brown", weight: b.weight, perKg: b.perKg, pieces30kg: b.pieces30kg }
                          ]).map((item, idx) => {
                            const stock = getSubcategoryStock("Medical pouches", { color: item.color, size: item.size });
                            return (
                              <tr key={idx}>
                                <td><strong>{item.size}</strong></td>
                                <td>{item.color}</td>
                                <td>{item.weight}</td>
                                <td>{item.perKg}</td>
                                <td>{item.pieces30kg}</td>
                                <td><span style={{ fontWeight: "bold", color: stock > 0 ? "#10b981" : "#ef4444" }}>{stock} Units</span></td>
                                <td>
                                  {isInventoryStaff ? (
                                    <button 
                                      className="btn-convert"
                                      onClick={() => {
                                        const existing = getSubcategoryItem("Medical pouches", { color: item.color, size: item.size });
                                        if (existing) {
                                          setSelectedIndentItem(existing);
                                          setIndentInventoryForm({
                                            category: "Medical pouches",
                                            color: item.color,
                                            size: item.size,
                                            tissueType: "Soft",
                                            customName: "",
                                            current_stock: existing.stock,
                                            minimum_stock: existing.minimum_stock,
                                            unit: existing.unit
                                          });
                                        } else {
                                          setSelectedIndentItem(null);
                                          setIndentInventoryForm({
                                            category: "Medical pouches",
                                            color: item.color,
                                            size: item.size,
                                            tissueType: "Soft",
                                            customName: "",
                                            current_stock: 0,
                                            minimum_stock: 100,
                                            unit: "Units"
                                          });
                                        }
                                        setShowIndentInventoryModal(true);
                                      }}
                                    >
                                      {getSubcategoryItem("Medical pouches", { color: item.color, size: item.size }) ? "Update Stock" : "Set Stock"}
                                    </button>
                                  ) : (
                                    <span style={{ fontSize: "12px", color: "#64748b" }}>View Only</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* 2. V BOTTOMS */}
                <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", background: "#fff", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
                  <div 
                    style={{ padding: "15px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", background: expandedCategory === "vbottom" ? "#f8fafc" : "#fff" }}
                    onClick={() => setExpandedCategory(expandedCategory === "vbottom" ? null : "vbottom")}
                  >
                    <div>
                      <strong style={{ fontSize: "16px", color: "#0f172a" }}>V Bottoms</strong>
                      <span style={{ marginLeft: "12px", fontSize: "12px", background: "#e2e8f0", padding: "2px 8px", borderRadius: "12px", color: "#475569" }}>All Bag sizes</span>
                    </div>
                    {expandedCategory === "vbottom" ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                  {expandedCategory === "vbottom" && (
                    <div style={{ padding: "15px 20px", borderTop: "1px solid #edf2f7", overflowX: "auto" }}>
                      <table className="lead-table" style={{ width: "100%" }}>
                        <thead>
                          <tr>
                            <th>Size</th>
                            <th>Weight (kg)</th>
                            <th>Per Kg Pieces</th>
                            <th>30kg Pieces</th>
                            <th>Current Stock</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {BAG_SIZES.map((b, idx) => {
                            const stock = getSubcategoryStock("V bottoms", { size: b.size });
                            return (
                              <tr key={idx}>
                                <td><strong>{b.size}</strong></td>
                                <td>{b.weight}</td>
                                <td>{b.perKg}</td>
                                <td>{b.pieces30kg}</td>
                                <td><span style={{ fontWeight: "bold", color: stock > 0 ? "#10b981" : "#ef4444" }}>{stock} Units</span></td>
                                <td>
                                  {isInventoryStaff ? (
                                    <button 
                                      className="btn-convert"
                                      onClick={() => {
                                        const existing = getSubcategoryItem("V bottoms", { size: b.size });
                                        if (existing) {
                                          setSelectedIndentItem(existing);
                                          setIndentInventoryForm({
                                            category: "V bottoms",
                                            color: "White",
                                            size: b.size,
                                            tissueType: "Soft",
                                            customName: "",
                                            current_stock: existing.stock,
                                            minimum_stock: existing.minimum_stock,
                                            unit: existing.unit
                                          });
                                        } else {
                                          setSelectedIndentItem(null);
                                          setIndentInventoryForm({
                                            category: "V bottoms",
                                            color: "White",
                                            size: b.size,
                                            tissueType: "Soft",
                                            customName: "",
                                            current_stock: 0,
                                            minimum_stock: 100,
                                            unit: "Units"
                                          });
                                        }
                                        setShowIndentInventoryModal(true);
                                      }}
                                    >
                                      {getSubcategoryItem("V bottoms", { size: b.size }) ? "Update Stock" : "Set Stock"}
                                    </button>
                                  ) : (
                                    <span style={{ fontSize: "12px", color: "#64748b" }}>View Only</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* 3. SQUARE BOTTOM WITHOUT HANDLE */}
                <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", background: "#fff", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
                  <div 
                    style={{ padding: "15px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", background: expandedCategory === "square_no_handle" ? "#f8fafc" : "#fff" }}
                    onClick={() => setExpandedCategory(expandedCategory === "square_no_handle" ? null : "square_no_handle")}
                  >
                    <div>
                      <strong style={{ fontSize: "16px", color: "#0f172a" }}>Square Bottom Without Handle</strong>
                      <span style={{ marginLeft: "12px", fontSize: "12px", background: "#e2e8f0", padding: "2px 8px", borderRadius: "12px", color: "#475569" }}>All Bag sizes</span>
                    </div>
                    {expandedCategory === "square_no_handle" ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                  {expandedCategory === "square_no_handle" && (
                    <div style={{ padding: "15px 20px", borderTop: "1px solid #edf2f7", overflowX: "auto" }}>
                      <table className="lead-table" style={{ width: "100%" }}>
                        <thead>
                          <tr>
                            <th>Size</th>
                            <th>Weight (kg)</th>
                            <th>Per Kg Pieces</th>
                            <th>30kg Pieces</th>
                            <th>Current Stock</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {BAG_SIZES.map((b, idx) => {
                            const stock = getSubcategoryStock("Square bottom without handle", { size: b.size });
                            return (
                              <tr key={idx}>
                                <td><strong>{b.size}</strong></td>
                                <td>{b.weight}</td>
                                <td>{b.perKg}</td>
                                <td>{b.pieces30kg}</td>
                                <td><span style={{ fontWeight: "bold", color: stock > 0 ? "#10b981" : "#ef4444" }}>{stock} Units</span></td>
                                <td>
                                  {isInventoryStaff ? (
                                    <button 
                                      className="btn-convert"
                                      onClick={() => {
                                        const existing = getSubcategoryItem("Square bottom without handle", { size: b.size });
                                        if (existing) {
                                          setSelectedIndentItem(existing);
                                          setIndentInventoryForm({
                                            category: "Square bottom without handle",
                                            color: "White",
                                            size: b.size,
                                            tissueType: "Soft",
                                            customName: "",
                                            current_stock: existing.stock,
                                            minimum_stock: existing.minimum_stock,
                                            unit: existing.unit
                                          });
                                        } else {
                                          setSelectedIndentItem(null);
                                          setIndentInventoryForm({
                                            category: "Square bottom without handle",
                                            color: "White",
                                            size: b.size,
                                            tissueType: "Soft",
                                            customName: "",
                                            current_stock: 0,
                                            minimum_stock: 100,
                                            unit: "Units"
                                          });
                                        }
                                        setShowIndentInventoryModal(true);
                                      }}
                                    >
                                      {getSubcategoryItem("Square bottom without handle", { size: b.size }) ? "Update Stock" : "Set Stock"}
                                    </button>
                                  ) : (
                                    <span style={{ fontSize: "12px", color: "#64748b" }}>View Only</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* 4. SQUARE BOTTOM WITH HANDLE */}
                <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", background: "#fff", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
                  <div 
                    style={{ padding: "15px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", background: expandedCategory === "square_handle" ? "#f8fafc" : "#fff" }}
                    onClick={() => setExpandedCategory(expandedCategory === "square_handle" ? null : "square_handle")}
                  >
                    <div>
                      <strong style={{ fontSize: "16px", color: "#0f172a" }}>Square Bottom With Handle</strong>
                      <span style={{ marginLeft: "12px", fontSize: "12px", background: "#e2e8f0", padding: "2px 8px", borderRadius: "12px", color: "#475569" }}>All Bag sizes</span>
                    </div>
                    {expandedCategory === "square_handle" ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                  {expandedCategory === "square_handle" && (
                    <div style={{ padding: "15px 20px", borderTop: "1px solid #edf2f7", overflowX: "auto" }}>
                      <table className="lead-table" style={{ width: "100%" }}>
                        <thead>
                          <tr>
                            <th>Size</th>
                            <th>Weight (kg)</th>
                            <th>Per Kg Pieces</th>
                            <th>30kg Pieces</th>
                            <th>Current Stock</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {BAG_SIZES.map((b, idx) => {
                            const stock = getSubcategoryStock("Square bottom with handle", { size: b.size });
                            return (
                              <tr key={idx}>
                                <td><strong>{b.size}</strong></td>
                                <td>{b.weight}</td>
                                <td>{b.perKg}</td>
                                <td>{b.pieces30kg}</td>
                                <td><span style={{ fontWeight: "bold", color: stock > 0 ? "#10b981" : "#ef4444" }}>{stock} Units</span></td>
                                <td>
                                  {isInventoryStaff ? (
                                    <button 
                                      className="btn-convert"
                                      onClick={() => {
                                        const existing = getSubcategoryItem("Square bottom with handle", { size: b.size });
                                        if (existing) {
                                          setSelectedIndentItem(existing);
                                          setIndentInventoryForm({
                                            category: "Square bottom with handle",
                                            color: "White",
                                            size: b.size,
                                            tissueType: "Soft",
                                            customName: "",
                                            current_stock: existing.stock,
                                            minimum_stock: existing.minimum_stock,
                                            unit: existing.unit
                                          });
                                        } else {
                                          setSelectedIndentItem(null);
                                          setIndentInventoryForm({
                                            category: "Square bottom with handle",
                                            color: "White",
                                            size: b.size,
                                            tissueType: "Soft",
                                            customName: "",
                                            current_stock: 0,
                                            minimum_stock: 100,
                                            unit: "Units"
                                          });
                                        }
                                        setShowIndentInventoryModal(true);
                                      }}
                                    >
                                      {getSubcategoryItem("Square bottom with handle", { size: b.size }) ? "Update Stock" : "Set Stock"}
                                    </button>
                                  ) : (
                                    <span style={{ fontSize: "12px", color: "#64748b" }}>View Only</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* 5. TISSUES */}
                <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", background: "#fff", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
                  <div 
                    style={{ padding: "15px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", background: expandedCategory === "tissues" ? "#f8fafc" : "#fff" }}
                    onClick={() => setExpandedCategory(expandedCategory === "tissues" ? null : "tissues")}
                  >
                    <div>
                      <strong style={{ fontSize: "16px", color: "#0f172a" }}>Tissues</strong>
                      <span style={{ marginLeft: "12px", fontSize: "12px", background: "#e2e8f0", padding: "2px 8px", borderRadius: "12px", color: "#475569" }}>Soft & Hard grades, all dimensions</span>
                    </div>
                    {expandedCategory === "tissues" ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                  {expandedCategory === "tissues" && (
                    <div style={{ padding: "15px 20px", borderTop: "1px solid #edf2f7", overflowX: "auto" }}>
                      <table className="lead-table" style={{ width: "100%" }}>
                        <thead>
                          <tr>
                            <th>Size</th>
                            <th>Grade Type</th>
                            <th>High Range</th>
                            <th>Low Range</th>
                            <th>Current Stock</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {TISSUES_SIZES.map((t, idx) => {
                            const stock = getSubcategoryStock("Tissues", { size: t.size, type: t.type });
                            return (
                              <tr key={idx}>
                                <td><strong>{t.size}</strong></td>
                                <td>
                                  <span style={{
                                    padding: "2px 8px",
                                    borderRadius: "12px",
                                    fontSize: "11px",
                                    fontWeight: "bold",
                                    background: t.type === "Soft" ? "#ebf8ff" : "#f7fafc",
                                    color: t.type === "Soft" ? "#2b6cb0" : "#4a5568",
                                    border: t.type === "Soft" ? "1px solid #bee3f8" : "1px solid #e2e8f0"
                                  }}>
                                    {t.type}
                                  </span>
                                </td>
                                <td>{t.high}</td>
                                <td>{t.low}</td>
                                <td><span style={{ fontWeight: "bold", color: stock > 0 ? "#10b981" : "#ef4444" }}>{stock} Units</span></td>
                                <td>
                                  {isInventoryStaff ? (
                                    <button 
                                      className="btn-convert"
                                      onClick={() => {
                                        const existing = getSubcategoryItem("Tissues", { size: t.size, type: t.type });
                                        if (existing) {
                                          setSelectedIndentItem(existing);
                                          setIndentInventoryForm({
                                            category: "Tissues",
                                            color: "White",
                                            size: t.size,
                                            tissueType: t.type,
                                            customName: "",
                                            current_stock: existing.stock,
                                            minimum_stock: existing.minimum_stock,
                                            unit: existing.unit
                                          });
                                        } else {
                                          setSelectedIndentItem(null);
                                          setIndentInventoryForm({
                                            category: "Tissues",
                                            color: "White",
                                            size: t.size,
                                            tissueType: t.type,
                                            customName: "",
                                            current_stock: 0,
                                            minimum_stock: 100,
                                            unit: "Units"
                                          });
                                        }
                                        setShowIndentInventoryModal(true);
                                      }}
                                    >
                                      {getSubcategoryItem("Tissues", { size: t.size, type: t.type }) ? "Update Stock" : "Set Stock"}
                                    </button>
                                  ) : (
                                    <span style={{ fontSize: "12px", color: "#64748b" }}>View Only</span>
                                  )}
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
            </div>
          </>
        )}

        {/* ==========================================
            MODAL: ADD/EDIT RAW MATERIAL
            ========================================== */}
        {showItemModal && (
          <div className="modal-overlay" onClick={() => setShowItemModal(false)}>
            <div className="employee-modal" style={{ padding: "20px" }} onClick={e => e.stopPropagation()}>
              <div className="modal-top">
                <h2>{selectedItem ? "Modify Raw Material" : "Add Raw Material"}</h2>
                <button className="close-btn" onClick={() => setShowItemModal(false)}>✕</button>
              </div>
              <form onSubmit={handleItemSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "4px" }}>Material Type</label>
                  <select 
                    className="searchbar" 
                    value={itemForm.type} 
                    onChange={e => setItemForm({...itemForm, type: e.target.value})}
                    style={{ background: "#f8fafc" }}
                  >
                    <option value="Reel">Reel</option>
                    <option value="Glue">Glue</option>
                    <option value="Colors">Colors</option>
                    <option value="Handles">Handles</option>
                    <option value="Sheets">Sheets</option>
                  </select>
                </div>

                {itemForm.type === "Reel" && (
                  <div style={{ display: "flex", gap: "10px" }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "4px" }}>Color spec</label>
                      <input 
                        type="text" 
                        required 
                        className="searchbar" 
                        placeholder="e.g. Red, Brown, Kraft" 
                        value={itemForm.color} 
                        onChange={e => setItemForm({...itemForm, color: e.target.value})} 
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "4px" }}>Width (centimeters)</label>
                      <input 
                        type="text" 
                        required 
                        className="searchbar" 
                        placeholder="e.g. 90, 102" 
                        value={itemForm.centimeters} 
                        onChange={e => setItemForm({...itemForm, centimeters: e.target.value})} 
                      />
                    </div>
                  </div>
                )}

                {itemForm.type === "Sheets" && (
                  <div>
                    <label style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "4px" }}>Color spec</label>
                    <input 
                      type="text" 
                      required 
                      className="searchbar" 
                      placeholder="e.g. Brown, White" 
                      value={itemForm.color} 
                      onChange={e => setItemForm({...itemForm, color: e.target.value})} 
                    />
                  </div>
                )}

                <div style={{ display: "flex", gap: "10px" }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "4px" }}>Current Stock</label>
                    <input type="number" required className="searchbar" value={itemForm.current_stock} onChange={e => setItemForm({...itemForm, current_stock: parseFloat(e.target.value) || 0})} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "4px" }}>Minimum Stock</label>
                    <input type="number" required className="searchbar" value={itemForm.minimum_stock} onChange={e => setItemForm({...itemForm, minimum_stock: parseFloat(e.target.value) || 0})} />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "4px" }}>Unit</label>
                  <input type="text" required className="searchbar" placeholder="e.g. kg, pieces, sheets" value={itemForm.unit} onChange={e => setItemForm({...itemForm, unit: e.target.value})} />
                </div>

                <button type="submit" className="btn-premium" style={{ marginTop: "10px" }}>Save Material Details</button>
              </form>
            </div>
          </div>
        )}

        {/* ==========================================
            MODAL: RAISE PURCHASE REQUEST (NEW STOCK)
            ========================================== */}
        {showPRModal && (
          <div className="modal-overlay" onClick={() => setShowPRModal(false)}>
            <div className="employee-modal" style={{ padding: "20px" }} onClick={e => e.stopPropagation()}>
              <div className="modal-top">
                <h2>Request Raw Material Stock</h2>
                <button className="close-btn" onClick={() => setShowPRModal(false)}>✕</button>
              </div>
              <form onSubmit={handlePRSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "4px" }}>Select Material from Catalog</label>
                  <select 
                    className="searchbar"
                    value={prForm.item_name}
                    onChange={e => setPrForm({...prForm, item_name: e.target.value})}
                    required
                    style={{ background: "#f8fafc" }}
                  >
                    <option value="">-- Choose Raw Material SKU --</option>
                    {inventory.filter(i => i.category === "Raw Material").map(i => (
                      <option key={i.id} value={i.name}>{i.name} (Stock: {i.stock} {i.unit})</option>
                    ))}
                    <option value="CUSTOM_MATERIAL">-- Request custom / unregistered material --</option>
                  </select>
                </div>

                {prForm.item_name === "CUSTOM_MATERIAL" && (
                  <div>
                    <label style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "4px" }}>Enter Material Description</label>
                    <input 
                      type="text" 
                      required 
                      className="searchbar" 
                      placeholder="e.g. Kraft Paper Reel 120GSM, 102cm width" 
                      onChange={e => setPrForm({...prForm, item_name: e.target.value})} 
                    />
                  </div>
                )}

                <div>
                  <label style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "4px" }}>Quantity Required</label>
                  <input type="number" required className="searchbar" placeholder="Enter amount" value={prForm.quantity} onChange={e => setPrForm({...prForm, quantity: parseFloat(e.target.value) || 0})} />
                </div>
                <div>
                  <label style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "4px" }}>Supplier / Vendor Name</label>
                  <input type="text" className="searchbar" placeholder="e.g. Paramount Paper Mills" value={prForm.vendor_name} onChange={e => setPrForm({...prForm, vendor_name: e.target.value})} />
                </div>
                <button type="submit" className="btn-premium" style={{ marginTop: "10px" }}>Raise PR Request</button>
              </form>
            </div>
          </div>
        )}

        {/* ==========================================
            MODAL: ADD/EDIT INDENT (FINISHED GOODS INVENTORY)
            ========================================== */}
        {showIndentInventoryModal && (
          <div className="modal-overlay" onClick={() => setShowIndentInventoryModal(false)}>
            <div className="employee-modal" style={{ padding: "20px" }} onClick={e => e.stopPropagation()}>
              <div className="modal-top">
                <h2>{selectedIndentItem ? "Modify Indent Stock" : "Add Indent Product"}</h2>
                <button className="close-btn" onClick={() => setShowIndentInventoryModal(false)}>✕</button>
              </div>
              <form onSubmit={handleIndentInventorySubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "4px" }}>Product Category</label>
                  <select 
                    className="searchbar"
                    value={indentInventoryForm.category}
                    onChange={e => setIndentInventoryForm({...indentInventoryForm, category: e.target.value, size: e.target.value === "Tissues" ? "30×30" : "8×3×14"})}
                    required
                    disabled={!!selectedIndentItem}
                    style={{ background: "#f8fafc" }}
                  >
                    <option value="Medical pouches">Medical pouches</option>
                    <option value="V bottoms">V bottoms</option>
                    <option value="Square bottom without handle">Square bottom without handle</option>
                    <option value="Square bottom with handle">Square bottom with handle</option>
                    <option value="Tissues">Tissues</option>
                    <option value="Custom">Custom / Unregistered Product</option>
                  </select>
                </div>

                {indentInventoryForm.category === "Custom" && (
                  <div>
                    <label style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "4px" }}>Product Name / Specs</label>
                    <input 
                      type="text" 
                      required 
                      className="searchbar" 
                      placeholder="e.g. Non-woven Loop Handle Bag (Orange, 12×16)" 
                      value={indentInventoryForm.customName}
                      disabled={!!selectedIndentItem}
                      onChange={e => setIndentInventoryForm({...indentInventoryForm, customName: e.target.value})} 
                    />
                  </div>
                )}

                {indentInventoryForm.category === "Medical pouches" && (
                  <div>
                    <label style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "4px" }}>Color spec</label>
                    <select 
                      className="searchbar" 
                      value={indentInventoryForm.color} 
                      onChange={e => setIndentInventoryForm({...indentInventoryForm, color: e.target.value})}
                      disabled={!!selectedIndentItem}
                      style={{ background: "#f8fafc" }}
                    >
                      <option value="White">White</option>
                      <option value="Brown">Brown</option>
                    </select>
                  </div>
                )}

                {indentInventoryForm.category === "Tissues" && (
                  <div>
                    <label style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "4px" }}>Grade Type</label>
                    <select 
                      className="searchbar" 
                      value={indentInventoryForm.tissueType} 
                      onChange={e => setIndentInventoryForm({...indentInventoryForm, tissueType: e.target.value})}
                      disabled={!!selectedIndentItem}
                      style={{ background: "#f8fafc" }}
                    >
                      <option value="Soft">Soft</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>
                )}

                {indentInventoryForm.category !== "Custom" && (
                  <div>
                    <label style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "4px" }}>Size Subcategory</label>
                    <select 
                      className="searchbar" 
                      value={indentInventoryForm.size} 
                      onChange={e => setIndentInventoryForm({...indentInventoryForm, size: e.target.value})}
                      disabled={!!selectedIndentItem}
                      style={{ background: "#f8fafc" }}
                    >
                      {indentInventoryForm.category === "Tissues" 
                        ? TISSUES_SIZES.filter(t => t.type === indentInventoryForm.tissueType).map((t, idx) => (
                            <option key={idx} value={t.size}>{t.size} (High: {t.high}, Low: {t.low})</option>
                          ))
                        : BAG_SIZES.map((b, idx) => (
                            <option key={idx} value={b.size}>{b.size} (Weight: {b.weight}kg, PerKg: {b.perKg})</option>
                          ))
                      }
                    </select>
                  </div>
                )}

                <div style={{ display: "flex", gap: "10px" }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "4px" }}>Available Stock Quantity</label>
                    <input 
                      type="number" 
                      required 
                      className="searchbar" 
                      placeholder="e.g. 500" 
                      value={indentInventoryForm.current_stock} 
                      onChange={e => setIndentInventoryForm({...indentInventoryForm, current_stock: parseFloat(e.target.value) || 0})} 
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "4px" }}>Minimum Stock Warning</label>
                    <input 
                      type="number" 
                      required 
                      className="searchbar" 
                      placeholder="e.g. 100" 
                      value={indentInventoryForm.minimum_stock} 
                      onChange={e => setIndentInventoryForm({...indentInventoryForm, minimum_stock: parseFloat(e.target.value) || 0})} 
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "4px" }}>Unit</label>
                  <input 
                    type="text" 
                    required 
                    className="searchbar" 
                    placeholder="e.g. Units, pcs, bags" 
                    value={indentInventoryForm.unit} 
                    onChange={e => setIndentInventoryForm({...indentInventoryForm, unit: e.target.value})} 
                  />
                </div>

                <button type="submit" className="btn-premium" style={{ marginTop: "10px" }} disabled={savingIndentInventory}>
                  {savingIndentInventory ? "Saving..." : "Save Indent Details"}
                </button>
              </form>
            </div>
          </div>
        )}

        <Footer />
      </div>
    </>
  )
}