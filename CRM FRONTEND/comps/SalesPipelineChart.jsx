import React from "react";
import Plotly from "plotly.js-basic-dist";
import createPlotlyComponent from "react-plotly.js/factory";
const Plot = createPlotlyComponent(Plotly);
import "../src/App.css";

export default function SalesPipelineChart({ deals = [] }) {
  let todo = 0, inProgress = 0, closed = 0;
  deals.forEach(deal => {
    if (deal.stage && deal.stage.includes("Closed")) closed++;
    else if (deal.stage === "In Progress" || deal.stage === "Negotiation") inProgress++;
    else todo++;
  });

  return (
    <div className="chart-card" style={{ width: "100%", overflow: "hidden" }}>
      <Plot
        data={[
          {
            type: "pie",
            labels: ["To-Do", "In Progress", "Closed"],
            values: [todo, inProgress, closed],
            hole: 0.5,
            textinfo: "label+percent",
            textposition: "inside",
            marker: {
              colors: ["#3b82f6", "#f59e0b", "#10b981"]
            }
          }
        ]}
        layout={{
          margin: { t: 40, l: 20, r: 20, b: 20 },
          title: {
            text: "Sales Deal Distribution",
            x: 0,
            font: {
              family: "Montserrat, sans-serif",
              size: 15,
              color: "#212529",
              weight: "bold",
            },
          },
          paper_bgcolor: "transparent",
          plot_bgcolor: "transparent",
          autosize: true,
          showlegend: true,
          legend: { orientation: "h", y: -0.1 }
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
