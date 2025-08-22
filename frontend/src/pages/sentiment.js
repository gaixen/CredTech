import React, { useState } from "react";
import { credTechAPI } from "../services/credtech-api";

const SentimentAnalysisPage = () => {
  const [ticker, setTicker] = useState("");
  const [loading, setLoading] = useState(false);
  const [sentimentData, setSentimentData] = useState(null);
  const [error, setError] = useState(null);
  const [customText, setCustomText] = useState("");
  const [customAnalysis, setCustomAnalysis] = useState(null);

  const handleTickerAnalysis = async (e) => {
    e.preventDefault();
    if (!ticker.trim()) return;

    setLoading(true);
    setError(null);
    setSentimentData(null);

    try {
      // Call the sentiment analysis for the ticker
      const response = await credTechAPI.getCompanySentiment(
        ticker.toUpperCase()
      );
      setSentimentData(response);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomTextAnalysis = async () => {
    if (!customText.trim()) return;

    setLoading(true);
    try {
      const response = await credTechAPI.analyzeSentiment(customText);
      setCustomAnalysis(response);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getSentimentColor = (sentiment) => {
    switch (sentiment?.toLowerCase()) {
      case "positive":
        return "#28a745";
      case "negative":
        return "#dc3545";
      default:
        return "#6c757d";
    }
  };

  const getSentimentIcon = (sentiment) => {
    switch (sentiment?.toLowerCase()) {
      case "positive":
        return "📈";
      case "negative":
        return "📉";
      default:
        return "📊";
    }
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
      <h1 style={{ textAlign: "center", marginBottom: "2rem", color: "#333" }}>
        🚀 Market Sentiment Analysis
      </h1>
      <p style={{ textAlign: "center", marginBottom: "3rem", color: "#666" }}>
        Analyze Reddit financial discussions and market sentiment using FinBERT
        AI
      </p>

      {/* Ticker Analysis Section */}
      <div
        style={{
          backgroundColor: "#f8f9fa",
          border: "1px solid #e0e0e0",
          borderRadius: "12px",
          padding: "2rem",
          marginBottom: "2rem",
        }}
      >
        <h2 style={{ marginBottom: "1.5rem", color: "#333" }}>
          📊 Company Sentiment Analysis
        </h2>

        <form onSubmit={handleTickerAnalysis} style={{ marginBottom: "2rem" }}>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <input
              type="text"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              placeholder="Enter ticker symbol (e.g., AAPL, TSLA, GOOGL)"
              style={{
                flex: 1,
                padding: "1rem",
                fontSize: "1.1rem",
                border: "2px solid #ddd",
                borderRadius: "8px",
                outline: "none",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#007bff")}
              onBlur={(e) => (e.target.style.borderColor = "#ddd")}
            />
            <button
              type="submit"
              disabled={loading || !ticker.trim()}
              style={{
                padding: "1rem 2rem",
                fontSize: "1.1rem",
                backgroundColor: loading ? "#6c757d" : "#007bff",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: loading ? "not-allowed" : "pointer",
                fontWeight: "bold",
              }}
            >
              {loading ? "Analyzing..." : "Analyze Sentiment"}
            </button>
          </div>
        </form>

        {error && (
          <div
            style={{
              backgroundColor: "#f8d7da",
              color: "#721c24",
              padding: "1rem",
              borderRadius: "8px",
              marginBottom: "1rem",
              border: "1px solid #f5c6cb",
            }}
          >
            <strong>Error:</strong> {error}
          </div>
        )}

        {sentimentData && (
          <div
            style={{
              border: "1px solid #ddd",
              borderRadius: "12px",
              padding: "2rem",
              backgroundColor: "white",
            }}
          >
            <div style={{ textAlign: "center", marginBottom: "2rem" }}>
              <h3 style={{ color: "#333", marginBottom: "1rem" }}>
                {sentimentData.symbol} Market Sentiment
              </h3>
              <div
                style={{
                  fontSize: "3rem",
                  marginBottom: "1rem",
                }}
              >
                {getSentimentIcon(
                  sentimentData.sentiment_analysis.overall_sentiment
                )}
              </div>
              <div
                style={{
                  fontSize: "1.5rem",
                  fontWeight: "bold",
                  color: getSentimentColor(
                    sentimentData.sentiment_analysis.overall_sentiment
                  ),
                  marginBottom: "0.5rem",
                }}
              >
                {sentimentData.sentiment_analysis.overall_sentiment}
              </div>
              <div style={{ fontSize: "1.2rem", color: "#666" }}>
                Score: {sentimentData.sentiment_analysis.weighted_score}
              </div>
            </div>

            {/* Positive Reasons */}
            {sentimentData.sentiment_analysis.positive_reasons?.length > 0 && (
              <div style={{ marginBottom: "2rem" }}>
                <h4 style={{ color: "#28a745", marginBottom: "1rem" }}>
                  💡 Positive Market Signals
                </h4>
                <div style={{ display: "grid", gap: "1rem" }}>
                  {sentimentData.sentiment_analysis.positive_reasons.map(
                    (reason, index) => (
                      <div
                        key={index}
                        style={{
                          backgroundColor: "#d4edda",
                          border: "1px solid #c3e6cb",
                          borderRadius: "8px",
                          padding: "1.5rem",
                        }}
                      >
                        <div
                          style={{ marginBottom: "0.5rem", fontSize: "1.1rem" }}
                        >
                          "{reason.reason}"
                        </div>
                        {reason.keywords?.length > 0 && (
                          <div style={{ fontSize: "0.9rem", color: "#155724" }}>
                            <strong>Key Terms:</strong>{" "}
                            {reason.keywords.map((keyword, i) => (
                              <span
                                key={i}
                                style={{
                                  backgroundColor: "#c3e6cb",
                                  padding: "2px 8px",
                                  borderRadius: "12px",
                                  marginRight: "0.5rem",
                                  fontSize: "0.8rem",
                                }}
                              >
                                {keyword}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            {/* Negative Reasons */}
            {sentimentData.sentiment_analysis.negative_reasons?.length > 0 && (
              <div style={{ marginBottom: "2rem" }}>
                <h4 style={{ color: "#dc3545", marginBottom: "1rem" }}>
                  ⚠️ Negative Market Signals
                </h4>
                <div style={{ display: "grid", gap: "1rem" }}>
                  {sentimentData.sentiment_analysis.negative_reasons.map(
                    (reason, index) => (
                      <div
                        key={index}
                        style={{
                          backgroundColor: "#f8d7da",
                          border: "1px solid #f5c6cb",
                          borderRadius: "8px",
                          padding: "1.5rem",
                        }}
                      >
                        <div
                          style={{ marginBottom: "0.5rem", fontSize: "1.1rem" }}
                        >
                          "{reason.reason}"
                        </div>
                        {reason.keywords?.length > 0 && (
                          <div style={{ fontSize: "0.9rem", color: "#721c24" }}>
                            <strong>Key Terms:</strong>{" "}
                            {reason.keywords.map((keyword, i) => (
                              <span
                                key={i}
                                style={{
                                  backgroundColor: "#f5c6cb",
                                  padding: "2px 8px",
                                  borderRadius: "12px",
                                  marginRight: "0.5rem",
                                  fontSize: "0.8rem",
                                }}
                              >
                                {keyword}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            <div
              style={{
                backgroundColor: "#e9ecef",
                padding: "1rem",
                borderRadius: "8px",
                fontSize: "0.9rem",
                color: "#6c757d",
              }}
            >
              <div>
                <strong>Data Source:</strong> {sentimentData.data_source}
              </div>
              <div>
                <strong>AI Model:</strong> {sentimentData.model}
              </div>
              <div>
                <strong>Analysis Time:</strong>{" "}
                {new Date(sentimentData.timestamp).toLocaleString()}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Custom Text Analysis Section */}
      <div
        style={{
          backgroundColor: "#f8f9fa",
          border: "1px solid #e0e0e0",
          borderRadius: "12px",
          padding: "2rem",
        }}
      >
        <h2 style={{ marginBottom: "1.5rem", color: "#333" }}>
          🧠 Custom Text Sentiment Analysis
        </h2>
        <p style={{ marginBottom: "1.5rem", color: "#666" }}>
          Analyze any financial text or news using our FinBERT AI model
        </p>

        <div style={{ marginBottom: "1rem" }}>
          <textarea
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder="Enter financial text, news, or Reddit post to analyze..."
            style={{
              width: "100%",
              minHeight: "120px",
              padding: "1rem",
              fontSize: "1rem",
              border: "2px solid #ddd",
              borderRadius: "8px",
              outline: "none",
              resize: "vertical",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#007bff")}
            onBlur={(e) => (e.target.style.borderColor = "#ddd")}
          />
        </div>

        <button
          onClick={handleCustomTextAnalysis}
          disabled={loading || !customText.trim()}
          style={{
            padding: "1rem 2rem",
            fontSize: "1rem",
            backgroundColor: loading ? "#6c757d" : "#28a745",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: loading ? "not-allowed" : "pointer",
            fontWeight: "bold",
          }}
        >
          {loading ? "Analyzing..." : "Analyze Text"}
        </button>

        {customAnalysis && (
          <div
            style={{
              marginTop: "2rem",
              border: "1px solid #ddd",
              borderRadius: "8px",
              padding: "1.5rem",
              backgroundColor: "white",
            }}
          >
            <h4 style={{ marginBottom: "1rem", color: "#333" }}>
              Analysis Results
            </h4>

            <div style={{ marginBottom: "1rem" }}>
              <strong>Sentiment:</strong>{" "}
              <span
                style={{
                  color: getSentimentColor(customAnalysis.sentiment.label),
                  fontWeight: "bold",
                  marginLeft: "0.5rem",
                }}
              >
                {customAnalysis.sentiment.label} (
                {(customAnalysis.sentiment.score * 100).toFixed(1)}%)
              </span>
            </div>

            {customAnalysis.keywords.positive_keywords?.length > 0 && (
              <div style={{ marginBottom: "1rem" }}>
                <strong style={{ color: "#28a745" }}>Positive Keywords:</strong>{" "}
                {customAnalysis.keywords.positive_keywords.map((keyword, i) => (
                  <span
                    key={i}
                    style={{
                      backgroundColor: "#d4edda",
                      color: "#155724",
                      padding: "2px 8px",
                      borderRadius: "12px",
                      marginRight: "0.5rem",
                      fontSize: "0.9rem",
                    }}
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            )}

            {customAnalysis.keywords.negative_keywords?.length > 0 && (
              <div style={{ marginBottom: "1rem" }}>
                <strong style={{ color: "#dc3545" }}>Negative Keywords:</strong>{" "}
                {customAnalysis.keywords.negative_keywords.map((keyword, i) => (
                  <span
                    key={i}
                    style={{
                      backgroundColor: "#f8d7da",
                      color: "#721c24",
                      padding: "2px 8px",
                      borderRadius: "12px",
                      marginRight: "0.5rem",
                      fontSize: "0.9rem",
                    }}
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            )}

            <div
              style={{ fontSize: "0.85rem", color: "#666", marginTop: "1rem" }}
            >
              Analysis Time:{" "}
              {new Date(customAnalysis.timestamp).toLocaleString()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SentimentAnalysisPage;
