import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { credTechAPI } from "../services/credtech-api";

const NewsPage = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("general");
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [trendingSymbols, setTrendingSymbols] = useState([]);
  const { currentUser } = useAuth();

  const categories = [
    { key: "general", label: "General Finance", icon: "📰" },
    { key: "Banking", label: "Banking", icon: "🏦" },
    { key: "Credit Markets", label: "Credit Markets", icon: "📊" },
    { key: "Monetary Policy", label: "Monetary Policy", icon: "🏛️" },
  ];

  useEffect(() => {
    fetchNews();
    fetchTrendingSymbols();
  }, [selectedCategory]);

  const fetchNews = async () => {
    setLoading(true);
    setError("");

    try {
      let data;

      if (selectedCategory === "general") {
        // Get latest news for general category
        const response = await credTechAPI.getLatestNews({ limit: 20 });
        data = response;
      } else {
        // Get news by specific category
        const response = await credTechAPI.getNewsByCategory(
          selectedCategory,
          20
        );
        data = response;
      }

      setNews(data.articles || []);
    } catch (err) {
      console.error("Error fetching news:", err);
      setError("Failed to fetch news. Please try again.");
      // Set empty array on error instead of keeping old data
      setNews([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrendingSymbols = async () => {
    try {
      const response = await credTechAPI.getTrendingSymbols();
      setTrendingSymbols(response.trending_symbols || []);
    } catch (err) {
      console.error("Error fetching trending symbols:", err);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError("");

    try {
      const response = await credTechAPI.searchNews(searchQuery, 20);
      setNews(response.articles || []);
    } catch (err) {
      console.error("Error searching news:", err);
      setError("Search failed. Please try again.");
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

      {/* Search Section */}
      <div
        style={{
          display: "flex",
          gap: "1rem",
          alignItems: "center",
          marginBottom: "2rem",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            flex: "1",
            minWidth: "300px",
          }}
        >
          <input
            type="text"
            placeholder="Search news articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            style={{
              flex: "1",
              padding: "0.75rem",
              borderRadius: "8px",
              border: "1px solid var(--border-color)",
              backgroundColor: "var(--secondary-color)",
              color: "var(--text-color)",
              fontSize: "1rem",
            }}
          />
          <button
            onClick={handleSearch}
            disabled={!searchQuery.trim()}
            style={{
              padding: "0.75rem 1.5rem",
              borderRadius: "8px",
              border: "none",
              backgroundColor: "var(--primary-color)",
              color: "white",
              fontSize: "1rem",
              cursor: searchQuery.trim() ? "pointer" : "not-allowed",
              opacity: searchQuery.trim() ? 1 : 0.6,
            }}
          >
            🔍 Search
          </button>
        </div>

        {/* Trending Symbols */}
        {trendingSymbols.length > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              flexWrap: "wrap",
            }}
          >
            <span style={{ color: "var(--text-color)", opacity: 0.8 }}>
              Trending:
            </span>
            {trendingSymbols.slice(0, 5).map((item, index) => (
              <span
                key={index}
                style={{
                  padding: "0.25rem 0.5rem",
                  backgroundColor: "var(--primary-color)",
                  color: "white",
                  borderRadius: "12px",
                  fontSize: "0.8rem",
                  fontWeight: "500",
                }}
              >
                {item.symbol} ({item.mentions})
              </span>
            ))}
          </div>
        )}
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
          {news.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "3rem",
                color: "var(--text-color)",
                opacity: 0.7,
              }}
            >
              No news articles found for the selected category.
            </div>
          ) : (
            news.map((article) => (
              <div
                key={article.id}
                style={newsCardStyle}
                onClick={() =>
                  article.url !== "#" && window.open(article.url, "_blank")
                }
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
                    <span style={categoryTagStyle(article.severity || "low")}>
                      {article.category || "General"}
                    </span>
                    <span style={timestampStyle}>{article.timestamp}</span>
                  </div>
                </div>
                <p style={summaryStyle}>
                  {article.summary ||
                    (article.content
                      ? article.content.substring(0, 200) + "..."
                      : "No summary available")}
                </p>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: "1rem",
                  }}
                >
                  <div style={sourceStyle}>Source: {article.source}</div>
                  {article.symbols && article.symbols.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        gap: "0.25rem",
                        flexWrap: "wrap",
                      }}
                    >
                      {article.symbols.slice(0, 3).map((symbol, idx) => (
                        <span
                          key={idx}
                          style={{
                            padding: "0.1rem 0.4rem",
                            backgroundColor: "var(--primary-color)",
                            color: "white",
                            borderRadius: "8px",
                            fontSize: "0.7rem",
                            fontWeight: "500",
                          }}
                        >
                          {symbol}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
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
