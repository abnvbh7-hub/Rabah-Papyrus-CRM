import Footer from "/comps/Footer.jsx"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { MapContainer, TileLayer, Marker, Popup as LeafletPopup } from "react-leaflet"
import { BASE_URL } from "./config"

const parseGMT = (str) => {
  if (!str) return new Date();
  const formatted = str.replace(" ", "T");
  return new Date(formatted.endsWith("Z") ? formatted : formatted + "Z");
};

export default function Track() {
  const nav = useNavigate()
  const [type, setType] = useState("loading")
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  const filteredEmployees = employees.filter((emp) =>
    (emp.name && emp.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (emp.employee_id && emp.employee_id.toString().toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const [showMapModal, setShowMapModal] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      nav("/login")
    }
  }, [])

  async function fetchUser() {
    const token = localStorage.getItem("token")
    try {
      const res = await fetch(`${BASE_URL}/me`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      
      if (data.payload) {
        setType(data.payload.role.toLowerCase())
        
        if (data.payload.verified === false) {
          localStorage.removeItem("token")
          nav('/under_review')
        }
      }
    } catch (err) {
      console.error(err)
    }
  }

  async function fetchLocations() {
    const token = localStorage.getItem("token")
    try {
      // Assuming the /users endpoint returns latitude and longitude for each user
      // If a dedicated /locations endpoint exists, replace this URL.
      const res = await fetch(`${BASE_URL}/users`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.status === "success" && data.users) {
        setEmployees(data.users)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    async function init() {
      await fetchUser()
      await fetchLocations()
    }
    init()
  }, [])

  useEffect(() => {
    if (type === "loading") return
    if (type !== "hr" && type !== "admin") {
      localStorage.removeItem("token")
      nav("/")
    }
  }, [type])

  const openInMaps = (lat, lng, e) => {
    e.stopPropagation();
    const mapLat = lat || "28.6139";
    const mapLng = lng || "77.2090";
    window.open(`https://www.google.com/maps/search/?api=1&query=${mapLat},${mapLng}`, "_blank")
  }

  const handleViewMap = async (emp) => {
    const token = localStorage.getItem("token")
    try {
      const res = await fetch(`${BASE_URL}/user/${emp.employee_id}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.status === "success" && data.user) {
        const user = data.user
        if (user.latitude !== null && user.longitude !== null && user.latitude !== undefined && user.longitude !== undefined) {
          setSelectedLocation({
            lat: parseFloat(user.latitude),
            lng: parseFloat(user.longitude),
            name: user.name,
            time: user.location_updated ? parseGMT(user.location_updated).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
          })
          setShowMapModal(true)
        } else {
          alert(`No location coordinates recorded for ${user.name || emp.name}.`)
        }
      } else {
        alert("Failed to fetch employee location details.")
      }
    } catch (err) {
      console.error("Error fetching employee details:", err)
      alert("Error fetching employee location details.")
    }
  }

  return (
    <>
      <div className="main-db">
        {/* HEADER */}
        <div className="dia">
          <div className="in-scr">
            <div className="dia-x">Employee Tracking</div>
            <div className="dia-y">Track the real-time location of your workforce</div>
          </div>
        </div>

        {/* SEARCH */}
        <div className="hrow1-x">
          <input
            type="text"
            className="searchbar"
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <img
            className="linimg"
            src="/search.png"
          />
        </div>

        {/* TRACKING TABLE */}
        <div className="lr2">
          <div className="table-header">Location Logs</div>
          {loading ? (
            <p style={{ padding: "20px", color: "white" }}>Loading locations...</p>
          ) : filteredEmployees.length === 0 ? (
            <p style={{ padding: "20px", color: "white" }}>No employee location data found.</p>
          ) : (
            <table className="lead-table">
              <thead>
                <tr>
                  <th>EMP ID</th>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Last Known Location</th>
                  <th>Location Updated At</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((emp, index) => (
                  <tr 
                    key={emp.employee_id || index}
                    onClick={() => handleViewMap(emp)}
                    style={{ cursor: "pointer" }}
                  >
                    <td>{emp.employee_id}</td>
                    <td>{emp.name}</td>
                    <td>{emp.role}</td>
                    <td>
                      {emp.latitude && emp.longitude 
                        ? `${emp.latitude}, ${emp.longitude}` 
                        : "Location Not Sent"}
                    </td>
                    <td>
                      {emp.location_updated 
                        ? parseGMT(emp.location_updated).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) 
                        : "N/A"}
                    </td>
                    <td>
                      <button 
                        style={{ 
                          padding: "8px 14px", 
                          fontSize: "12px", 
                          fontWeight: "bold",
                          color: "#000",
                          background: "linear-gradient(135deg, #00ffcc 0%, #00b3ff 100%)",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                          boxShadow: "0 2px 10px rgba(0, 255, 204, 0.3)",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          transition: "transform 0.2s ease"
                        }}
                        onClick={(e) => openInMaps(emp.latitude, emp.longitude, e)}
                        onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"}
                        onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                      >
                        Open in Maps
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* MAP MODAL */}
        {showMapModal && selectedLocation && (
          <div className="modal-overlay">
            <div className="employee-modal" style={{ maxWidth: "800px", width: "95%" }}>
              <div className="modal-top">
                <h2>Location Map: {selectedLocation.name}</h2>
                <button
                  className="close-btn"
                  onClick={() => setShowMapModal(false)}
                >
                  ✕
                </button>
              </div>

              <div className="employee-details" style={{ padding: "10px 20px" }}>
                <p style={{ color: "white", marginBottom: "15px" }}>
                  <strong>Last Ping:</strong> {selectedLocation.time}
                </p>
                <div style={{ height: "400px", width: "100%", borderRadius: "8px", overflow: "hidden" }}>
                  <MapContainer center={[selectedLocation.lat, selectedLocation.lng]} zoom={13} style={{ height: "100%", width: "100%" }}>
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker position={[selectedLocation.lat, selectedLocation.lng]}>
                      <LeafletPopup>
                        {selectedLocation.name} was here.
                      </LeafletPopup>
                    </Marker>
                  </MapContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        <Footer />
      </div>
    </>
  )
}
