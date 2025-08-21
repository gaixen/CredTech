import React, { useState, useEffect } from "react";
import Link from "next/link";

const CompanyCard = ({ company, onSelect }) => {
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

  const basicInfoStyle = {
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

  const getRiskIndicatorStyle = (level) => {
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

  const metricsGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "0.75rem",
    marginBottom: "1rem",
  };

  const metricItemStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  };

  const metricLabelStyle = {
    color: "var(--text-color)",
    opacity: 0.7,
    fontSize: "0.8rem",
  };

  const metricValueStyle = {
    color: "var(--text-color)",
    fontWeight: "600",
    fontSize: "0.9rem",
  };

  const indicatorsStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: "1rem",
    borderTop: "1px solid var(--border-color)",
  };

  const priceChangeStyle = {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    fontSize: "0.9rem",
    fontWeight: "600",
    color: company.priceChange >= 0 ? "#0ada61" : "#ff4444",
  };

  const cdsChangeStyle = {
    fontSize: "0.85rem",
    color: "var(--text-color)",
    opacity: 0.8,
  };

  return (
    <div
      style={cardStyle}
      onClick={() => onSelect(company)}
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
        <div style={basicInfoStyle}>
          <h3 style={symbolStyle}>{company.symbol}</h3>
          <span style={nameStyle}>{company.name}</span>
        </div>
        <div style={getRiskIndicatorStyle(company.riskLevel)}>
          {company.riskLevel.toUpperCase()}
        </div>
      </div>

      <div style={metricsGridStyle}>
        <div style={metricItemStyle}>
          <span style={metricLabelStyle}>CDS Spread</span>
          <span style={metricValueStyle}>{company.cdsSpread} bps</span>
        </div>
        <div style={metricItemStyle}>
          <span style={metricLabelStyle}>Price</span>
          <span style={metricValueStyle}>${company.price}</span>
        </div>
        <div style={metricItemStyle}>
          <span style={metricLabelStyle}>Market Cap</span>
          <span style={metricValueStyle}>${company.marketCap}</span>
        </div>
        <div style={metricItemStyle}>
          <span style={metricLabelStyle}>Sector</span>
          <span style={metricValueStyle}>{company.sector}</span>
        </div>
      </div>

      <div style={indicatorsStyle}>
        <div style={priceChangeStyle}>
          <span>{company.priceChange >= 0 ? "📈" : "📉"}</span>
          {Math.abs(company.priceChange)}%
        </div>
        <div style={cdsChangeStyle}>
          CDS: {company.cdsChange > 0 ? "+" : ""}
          {company.cdsChange} bps
        </div>
      </div>
    </div>
  );
};

const CompanyDetail = ({ company, onBack }) => {
  const containerStyle = {
    maxWidth: "1200px",
    margin: "0 auto",
  };

  const headerStyle = {
    display: "flex",
    alignItems: "center",
    gap: "2rem",
    marginBottom: "2rem",
  };

  const backButtonStyle = {
    padding: "0.75rem 1.5rem",
    backgroundColor: "var(--secondary-color)",
    border: "1px solid var(--border-color)",
    borderRadius: "8px",
    color: "var(--text-color)",
    cursor: "pointer",
    fontSize: "1rem",
    transition: "all 0.3s ease",
  };

  const titleSectionStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  };

  const titleStyle = {
    fontSize: "2.5rem",
    fontWeight: "700",
    color: "var(--text-color)",
    margin: 0,
  };

  const subtitleStyle = {
    color: "var(--text-color)",
    opacity: 0.8,
    fontSize: "1.2rem",
  };

  const metricsGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "1.5rem",
    marginBottom: "2rem",
  };

  const metricCardStyle = {
    backgroundColor: "var(--secondary-color)",
    padding: "1.5rem",
    borderRadius: "12px",
    border: "1px solid var(--border-color)",
    display: "flex",
    alignItems: "center",
    gap: "1rem",
  };

  const metricIconStyle = {
    fontSize: "2rem",
    color: "var(--primary-color)",
  };

  const metricContentStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  };

  const metricTitleStyle = {
    color: "var(--text-color)",
    opacity: 0.8,
    fontSize: "0.9rem",
  };

  const metricMainStyle = {
    fontSize: "1.5rem",
    fontWeight: "700",
    color: "var(--text-color)",
  };

  const metricChangeStyle = {
    fontSize: "0.85rem",
    color: "var(--text-color)",
    opacity: 0.7,
  };

  const analysisGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "1.5rem",
  };

  const analysisSectionStyle = {
    backgroundColor: "var(--secondary-color)",
    padding: "1.5rem",
    borderRadius: "12px",
    border: "1px solid var(--border-color)",
  };

  const sectionTitleStyle = {
    fontSize: "1.25rem",
    fontWeight: "600",
    color: "var(--text-color)",
    marginBottom: "1rem",
  };

  const riskFactorStyle = {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    marginBottom: "1rem",
  };

  const factorNameStyle = {
    color: "var(--text-color)",
    fontSize: "0.9rem",
    minWidth: "100px",
  };

  const factorBarStyle = {
    flex: 1,
    height: "8px",
    backgroundColor: "var(--border-color)",
    borderRadius: "4px",
    overflow: "hidden",
  };

  const factorValueStyle = {
    color: "var(--text-color)",
    fontSize: "0.9rem",
    fontWeight: "600",
    minWidth: "40px",
  };

  const financialsGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "0.75rem",
  };

  const financialItemStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0.75rem 0",
    borderBottom: "1px solid var(--border-color)",
  };

  const financialLabelStyle = {
    color: "var(--text-color)",
    opacity: 0.8,
    fontSize: "0.9rem",
  };

  const financialValueStyle = {
    color: "var(--text-color)",
    fontWeight: "600",
    fontSize: "0.9rem",
  };

  const sentimentGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "1rem",
  };

  const sentimentItemStyle = (type) => {
    const baseStyle = {
      padding: "1rem",
      borderRadius: "8px",
      textAlign: "center",
      border: "1px solid",
    };

    switch (type) {
      case "positive":
        return {
          ...baseStyle,
          backgroundColor: "#0ada6120",
          borderColor: "#0ada6140",
          color: "#0ada61",
        };
      case "neutral":
        return {
          ...baseStyle,
          backgroundColor: "#ffaa0020",
          borderColor: "#ffaa0040",
          color: "#ffaa00",
        };
      case "negative":
        return {
          ...baseStyle,
          backgroundColor: "#ff444420",
          borderColor: "#ff444440",
          color: "#ff4444",
        };
      default:
        return baseStyle;
    }
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <button
          onClick={onBack}
          style={backButtonStyle}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = "var(--primary-color)";
            e.target.style.borderColor = "var(--primary-color)";
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = "var(--secondary-color)";
            e.target.style.borderColor = "var(--border-color)";
          }}
        >
          ← Back to Search
        </button>
        <div style={titleSectionStyle}>
          <h1 style={titleStyle}>{company.symbol}</h1>
          <span style={subtitleStyle}>{company.name}</span>
        </div>
      </div>

      <div style={metricsGridStyle}>
        <div style={metricCardStyle}>
          <div style={metricIconStyle}>🎯</div>
          <div style={metricContentStyle}>
            <span style={metricTitleStyle}>CDS Spread</span>
            <span style={metricMainStyle}>{company.cdsSpread} bps</span>
            <span style={metricChangeStyle}>
              {company.cdsChange > 0 ? "+" : ""}
              {company.cdsChange} bps (1D)
            </span>
          </div>
        </div>

        <div style={metricCardStyle}>
          <div style={metricIconStyle}>📊</div>
          <div style={metricContentStyle}>
            <span style={metricTitleStyle}>Default Probability</span>
            <span style={metricMainStyle}>{company.defaultProb}%</span>
            <span style={metricChangeStyle}>1-Year implied</span>
          </div>
        </div>

        <div style={metricCardStyle}>
          <div style={metricIconStyle}>🛡️</div>
          <div style={metricContentStyle}>
            <span style={metricTitleStyle}>Credit Rating</span>
            <span style={metricMainStyle}>{company.rating}</span>
            <span style={metricChangeStyle}>{company.ratingAgency}</span>
          </div>
        </div>
      </div>

      <div style={analysisGridStyle}>
        <div style={analysisSectionStyle}>
          <h3 style={sectionTitleStyle}>Risk Analysis</h3>
          <div>
            <div style={riskFactorStyle}>
              <span style={factorNameStyle}>Leverage Ratio</span>
              <div style={factorBarStyle}>
                <div
                  style={{
                    width: `${company.leverage}%`,
                    height: "100%",
                    backgroundColor: "var(--primary-color)",
                    borderRadius: "4px",
                  }}
                ></div>
              </div>
              <span style={factorValueStyle}>{company.leverage}%</span>
            </div>
            <div style={riskFactorStyle}>
              <span style={factorNameStyle}>Liquidity</span>
              <div style={factorBarStyle}>
                <div
                  style={{
                    width: `${company.liquidity}%`,
                    height: "100%",
                    backgroundColor: "#0ada61",
                    borderRadius: "4px",
                  }}
                ></div>
              </div>
              <span style={factorValueStyle}>{company.liquidity}%</span>
            </div>
            <div style={riskFactorStyle}>
              <span style={factorNameStyle}>Profitability</span>
              <div style={factorBarStyle}>
                <div
                  style={{
                    width: `${company.profitability}%`,
                    height: "100%",
                    backgroundColor: "#ffaa00",
                    borderRadius: "4px",
                  }}
                ></div>
              </div>
              <span style={factorValueStyle}>{company.profitability}%</span>
            </div>
          </div>
        </div>

        <div style={analysisSectionStyle}>
          <h3 style={sectionTitleStyle}>Key Financials</h3>
          <div style={financialsGridStyle}>
            <div style={financialItemStyle}>
              <span style={financialLabelStyle}>Revenue (TTM)</span>
              <span style={financialValueStyle}>${company.revenue}B</span>
            </div>
            <div style={financialItemStyle}>
              <span style={financialLabelStyle}>Net Income</span>
              <span style={financialValueStyle}>${company.netIncome}B</span>
            </div>
            <div style={financialItemStyle}>
              <span style={financialLabelStyle}>Total Debt</span>
              <span style={financialValueStyle}>${company.totalDebt}B</span>
            </div>
            <div style={financialItemStyle}>
              <span style={financialLabelStyle}>Cash & Equivalents</span>
              <span style={financialValueStyle}>${company.cash}B</span>
            </div>
            <div style={financialItemStyle}>
              <span style={financialLabelStyle}>ROE</span>
              <span style={financialValueStyle}>{company.roe}%</span>
            </div>
            <div style={financialItemStyle}>
              <span style={financialLabelStyle}>ROA</span>
              <span style={financialValueStyle}>{company.roa}%</span>
            </div>
          </div>
        </div>

        <div style={analysisSectionStyle}>
          <h3 style={sectionTitleStyle}>Recent News Impact</h3>
          <div style={sentimentGridStyle}>
            <div style={sentimentItemStyle("positive")}>
              <div style={{ fontWeight: "600", marginBottom: "0.5rem" }}>
                Positive News
              </div>
              <div style={{ fontSize: "1.2rem", fontWeight: "700" }}>
                +12 articles
              </div>
            </div>
            <div style={sentimentItemStyle("neutral")}>
              <div style={{ fontWeight: "600", marginBottom: "0.5rem" }}>
                Neutral News
              </div>
              <div style={{ fontSize: "1.2rem", fontWeight: "700" }}>
                8 articles
              </div>
            </div>
            <div style={sentimentItemStyle("negative")}>
              <div style={{ fontWeight: "600", marginBottom: "0.5rem" }}>
                Negative News
              </div>
              <div style={{ fontSize: "1.2rem", fontWeight: "700" }}>
                -3 articles
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const FilterBar = ({ filters, onFilterChange }) => {
  const filterBarStyle = {
    display: "flex",
    gap: "1.5rem",
    padding: "1.5rem",
    backgroundColor: "var(--secondary-color)",
    borderRadius: "12px",
    border: "1px solid var(--border-color)",
    marginBottom: "1.5rem",
    flexWrap: "wrap",
  };

  const filterGroupStyle = {
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
    backgroundColor: "var(--background-color)",
    border: "1px solid var(--border-color)",
    borderRadius: "6px",
    color: "var(--text-color)",
    fontSize: "0.9rem",
    cursor: "pointer",
  };

  return (
    <div style={filterBarStyle}>
      <div style={filterGroupStyle}>
        <label style={labelStyle}>Sector:</label>
        <select
          value={filters.sector}
          onChange={(e) => onFilterChange("sector", e.target.value)}
          style={selectStyle}
        >
          <option value="">All Sectors</option>
          <option value="technology">Technology</option>
          <option value="financials">Financials</option>
          <option value="healthcare">Healthcare</option>
          <option value="consumer">Consumer Discretionary</option>
          <option value="energy">Energy</option>
        </select>
      </div>

      <div style={filterGroupStyle}>
        <label style={labelStyle}>Risk Level:</label>
        <select
          value={filters.risk}
          onChange={(e) => onFilterChange("risk", e.target.value)}
          style={selectStyle}
        >
          <option value="">All Risk Levels</option>
          <option value="low">Low Risk</option>
          <option value="medium">Medium Risk</option>
          <option value="high">High Risk</option>
        </select>
      </div>

      <div style={filterGroupStyle}>
        <label style={labelStyle}>Market Cap:</label>
        <select
          value={filters.marketCap}
          onChange={(e) => onFilterChange("marketCap", e.target.value)}
          style={selectStyle}
        >
          <option value="">All Sizes</option>
          <option value="large">Large Cap (&gt;$10B)</option>
          <option value="mid">Mid Cap ($2B-$10B)</option>
          <option value="small">Small Cap (&lt;$2B)</option>
        </select>
      </div>
    </div>
  );
};

const CompanySearch = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [filters, setFilters] = useState({
    sector: "",
    risk: "",
    marketCap: "",
  });

  const sampleCompanies = [
    {
      symbol: "AAPL",
      name: "Apple Inc.",
      cdsSpread: 65,
      cdsChange: -2,
      price: "175.43",
      priceChange: 1.2,
      marketCap: "2.8T",
      sector: "Technology",
      riskLevel: "low",
      defaultProb: 0.8,
      rating: "AA+",
      ratingAgency: "S&P",
      leverage: 25,
      liquidity: 85,
      profitability: 78,
      revenue: 394.3,
      netIncome: 99.8,
      totalDebt: 111.1,
      cash: 166.0,
      roe: 26.4,
      roa: 22.0,
    },
    {
      symbol: "TSLA",
      name: "Tesla Inc.",
      cdsSpread: 180,
      cdsChange: 15,
      price: "248.50",
      priceChange: -2.3,
      marketCap: "790B",
      sector: "Consumer Discretionary",
      riskLevel: "medium",
      defaultProb: 2.1,
      rating: "BB+",
      ratingAgency: "Moody's",
      leverage: 45,
      liquidity: 68,
      profitability: 65,
      revenue: 96.8,
      netIncome: 15.0,
      totalDebt: 29.4,
      cash: 24.0,
      roe: 19.3,
      roa: 7.5,
    },
    {
      symbol: "NFLX",
      name: "Netflix Inc.",
      cdsSpread: 220,
      cdsChange: 8,
      price: "445.20",
      priceChange: 0.8,
      marketCap: "198B",
      sector: "Communication Services",
      riskLevel: "high",
      defaultProb: 3.2,
      rating: "BB",
      ratingAgency: "Fitch",
      leverage: 55,
      liquidity: 72,
      profitability: 45,
      revenue: 31.6,
      netIncome: 4.5,
      totalDebt: 14.5,
      cash: 6.2,
      roe: 12.8,
      roa: 6.1,
    },
  ];

  const [companies, setCompanies] = useState(sampleCompanies);

  const handleFilterChange = (filterType, value) => {
    setFilters((prev) => ({ ...prev, [filterType]: value }));
  };

  const filteredCompanies = companies.filter((company) => {
    const matchesSearch =
      company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.symbol.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSector =
      !filters.sector ||
      company.sector.toLowerCase().includes(filters.sector.toLowerCase());
    const matchesRisk = !filters.risk || company.riskLevel === filters.risk;

    return matchesSearch && matchesSector && matchesRisk;
  });

  if (selectedCompany) {
    return (
      <CompanyDetail
        company={selectedCompany}
        onBack={() => setSelectedCompany(null)}
      />
    );
  }

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

  const searchBarStyle = {
    position: "relative",
    marginBottom: "1.5rem",
  };

  const searchIconStyle = {
    position: "absolute",
    left: "1rem",
    top: "50%",
    transform: "translateY(-50%)",
    color: "var(--text-color)",
    opacity: 0.5,
    fontSize: "1.2rem",
  };

  const searchInputStyle = {
    width: "100%",
    padding: "1rem 1rem 1rem 3rem",
    backgroundColor: "var(--secondary-color)",
    border: "1px solid var(--border-color)",
    borderRadius: "12px",
    color: "var(--text-color)",
    fontSize: "1rem",
    outline: "none",
  };

  const resultsHeaderStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1.5rem",
  };

  const resultsCountStyle = {
    color: "var(--text-color)",
    fontSize: "1rem",
    opacity: 0.8,
  };

  const companiesGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "1.5rem",
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div style={titleSectionStyle}>
          <h1 style={mainTitleStyle}>Company Analysis</h1>
          <p style={subtitleStyle}>
            Search and analyze credit risk for individual companies
          </p>
        </div>
        <Link href="/" style={backLinkStyle}>
          ← Back to Dashboard
        </Link>
      </div>

      <div style={searchBarStyle}>
        <div style={searchIconStyle}>🔍</div>
        <input
          type="text"
          placeholder="Search by company name or ticker symbol..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={searchInputStyle}
          onFocus={(e) => {
            e.target.style.borderColor = "var(--primary-color)";
            e.target.style.boxShadow = "0 0 0 3px rgba(10, 218, 97, 0.1)";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "var(--border-color)";
            e.target.style.boxShadow = "none";
          }}
        />
      </div>

      <FilterBar filters={filters} onFilterChange={handleFilterChange} />

      <div style={resultsHeaderStyle}>
        <span style={resultsCountStyle}>
          {filteredCompanies.length} companies found
        </span>
      </div>

      <div style={companiesGridStyle}>
        {filteredCompanies.map((company, idx) => (
          <CompanyCard
            key={idx}
            company={company}
            onSelect={setSelectedCompany}
          />
        ))}
      </div>
    </div>
  );
};

export default CompanySearch;
