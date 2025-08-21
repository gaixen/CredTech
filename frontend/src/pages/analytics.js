import React, { useState, useEffect } from "react";
import Link from "next/link";

const ChartCard = ({ title, type, data, color = "var(--primary-color)" }) => {
  const cardStyle = {
    backgroundColor: "var(--secondary-color)",
    padding: "1.5rem",
    borderRadius: "12px",
    border: "1px solid var(--border-color)",
    transition: "all 0.3s ease",
  };

  const headerStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1rem",
  };

  const titleStyle = {
    fontSize: "1.1rem",
    fontWeight: "600",
    color: "var(--text-color)",
    margin: 0,
  };

  const typeIconStyle = {
    padding: "0.5rem",
    backgroundColor: "var(--background-color)",
    borderRadius: "6px",
    color: color,
    fontSize: "1.2rem",
  };

  const chartPlaceholderStyle = {
    height: "180px",
    backgroundColor: "var(--background-color)",
    border: `2px dashed ${color}40`,
    borderRadius: "8px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: "0.5rem",
  };

  const chartTypeStyle = {
    color: "var(--text-color)",
    opacity: 0.6,
    fontSize: "0.9rem",
    fontWeight: "500",
  };

  const chartValueStyle = {
    color: color,
    fontSize: "1.5rem",
    fontWeight: "700",
  };

  return (
    <div
      style={cardStyle}
      onMouseEnter={(e) => {
        e.target.style.transform = "translateY(-2px)";
        e.target.style.boxShadow = "0 8px 25px rgba(0, 0, 0, 0.3)";
        e.target.style.borderColor = color;
      }}
      onMouseLeave={(e) => {
        e.target.style.transform = "translateY(0)";
        e.target.style.boxShadow = "none";
        e.target.style.borderColor = "var(--border-color)";
      }}
    >
      <div style={headerStyle}>
        <h3 style={titleStyle}>{title}</h3>
        <div style={typeIconStyle}>
          {type === "line" ? "📈" : type === "pie" ? "🍰" : "📊"}
        </div>
      </div>
      <div style={chartPlaceholderStyle}>
        <span style={chartTypeStyle}>{type.toUpperCase()} CHART</span>
        <span style={chartValueStyle}>{data?.value || "No Data"}</span>
      </div>
    </div>
  );
};

const RiskMatrix = () => {
  const matrixStyle = {
    backgroundColor: "var(--secondary-color)",
    padding: "1.5rem",
    borderRadius: "12px",
    border: "1px solid var(--border-color)",
    marginBottom: "1.5rem",
  };

  const titleStyle = {
    fontSize: "1.25rem",
    fontWeight: "600",
    color: "var(--text-color)",
    marginBottom: "1rem",
  };

  const gridStyle = {
    display: "grid",
    gridTemplateColumns: "120px repeat(3, 1fr)",
    gap: "0.5rem",
    fontSize: "0.9rem",
  };

  const headerCellStyle = {
    padding: "0.75rem",
    backgroundColor: "var(--background-color)",
    color: "var(--text-color)",
    fontWeight: "600",
    textAlign: "center",
    borderRadius: "6px",
    fontSize: "0.8rem",
  };

  const rowHeaderStyle = {
    ...headerCellStyle,
    textAlign: "left",
    paddingLeft: "1rem",
  };

  const getCellStyle = (level) => {
    const baseStyle = {
      padding: "0.75rem",
      textAlign: "center",
      borderRadius: "6px",
      fontWeight: "700",
      color: "white",
    };

    switch (level) {
      case "low":
        return { ...baseStyle, backgroundColor: "#0ada61" };
      case "medium":
        return { ...baseStyle, backgroundColor: "#ffaa00" };
      case "high":
        return { ...baseStyle, backgroundColor: "#ff6600" };
      case "critical":
        return { ...baseStyle, backgroundColor: "#ff4444" };
      default:
        return baseStyle;
    }
  };

  return (
    <div style={matrixStyle}>
      <h3 style={titleStyle}>Risk Assessment Matrix</h3>
      <div style={gridStyle}>
        <div style={headerCellStyle}></div>
        <div style={headerCellStyle}>Low Impact</div>
        <div style={headerCellStyle}>Medium Impact</div>
        <div style={headerCellStyle}>High Impact</div>

        <div style={rowHeaderStyle}>High Probability</div>
        <div style={getCellStyle("medium")}>3</div>
        <div style={getCellStyle("high")}>8</div>
        <div style={getCellStyle("critical")}>12</div>

        <div style={rowHeaderStyle}>Medium Probability</div>
        <div style={getCellStyle("low")}>2</div>
        <div style={getCellStyle("medium")}>5</div>
        <div style={getCellStyle("high")}>7</div>

        <div style={rowHeaderStyle}>Low Probability</div>
        <div style={getCellStyle("low")}>1</div>
        <div style={getCellStyle("low")}>2</div>
        <div style={getCellStyle("medium")}>4</div>
      </div>
    </div>
  );
};

const AnalyticsSummary = ({ title, value, trend, icon }) => {
  const cardStyle = {
    backgroundColor: "var(--secondary-color)",
    padding: "1.5rem",
    borderRadius: "12px",
    border: "1px solid var(--border-color)",
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    transition: "all 0.3s ease",
  };

  const iconStyle = {
    fontSize: "2rem",
    color: "var(--primary-color)",
  };

  const contentStyle = {
    flex: 1,
  };

  const titleStyle = {
    fontSize: "0.9rem",
    color: "var(--text-color)",
    opacity: 0.8,
    margin: 0,
    marginBottom: "0.5rem",
  };

  const valueStyle = {
    fontSize: "1.5rem",
    fontWeight: "700",
    color: "var(--text-color)",
    marginBottom: "0.5rem",
  };

  const trendStyle = {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    fontSize: "0.85rem",
    color: trend >= 0 ? "#0ada61" : "#ff4444",
  };

  return (
    <div
      style={cardStyle}
      onMouseEnter={(e) => {
        e.target.style.transform = "translateY(-2px)";
        e.target.style.boxShadow = "0 8px 25px rgba(0, 0, 0, 0.3)";
        e.target.style.borderColor = "var(--primary-color)";
      }}
      onMouseLeave={(e) => {
        e.target.style.transform = "translateY(0)";
        e.target.style.boxShadow = "none";
        e.target.style.borderColor = "var(--border-color)";
      }}
    >
      <div style={iconStyle}>{icon}</div>
      <div style={contentStyle}>
        <h4 style={titleStyle}>{title}</h4>
        <div style={valueStyle}>{value}</div>
        <div style={trendStyle}>
          <span>{trend >= 0 ? "📈" : "📉"}</span>
          {Math.abs(trend)}% vs last month
        </div>
      </div>
    </div>
  );
};

const Analytics = () => {
  const [timeRange, setTimeRange] = useState("30d");
  const [selectedMetric, setSelectedMetric] = useState("cds_spreads");

  const summaryData = [
    { title: "Avg CDS Spread", value: "245 bps", trend: -8.2, icon: "🎯" },
    { title: "Portfolio VaR", value: "$1.2M", trend: 12.5, icon: "📊" },
    { title: "Default Probability", value: "2.8%", trend: -15.3, icon: "🍰" },
    { title: "Risk-Adjusted Return", value: "18.4%", trend: 5.7, icon: "📈" },
  ];

  const chartData = [
    {
      title: "CDS Spread Trends",
      type: "line",
      data: { value: "245 bps" },
      color: "var(--primary-color)",
    },
    {
      title: "Sector Exposure",
      type: "pie",
      data: { value: "8 Sectors" },
      color: "#0ada61",
    },
    {
      title: "Risk Distribution",
      type: "bar",
      data: { value: "15 Assets" },
      color: "#ffaa00",
    },
    {
      title: "Performance Attribution",
      type: "line",
      data: { value: "+12.3%" },
      color: "#ff4444",
    },
  ];

  const containerStyle = {
    maxWidth: "1200px",
    margin: "0 auto",
  };

  const headerStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "2rem",
    flexWrap: "wrap",
    gap: "1rem",
  };

  const titleSectionStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  };

  const mainTitleStyle = {
    fontSize: "2.5rem",
    fontWeight: "700",
    color: "var(--text-color)",
    margin: 0,
  };

  const subtitleStyle = {
    color: "var(--text-color)",
    opacity: 0.8,
    fontSize: "1rem",
  };

  const backLinkStyle = {
    color: "var(--primary-color)",
    textDecoration: "none",
    fontSize: "1rem",
  };

  const controlsStyle = {
    display: "flex",
    gap: "2rem",
    marginBottom: "2rem",
    flexWrap: "wrap",
  };

  const selectorStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  };

  const labelStyle = {
    color: "var(--text-color)",
    fontWeight: "500",
    fontSize: "0.9rem",
  };

  const selectStyle = {
    padding: "0.75rem",
    backgroundColor: "var(--secondary-color)",
    border: "1px solid var(--border-color)",
    borderRadius: "6px",
    color: "var(--text-color)",
    fontSize: "1rem",
    cursor: "pointer",
  };

  const summaryGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "1.5rem",
    marginBottom: "2rem",
  };

  const sectionTitleStyle = {
    fontSize: "1.5rem",
    fontWeight: "700",
    color: "var(--text-color)",
    marginBottom: "1.5rem",
  };

  const chartsGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "1.5rem",
    marginBottom: "2rem",
  };

  const analysisGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "1.5rem",
  };

  const analysisCardStyle = {
    backgroundColor: "var(--secondary-color)",
    padding: "1.5rem",
    borderRadius: "12px",
    border: "1px solid var(--border-color)",
  };

  const cardTitleStyle = {
    fontSize: "1.25rem",
    fontWeight: "600",
    color: "var(--text-color)",
    marginBottom: "1rem",
  };

  const scenarioStyle = {
    padding: "1rem",
    backgroundColor: "var(--background-color)",
    borderRadius: "8px",
    marginBottom: "1rem",
    border: "1px solid var(--border-color)",
  };

  const scenarioNameStyle = {
    fontWeight: "600",
    color: "var(--text-color)",
    display: "block",
    marginBottom: "0.5rem",
  };

  const scenarioImpactStyle = {
    color: "#ff4444",
    display: "block",
    fontSize: "0.9rem",
    marginBottom: "0.25rem",
  };

  const scenarioProbabilityStyle = {
    color: "var(--text-color)",
    opacity: 0.7,
    fontSize: "0.85rem",
  };

  const correlationItemStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0.75rem 0",
    borderBottom: "1px solid var(--border-color)",
  };

  const correlationLabelStyle = {
    color: "var(--text-color)",
    fontSize: "0.9rem",
  };

  const getCorrelationValueStyle = (type) => {
    const baseStyle = {
      fontWeight: "600",
      fontSize: "0.9rem",
    };

    switch (type) {
      case "positive":
        return { ...baseStyle, color: "#0ada61" };
      case "negative":
        return { ...baseStyle, color: "#ff4444" };
      case "neutral":
        return { ...baseStyle, color: "#ffaa00" };
      default:
        return { ...baseStyle, color: "var(--text-color)" };
    }
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div style={titleSectionStyle}>
          <h1 style={mainTitleStyle}>Risk Analytics</h1>
          <p style={subtitleStyle}>
            Advanced credit risk analysis and portfolio insights
          </p>
        </div>
        <Link href="/" style={backLinkStyle}>
          ← Back to Dashboard
        </Link>
      </div>

      <div style={controlsStyle}>
        <div style={selectorStyle}>
          <label style={labelStyle}>Time Range:</label>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            style={selectStyle}
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="1y">Last Year</option>
          </select>
        </div>
        <div style={selectorStyle}>
          <label style={labelStyle}>Primary Metric:</label>
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
            style={selectStyle}
          >
            <option value="cds_spreads">CDS Spreads</option>
            <option value="default_prob">Default Probability</option>
            <option value="var">Value at Risk</option>
            <option value="expected_loss">Expected Loss</option>
          </select>
        </div>
      </div>

      <div style={summaryGridStyle}>
        {summaryData.map((item, idx) => (
          <AnalyticsSummary key={idx} {...item} />
        ))}
      </div>

      <h2 style={sectionTitleStyle}>Risk Visualization</h2>
      <div style={chartsGridStyle}>
        {chartData.map((chart, idx) => (
          <ChartCard key={idx} {...chart} />
        ))}
      </div>

      <h2 style={sectionTitleStyle}>Advanced Analysis</h2>
      <div style={analysisGridStyle}>
        <RiskMatrix />

        <div style={analysisCardStyle}>
          <h3 style={cardTitleStyle}>Stress Testing Results</h3>
          <div>
            <div style={scenarioStyle}>
              <span style={scenarioNameStyle}>Market Crash (-30%)</span>
              <span style={scenarioImpactStyle}>Portfolio Loss: $3.2M</span>
              <span style={scenarioProbabilityStyle}>Probability: 5%</span>
            </div>
            <div style={scenarioStyle}>
              <span style={scenarioNameStyle}>
                Interest Rate Spike (+300bps)
              </span>
              <span style={scenarioImpactStyle}>Portfolio Loss: $1.8M</span>
              <span style={scenarioProbabilityStyle}>Probability: 15%</span>
            </div>
            <div style={scenarioStyle}>
              <span style={scenarioNameStyle}>Credit Crisis</span>
              <span style={scenarioImpactStyle}>Portfolio Loss: $4.5M</span>
              <span style={scenarioProbabilityStyle}>Probability: 2%</span>
            </div>
          </div>
        </div>

        <div style={analysisCardStyle}>
          <h3 style={cardTitleStyle}>Correlation Analysis</h3>
          <div>
            <div style={correlationItemStyle}>
              <span style={correlationLabelStyle}>CDS vs Stock Price</span>
              <span style={getCorrelationValueStyle("negative")}>-0.73</span>
            </div>
            <div style={correlationItemStyle}>
              <span style={correlationLabelStyle}>CDS vs VIX</span>
              <span style={getCorrelationValueStyle("positive")}>+0.64</span>
            </div>
            <div style={correlationItemStyle}>
              <span style={correlationLabelStyle}>CDS vs Credit Rating</span>
              <span style={getCorrelationValueStyle("negative")}>-0.82</span>
            </div>
            <div style={correlationItemStyle}>
              <span style={correlationLabelStyle}>Sector Concentration</span>
              <span style={getCorrelationValueStyle("neutral")}>0.23</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
