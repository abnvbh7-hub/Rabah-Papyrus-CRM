import Footer from "/comps/Footer.jsx"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { MapContainer, TileLayer, Marker, Popup as LeafletPopup } from "react-leaflet"
import L from "leaflet"
import Calendar from "react-calendar"
import { Search, Sparkles, Users, CalendarOff, UserX, MapPin, ClipboardList, Clock } from "lucide-react";
import { BASE_URL } from "./config";
import HrStatsChart from "../comps/HrStatsChart.jsx";

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

export default function Hr() {

  const nav = useNavigate();

  const [Name, setName]= useState("")
  const [type, setType] = useState("loading")
  const [status,setStatus] = useState(null)

  const [employees, setEmployees] = useState([])
  const [loadingEmployees, setLoadingEmployees] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  const filteredEmployees = employees.filter((emp) =>
    (emp.name && emp.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (emp.employee_id && emp.employee_id.toString().toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // MODAL STATES
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [loadingModal, setLoadingModal] = useState(false)

  // ATTENDANCE MODAL STATES
  const [showAttendanceModal, setShowAttendanceModal] = useState(false)
  const [selectedAttendanceUser, setSelectedAttendanceUser] = useState(null)
  const [attendanceLogs, setAttendanceLogs] = useState([])
  const [loadingAttendance, setLoadingAttendance] = useState(false)

  // MAP MODAL STATES
  const [showMapModal, setShowMapModal] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState(null)

  const [monthlyAttendanceData, setMonthlyAttendanceData] = useState({})
  const [selectedDayLog, setSelectedDayLog] = useState(null)
  const [showDayModal, setShowDayModal] = useState(false)
  const [attendanceStats, setAttendanceStats] = useState({ present: 0, absent: 0 })

  const handleDayClick = (value) => {
    const date = new Date(value);
    const localDateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const log = attendanceLogs.find(l => l.attendance_date && l.attendance_date.startsWith(localDateStr));
    
    if (log) {
      setSelectedDayLog(log);
      setShowDayModal(true);
    } else {
      alert("No check-in or check-out data recorded for this date.");
    }
  }

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
        setAttendanceLogs(data.attendance);

        const monthlyData = {};
        
        const today = new Date();
        const isCurrentMonth = today.getMonth() + 1 === month && today.getFullYear() === year;
        const isFutureMonth = targetDate > today && !isCurrentMonth;
        
        let lastDay = 0;
        if (!isFutureMonth) {
          lastDay = isCurrentMonth ? today.getDate() : new Date(year, month, 0).getDate();
        }
        
        for (let i = 1; i <= lastDay; i++) {
          const d = new Date(year, month - 1, i);
          if (d.getDay() !== 0 && d.getDay() !== 6) {
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
        
        setMonthlyAttendanceData(monthlyData);
        setAttendanceStats({
          present: Object.values(monthlyData).filter(v => v === true).length,
          absent: Object.values(monthlyData).filter(v => v === false).length
        });
      } else {
        setAttendanceLogs([]);
        setMonthlyAttendanceData({});
      }
    } catch (err) {
      console.error("Error fetching monthly attendance:", err)
      setAttendanceLogs([]);
      setMonthlyAttendanceData({});
      setAttendanceStats({ present: 0, absent: 0 });
    }
  }

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      nav("/login");
    }
  }, []);

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
      setName(data.payload.name)
      setType(data.payload.role.toLowerCase())
      setStatus(data.payload.verified)

      if(data.payload.verified === false){
        localStorage.removeItem("token")
        nav('/under_review')
      }
    }
    catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    async function loadUser() {
      await fetchUser();
      await fetchEmployees();
    }
    loadUser();
  }, []);

  useEffect(() => {
    if (type === "loading") return;
    if (type !== "hr" && type !== "admin") {
      localStorage.removeItem("token");
      nav("/");
    }
  }, [type]);

  async function fetchEmployees() {
    const token = localStorage.getItem("token")
    try {
      const res = await fetch(
        `${BASE_URL}/users`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      const data = await res.json()
      console.log("Employees:", data)
      if (data.status === "success") {
        setEmployees(data.users)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingEmployees(false)
    }
  }

  // FETCH SINGLE EMPLOYEE
  const handleView = async (employee_id) => {
    const token = localStorage.getItem("token")
    try {
      setLoadingModal(true)
      const res = await fetch(
        `${BASE_URL}/user/` + employee_id,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      const data = await res.json()
      console.log("Employee Details:", data)
      if (data.status === "success") {
        setSelectedEmployee(data.user)
        setShowModal(true)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingModal(false)
    }
  }

  // VERIFY EMPLOYEE
  async function verifyEmployee(employee_id) {
    const token = localStorage.getItem("token")
    try {
      const res = await fetch(
        `${BASE_URL}/verify/` + employee_id,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      const data = await res.json()
      console.log(data)
      if (data.status === "success") {
        setSelectedEmployee({
          ...selectedEmployee,
          status: true
        })
        fetchEmployees()
      }
    } catch (err) {
      console.error(err)
    }
  }

  // DELETE EMPLOYEE
  async function deleteEmployee(employee_id) {
    const token = localStorage.getItem("token")
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this employee?"
    )
    if (!confirmDelete) return
    try {
      const res = await fetch(
        `${BASE_URL}/user/` + employee_id,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      const data = await res.json()
      console.log(data)
      if (data.status === "success") {
        setShowModal(false)
        fetchEmployees()
        alert("Employee Deleted")
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handlePromote = (emp) => {
    console.log("Promote employee:", emp)
  }

  const openInMaps = (lat, lng) => {
    const mapLat = lat || "28.6139";
    const mapLng = lng || "77.2090";
    window.open(`https://www.google.com/maps/search/?api=1&query=${mapLat},${mapLng}`, "_blank")
  }

  const handleViewMap = async (emp) => {
    const token = localStorage.getItem("token")
    try {
      const res = await fetch(`${BASE_URL}/user/` + emp.employee_id, {
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

  const handleViewAttendance = async (employee) => {
    setSelectedAttendanceUser(employee)
    setShowAttendanceModal(true)
    setLoadingAttendance(true)
    await fetchMonthlyAttendance(employee.employee_id)
    setLoadingAttendance(false)
  }

  return (
    <>
      <div className="main-db">

        {/* HEADER */}
        <div className="dia">
          <div className="in-scr">
            <div className="dia-x">HR Management</div>
            <div className="dia-y">Manage employees and HR activities</div>
          </div>
          <div>
            <div className="lr1y">
              <button className="btn-dark-ai" onClick={() => console.log("AI analyze workforce")}>
                <Sparkles size={14} />
                Analyze Workforce with AI
              </button>
            </div>
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
          <Search className="linimg" size={18} />
        </div>

        {/* SUMMARY CARDS */}
        <div className="card-mc">
          <div className="hm-card">
            <div className="hmmc">
              <div className="hm-card-x">Total Employees</div>
              <div className="hm-card-y">{employees.length < 10 ? `0${employees.length}` : employees.length}</div>
              <div className="hm-card-z">Active roster</div>
            </div>
            <Users className="card-img" size={32} />
          </div>

          <div className="hm-card">
            <div className="hmmc">
              <div className="hm-card-x">On Leave</div>
              <div className="hm-card-y">01</div>
              <div className="hm-card-z-r">Needs backup</div>
            </div>
            <CalendarOff className="card-img" size={32} />
          </div>

          <div className="hm-card">
            <div className="hmmc">
              <div className="hm-card-x">Inactive</div>
              <div className="hm-card-y">{employees.filter(e => e.status === false).length < 10 ? `0${employees.filter(e => e.status === false).length}` : employees.filter(e => e.status === false).length}</div>
              <div className="hm-card-z-r">Review required</div>
            </div>
            <UserX className="card-img" size={32} />
          </div>
        </div>

        <div className="card-mc" style={{ marginBottom: "20px" }}>
          <HrStatsChart employees={employees} />
        </div>

        {/* EMPLOYEE TABLE */}
        <div className="lr2">
          <div className="table-header">Employee List</div>
          <table className="lead-table">
            <thead>
              <tr>
                <th>#</th>
                <th>EMP ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Verified</th>
                <th>Salary</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((emp) => (
                <tr
                  key={emp.id}
                  onClick={() => handleView(emp.employee_id)}
                  style={{ cursor: "pointer" }}
                >
                  <td><input type="checkbox" onClick={(e) => e.stopPropagation()} /></td>
                  <td>{emp.employee_id}</td>
                  <td>{emp.name}</td>
                  <td>{emp.email}</td>
                  <td>{emp.phone}</td>
                  <td style={{ textTransform: "capitalize" }}>{emp.role}</td>
                  <td>
                    <span className={emp.status === false ? "status-todo" : "status-done"}>
                      {emp.status === false ? "No" : "Yes"}
                    </span>
                  </td>
                  <td>{emp.salary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* LOCATION TRACKING TABLE FOR ADMIN & HR */}
        {(type === "admin" || type === "hr") && (
          <div className="lr2">
            <div className="table-header">Location Logs</div>
            {loadingEmployees ? (
              <p style={{ padding: "20px", color: "#64748b" }}>Loading locations...</p>
            ) : filteredEmployees.length === 0 ? (
              <p style={{ padding: "20px", color: "#64748b" }}>No employee location data found.</p>
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
                      key={`loc-${emp.employee_id || index}`}
                      onClick={() => handleViewMap(emp)}
                      style={{ cursor: "pointer" }}
                    >
                      <td>{emp.employee_id}</td>
                      <td>{emp.name}</td>
                      <td style={{ textTransform: "capitalize" }}>{emp.role}</td>
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
                          className="btn-premium"
                          onClick={(e) => {
                            e.stopPropagation();
                            openInMaps(emp.latitude, emp.longitude);
                          }}
                          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                        >
                          <MapPin size={12} />
                          Open in Maps
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ATTENDANCE TRACKING TABLE FOR ADMIN & HR */}
        {(type === "admin" || type === "hr") && (
          <div className="lr2">
            <div className="table-header">Attendance Tracking</div>
            {loadingEmployees ? (
              <p style={{ padding: "20px", color: "#64748b" }}>Loading attendance...</p>
            ) : filteredEmployees.length === 0 ? (
              <p style={{ padding: "20px", color: "#64748b" }}>No employee attendance data found.</p>
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
                      key={`att-${emp.employee_id || index}`}
                      onClick={() => handleViewAttendance(emp)}
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
        )}

        {/* MODAL */}
        {showModal && selectedEmployee && (
          <div className="modal-overlay">
            <div className="employee-modal">
              <div className="modal-top">
                <h2>Employee Details</h2>
                <button
                  className="close-btn"
                  onClick={() => setShowModal(false)}
                >
                  ✕
                </button>
              </div>

              {loadingModal ? (
                <div className="modal-loading">Loading details...</div>
              ) : (
                <div className="employee-details">
                  <div className="emp-field">
                    <span>Employee ID:</span>
                    <p>{selectedEmployee.employee_id}</p>
                  </div>

                  <div className="emp-field">
                    <span>Name:</span>
                    <p>{selectedEmployee.name}</p>
                  </div>

                  <div className="emp-field">
                    <span>Email:</span>
                    <p>{selectedEmployee.email}</p>
                  </div>

                  <div className="emp-field">
                    <span>Phone:</span>
                    <p>{selectedEmployee.phone}</p>
                  </div>

                  <div className="emp-field">
                    <span>Role:</span>
                    <p style={{ textTransform: "capitalize" }}>{selectedEmployee.role}</p>
                  </div>

                  <div className="emp-field">
                    <span>Verified:</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span className={selectedEmployee.status ? "emp-status-yes" : "emp-status-no"}>
                        {selectedEmployee.status ? "Verified" : "Not Verified"}
                      </span>
                      {!selectedEmployee.status && (
                        <button
                          className="btn-premium"
                          onClick={() => verifyEmployee(selectedEmployee.employee_id)}
                          style={{ padding: "4px 10px", fontSize: "11px" }}
                        >
                          Verify User
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="emp-field">
                    <span>Created At:</span>
                    <p>
                      {parseGMT(selectedEmployee.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                    </p>
                  </div>

                  <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end" }}>
                    <button
                      className="btn-cancel"
                      onClick={() => deleteEmployee(selectedEmployee.employee_id)}
                      style={{ width: "100%", padding: "10px" }}
                    >
                      Delete Employee
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ATTENDANCE MODAL */}
        {showAttendanceModal && selectedAttendanceUser && (
          <div className="modal-overlay">
            <div className="employee-modal medium">
              <div className="modal-top">
                <h2>Attendance: {selectedAttendanceUser.name}</h2>
                <button
                  className="close-btn"
                  onClick={() => setShowAttendanceModal(false)}
                >
                  ✕
                </button>
              </div>

              {loadingAttendance ? (
                <div className="modal-loading">Loading attendance records...</div>
              ) : (
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
                        fetchMonthlyAttendance(selectedAttendanceUser.employee_id, activeStartDate);
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
              )}
            </div>
          </div>
        )}

        {/* DAY MAP MODAL */}
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
                  <div className="responsive-map-container" style={{ height: "400px" }}>
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
                <p style={{ color: "#64748b", marginBottom: "15px" }}>
                  <strong>Last Ping:</strong> {selectedLocation.time}
                </p>
                <div style={{ height: "400px", width: "100%", borderRadius: "8px", overflow: "hidden", border: "1px solid rgba(15, 23, 42, 0.08)" }}>
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