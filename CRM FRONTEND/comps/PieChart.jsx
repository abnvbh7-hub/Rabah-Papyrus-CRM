import React from "react";
import Plotly from "plotly.js-basic-dist";
import createPlotlyComponent from "react-plotly.js/factory";
const Plot = createPlotlyComponent(Plotly);
import "../src/App.css";

export default function PieChart({ employees = [] }) {
  const roleCounts = {};
  employees.forEach(emp => {
    const role = (emp.role || "Unknown").toLowerCase();
    roleCounts[role] = (roleCounts[role] || 0) + 1;
  });

  const labels = Object.keys(roleCounts).map(r => r.charAt(0).toUpperCase() + r.slice(1));
  const values = Object.values(roleCounts);

  return (
    <div className="chart-card">
      <Plot
        data={[
          {
            values: values,
            labels: labels,
            type: "pie",
            hole: 0.5, // donut
            sort: false, // keep order consistent
            marker: {
              colors: [
                "#334155", // slate dark
                "#64748B", // slate medium
                "#4f46e5", // Indigo accent
                "#10b981", // Success green
                "#f59e0b", // Amber warning
              ],
            },
            pull: [0.02, 0.02, 0.02], // small gap between slices
            textinfo: "label+percent",
            textposition: "inside",
            hovertemplate:
              "<b>%{label}</b><br>Count: %{value}<br>%{percent}<extra></extra>",
          },
        ]}
        layout={{
          title: {
            text: "Employee Roles Distribution",
            x: 0,
            font: {
              family: "Montserrat, sans-serif",
              size: 15,
              color: "#212529",
              weight: "bold",
            },
          },
          paper_bgcolor: "#ffffff",
          plot_bgcolor: "#ffffff",
          font: {
            family: "Montserrat, sans-serif",
            color: "#495057",
            size:10
          },
          autosize: true,
          margin: { t: 50, l: 40, r: 40, b: 40 },
          transition: { duration: 500, easing: "cubic-in-out" },
        }}
        config={{
          displayModeBar: false,
          responsive: true,
        }}
        className="chart-plot"
      />
    </div>
  );
}