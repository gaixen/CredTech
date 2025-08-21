import React, { useState } from "react";
import Link from "next/link";

const PositionCard = ({ position, onEdit, onRemove }) => {
  const cardStyle = {
    backgroundColor: "var(--secondary-color)",
    padding: "1.5rem",
    borderRadius: "12px",
    border: "1px solid var(--border-color)",
    transition: "all 0.3s ease",
    cursor: "pointer",
  };

  const headerStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "1rem",
  };

  const positionInfoStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  };

  const symbolStyle = {
    fontSize: "1.25rem",
    fontWeight: "700",
    color: "var(--text-color)",
    margin: 0,
  };

  const nameStyle = {
    color: "var(--text-color)",
    opacity: 0.7,
    fontSize: "0.9rem",
  };

  const actionsStyle = {
    display: "flex",
    gap: "0.5rem",
  };

  const actionButtonStyle = {
    padding: "0.5rem",
    backgroundColor: "var(--background-color)",
    border: "1px solid var(--border-color)",
    borderRadius: "6px",
    color: "var(--text-color)",
    cursor: "pointer",
    transition: "all 0.3s ease",
  };

  const dangerButtonStyle = {
    ...actionButtonStyle,
    borderColor: "#ff4444",
    color: "#ff4444",
  };

  const metricsStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  };

  const metricRowStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  };

  const metricLabelStyle = {
    color: "var(--text-color)",
    opacity: 0.8,
    fontSize: "0.9rem",
  };

  const metricValueStyle = {
    fontWeight: "600",
    color: "var(--text-color)",
  };

  const positiveStyle = {
    ...metricValueStyle,
    color: "#0ada61",
  };

  const negativeStyle = {
    ...metricValueStyle,
    color: "#ff4444",
  };

  const getRiskBadgeStyle = (level) => {
    const baseStyle = {
      padding: "0.25rem 0.75rem",
      borderRadius: "6px",
      fontSize: "0.8rem",
      fontWeight: "600",
    };

    switch (level) {
      case "low":
        return {
          ...baseStyle,
          backgroundColor: "#0ada6120",
          color: "#0ada61",
          border: "1px solid #0ada6140",
        };
      case "medium":
        return {
          ...baseStyle,
          backgroundColor: "#ffaa0020",
          color: "#ffaa00",
          border: "1px solid #ffaa0040",
        };
      case "high":
        return {
          ...baseStyle,
          backgroundColor: "#ff444420",
          color: "#ff4444",
          border: "1px solid #ff444440",
        };
      default:
        return baseStyle;
    }
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
      <div style={headerStyle}>
        <div style={positionInfoStyle}>
          <h4 style={symbolStyle}>{position.symbol}</h4>
          <span style={nameStyle}>{position.name}</span>
        </div>
        <div style={actionsStyle}>
          <button
            onClick={() => onEdit(position)}
            style={actionButtonStyle}
            onMouseEnter={(e) =>
              (e.target.style.backgroundColor = "var(--primary-color)")
            }
            onMouseLeave={(e) =>
              (e.target.style.backgroundColor = "var(--background-color)")
            }
          >
            ✏️
          </button>
          <button
            onClick={() => onRemove(position)}
            style={dangerButtonStyle}
            onMouseEnter={(e) => (e.target.style.backgroundColor = "#ff444420")}
            onMouseLeave={(e) =>
              (e.target.style.backgroundColor = "var(--background-color)")
            }
          >
            🗑️
          </button>
        </div>
      </div>

      <div style={metricsStyle}>
        <div style={metricRowStyle}>
          <span style={metricLabelStyle}>Notional:</span>
          <span style={metricValueStyle}>
            ${position.notional.toLocaleString()}
          </span>
        </div>
        <div style={metricRowStyle}>
          <span style={metricLabelStyle}>Current Spread:</span>
          <span style={metricValueStyle}>{position.currentSpread} bps</span>
        </div>
        <div style={metricRowStyle}>
          <span style={metricLabelStyle}>P&L:</span>
          <span style={position.pnl >= 0 ? positiveStyle : negativeStyle}>
            {position.pnl >= 0 ? "+" : ""}${position.pnl.toLocaleString()}
          </span>
        </div>
        <div style={metricRowStyle}>
          <span style={metricLabelStyle}>Risk Score:</span>
          <span style={getRiskBadgeStyle(position.riskLevel)}>
            {position.riskScore}/10
          </span>
        </div>
      </div>
    </div>
  );
};

const PortfolioSummary = ({ data }) => {
  const summaryStyle = {
    backgroundColor: "var(--secondary-color)",
    padding: "2rem",
    borderRadius: "12px",
    border: "1px solid var(--border-color)",
    marginBottom: "2rem",
  };

  const titleStyle = {
    fontSize: "1.5rem",
    fontWeight: "700",
    color: "var(--text-color)",
    marginBottom: "1.5rem",
  };

  const metricsGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "1.5rem",
  };

  const metricCardStyle = {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    padding: "1rem",
    backgroundColor: "var(--background-color)",
    borderRadius: "8px",
    border: "1px solid var(--border-color)",
  };

  const iconStyle = {
    fontSize: "1.5rem",
    color: "var(--primary-color)",
  };

  const metricContentStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  };

  const labelStyle = {
    color: "var(--text-color)",
    opacity: 0.8,
    fontSize: "0.9rem",
  };

  const valueStyle = {
    fontSize: "1.25rem",
    fontWeight: "700",
    color: "var(--text-color)",
  };

  const positiveValueStyle = {
    ...valueStyle,
    color: "#0ada61",
  };

  const negativeValueStyle = {
    ...valueStyle,
    color: "#ff4444",
  };

  return (
    <div style={summaryStyle}>
      <h2 style={titleStyle}>Portfolio Overview</h2>
      <div style={metricsGridStyle}>
        <div style={metricCardStyle}>
          <span style={iconStyle}>💰</span>
          <div style={metricContentStyle}>
            <span style={labelStyle}>Total Value</span>
            <span style={valueStyle}>${data.totalValue.toLocaleString()}</span>
          </div>
        </div>
        <div style={metricCardStyle}>
          <span style={iconStyle}>📊</span>
          <div style={metricContentStyle}>
            <span style={labelStyle}>Total P&L</span>
            <span
              style={
                data.totalPnl >= 0 ? positiveValueStyle : negativeValueStyle
              }
            >
              {data.totalPnl >= 0 ? "+" : ""}${data.totalPnl.toLocaleString()}
            </span>
          </div>
        </div>
        <div style={metricCardStyle}>
          <span style={iconStyle}>📈</span>
          <div style={metricContentStyle}>
            <span style={labelStyle}>Positions</span>
            <span style={valueStyle}>{data.totalPositions}</span>
          </div>
        </div>
        <div style={metricCardStyle}>
          <span style={iconStyle}>⚠️</span>
          <div style={metricContentStyle}>
            <span style={labelStyle}>Avg Risk Score</span>
            <span style={valueStyle}>{data.avgRiskScore.toFixed(1)}/10</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const AddPositionModal = ({ isOpen, onClose, onAdd }) => {
  const [formData, setFormData] = useState({
    symbol: "",
    name: "",
    notional: "",
    spread: "",
    direction: "long",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd({
      ...formData,
      notional: parseInt(formData.notional),
      currentSpread: parseInt(formData.spread),
      pnl: 0,
      riskScore: Math.floor(Math.random() * 10) + 1,
      riskLevel:
        Math.random() > 0.6 ? "high" : Math.random() > 0.3 ? "medium" : "low",
    });
    setFormData({
      symbol: "",
      name: "",
      notional: "",
      spread: "",
      direction: "long",
    });
    onClose();
  };

  if (!isOpen) return null;

  const overlayStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  };

  const modalStyle = {
    backgroundColor: "var(--secondary-color)",
    padding: "2rem",
    borderRadius: "12px",
    border: "1px solid var(--border-color)",
    width: "100%",
    maxWidth: "500px",
    maxHeight: "90vh",
    overflow: "auto",
  };

  const headerStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1.5rem",
  };

  const titleStyle = {
    fontSize: "1.5rem",
    fontWeight: "700",
    color: "var(--text-color)",
    margin: 0,
  };

  const closeButtonStyle = {
    background: "none",
    border: "none",
    fontSize: "1.5rem",
    color: "var(--text-color)",
    cursor: "pointer",
  };

  const formStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  };

  const formGroupStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  };

  const labelStyle = {
    color: "var(--text-color)",
    fontWeight: "500",
  };

  const inputStyle = {
    padding: "0.75rem",
    backgroundColor: "var(--background-color)",
    border: "1px solid var(--border-color)",
    borderRadius: "6px",
    color: "var(--text-color)",
    fontSize: "1rem",
  };

  const selectStyle = {
    ...inputStyle,
    cursor: "pointer",
  };

  const actionsStyle = {
    display: "flex",
    gap: "1rem",
    justifyContent: "flex-end",
    marginTop: "1rem",
  };

  const buttonStyle = {
    padding: "0.75rem 1.5rem",
    borderRadius: "6px",
    border: "none",
    fontSize: "1rem",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.3s ease",
  };

  const primaryButtonStyle = {
    ...buttonStyle,
    backgroundColor: "var(--primary-color)",
    color: "white",
  };

  const secondaryButtonStyle = {
    ...buttonStyle,
    backgroundColor: "var(--background-color)",
    color: "var(--text-color)",
    border: "1px solid var(--border-color)",
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <h3 style={titleStyle}>Add New Position</h3>
          <button onClick={onClose} style={closeButtonStyle}>
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} style={formStyle}>
          <div style={formGroupStyle}>
            <label style={labelStyle}>Symbol</label>
            <input
              type="text"
              value={formData.symbol}
              onChange={(e) =>
                setFormData({ ...formData, symbol: e.target.value })
              }
              placeholder="e.g., AAPL"
              required
              style={inputStyle}
            />
          </div>
          <div style={formGroupStyle}>
            <label style={labelStyle}>Company Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g., Apple Inc."
              required
              style={inputStyle}
            />
          </div>
          <div style={formGroupStyle}>
            <label style={labelStyle}>Notional Amount ($)</label>
            <input
              type="number"
              value={formData.notional}
              onChange={(e) =>
                setFormData({ ...formData, notional: e.target.value })
              }
              placeholder="1000000"
              required
              style={inputStyle}
            />
          </div>
          <div style={formGroupStyle}>
            <label style={labelStyle}>CDS Spread (bps)</label>
            <input
              type="number"
              value={formData.spread}
              onChange={(e) =>
                setFormData({ ...formData, spread: e.target.value })
              }
              placeholder="250"
              required
              style={inputStyle}
            />
          </div>
          <div style={formGroupStyle}>
            <label style={labelStyle}>Direction</label>
            <select
              value={formData.direction}
              onChange={(e) =>
                setFormData({ ...formData, direction: e.target.value })
              }
              style={selectStyle}
            >
              <option value="long">Long (Buy Protection)</option>
              <option value="short">Short (Sell Protection)</option>
            </select>
          </div>
          <div style={actionsStyle}>
            <button
              type="button"
              onClick={onClose}
              style={secondaryButtonStyle}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={primaryButtonStyle}
              onMouseEnter={(e) => (e.target.style.backgroundColor = "#0bc954")}
              onMouseLeave={(e) =>
                (e.target.style.backgroundColor = "var(--primary-color)")
              }
            >
              Add Position
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Portfolio = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [positions, setPositions] = useState([
    {
      symbol: "AAPL",
      name: "Apple Inc.",
      notional: 5000000,
      currentSpread: 65,
      pnl: 125000,
      riskScore: 3,
      riskLevel: "low",
    },
    {
      symbol: "TSLA",
      name: "Tesla Inc.",
      notional: 2000000,
      currentSpread: 180,
      pnl: -45000,
      riskScore: 7,
      riskLevel: "medium",
    },
    {
      symbol: "META",
      name: "Meta Platforms",
      notional: 3000000,
      currentSpread: 95,
      pnl: 78000,
      riskScore: 4,
      riskLevel: "low",
    },
    {
      symbol: "NFLX",
      name: "Netflix Inc.",
      notional: 1500000,
      currentSpread: 220,
      pnl: -32000,
      riskScore: 8,
      riskLevel: "high",
    },
  ]);

  const portfolioData = {
    totalValue: positions.reduce((sum, pos) => sum + pos.notional, 0),
    totalPnl: positions.reduce((sum, pos) => sum + pos.pnl, 0),
    totalPositions: positions.length,
    avgRiskScore:
      positions.reduce((sum, pos) => sum + pos.riskScore, 0) / positions.length,
  };

  const handleAddPosition = (newPosition) => {
    setPositions([...positions, newPosition]);
  };

  const handleEditPosition = (position) => {
    console.log("Edit position:", position);
    // You can implement edit functionality here
  };

  const handleRemovePosition = (positionToRemove) => {
    setPositions(
      positions.filter((pos) => pos.symbol !== positionToRemove.symbol)
    );
  };

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

  const actionsStyle = {
    display: "flex",
    gap: "1rem",
    alignItems: "center",
  };

  const addButtonStyle = {
    padding: "0.75rem 1.5rem",
    backgroundColor: "var(--primary-color)",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "1rem",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.3s ease",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  };

  const backLinkStyle = {
    color: "var(--primary-color)",
    textDecoration: "none",
    fontSize: "1rem",
  };

  const positionsGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "1.5rem",
    marginBottom: "2rem",
  };

  const sectionTitleStyle = {
    fontSize: "1.5rem",
    fontWeight: "700",
    color: "var(--text-color)",
    marginBottom: "1.5rem",
  };

  const analyticsGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "1.5rem",
  };

  const analyticsCardStyle = {
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

  const concentrationItemStyle = {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    marginBottom: "0.75rem",
  };

  const concentrationLabelStyle = {
    color: "var(--text-color)",
    fontSize: "0.9rem",
    minWidth: "120px",
  };

  const concentrationBarStyle = {
    flex: 1,
    height: "8px",
    backgroundColor: "var(--border-color)",
    borderRadius: "4px",
    overflow: "hidden",
  };

  const concentrationPercentStyle = {
    color: "var(--text-color)",
    fontSize: "0.9rem",
    fontWeight: "600",
    minWidth: "40px",
  };

  const performanceItemStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0.75rem 0",
    borderBottom: "1px solid var(--border-color)",
  };

  const performanceLabelStyle = {
    color: "var(--text-color)",
    opacity: 0.8,
  };

  const performanceValueStyle = {
    color: "var(--text-color)",
    fontWeight: "600",
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div style={titleSectionStyle}>
          <h1 style={mainTitleStyle}>Portfolio Management</h1>
          <p style={subtitleStyle}>Manage your credit default swap positions</p>
        </div>
        <div style={actionsStyle}>
          <button
            onClick={() => setShowAddModal(true)}
            style={addButtonStyle}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "#0bc954";
              e.target.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "var(--primary-color)";
              e.target.style.transform = "translateY(0)";
            }}
          >
            ➕ Add Position
          </button>
          <Link href="/" style={backLinkStyle}>
            ← Back to Dashboard
          </Link>
        </div>
      </div>

      <PortfolioSummary data={portfolioData} />

      <h2 style={sectionTitleStyle}>Active Positions</h2>
      <div style={positionsGridStyle}>
        {positions.map((position, idx) => (
          <PositionCard
            key={idx}
            position={position}
            onEdit={handleEditPosition}
            onRemove={handleRemovePosition}
          />
        ))}
      </div>

      <h2 style={sectionTitleStyle}>Portfolio Analytics</h2>
      <div style={analyticsGridStyle}>
        <div style={analyticsCardStyle}>
          <h3 style={cardTitleStyle}>Risk Concentration</h3>
          <div>
            <div style={concentrationItemStyle}>
              <span style={concentrationLabelStyle}>Technology</span>
              <div style={concentrationBarStyle}>
                <div
                  style={{
                    width: "45%",
                    height: "100%",
                    backgroundColor: "var(--primary-color)",
                    borderRadius: "4px",
                  }}
                ></div>
              </div>
              <span style={concentrationPercentStyle}>45%</span>
            </div>
            <div style={concentrationItemStyle}>
              <span style={concentrationLabelStyle}>Consumer Disc.</span>
              <div style={concentrationBarStyle}>
                <div
                  style={{
                    width: "30%",
                    height: "100%",
                    backgroundColor: "#ffaa00",
                    borderRadius: "4px",
                  }}
                ></div>
              </div>
              <span style={concentrationPercentStyle}>30%</span>
            </div>
            <div style={concentrationItemStyle}>
              <span style={concentrationLabelStyle}>Communication</span>
              <div style={concentrationBarStyle}>
                <div
                  style={{
                    width: "25%",
                    height: "100%",
                    backgroundColor: "#ff4444",
                    borderRadius: "4px",
                  }}
                ></div>
              </div>
              <span style={concentrationPercentStyle}>25%</span>
            </div>
          </div>
        </div>

        <div style={analyticsCardStyle}>
          <h3 style={cardTitleStyle}>Performance Metrics</h3>
          <div>
            <div style={performanceItemStyle}>
              <span style={performanceLabelStyle}>Sharpe Ratio</span>
              <span style={performanceValueStyle}>1.34</span>
            </div>
            <div style={performanceItemStyle}>
              <span style={performanceLabelStyle}>Max Drawdown</span>
              <span style={performanceValueStyle}>-8.2%</span>
            </div>
            <div style={performanceItemStyle}>
              <span style={performanceLabelStyle}>Win Rate</span>
              <span style={performanceValueStyle}>68%</span>
            </div>
            <div style={performanceItemStyle}>
              <span style={performanceLabelStyle}>Avg Holding Period</span>
              <span style={performanceValueStyle}>45 days</span>
            </div>
          </div>
        </div>
      </div>

      <AddPositionModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddPosition}
      />
    </div>
  );
};

export default Portfolio;
