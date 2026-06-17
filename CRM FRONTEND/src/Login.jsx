import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft, LogIn } from "lucide-react";

import { BASE_URL } from "./config";

export default function Login() {

  const nav = useNavigate();

  const [EID, setEID] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ AUTO REDIRECT IF TOKEN EXISTS
  useEffect(() => {
    const token = localStorage.getItem("token");

    if (token) {
      nav("/home");
    }
  }, [nav]);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`${BASE_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: EID,
          password: password,
        }),
      });

      const data = await res.json();
      console.log(data);

      if (data.status === "success") {
        localStorage.setItem("token", data.token);
        localStorage.setItem("employee_id", EID);
        nav("/home"); // redirect after login
      } else {
        alert(data.message || "Invalid Credentials");
      }
    } catch (err) {
      console.error(err);
      alert("Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="signup-page">
      <div className="signup-card">
        <div className="signup-logo">
          <img
            src="./rabah-logo-blk.png"
            alt="logo"
            className="signup-logo-img"
          />
        </div>

        <div className="signup-header">
          <div className="signup-title">Welcome Back</div>
          <div className="signup-subtitle">
            Login to access your CRM dashboard
          </div>
        </div>

        <form className="signup-form" onSubmit={handleSubmit}>
          <div className="signup-group">
            <label>Employee ID</label>
            <input
              placeholder="Enter your employee ID"
              value={EID}
              onChange={(e) => setEID(e.target.value)}
              required
            />
          </div>

          <div className="signup-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="signup-btn" disabled={loading} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
            {loading ? "Logging in..." : "Login"}
          </button>

          <button type="button" className="back-btn" onClick={() => nav('/')} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
            <ArrowLeft size={16} />
            Back
          </button>
        </form>
      </div>
    </div>
  );
}