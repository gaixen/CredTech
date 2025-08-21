import React, { useState } from "react";
import Link from "next/link";

const WatchlistCard = ({ watchlist, onSelect, onDelete }) => {
  const cardStyle = {
    backgroundColor: "var(--secondary-color)",
    padding: "1.5rem",
    borderRadius: "12px",
    border: "1px solid var(--border-color)",
    cursor: "pointer",
    transition: "all 0.3s ease",
  };

  const headerStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "1rem",
  };

  const titleStyle = {
    fontSize: "1.25rem",
    fontWeight: "700",
    color: "var(--text-color)",
    margin: 0,
  };

  const countStyle = {
    color: "var(--text-color)",
    opacity: 0.7,
    fontSize: "0.9rem",
  };

  const deleteButtonStyle = {
    background: "none",
    border: "none",
    color: "#ff4444",
    cursor: "pointer",
    fontSize: "1.2rem",
    padding: "0.25rem",
  };

  const companiesPreviewStyle = {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.5rem",
    marginBottom: "1rem",
  };

  const companyTagStyle = {
    padding: "0.25rem 0.75rem",
    backgroundColor: "var(--primary-color)",
    color: "var(--background-color)",
    borderRadius: "16px",
    fontSize: "0.8rem",
    fontWeight: "500",
  };

  const performanceStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: "1rem",
    borderTop: "1px solid var(--border-color)",
  };

  const performanceItemStyle = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.25rem",
  };

  const performanceLabelStyle = {
    color: "var(--text-color)",
    opacity: 0.7,
    fontSize: "0.8rem",
  };

  const performanceValueStyle = (isPositive) => ({
    color: isPositive ? "#0ada61" : "#ff4444",
    fontWeight: "600",
    fontSize: "0.9rem",
  });

  return (
    <div
      style={cardStyle}
      onClick={() => onSelect(watchlist)}
      onMouseEnter={(e) => {
        e.target.style.transform = "translateY(-4px)";
        e.target.style.boxShadow = "0 12px 30px rgba(0, 0, 0, 0.4)";
        e.target.style.borderColor = "var(--primary-color)";
      }}
      onMouseLeave={(e) => {
        e.target.style.transform = "translateY(0)";
        e.target.style.boxShadow = "none";
        e.target.style.borderColor = "var(--border-color)";
      }}
    >
      <div style={headerStyle}>
        <div>
          <h3 style={titleStyle}>{watchlist.name}</h3>
          <span style={countStyle}>{watchlist.companies.length} companies</span>
        </div>
        <button
          style={deleteButtonStyle}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(watchlist.id);
          }}
        >
          🗑️
        </button>
      </div>

      <div style={companiesPreviewStyle}>
        {watchlist.companies.slice(0, 3).map((company, idx) => (
          <span key={idx} style={companyTagStyle}>
            {company.symbol}
          </span>
        ))}
        {watchlist.companies.length > 3 && (
          <span style={companyTagStyle}>
            +{watchlist.companies.length - 3} more
          </span>
        )}
      </div>

      <div style={performanceStyle}>
        <div style={performanceItemStyle}>
          <span style={performanceLabelStyle}>Avg Return</span>
          <span style={performanceValueStyle(watchlist.avgReturn >= 0)}>
            {watchlist.avgReturn >= 0 ? "+" : ""}
            {watchlist.avgReturn}%
          </span>
        </div>
        <div style={performanceItemStyle}>
          <span style={performanceLabelStyle}>Risk Level</span>
          <span
            style={{
              color:
                watchlist.riskLevel === "low"
                  ? "#0ada61"
                  : watchlist.riskLevel === "medium"
                  ? "#ffaa00"
                  : "#ff4444",
              fontWeight: "600",
              fontSize: "0.9rem",
            }}
          >
            {watchlist.riskLevel.toUpperCase()}
          </span>
        </div>
        <div style={performanceItemStyle}>
          <span style={performanceLabelStyle}>Last Updated</span>
          <span style={{ color: "var(--text-color)", fontSize: "0.8rem" }}>
            {watchlist.lastUpdated}
          </span>
        </div>
      </div>
    </div>
  );
};

const CreateWatchlistModal = ({ isOpen, onClose, onCreate }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  if (!isOpen) return null;

  const modalOverlayStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  };

  const modalStyle = {
    backgroundColor: "var(--secondary-color)",
    padding: "2rem",
    borderRadius: "12px",
    border: "1px solid var(--border-color)",
    maxWidth: "500px",
    width: "90%",
  };

  const titleStyle = {
    fontSize: "1.5rem",
    fontWeight: "700",
    color: "var(--text-color)",
    marginBottom: "1.5rem",
  };

  const inputStyle = {
    width: "100%",
    padding: "0.75rem",
    backgroundColor: "var(--background-color)",
    border: "1px solid var(--border-color)",
    borderRadius: "6px",
    color: "var(--text-color)",
    fontSize: "1rem",
    marginBottom: "1rem",
  };

  const buttonStyle = {
    padding: "0.75rem 1.5rem",
    backgroundColor: "var(--primary-color)",
    border: "none",
    borderRadius: "6px",
    color: "var(--background-color)",
    cursor: "pointer",
    fontSize: "1rem",
    fontWeight: "600",
    marginRight: "1rem",
  };

  const cancelButtonStyle = {
    ...buttonStyle,
    backgroundColor: "var(--secondary-color)",
    color: "var(--text-color)",
    border: "1px solid var(--border-color)",
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) {
      onCreate({ name, description });
      setName("");
      setDescription("");
      onClose();
    }
  };

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <h2 style={titleStyle}>Create New Watchlist</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Watchlist name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inputStyle}
            required
          />
          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ ...inputStyle, height: "100px", resize: "vertical" }}
          />
          <div>
            <button type="submit" style={buttonStyle}>
              Create Watchlist
            </button>
            <button type="button" onClick={onClose} style={cancelButtonStyle}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Watchlists = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [watchlists, setWatchlists] = useState([
    {
      id: 1,
      name: "Tech Giants",
      companies: [
        {
          symbol: "AAPL",
          name: "Apple Inc.",
          price: "175.43",
          change: 1.2,
          cdsSpread: 65,
          riskLevel: "low",
        },
        {
          symbol: "MSFT",
          name: "Microsoft Corp.",
          price: "378.85",
          change: 0.8,
          cdsSpread: 55,
          riskLevel: "low",
        },
        {
          symbol: "GOOGL",
          name: "Alphabet Inc.",
          price: "134.12",
          change: -0.5,
          cdsSpread: 70,
          riskLevel: "low",
        },
      ],
      avgReturn: 8.5,
      riskLevel: "low",
      totalValue: 245.6,
      lastUpdated: "2 hours ago",
    },
    {
      id: 2,
      name: "High Risk Plays",
      companies: [
        {
          symbol: "TSLA",
          name: "Tesla Inc.",
          price: "248.50",
          change: -2.3,
          cdsSpread: 180,
          riskLevel: "high",
        },
        {
          symbol: "NFLX",
          name: "Netflix Inc.",
          price: "445.20",
          change: 0.8,
          cdsSpread: 220,
          riskLevel: "high",
        },
      ],
      avgReturn: -5.2,
      riskLevel: "high",
      totalValue: 98.3,
      lastUpdated: "30 minutes ago",
    },
    {
      id: 3,
      name: "Financial Sector",
      companies: [
        {
          symbol: "JPM",
          name: "JPMorgan Chase",
          price: "145.67",
          change: 1.8,
          cdsSpread: 95,
          riskLevel: "medium",
        },
        {
          symbol: "BAC",
          name: "Bank of America",
          price: "29.44",
          change: 2.1,
          cdsSpread: 110,
          riskLevel: "medium",
        },
        {
          symbol: "WFC",
          name: "Wells Fargo",
          price: "41.22",
          change: -0.3,
          cdsSpread: 125,
          riskLevel: "medium",
        },
      ],
      avgReturn: 3.7,
      riskLevel: "medium",
      totalValue: 156.8,
      lastUpdated: "1 hour ago",
    },
  ]);

  const handleCreateWatchlist = (newWatchlist) => {
    const watchlist = {
      id: watchlists.length + 1,
      ...newWatchlist,
      companies: [],
      avgReturn: 0,
      riskLevel: "low",
      totalValue: 0,
      lastUpdated: "Just now",
    };
    setWatchlists([...watchlists, watchlist]);
  };

  const handleDeleteWatchlist = (id) => {
    setWatchlists(watchlists.filter((w) => w.id !== id));
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

  const createButtonStyle = {
    padding: "0.75rem 1.5rem",
    backgroundColor: "var(--primary-color)",
    border: "none",
    borderRadius: "8px",
    color: "var(--background-color)",
    cursor: "pointer",
    fontSize: "1rem",
    fontWeight: "600",
    transition: "all 0.3s ease",
  };

  const backLinkStyle = {
    color: "var(--primary-color)",
    textDecoration: "none",
    fontSize: "1rem",
  };

  const watchlistsGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
    gap: "1.5rem",
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div style={titleSectionStyle}>
          <h1 style={mainTitleStyle}>Watchlists</h1>
          <p style={subtitleStyle}>Monitor and track your favorite companies</p>
        </div>
        <div style={actionsStyle}>
          <button
            onClick={() => setShowCreateModal(true)}
            style={createButtonStyle}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "#099951";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "var(--primary-color)";
            }}
          >
            + Create Watchlist
          </button>
          <Link href="/" style={backLinkStyle}>
            ← Back to Dashboard
          </Link>
        </div>
      </div>

      <div style={watchlistsGridStyle}>
        {watchlists.map((watchlist) => (
          <WatchlistCard
            key={watchlist.id}
            watchlist={watchlist}
            onSelect={(w) => console.log("Selected watchlist:", w)}
            onDelete={handleDeleteWatchlist}
          />
        ))}
      </div>

      <CreateWatchlistModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateWatchlist}
      />
    </div>
  );
};

export default Watchlists;
