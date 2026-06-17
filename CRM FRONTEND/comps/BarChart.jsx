import React from "react";
import Plotly from "plotly.js-basic-dist";
import createPlotlyComponent from "react-plotly.js/factory";
const Plot = createPlotlyComponent(Plotly);
import "../src/App.css"

export default function LeadsBarChart({ leads = [] }) {
  let todo = 0, inProgress = 0, closed = 0;
  leads.forEach(lead => {
    if (lead.is_converted || lead.status === "converted") closed++;
    else if (lead.status === "active") inProgress++;
    else todo++;
  });

  const leadStatus = ["To-Do", "In Progress", "Closed"];
  const leadCounts = [todo, inProgress, closed];

  return (
    <div className="chart-card">
      <Plot
        data={[
          {
            x: leadCounts,
            y: leadStatus,
            type: "bar",
            orientation: "h",
            text: leadCounts,
            textposition: "outside",
            textfont: {
              size: 12,
              color: "#343a40",
            },
            marker: {
              color: [
                "#CBD5F5", // To-do (light)
                "#64748B", // In progress
                "#10b981", // Closed (success)
              ],
              opacity: 0.95,
              line: { width: 0 },
            },
            hovertemplate:
              "<b>%{y}</b><br>Leads: %{x}<extra></extra>",
          },
        ]}
        layout={{
          autosize: true,
          title: {
            text: "Leads by Status",
            x: 0,
            font: {
              family: "Montserrat, sans-serif",
              size: 15,
              color: "#212529",
              weight: "bold"
            },
          },

          paper_bgcolor: "#ffffff",
          plot_bgcolor: "#ffffff",

          font: {
            family: "Montserrat, sans-serif",
            color: "#495057",
          },

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

          bargap: 0.4,
          margin: { t: 40, l: 40, r: 20, b: 40 },
          width:350,

          transition: {
            duration: 500,
            easing: "cubic-in-out",
          },
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