import React from "react";
import Plotly from "plotly.js-basic-dist";
import createPlotlyComponent from "react-plotly.js/factory";
const Plot = createPlotlyComponent(Plotly);
import "../src/App.css";

export default function HrStatsChart({ employees = [] }) {
  const verifiedCount = employees.filter(e => e.status === true).length;
  const unverifiedCount = employees.filter(e => e.status === false).length;

  return (
    <div className="chart-card" style={{ width: "100%", overflow: "hidden" }}>
      <Plot
        data={[
          {
            x: ["Verified", "Unverified"],
            y: [verifiedCount, unverifiedCount],
            type: "bar",
            marker: {
              color: ["#10b981", "#ef4444"],
            },
            text: [verifiedCount, unverifiedCount],
            textposition: "auto",
            hovertemplate: "<b>%{x}</b>: %{y}<extra></extra>",
          }
        ]}
        layout={{
          margin: { t: 40, l: 40, r: 20, b: 40 },
          title: {
            text: "Employee Verification Status",
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
          autosize: true,
          xaxis: {
            showgrid: false,
            tickfont: { size: 12 },
          },
          yaxis: {
            showgrid: true,
            gridcolor: "#f1f3f5",
            zeroline: false,
            tickfont: { size: 12 },
          },
          transition: {
            duration: 500,
            easing: "cubic-in-out",
          },
        }}
        config={{
          displayModeBar: false,
          responsive: true,
        }}
        style={{ width: "100%", height: "300px" }}
      />
    </div>
  );
}
