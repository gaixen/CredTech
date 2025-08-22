const BASE_URL = "http://localhost:8000";

class CredTechAPI {
  async request(endpoint, options = {}) {
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("API request failed:", error);
      throw error;
    }
  }

  // Dashboard APIs
  async getDashboardSummary() {
    return this.request("/api/dashboard/summary");
  }

  // Company APIs
  async getCompanies(filters = {}) {
    const params = new URLSearchParams(filters);
    return this.request(`/api/companies?${params}`);
  }

  async getCompanyAnalysis(symbol) {
    return this.request(`/api/companies/${symbol}/analysis`);
  }

  async ingestCompanyData(symbol) {
    return this.request(`/api/companies/${symbol}/ingest`, {
      method: "POST",
    });
  }

  // NEW: Candlestick data for real-time charts
  async getCandlestickData(symbol, timeframe = "1Y") {
    return this.request(
      `/api/companies/${symbol}/candlestick?timeframe=${timeframe}`
    );
  }

  // NEW: Model training results
  async getModelResults() {
    return this.request("/api/models/results");
  }

  // NEW: Feature importance data
  async getFeatureImportance() {
    return this.request("/api/models/feature-importance");
  }

  // NEW: Run complete pipeline
  async runPipeline() {
    return this.request("/api/pipeline/run", {
      method: "POST",
    });
  }

  // NEW: Academic model training
  async trainAcademicModels() {
    return this.request("/api/models/train-academic", {
      method: "POST",
    });
  }

  // NEW: Real-time risk assessment
  async getRiskAssessment(symbol) {
    return this.request(`/api/companies/${symbol}/risk-assessment`);
  }

  // NEW: Portfolio analysis
  async getPortfolioAnalysis(symbols) {
    return this.request("/api/portfolio/analysis", {
      method: "POST",
      body: JSON.stringify({ symbols }),
    });
  }

  // NEW: Historical fundamentals
  async getHistoricalFundamentals(symbol, years = 5) {
    return this.request(`/api/companies/${symbol}/historical?years=${years}`);
  }

  // NEW: Model explanations
  async getModelExplanations(symbol) {
    return this.request(`/api/models/explain/${symbol}`);
  }

  // NEW: Real-time updates
  async getRealtimeUpdates() {
    return this.request("/api/realtime/updates");
  }

  // NEW: System health
  async getSystemHealth() {
    return this.request("/api/system/health");
  }

  // Test connection to backend API
  async testConnection() {
    try {
      const response = await this.request("/");
      return response;
    } catch (error) {
      return { status: "error", message: error.message };
    }
  }

  // Portfolio APIs
  async getPortfolioOverview() {
    return this.request("/api/portfolio/overview");
  }

  async getRiskAnalysis() {
    return this.request("/api/risk/analysis");
  }

  // Batch operations
  async ingestSampleData() {
    const symbols = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA"];
    const results = [];

    for (const symbol of symbols) {
      try {
        const result = await this.ingestCompanyData(symbol);
        results.push({ symbol, success: true, result });
      } catch (error) {
        results.push({ symbol, success: false, error: error.message });
      }
    }

    return results;
  }

  // Sentiment Analysis APIs
  async getCompanySentiment(symbol) {
    return this.request(`/api/sentiment/${symbol}`);
  }

  async analyzeSentiment(text) {
    return this.request("/api/sentiment/analyze", {
      method: "POST",
      body: JSON.stringify({ text }),
    });
  }

  async getSentimentDashboard() {
    return this.request("/api/sentiment/dashboard");
  }

  // News APIs
  async getLatestNews(filters = {}) {
    const params = new URLSearchParams(filters);
    return this.request(`/api/news/latest?${params}`);
  }

  async getCompanyNews(symbol, limit = 20) {
    return this.request(`/api/news/company/${symbol}?limit=${limit}`);
  }

  async getNewsByCategory(category, limit = 30) {
    return this.request(`/api/news/category/${category}?limit=${limit}`);
  }

  async searchNews(query, limit = 25) {
    const params = new URLSearchParams({ q: query, limit });
    return this.request(`/api/news/search?${params}`);
  }

  async getTrendingSymbols() {
    return this.request("/api/news/trending");
  }

  async getNewsDashboard() {
    return this.request("/api/news/dashboard");
  }
}

export const credTechAPI = new CredTechAPI();
export default credTechAPI;
