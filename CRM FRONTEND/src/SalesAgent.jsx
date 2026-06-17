import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { BASE_URL } from "./config.js";
import SalesPipelineChart from "../comps/SalesPipelineChart.jsx";

export default function SalesAgent() {
  const nav = useNavigate();
  const [deals, setDeals] = useState([]);
  const [userName, setUserName] = useState("Sales Agent");
  const [employeeId, setEmployeeId] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      nav("/login");
      return;
    }

    const fetchData = async () => {
      try {
        const meRes = await fetch(`${BASE_URL}/me`, { headers: { Authorization: `Bearer ${token}` } });
        const meData = await meRes.json();
        if (meData.payload) {
          setUserName(meData.payload.name || "Sales Agent");
          setEmployeeId(meData.payload.employee_id);
        }

        const dealsRes = await fetch(`${BASE_URL}/deals`, { headers: { Authorization: `Bearer ${token}` } });
        const dealsData = await dealsRes.json();
        if (dealsData.status === "success") {
          setDeals(dealsData.deals || []);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchData();
  }, [nav]);

  const myDeals = deals.filter(d => d.assigned_to === employeeId);
  const activeDeals = myDeals.filter(d => d.status !== "Pending Approval");

  return (
    <div className="main-db">
      <div className="dia">
        <div className="in-scr">
          <div className="dia-x">Hey, {userName}</div>
          <div className="dia-y">Manage your sales performance here</div>
        </div>
        <div className="lr1y">
          <button className="btn-dark-ai" onClick={() => console.log("AI clicked")}>
            <Sparkles size={14} />
            AI Insights
          </button>
        </div>
      </div>

      <div className="card-mc" style={{ marginBottom: "20px" }}>
        <SalesPipelineChart deals={activeDeals} />
      </div>

      <div className="lr2" style={{ width: "100%" }}>
        <div className="table-header">My Active Orders</div>
        <table className="lead-table">
          <thead>
            <tr>
              <th>Order Number / Name</th>
              <th>Company</th>
              <th>Value</th>
              <th>Stage</th>
            </tr>
          </thead>
          <tbody>
            {activeDeals.map((deal) => (
              <tr key={deal.id}>
                <td style={{ fontWeight: "600", color: "#0f172a" }}>{deal.deal_name}</td>
                <td>{deal.company_name}</td>
                <td style={{ fontWeight: "bold", color: "#10b981" }}>₹ {deal.deal_value}</td>
                <td>
                  <span className={
                    deal.stage.includes("Closed") ? "status-done" : deal.stage === "New" ? "status-todo" : "status-progress"
                  } style={{ whiteSpace: "nowrap", display: "inline-block" }}>
                    {deal.stage}
                  </span>
                </td>
              </tr>
            ))}
            {activeDeals.length === 0 && (
              <tr>
                <td colSpan="4" style={{ textAlign: "center", padding: "20px", color: "#64748b" }}>
                  No active orders assigned to you.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}