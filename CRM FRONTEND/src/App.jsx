import './App.css'
import 'leaflet/dist/leaflet.css'
import 'react-calendar/dist/Calendar.css'
import { Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import { useGeolocated } from 'react-geolocated'
import Home from './Home'
import Leads from './Leads'
import Hr from './Hr'
import Sales from './Sales'
import Inventory from './Inventory'
import Nav from '/comps/Nav.jsx'
import SalesAgent from './SalesAgent'
import Signup from "./Signup"
import Login from "./Login"
import FrontPage from "./FrontPage"
import UnderReview from './UnderReview'
import Track from './Track'
import Attendance from './Attendance'
import Customers from './Customers'
import Production from './Production'
import Accounts from './Accounts'
import { BASE_URL } from "./config";

export default function App() {
  const { coords } = useGeolocated({
    positionOptions: {
      enableHighAccuracy: true,
    },
    userDecisionTimeout: 5000,
  });

  useEffect(() => {
    console.log("Geolocated hook raw coords:", coords);
    if (!coords) {
      console.log("Geolocation has not resolved coordinates yet (waiting for browser prompt or GPS lock).");
      return;
    }
    
    console.log("Geolocation successfully resolved coordinates! Lat:", coords.latitude, "Lon:", coords.longitude);
    const token = localStorage.getItem("token");
    if (!token) {
      console.log("No authorization token found in localStorage. Skipping location update.");
      return;
    }

    const sendLocation = async () => {
      try {
        let employeeId = localStorage.getItem("employee_id");
        if (!employeeId) {
          console.log("No employee_id in localStorage. Fetching from /me...");
          const meRes = await fetch(`${BASE_URL}/me`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          const meData = await meRes.json();
          employeeId = meData.payload?.employee_id;
          if (employeeId) {
            localStorage.setItem("employee_id", employeeId);
            console.log("Fetched and cached employee_id:", employeeId);
          }
        }

        if (employeeId) {
          console.log(`Sending PUT request to /update_location for employee_id: ${employeeId}...`);
          const response = await fetch(`${BASE_URL}/update_location?employee_id=${employeeId}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              lat: coords.latitude,
              lon: coords.longitude
            })
          });
          const resData = await response.json();
          console.log("Update Location API response:", resData);
        } else {
          console.error("Could not retrieve employee_id to update location.");
        }
      } catch (err) {
        console.error("Error sending location:", err);
      }
    };

    sendLocation();
  }, [coords]);

  return (
    <Routes>
      {/* All routes share the same layout with Nav */}
      <Route
        path="/"
        element={
          
              <FrontPage />
        }
      />
      <Route
        path="/home"
        element={
          <div className="layout">
            <Nav />
            <div className="main">
              <Home />
            </div>
          </div>
        }
        />
      <Route
        path="/leads"
        element={
          <div className="layout">
            <Nav />
            <div className="main">
              <Leads />
            </div>
          </div>
        }
      />
      <Route
        path="/inventory"
        element={
          <div className="layout">
            <Nav />
            <div className="main">
              <Inventory />
            </div>
          </div>
        }
      />
      <Route
        path="/hr"
        element={
          <div className="layout">
            <Nav />
            <div className="main">
              <Hr />
            </div>
          </div>
        }
      />
      <Route
        path="/sales"
        element={
          <div className="layout">
            <Nav />
            <div className="main">
              <Sales />
            </div>
          </div>
        }
      />
      <Route
        path="/salesagent"
        element={
          <div className="layout">
            <Nav/>
            <div className="main">
              <SalesAgent />
            </div>
          </div>
        }
      />
      <Route
        path='/signup'
        element={<Signup/>}/>
      <Route
        path='/login'
        element={<Login/>}/>
      <Route
        path='/under_review'
        element={<UnderReview/>}/>
      <Route
        path="/track"
        element={
          <div className="layout">
            <Nav />
            <div className="main">
              <Track />
            </div>
          </div>
        }
      />
      <Route
        path="/attendance"
        element={
          <div className="layout">
            <Nav />
            <div className="main">
              <Attendance />
            </div>
          </div>
        }
      />
      <Route
        path="/customers"
        element={
          <div className="layout">
            <Nav />
            <div className="main">
              <Customers />
            </div>
          </div>
        }
      />
      <Route
        path="/production"
        element={
          <div className="layout">
            <Nav />
            <div className="main">
              <Production />
            </div>
          </div>
        }
      />
      <Route
        path="/accounts"
        element={
          <div className="layout">
            <Nav />
            <div className="main">
              <Accounts />
            </div>
          </div>
        }
      />

    </Routes>
  )
}