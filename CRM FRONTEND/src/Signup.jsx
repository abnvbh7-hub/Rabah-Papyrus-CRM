import { useState } from "react";
import { User, Mail, Lock, Loader2, ArrowLeft, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { BASE_URL } from "./config";

export default function Signup() {

  const nav = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    const userData = {
      name,
      email,
      role,
      phone,
      password,
      employee_id: employeeId, // ✅ FIXED KEY (important)
    };

    try {
      const res = await fetch(`${BASE_URL}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });

      const data = await res.json();
      console.log(data);

      if (data.status === "success") {
        alert(`User created successfully! Generated Employee ID: ${data.employee_id}. Please note it down to login.`);
        nav("/login"); // redirect to login
      } else {
        alert(data.message || "Signup failed");
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
        {/* LOGO */}
        <div className="signup-logo">
          <img
            src="./rabah-logo-blk.png"
            alt="logo"
            className="signup-logo-img"
          />
        </div>

        {/* HEADER */}
        <div className="signup-header">
          <div className="signup-title">Create Account</div>
          <div className="signup-subtitle">
            Add a new user to your CRM dashboard
          </div>
        </div>

        {/* FORM */}
        <form className="signup-form" onSubmit={handleSubmit}>
          {/* NAME */}
          <div className="signup-group">
            <label>Name</label>
            <input
              type="text"
              placeholder="Enter full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* EMAIL */}
          <div className="signup-group">
            <label>Email</label>
            <input
              type="email"
              placeholder="Enter email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* PASSWORD */}
          <div className="signup-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {/* ROLE */}
          <div className="signup-group">
            <label>Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
            >
              <option value="">Select role</option>
              <option value="sales">Sales</option>
              <option value="hr">HR</option>
              <option value="inventory">Inventory</option>
              <option value="production">Production</option>
              <option value="accountant">Accountant</option>
            </select>
          </div>

          {/* PHONE */}
          <div className="signup-group">
            <label>Phone</label>
            <input
              type="tel"
              placeholder="Enter phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          {/* BUTTON */}
          <button type="submit" className="signup-btn" disabled={loading} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
            {loading ? "Creating..." : "Create User"}
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