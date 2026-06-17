import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, Users, TrendingUp, Package, Briefcase, Calendar, Map, LogOut, Clock, Activity, Menu, ShoppingCart } from "lucide-react";
import { BASE_URL } from "../src/config";

export default function Navbar() {
  const location = useLocation();
  const isActive = (path) => location.pathname === path ? "active" : "";

  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState("loading");
  const [user, setUser] = useState(null);

  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState(null);
  const [timer, setTimer] = useState("00:00:00");

  useEffect(() => {
    const storedTime = localStorage.getItem("checkInTime");
    if (storedTime) {
      setCheckInTime(new Date(storedTime));
      setIsCheckedIn(true);
    }
  }, []);

  useEffect(() => {
    let interval;
    if (isCheckedIn && checkInTime) {
      interval = setInterval(() => {
        const now = new Date();
        const diff = Math.floor((now - checkInTime) / 1000);
        const hours = String(Math.floor(diff / 3600)).padStart(2, '0');
        const minutes = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
        const seconds = String(diff % 60).padStart(2, '0');
        setTimer(`${hours}:${minutes}:${seconds}`);
      }, 1000);
    } else {
      setTimer("00:00:00");
    }
    return () => clearInterval(interval);
  }, [isCheckedIn, checkInTime]);

  const handleAttendance = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const endpoint = isCheckedIn ? "/checkout" : "/checkin";
            const reqMethod = isCheckedIn ? "PUT" : "POST";
            let employeeId = localStorage.getItem("employee_id");
            
            if (!employeeId) {
              const meRes = await fetch(`${BASE_URL}/me`, {
                method: "GET",
                headers: { Authorization: `Bearer ${token}` }
              });
              const meData = await meRes.json();
              employeeId = meData.payload?.employee_id;
              if (employeeId) localStorage.setItem("employee_id", employeeId);
            }

            if (employeeId) {
              fetch(`${BASE_URL}${endpoint}?employee_id=${employeeId}`, {
                method: reqMethod,
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                  lat: position.coords.latitude,
                  lon: position.coords.longitude
                })
              }).catch(e => console.error(e));
            } else {
              console.error("No employee_id found for attendance.");
            }
            
            if (isCheckedIn) {
              setIsCheckedIn(false);
              setCheckInTime(null);
              localStorage.removeItem("checkInTime");
            } else {
              setIsCheckedIn(true);
              const now = new Date();
              setCheckInTime(now);
              localStorage.setItem("checkInTime", now.toISOString());
            }
          } catch (err) {
            console.error("Error with attendance", err);
          }
        },
        (error) => {
          alert("Please enable location to check in/out");
        }
      );
    } else {
      alert("Geolocation is not supported by your browser");
    }
  };

  const renderAttendanceWidget = () => (
    <div className="attendance-widget-card">
      {isCheckedIn && (
        <div className="attendance-timer" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Clock size={12} className="text-danger animate-pulse" style={{ color: '#ef4444' }} />
          {timer}
        </div>
      )}
      <button 
        onClick={handleAttendance}
        className={`attendance-btn ${isCheckedIn ? 'checkout' : 'checkin'}`}
      >
        <Clock size={11} style={{ marginRight: '2px' }} />
        {isCheckedIn ? 'Check Out' : 'Check In'}
      </button>
    </div>
  );

  const nav = useNavigate();

  async function fetchUser() {
    const token = localStorage.getItem("token");

    if (!token) {
      setType("guest");
      return;
    }

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

      if (data.Status === "Success") {
        const userData = data.payload;

        setUser(userData);
        setType(userData.role?.toLowerCase());
      } else {
        setType("guest");
      }
    } catch (err) {
      console.error(err);
      setType("guest");
    }
  }

  useEffect(() => {
    fetchUser();
  }, []);

  const handleNav = (path) => {
    nav(path);
    setIsOpen(false);
  };

  const initial =
    user?.name?.charAt(0)?.toUpperCase() || "U";

  function logout() {
    localStorage.removeItem("token");

    setUser(null);
    setType("guest");

    window.location.href = "/login";
  }

  return (
    <>
      {/* Sidebar */}
      <nav className={`nav-mc ${isOpen ? "open" : ""}`}>
        <div className="logo">
          <img className="crm-img" src="/rabah-logo.png" alt="logo" />
        </div>

        <div className="line"></div>

        {/* ADMIN NAV */}
        {type === "admin" && (
          <div className="links">
            <div className={`linmc ${isActive("/home")}`} onClick={() => handleNav("/home")}>
              <Home className="linimg" size={18} />
              <span className="lin">Home</span>
            </div>

            <div className="linex"></div>

            <div className={`linmc ${isActive("/customers")}`} onClick={() => handleNav("/customers")}>
              <Users className="linimg" size={18} />
              <span className="lin">Customers</span>
            </div>

            <div className="linex"></div>

            <div className={`linmc ${isActive("/leads")}`} onClick={() => handleNav("/leads")}>
              <Briefcase className="linimg" size={18} />
              <span className="lin">Leads</span>
            </div>

            <div className="linex"></div>

            <div className={`linmc ${isActive("/sales")}`} onClick={() => handleNav("/sales")}>
              <ShoppingCart className="linimg" size={18} />
              <span className="lin">Orders</span>
            </div>

            <div className="linex"></div>

            <div className={`linmc ${isActive("/inventory")}`} onClick={() => handleNav("/inventory")}>
              <Package className="linimg" size={18} />
              <span className="lin">Inventory</span>
            </div>

            <div className="linex"></div>

            <div className={`linmc ${isActive("/production")}`} onClick={() => handleNav("/production")}>
              <Activity className="linimg" size={18} />
              <span className="lin">Production</span>
            </div>

            <div className="linex"></div>

            <div className={`linmc ${isActive("/accounts")}`} onClick={() => handleNav("/accounts")}>
              <Clock className="linimg" size={18} />
              <span className="lin">Accounts</span>
            </div>

            <div className="linex"></div>

            <div className={`linmc ${isActive("/hr")}`} onClick={() => handleNav("/hr")}>
              <Users className="linimg" size={18} />
              <span className="lin">HR</span>
            </div>

            <div className="linex"></div>

            <div className={`linmc ${isActive("/attendance")}`} onClick={() => handleNav("/attendance")}>
              <Calendar className="linimg" size={18} />
              <span className="lin">Attendance</span>
            </div>
          </div>
        )}

        {/* HR NAV */}
        {type === "hr" && (
          <div className="links">
            <div className={`linmc ${isActive("/home")}`} onClick={() => handleNav("/home")}>
              <Home className="linimg" size={18} />
              <span className="lin">Home</span>
            </div>

            <div className="linex"></div>

            <div className={`linmc ${isActive("/hr")}`} onClick={() => handleNav("/hr")}>
              <Briefcase className="linimg" size={18} />
              <span className="lin">Employees</span>
            </div>

            <div className="linex"></div>

            <div className={`linmc ${isActive("/attendance")}`} onClick={() => handleNav("/attendance")}>
              <Calendar className="linimg" size={18} />
              <span className="lin">Attendance</span>
            </div>

            <div className="linex"></div>

            <div className={`linmc ${isActive("/track")}`} onClick={() => handleNav("/track")}>
              <Map className="linimg" size={18} />
              <span className="lin">Track</span>
            </div>
          </div>
        )}

        {/* SALES NAV */}
        {type === "sales" && (
          <div className="links">
            <div className={`linmc ${isActive("/home")}`} onClick={() => handleNav("/home")}>
              <Home className="linimg" size={18} />
              <span className="lin">Home</span>
            </div>

            <div className="linex"></div>

            <div className={`linmc ${isActive("/customers")}`} onClick={() => handleNav("/customers")}>
              <Users className="linimg" size={18} />
              <span className="lin">Customers</span>
            </div>

            <div className="linex"></div>

            <div className={`linmc ${isActive("/leads")}`} onClick={() => handleNav("/leads")}>
              <Briefcase className="linimg" size={18} />
              <span className="lin">My Leads</span>
            </div>

            <div className="linex"></div>

            <div className={`linmc ${isActive("/sales")}`} onClick={() => handleNav("/sales")}>
              <ShoppingCart className="linimg" size={18} />
              <span className="lin">My Orders</span>
            </div>

            <div className="linex"></div>

            <div className={`linmc ${isActive("/inventory")}`} onClick={() => handleNav("/inventory")}>
              <Package className="linimg" size={18} />
              <span className="lin">Inventory</span>
            </div>

            <div className="linex"></div>

            <div className={`linmc ${isActive("/attendance")}`} onClick={() => handleNav("/attendance")}>
              <Calendar className="linimg" size={18} />
              <span className="lin">Attendance</span>
            </div>
          </div>
        )}

        {/* INVENTORY NAV */}
        {type === "inventory" && (
          <div className="links">
            <div className={`linmc ${isActive("/home")}`} onClick={() => handleNav("/home")}>
              <Home className="linimg" size={18} />
              <span className="lin">Home</span>
            </div>

            <div className="linex"></div>

            <div className={`linmc ${isActive("/inventory")}`} onClick={() => handleNav("/inventory")}>
              <Package className="linimg" size={18} />
              <span className="lin">Inventory</span>
            </div>

            <div className="linex"></div>

            <div className={`linmc ${isActive("/attendance")}`} onClick={() => handleNav("/attendance")}>
              <Calendar className="linimg" size={18} />
              <span className="lin">Attendance</span>
            </div>
          </div>
        )}

        {/* ACCOUNTANT NAV */}
        {type === "accountant" && (
          <div className="links">
            <div className={`linmc ${isActive("/home")}`} onClick={() => handleNav("/home")}>
              <Home className="linimg" size={18} />
              <span className="lin">Home</span>
            </div>

            <div className="linex"></div>

            <div className={`linmc ${isActive("/inventory")}`} onClick={() => handleNav("/inventory")}>
              <Package className="linimg" size={18} />
              <span className="lin">Inventory</span>
            </div>

            <div className="linex"></div>

            <div className={`linmc ${isActive("/accounts")}`} onClick={() => handleNav("/accounts")}>
              <Clock className="linimg" size={18} />
              <span className="lin">Accounts</span>
            </div>

            <div className="linex"></div>

            <div className={`linmc ${isActive("/attendance")}`} onClick={() => handleNav("/attendance")}>
              <Calendar className="linimg" size={18} />
              <span className="lin">Attendance</span>
            </div>
          </div>
        )}

        {/* PRODUCTION NAV */}
        {type === "production" && (
          <div className="links">
            <div className={`linmc ${isActive("/home")}`} onClick={() => handleNav("/home")}>
              <Home className="linimg" size={18} />
              <span className="lin">Home</span>
            </div>

            <div className="linex"></div>

            <div className={`linmc ${isActive("/production")}`} onClick={() => handleNav("/production")}>
              <Activity className="linimg" size={18} />
              <span className="lin">Production</span>
            </div>

            <div className="linex"></div>

            <div className={`linmc ${isActive("/attendance")}`} onClick={() => handleNav("/attendance")}>
              <Calendar className="linimg" size={18} />
              <span className="lin">Attendance</span>
            </div>
          </div>
        )}

        {/* STANDARD EMPLOYEE NAV */}
        {type !== "admin" && type !== "hr" && type !== "sales" && type !== "inventory" && type !== "production" && type !== "loading" && type !== "guest" && (
          <div className="links">
            <div className={`linmc ${isActive("/home")}`} onClick={() => handleNav("/home")}>
              <Home className="linimg" size={18} />
              <span className="lin">Home</span>
            </div>

            <div className="linex"></div>

            <div className={`linmc ${isActive("/attendance")}`} onClick={() => handleNav("/attendance")}>
              <Calendar className="linimg" size={18} />
              <span className="lin">Attendance</span>
            </div>
          </div>
        )}

        <div className="linex"></div>

        {/* USER INFO */}
        {type !== "loading" && (
          <div className="nav-footer-container">
            {renderAttendanceWidget()}

            <div className="lg-con" onClick={logout}>
              <div className="lgbt">
                <LogOut size={13} style={{ marginRight: '6px' }} />
                LOG OUT
              </div>
            </div>

            <div className="acc-dsk">
              <div className="acc">{initial}</div>
              <div className="acc-name">{user?.name || "User"}</div>
            </div>
          </div>
        )}
      </nav>

      {/* Overlay */}
      {isOpen && (
        <div className="overlay" onClick={() => setIsOpen(false)} />
      )}

      {/* Topbar */}
      <div className="topbar">
        <div className="hamburger" onClick={() => setIsOpen(!isOpen)}>
          <Menu size={24} />
        </div>

        <div className="content">
          <img className="crm-img" src="/rabah-logo.png" alt="logo" />
        </div>

        <div style={{ marginLeft: "auto", marginRight: "15px", display: "flex", alignItems: "center" }}>
          {renderAttendanceWidget()}
        </div>

        <div className="acc">{initial}</div>
      </div>
    </>
  );
}