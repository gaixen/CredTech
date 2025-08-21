import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";

const NewsPage = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("general");
  const [refreshing, setRefreshing] = useState(false);
  const { currentUser } = useAuth();

  // Mock news data for demonstration (in production, this would come from an API)
  // To connect real news APIs, uncomment and configure one of these:
  // 1. NewsAPI: https://newsapi.org/
  // 2. Alpha Vantage News: https://www.alphavantage.co/
  // 3. Financial Modeling Prep: https://financialmodelingprep.com/
  // 4. Your backend API: /api/news
  const mockNews = {
    general: [
      {
        id: 1,
        headline:
          "Federal Reserve Signals Potential Rate Changes Amid Economic Uncertainty",
        summary:
          "The Federal Reserve indicated possible monetary policy adjustments as inflation concerns persist.",
        source: "Reuters",
        timestamp: "2 hours ago",
        category: "Monetary Policy",
        severity: "high",
        url: "#",
      },
      {
        id: 2,
        headline:
          "Major Banks Report Strong Q3 Earnings Despite Credit Concerns",
        summary:
          "Leading financial institutions show resilience with solid quarterly results.",
        source: "Bloomberg",
        timestamp: "4 hours ago",
        category: "Banking",
        severity: "medium",
        url: "#",
      },
      {
        id: 3,
        headline: "Corporate Bond Spreads Widen as Market Volatility Increases",
        summary:
          "Credit risk premiums rise across sectors amid economic uncertainty.",
        source: "Financial Times",
        timestamp: "6 hours ago",
        category: "Credit Markets",
        severity: "high",
        url: "#",
      },
      {
        id: 4,
        headline: "Tech Sector Credit Ratings Under Review by Major Agencies",
        summary:
          "Technology companies face scrutiny as growth prospects moderate.",
        source: "Wall Street Journal",
        timestamp: "8 hours ago",
        category: "Tech",
        severity: "medium",
        url: "#",
      },
      {
        id: 5,
        headline:
          "Energy Sector Sees Credit Improvement on Commodity Price Stability",
        summary:
          "Oil and gas companies benefit from stable energy prices and improved cash flows.",
        source: "S&P Global",
        timestamp: "12 hours ago",
        category: "Energy",
        severity: "low",
        url: "#",
      },
    ],
    credit: [
      {
        id: 6,
        headline: "Credit Default Swap Spreads Surge for Retail Companies",
        summary:
          "Consumer discretionary sector faces increased default risk pricing.",
        source: "Credit Week",
        timestamp: "1 hour ago",
        category: "CDS",
        severity: "high",
        url: "#",
      },
      {
        id: 7,
        headline: "High-Yield Bond Issuance Drops 30% Quarter-over-Quarter",
        summary:
          "Companies delay debt refinancing amid higher borrowing costs.",
        source: "Bond Buyer",
        timestamp: "3 hours ago",
        category: "High Yield",
        severity: "medium",
        url: "#",
      },
      {
        id: 8,
        headline: "Investment Grade Corporate Bonds See Record Inflows",
        summary:
          "Institutional investors flock to safer corporate debt instruments.",
        source: "Moody's",
        timestamp: "5 hours ago",
        category: "Investment Grade",
        severity: "low",
        url: "#",
      },
    ],
    markets: [
      {
        id: 9,
        headline: "Stock Market Volatility Reaches Highest Level Since 2020",
        summary:
          "VIX index spikes as investors react to mixed economic signals.",
        source: "CNBC",
        timestamp: "30 minutes ago",
        category: "Volatility",
        severity: "high",
        url: "#",
      },
      {
        id: 10,
        headline: "Dollar Strengthens Against Major Currencies",
        summary: "USD gains momentum on relative economic resilience.",
        source: "MarketWatch",
        timestamp: "2 hours ago",
        category: "Forex",
        severity: "medium",
        url: "#",
      },
    ],
  };

  const categories = [
    { key: "general", label: "General Finance", icon: "📰" },
    { key: "credit", label: "Credit Markets", icon: "📊" },
    { key: "markets", label: "Market News", icon: "📈" },
  ];

  useEffect(() => {
    fetchNews();
  }, [selectedCategory]);

  const fetchNews = async () => {
    setLoading(true);
    setError("");

    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // In production, this would be an actual API call
      // const response = await fetch(`/api/news?category=${selectedCategory}`);
      // const data = await response.json();

      setNews(mockNews[selectedCategory] || []);
    } catch (err) {
      setError("Failed to fetch news. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const refreshNews = async () => {
    setRefreshing(true);
    await fetchNews();
    setRefreshing(false);
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "high":
        return "#ff4444";
      case "medium":
        return "#ffaa00";
      case "low":
        return "#0ada61";
      default:
        return "var(--text-color)";
    }
  };

  const containerStyle = {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "2rem",
  };

  const headerStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "2rem",
    flexWrap: "wrap",
    gap: "1rem",
  };

  const titleStyle = {
    fontSize: "2.5rem",
    fontWeight: "700",
    color: "var(--text-color)",
    margin: 0,
  };

  const refreshButtonStyle = {
    padding: "0.75rem 1.5rem",
    backgroundColor: "var(--primary-color)",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: refreshing ? "not-allowed" : "pointer",
    fontSize: "1rem",
    fontWeight: "500",
    transition: "all 0.3s ease",
    opacity: refreshing ? 0.7 : 1,
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  };

  const categoriesStyle = {
    display: "flex",
    gap: "1rem",
    marginBottom: "2rem",
    flexWrap: "wrap",
  };

  const categoryButtonStyle = (isActive) => ({
    padding: "0.75rem 1.5rem",
    backgroundColor: isActive
      ? "var(--primary-color)"
      : "var(--secondary-color)",
    color: isActive ? "white" : "var(--text-color)",
    border: `1px solid ${
      isActive ? "var(--primary-color)" : "var(--border-color)"
    }`,
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "1rem",
    transition: "all 0.3s ease",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  });

  const newsGridStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  };

  const newsCardStyle = {
    backgroundColor: "var(--secondary-color)",
    padding: "1.5rem",
    borderRadius: "12px",
    border: "1px solid var(--border-color)",
    transition: "all 0.3s ease",
    cursor: "pointer",
    position: "relative",
  };

  const newsHeaderStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "1rem",
    gap: "1rem",
  };

  const headlineStyle = {
    fontSize: "1.25rem",
    fontWeight: "600",
    color: "var(--text-color)",
    margin: 0,
    lineHeight: "1.4",
  };

  const metaInfoStyle = {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "0.5rem",
    minWidth: "max-content",
  };

  const categoryTagStyle = (severity) => ({
    padding: "0.25rem 0.75rem",
    backgroundColor: getSeverityColor(severity) + "20",
    color: getSeverityColor(severity),
    border: `1px solid ${getSeverityColor(severity)}40`,
    borderRadius: "6px",
    fontSize: "0.8rem",
    fontWeight: "500",
  });

  const timestampStyle = {
    color: "var(--text-color)",
    opacity: 0.7,
    fontSize: "0.85rem",
  };

  const summaryStyle = {
    color: "var(--text-color)",
    opacity: 0.9,
    lineHeight: "1.5",
    marginBottom: "1rem",
  };

  const sourceStyle = {
    color: "var(--primary-color)",
    fontSize: "0.9rem",
    fontWeight: "500",
  };

  const loadingStyle = {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "3rem",
    color: "var(--text-color)",
    fontSize: "1.1rem",
  };

  const errorStyle = {
    color: "#ff4444",
    backgroundColor: "rgba(255, 68, 68, 0.1)",
    padding: "1rem",
    borderRadius: "8px",
    border: "1px solid rgba(255, 68, 68, 0.3)",
    textAlign: "center",
  };

  const spinnerStyle = {
    width: "20px",
    height: "20px",
    border: "2px solid transparent",
    borderTop: "2px solid currentColor",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>Financial News</h1>
        <button
          onClick={refreshNews}
          disabled={refreshing}
          style={refreshButtonStyle}
          onMouseEnter={(e) => {
            if (!refreshing) {
              e.target.style.backgroundColor = "#0bc954";
              e.target.style.transform = "translateY(-1px)";
            }
          }}
          onMouseLeave={(e) => {
            if (!refreshing) {
              e.target.style.backgroundColor = "var(--primary-color)";
              e.target.style.transform = "translateY(0)";
            }
          }}
        >
          {refreshing ? (
            <>
              <div style={spinnerStyle}></div>
              Refreshing...
            </>
          ) : (
            <>🔄 Refresh</>
          )}
        </button>
      </div>

      <div style={categoriesStyle}>
        {categories.map((category) => (
          <button
            key={category.key}
            onClick={() => setSelectedCategory(category.key)}
            style={categoryButtonStyle(selectedCategory === category.key)}
            onMouseEnter={(e) => {
              if (selectedCategory !== category.key) {
                e.target.style.backgroundColor = "var(--border-color)";
              }
            }}
            onMouseLeave={(e) => {
              if (selectedCategory !== category.key) {
                e.target.style.backgroundColor = "var(--secondary-color)";
              }
            }}
          >
            <span>{category.icon}</span>
            {category.label}
          </button>
        ))}
      </div>

      {loading && (
        <div style={loadingStyle}>
          <div style={spinnerStyle}></div>
          <span style={{ marginLeft: "1rem" }}>Loading latest news...</span>
        </div>
      )}

      {error && <div style={errorStyle}>{error}</div>}

      {!loading && !error && (
        <div style={newsGridStyle}>
          {news.map((article) => (
            <div
              key={article.id}
              style={newsCardStyle}
              onClick={() => window.open(article.url, "_blank")}
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
              <div style={newsHeaderStyle}>
                <h3 style={headlineStyle}>{article.headline}</h3>
                <div style={metaInfoStyle}>
                  <span style={categoryTagStyle(article.severity)}>
                    {article.category}
                  </span>
                  <span style={timestampStyle}>{article.timestamp}</span>
                </div>
              </div>
              <p style={summaryStyle}>{article.summary}</p>
              <div style={sourceStyle}>Source: {article.source}</div>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

export default NewsPage;
