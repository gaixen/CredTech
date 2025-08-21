// News API utilities for CredTech
// This file contains functions to fetch real-time financial news

/**
 * Fetch news from NewsAPI.org
 * Requires API key from https://newsapi.org/
 */
export const fetchNewsAPI = async (category = "business", country = "us") => {
  const API_KEY = process.env.NEXT_PUBLIC_NEWS_API_KEY;
  if (!API_KEY) {
    throw new Error("News API key not configured");
  }

  const url = `https://newsapi.org/v2/top-headlines?country=${country}&category=${category}&apiKey=${API_KEY}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`News API error: ${response.status}`);
    }

    const data = await response.json();
    return data.articles.map((article) => ({
      id: article.url,
      headline: article.title,
      summary: article.description,
      source: article.source.name,
      timestamp: new Date(article.publishedAt).toLocaleString(),
      category: category,
      severity: "medium", // You can implement logic to determine severity
      url: article.url,
      imageUrl: article.urlToImage,
    }));
  } catch (error) {
    console.error("Failed to fetch news:", error);
    throw error;
  }
};

/**
 * Fetch financial news from Alpha Vantage
 * Requires API key from https://www.alphavantage.co/
 */
export const fetchAlphaVantageNews = async (tickers = "AAPL,GOOGL,MSFT") => {
  const API_KEY = process.env.NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY;
  if (!API_KEY) {
    throw new Error("Alpha Vantage API key not configured");
  }

  const url = `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=${tickers}&apikey=${API_KEY}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Alpha Vantage API error: ${response.status}`);
    }

    const data = await response.json();
    return (
      data.feed?.map((article) => ({
        id: article.url,
        headline: article.title,
        summary: article.summary,
        source: article.source,
        timestamp: new Date(article.time_published).toLocaleString(),
        category: "Market News",
        severity:
          article.overall_sentiment_score > 0.1
            ? "low"
            : article.overall_sentiment_score < -0.1
            ? "high"
            : "medium",
        url: article.url,
        sentiment: article.overall_sentiment_label,
      })) || []
    );
  } catch (error) {
    console.error("Failed to fetch Alpha Vantage news:", error);
    throw error;
  }
};

/**
 * Fetch news from your backend API
 */
export const fetchBackendNews = async (category = "general") => {
  try {
    const response = await fetch(`/api/news?category=${category}`);
    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to fetch backend news:", error);
    throw error;
  }
};

/**
 * Determine news severity based on keywords
 */
export const determineSeverity = (headline, summary) => {
  const highSeverityKeywords = [
    "crisis",
    "crash",
    "default",
    "bankruptcy",
    "emergency",
    "warning",
    "downgrade",
    "risk",
    "threat",
    "concern",
    "volatility",
    "decline",
  ];

  const lowSeverityKeywords = [
    "growth",
    "increase",
    "improvement",
    "upgrade",
    "positive",
    "strong",
    "gain",
    "rise",
    "expansion",
    "opportunity",
    "success",
  ];

  const text = `${headline} ${summary}`.toLowerCase();

  const hasHighSeverity = highSeverityKeywords.some((keyword) =>
    text.includes(keyword)
  );
  const hasLowSeverity = lowSeverityKeywords.some((keyword) =>
    text.includes(keyword)
  );

  if (hasHighSeverity && !hasLowSeverity) return "high";
  if (hasLowSeverity && !hasHighSeverity) return "low";
  return "medium";
};

/**
 * Filter news by financial relevance
 */
export const filterFinancialNews = (articles) => {
  const financialKeywords = [
    "bank",
    "credit",
    "loan",
    "bond",
    "stock",
    "market",
    "economy",
    "fed",
    "interest",
    "rate",
    "inflation",
    "gdp",
    "earnings",
    "revenue",
    "profit",
    "debt",
    "equity",
    "financial",
    "trading",
  ];

  return articles.filter((article) => {
    const text = `${article.headline} ${article.summary}`.toLowerCase();
    return financialKeywords.some((keyword) => text.includes(keyword));
  });
};

// Configuration for different news sources
export const newsConfig = {
  categories: {
    general: {
      newsapi: "business",
      alphavantage: "AAPL,GOOGL,MSFT,TSLA,AMZN",
      backend: "general",
    },
    credit: {
      newsapi: "business",
      alphavantage: "JPM,BAC,WFC,C,GS",
      backend: "credit",
    },
    markets: {
      newsapi: "business",
      alphavantage: "SPY,QQQ,DIA,VIX",
      backend: "markets",
    },
  },
};

export default {
  fetchNewsAPI,
  fetchAlphaVantageNews,
  fetchBackendNews,
  determineSeverity,
  filterFinancialNews,
  newsConfig,
};
