import Footer from "/comps/Footer.jsx"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import Calendar from "react-calendar"
import { MapContainer, TileLayer, Marker, Popup as LeafletPopup, useMap } from "react-leaflet"
import L from "leaflet"
import { Search, Calendar as CalendarIcon, MapPin, Activity, Info, Clock } from "lucide-react";
import { BASE_URL } from "./config";

const checkInIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const checkOutIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const parseGMT = (str) => {
  if (!str) return new Date();
  const formatted = str.replace(" ", "T");
  return new Date(formatted.endsWith("Z") ? formatted : formatted + "Z");
};

const formatWorkHours = (hours) => {
  if (hours === undefined || hours === null) return "0 mins";
  const num = parseFloat(hours);
  if (isNaN(num)) return "0 mins";
  const hrs = Math.floor(num);
  const mins = Math.round((num - hrs) * 60);
  if (hrs === 0) return `${mins} mins`;
  return `${hrs}h ${mins}m`;
};

// Helper component to dynamically recenter Leaflet map when coords change
function RecenterMap({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
  }, [lat, lng, map]);
  return null;
}

export default function Attendance() {
  const nav = useNavigate()
  const [type, setType] = useState("loading")
  const [currentUser, setCurrentUser] = useState(null)
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  const filteredEmployees = employees.filter((emp) =>
    (emp.name && emp.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (emp.employee_id && emp.employee_id.toString().toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const [showCalendarModal, setShowCalendarModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)

  const [selectedDayLog, setSelectedDayLog] = useState(null)
  const [showDayModal, setShowDayModal] = useState(false)
  const [attendanceStats, setAttendanceStats] = useState({ present: 0, absent: 0 })

  const [userMonthlyLogs, setUserMonthlyLogs] = useState([]);

  const handleDayClick = (value) => {
    const date = new Date(value);
    const localDateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    
    const log = userMonthlyLogs.find(l => l.attendance_date && l.attendance_date.startsWith(localDateStr));
    
    if (log) {
      setSelectedDayLog(log);
      if (type === "admin" || type === "hr") {
        setShowDayModal(true);
      }
    } else {
      if (type === "admin" || type === "hr") {
        alert("No check-in or check-out data recorded for this date.");
      } else {
        setSelectedDayLog(null);
      }
    }
  }

  // MONTHLY CALENDAR STATE
  const [monthlyAttendanceData, setMonthlyAttendanceData] = useState({})

  const fetchMonthlyAttendance = async (userId, targetDate = new Date()) => {
    const token = localStorage.getItem("token")
    const month = targetDate.getMonth() + 1;
    const year = targetDate.getFullYear();

    try {
      const res = await fetch(`${BASE_URL}/attendance/${userId}?month=${month}&year=${year}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.status === "success" && data.attendance) {
        setUserMonthlyLogs(data.attendance);

        const monthlyData = {};
        
        // Mark all past working days in the month as absent by default
        const today = new Date();
        const isCurrentMonth = today.getMonth() + 1 === month && today.getFullYear() === year;
        const isFutureMonth = targetDate > today && !isCurrentMonth;
        
        let lastDay = 0;
        if (!isFutureMonth) {
          lastDay = isCurrentMonth ? today.getDate() : new Date(year, month, 0).getDate();
        }
        
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
            // Mark as present if there's a valid log
            monthlyData[localDate] = (log.status && log.status.toLowerCase() === 'present') || !!log.checkin_time;
          }
        });
        
        setMonthlyAttendanceData(monthlyData);
        setAttendanceStats({
          present: Object.values(monthlyData).filter(v => v === true).length,
          absent: Object.values(monthlyData).filter(v => v === false).length
        });
      } else {
        setUserMonthlyLogs([]);
        setMonthlyAttendanceData({});
      }
    } catch (err) {
      console.error("Error fetching monthly attendance:", err)
      setUserMonthlyLogs([]);
      setMonthlyAttendanceData({});
      setAttendanceStats({ present: 0, absent: 0 });
    }
  }

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
        setCurrentUser(data.payload)
        setType(data.payload.role.toLowerCase())
        
        if (data.payload.verified === false) {
          localStorage.removeItem("token")
          nav('/under_review')
        } else {
          // If a standard user, fetch their own attendance history directly
          if (data.payload.role.toLowerCase() !== "admin" && data.payload.role.toLowerCase() !== "hr") {
            fetchMonthlyAttendance(data.payload.employee_id)
          } else {
            // Admin/HR views other employees
            fetchEmployees()
          }
        }
      }
    } catch (err) {
      console.error("Error checking authentication:", err)
    }
  }

  const fetchEmployees = async () => {
    const token = localStorage.getItem("token")
    try {
      const res = await fetch(`${BASE_URL}/users`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.status === "success") {
        setEmployees(data.users)
      }
    } catch (err) {
      console.error("Error loading employee registry:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUser()
  }, [])

  const handleViewCalendar = async (employee) => {
    setSelectedUser(employee)
    setShowCalendarModal(true)
    await fetchMonthlyAttendance(employee.employee_id)
  }

  return (
    <>
      <div className="main-db">
        <div className="dia">
          <div className="in-scr">
            <div className="dia-x">Attendance Registry</div>
            <div className="dia-y">Monitor geolocated attendance check-in details</div>
          </div>
        </div>

        {/* ADMIN & HR DIRECTORY VIEW */}
        {(type === "admin" || type === "hr") && (
          <>
            {/* SEARCH */}
            <div className="hrow1-x">
              <input
                type="text"
                className="searchbar"
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="linimg" size={18} />
            </div>

            {/* EMPLOYEES TABLE */}
            <div className="lr2">
              <div className="table-header">Employee Directory</div>
              {loading ? (
                <p style={{ padding: "20px", color: "#64748b" }}>Loading employees...</p>
              ) : filteredEmployees.length === 0 ? (
                <p style={{ padding: "20px", color: "#64748b" }}>No employees found.</p>
              ) : (
                <table className="lead-table">
                  <thead>
                    <tr>
                      <th>EMP ID</th>
                      <th>Name</th>
                      <th>Role</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployees.map((emp, index) => (
                      <tr 
                        key={emp.id || index}
                        onClick={() => handleViewCalendar(emp)}
                        style={{ cursor: "pointer" }}
                      >
                        <td>{emp.employee_id}</td>
                        <td>{emp.name}</td>
                        <td style={{ textTransform: "capitalize" }}>{emp.role}</td>
                        <td>
                          <span className={emp.status === false ? "status-todo" : "status-done"}>
                            {emp.status === false ? "Inactive" : "Active"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* PERSONAL VIEW FOR NON-ADMIN / NON-HR ROLES */}
        {type !== "admin" && type !== "hr" && type !== "loading" && currentUser && (
          <div className="lr2" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>
            <div className="table-header">My Attendance Dashboard</div>
            
            <div style={{ display: "flex", flexWrap: "wrap", gap: "20px", width: "100%" }}>
              {/* Stats Card */}
              <div style={{ flex: "1 1 300px", background: "#f8fafc", padding: "20px", borderRadius: "12px", border: "1px solid rgba(15, 23, 42, 0.08)", color: "#0f172a", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <h3 style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "15px", color: "#0f172a", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Activity size={16} className="text-primary" />
                    This Month's Summary
                  </h3>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "15px" }}>
                    <div>
                      <div style={{ fontSize: "12px", color: "#64748b" }}>Total Present</div>
                      <div style={{ fontSize: "28px", fontWeight: "bold", color: "#10b981" }}>{attendanceStats.present}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "12px", color: "#64748b" }}>Total Absent</div>
                      <div style={{ fontSize: "28px", fontWeight: "bold", color: "#ef4444" }}>{attendanceStats.absent}</div>
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: "12px", color: "#64748b", borderTop: "1px solid rgba(15, 23, 42, 0.08)", paddingTop: "10px", display: "flex", alignItems: "center", gap: "4px" }}>
                  <Info size={12} />
                  Click any day on the calendar to see details of your check-in, check-out, and location logs.
                </div>
              </div>

              {/* Calendar Card */}
              <div style={{ flex: "1 1 350px", display: "flex", justifyContent: "center", background: "#f8fafc", padding: "20px", borderRadius: "12px", border: "1px solid rgba(15, 23, 42, 0.08)" }}>
                <style>{`
                  .present-day { background-color: #dcfce7 !important; color: #15803d !important; font-weight: bold; border-radius: 8px; border: 1px solid #bbf7d0; }
                  .absent-day { background-color: #fee2e2 !important; color: #dc2626 !important; font-weight: bold; border-radius: 8px; border: 1px solid #fecaca; }
                  .weekend { background-color: transparent !important; color: #6b7280 !important; }
                  .react-calendar { width: 100%; max-width: 420px; border-radius: 12px; border: 1px solid rgba(15, 23, 42, 0.08); background: #ffffff; color: #111827; padding: 10px; font-family: "Montserrat", sans-serif; box-shadow: 0 4px 6px rgba(0,0,0,0.02); }
                  .react-calendar button { color: #111827; border-radius: 8px; margin: 2px 0; padding: 10px 0; font-family: "Montserrat", sans-serif; }
                  .react-calendar button:enabled:hover { background-color: #e5e7eb; }
                  .react-calendar__navigation button:enabled:hover,
                  .react-calendar__navigation button:focus { background-color: #e5e7eb; }
                  .react-calendar__tile--now { background: #dbeafe !important; color: #1e40af !important; font-weight: bold; }
                  .react-calendar__tile--active { background: #111827 !important; color: white !important; }
                  .react-calendar__month-view__days__day--neighboringMonth { color: #9ca3af !important; }
                `}</style>
                <Calendar 
                  value={new Date()}
                  onActiveStartDateChange={({ activeStartDate, view }) => {
                    if (view === 'month') {
                      fetchMonthlyAttendance(currentUser.employee_id, activeStartDate);
                    }
                  }}
                  onClickDay={(value) => handleDayClick(value)}
                  tileClassName={({ date, view }) => {
                    if (view === 'month') {
                      const day = date.getDay();
                      if (day === 0 || day === 6) return 'weekend';
                      
                      const status = monthlyAttendanceData[date.toDateString()];
                      if (status === true) return 'present-day';
                      if (status === false) return 'absent-day';
                      
                      return null;
                    }
                  }}
                />
              </div>
            </div>

            {/* Selected Day Log & Map Details */}
            {selectedDayLog ? (
              <div style={{ background: "#f8fafc", border: "1px solid rgba(15, 23, 42, 0.08)", borderRadius: "12px", padding: "20px", color: "#0f172a" }}>
                <h3 style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "15px", borderBottom: "1px solid rgba(15, 23, 42, 0.08)", paddingBottom: "10px", color: "#0f172a", display: "flex", alignItems: "center", gap: "6px" }}>
                  <CalendarIcon size={16} />
                  Day Log Details: {selectedDayLog.attendance_date}
                </h3>
                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  color: "#0f172a", 
                  marginBottom: "20px", 
                  background: "#ffffff", 
                  padding: "15px", 
                  borderRadius: "8px",
                  border: "1px solid rgba(15, 23, 42, 0.08)",
                  flexWrap: "wrap", 
                  gap: "10px" 
                }}>
                  <div>
                    <strong style={{ color: "#64748b", display: "block", fontSize: "12px" }}>Check In</strong>
                    <div style={{ fontSize: "14px", marginTop: "4px", color: "#0f172a" }}>
                      {selectedDayLog.checkin_time ? parseGMT(selectedDayLog.checkin_time).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "N/A"}
                    </div>
                  </div>
                  <div>
                    <strong style={{ color: "#64748b", display: "block", fontSize: "12px" }}>Check Out</strong>
                    <div style={{ fontSize: "14px", marginTop: "4px", color: "#0f172a" }}>
                      {selectedDayLog.checkout_time ? parseGMT(selectedDayLog.checkout_time).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "Not checked out"}
                    </div>
                  </div>
                  <div style={{ background: "rgba(99, 102, 241, 0.05)", padding: "5px 12px", borderRadius: "8px", border: "1px solid rgba(99, 102, 241, 0.15)" }}>
                    <strong style={{ color: "#4f46e5", display: "block", fontSize: "12px" }}>Work Hours</strong>
                    <div style={{ fontSize: "15px", fontWeight: "bold", color: "#4f46e5", marginTop: "2px" }}>
                      {formatWorkHours(selectedDayLog.work_hours)}
                    </div>
                  </div>
                </div>

                {selectedDayLog.checkin_lat && selectedDayLog.checkin_lon ? (
                  <div className="responsive-map-container" style={{ height: "300px", width: "100%", borderRadius: "8px", overflow: "hidden", border: "1px solid rgba(15, 23, 42, 0.08)" }}>
                    <MapContainer center={[selectedDayLog.checkin_lat, selectedDayLog.checkin_lon]} zoom={14} style={{ height: "100%", width: "100%" }}>
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <Marker position={[selectedDayLog.checkin_lat, selectedDayLog.checkin_lon]} icon={checkInIcon}>
                        <LeafletPopup>Checked In Here</LeafletPopup>
                      </Marker>
                      {selectedDayLog.checkout_lat && selectedDayLog.checkout_lon && (
                        <Marker position={[selectedDayLog.checkout_lat, selectedDayLog.checkout_lon]} icon={checkOutIcon}>
                          <LeafletPopup>Checked Out Here</LeafletPopup>
                        </Marker>
                      )}
                      <RecenterMap lat={selectedDayLog.checkin_lat} lng={selectedDayLog.checkin_lon} />
                    </MapContainer>
                  </div>
                ) : (
                  <p style={{ color: "#64748b", textAlign: "center", padding: "20px", background: "#ffffff", borderRadius: "8px", border: "1px solid rgba(15, 23, 42, 0.08)" }}>
                    No GPS coordinates recorded for this check-in.
                  </p>
                )}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "30px", background: "#f8fafc", color: "#64748b", borderRadius: "12px", border: "1px solid rgba(15, 23, 42, 0.08)" }}>
                Select a marked green or red date from the calendar to inspect your detailed check-in / check-out locations on the map.
              </div>
            )}
          </div>
        )}
      </div>

      {/* CALENDAR MODAL FOR ADMIN/HR DIRECTORY CLICK */}
      {showCalendarModal && selectedUser && (
        <div className="modal-overlay">
          <div className="employee-modal medium">
            <div className="modal-top">
              <h2>Attendance Calendar: {selectedUser.name}</h2>
              <button
                className="close-btn"
                onClick={() => setShowCalendarModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="employee-details" style={{ overflowX: "auto", display: "flex", flexDirection: "column", alignItems: "center", padding: "10px", width: "100%" }}>
              <style>{`
                .present-day { background-color: #dcfce7 !important; color: #15803d !important; font-weight: bold; border-radius: 8px; border: 1px solid #bbf7d0; }
                .absent-day { background-color: #fee2e2 !important; color: #dc2626 !important; font-weight: bold; border-radius: 8px; border: 1px solid #fecaca; }
                .weekend { background-color: transparent !important; color: #6b7280 !important; }
                .react-calendar { width: 100%; max-width: 420px; border-radius: 12px; border: 1px solid #e5e7eb; background: #f9fafb; color: #111827; padding: 10px; font-family: "Montserrat", sans-serif; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
                .react-calendar button { color: #111827; border-radius: 8px; margin: 2px 0; padding: 10px 0; font-family: "Montserrat", sans-serif; }
                .react-calendar button:enabled:hover { background-color: #e5e7eb; }
                .react-calendar__navigation button:enabled:hover,
                .react-calendar__navigation button:focus { background-color: #e5e7eb; }
                .react-calendar__tile--now { background: #dbeafe !important; color: #1e40af !important; font-weight: bold; }
                .react-calendar__tile--active { background: #111827 !important; color: white !important; }
              `}</style>
              <div style={{ display: "flex", justifyContent: "space-between", width: "100%", maxWidth: "420px", marginBottom: "15px", background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid rgba(15, 23, 42, 0.08)" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>Total Present</div>
                  <div style={{ fontSize: "20px", fontWeight: "bold", color: "#10b981" }}>{attendanceStats.present}</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>Total Absent</div>
                  <div style={{ fontSize: "20px", fontWeight: "bold", color: "#ef4444" }}>{attendanceStats.absent}</div>
                </div>
              </div>

              <Calendar 
                value={new Date()}
                onActiveStartDateChange={({ activeStartDate, view }) => {
                  if (view === 'month') {
                    fetchMonthlyAttendance(selectedUser.employee_id, activeStartDate);
                  }
                }}
                onClickDay={(value) => handleDayClick(value)}
                tileClassName={({ date, view }) => {
                  if (view === 'month') {
                    const day = date.getDay();
                    if (day === 0 || day === 6) return 'weekend';
                    
                    const status = monthlyAttendanceData[date.toDateString()];
                    if (status === true) return 'present-day';
                    if (status === false) return 'absent-day';
                    
                    return null;
                  }
                }}
              />
              <div style={{ display: "flex", gap: "20px", marginTop: "20px", color: "#0f172a", fontWeight: "bold" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><div style={{ width: "16px", height: "16px", backgroundColor: "#dcfce7", border: "1px solid #bbf7d0", borderRadius: "4px" }}></div> Present</div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><div style={{ width: "16px", height: "16px", backgroundColor: "#fee2e2", border: "1px solid #fecaca", borderRadius: "4px" }}></div> Absent</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DAY MAP MODAL FOR ADMIN/HR DIRECTORY CLICK */}
      {showDayModal && selectedDayLog && (
        <div className="modal-overlay">
          <div className="employee-modal large">
            <div className="modal-top">
              <h2>Attendance Logs: {selectedDayLog.attendance_date}</h2>
              <button
                className="close-btn"
                onClick={() => setShowDayModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="employee-details" style={{ padding: "20px" }}>
              <div style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                color: "#0f172a", 
                marginBottom: "20px", 
                background: "#f8fafc", 
                padding: "15px", 
                borderRadius: "12px",
                border: "1px solid rgba(15, 23, 42, 0.08)",
                flexWrap: "wrap", 
                gap: "10px" 
              }}>
                <div>
                  <strong style={{ color: "#64748b", display: "block", fontSize: "12px" }}>Check In</strong>
                  <div style={{ fontSize: "16px", marginTop: "4px", color: "#0f172a" }}>
                    {selectedDayLog.checkin_time ? parseGMT(selectedDayLog.checkin_time).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "N/A"}
                  </div>
                </div>
                <div>
                  <strong style={{ color: "#64748b", display: "block", fontSize: "12px" }}>Check Out</strong>
                  <div style={{ fontSize: "16px", marginTop: "4px", color: "#0f172a" }}>
                    {selectedDayLog.checkout_time ? parseGMT(selectedDayLog.checkout_time).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "Not checked out"}
                  </div>
                </div>
                <div style={{ background: "rgba(99, 102, 241, 0.05)", padding: "5px 12px", borderRadius: "8px", border: "1px solid rgba(99, 102, 241, 0.15)" }}>
                  <strong style={{ color: "#4f46e5", display: "block", fontSize: "12px" }}>Work Hours</strong>
                  <div style={{ fontSize: "18px", fontWeight: "bold", color: "#4f46e5", marginTop: "2px" }}>
                    {formatWorkHours(selectedDayLog.work_hours)}
                  </div>
                </div>
              </div>

              {selectedDayLog.checkin_lat && selectedDayLog.checkin_lon ? (
                <div className="responsive-map-container" style={{ height: "400px", width: "100%", borderRadius: "8px", overflow: "hidden", border: "1px solid rgba(15, 23, 42, 0.08)" }}>
                  <MapContainer center={[selectedDayLog.checkin_lat, selectedDayLog.checkin_lon]} zoom={13} style={{ height: "100%", width: "100%" }}>
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker position={[selectedDayLog.checkin_lat, selectedDayLog.checkin_lon]} icon={checkInIcon}>
                      <LeafletPopup>Checked In Here</LeafletPopup>
                    </Marker>
                    {selectedDayLog.checkout_lat && selectedDayLog.checkout_lon && (
                      <Marker position={[selectedDayLog.checkout_lat, selectedDayLog.checkout_lon]} icon={checkOutIcon}>
                        <LeafletPopup>Checked Out Here</LeafletPopup>
                      </Marker>
                    )}
                    <RecenterMap lat={selectedDayLog.checkin_lat} lng={selectedDayLog.checkin_lon} />
                  </MapContainer>
                </div>
              ) : (
                <p style={{ color: "#64748b", textAlign: "center", padding: "20px", background: "#f8fafc", borderRadius: "8px", border: "1px solid rgba(15, 23, 42, 0.08)" }}>
                  No GPS coordinates recorded for this check-in.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  )
}
