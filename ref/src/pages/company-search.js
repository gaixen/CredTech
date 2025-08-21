import React, { useState, useEffect } from 'react';
import { FiSearch, FiTrendingUp, FiTrendingDown, FiBarChart3, FiTarget, FiShield } from 'react-icons/fi';
import Link from 'next/link';

const CompanyCard = ({ company, onSelect }) => (
  <div className="company-card" onClick={() => onSelect(company)}>
    <div className="company-header">
      <div className="company-basic">
        <h3>{company.symbol}</h3>
        <span className="company-name">{company.name}</span>
      </div>
      <div className={`risk-indicator ${company.riskLevel}`}>
        {company.riskLevel.toUpperCase()}
      </div>
    </div>
    
    <div className="company-metrics">
      <div className="metric-grid">
        <div className="metric-item">
          <span className="metric-label">CDS Spread</span>
          <span className="metric-value">{company.cdsSpread} bps</span>
        </div>
        <div className="metric-item">
          <span className="metric-label">Price</span>
          <span className="metric-value">${company.price}</span>
        </div>
        <div className="metric-item">
          <span className="metric-label">Market Cap</span>
          <span className="metric-value">${company.marketCap}</span>
        </div>
        <div className="metric-item">
          <span className="metric-label">Sector</span>
          <span className="metric-value">{company.sector}</span>
        </div>
      </div>
    </div>
    
    <div className="company-indicators">
      <div className={`indicator ${company.priceChange >= 0 ? 'positive' : 'negative'}`}>
        {company.priceChange >= 0 ? <FiTrendingUp /> : <FiTrendingDown />}
        {Math.abs(company.priceChange)}%
      </div>
      <div className="cds-change">
        CDS: {company.cdsChange > 0 ? '+' : ''}{company.cdsChange} bps
      </div>
    </div>
  </div>
);

const CompanyDetail = ({ company, onBack }) => (
  <div className="company-detail">
    <div className="detail-header">
      <button onClick={onBack} className="back-btn">← Back to Search</button>
      <div className="detail-title">
        <h1>{company.symbol}</h1>
        <span className="detail-subtitle">{company.name}</span>
      </div>
    </div>

    <div className="detail-content">
      <div className="detail-metrics">
        <div className="metric-card">
          <FiTarget className="metric-icon" />
          <div>
            <span className="metric-title">CDS Spread</span>
            <span className="metric-main">{company.cdsSpread} bps</span>
            <span className="metric-change">
              {company.cdsChange > 0 ? '+' : ''}{company.cdsChange} bps (1D)
            </span>
          </div>
        </div>
        
        <div className="metric-card">
          <FiBarChart3 className="metric-icon" />
          <div>
            <span className="metric-title">Default Probability</span>
            <span className="metric-main">{company.defaultProb}%</span>
            <span className="metric-change">1-Year implied</span>
          </div>
        </div>
        
        <div className="metric-card">
          <FiShield className="metric-icon" />
          <div>
            <span className="metric-title">Credit Rating</span>
            <span className="metric-main">{company.rating}</span>
            <span className="metric-change">{company.ratingAgency}</span>
          </div>
        </div>
      </div>

      <div className="detail-analysis">
        <div className="analysis-section">
          <h3>Risk Analysis</h3>
          <div className="risk-factors">
            <div className="risk-factor">
              <span className="factor-name">Leverage Ratio</span>
              <div className="factor-bar">
                <div className="bar-fill" style={{width: `${company.leverage}%`}}></div>
              </div>
              <span className="factor-value">{company.leverage}%</span>
            </div>
            <div className="risk-factor">
              <span className="factor-name">Liquidity</span>
              <div className="factor-bar">
                <div className="bar-fill" style={{width: `${company.liquidity}%`}}></div>
              </div>
              <span className="factor-value">{company.liquidity}%</span>
            </div>
            <div className="risk-factor">
              <span className="factor-name">Profitability</span>
              <div className="factor-bar">
                <div className="bar-fill" style={{width: `${company.profitability}%`}}></div>
              </div>
              <span className="factor-value">{company.profitability}%</span>
            </div>
          </div>
        </div>

        <div className="analysis-section">
          <h3>Key Financials</h3>
          <div className="financials-grid">
            <div className="financial-item">
              <span>Revenue (TTM)</span>
              <span>${company.revenue}B</span>
            </div>
            <div className="financial-item">
              <span>Net Income</span>
              <span>${company.netIncome}B</span>
            </div>
            <div className="financial-item">
              <span>Total Debt</span>
              <span>${company.totalDebt}B</span>
            </div>
            <div className="financial-item">
              <span>Cash & Equivalents</span>
              <span>${company.cash}B</span>
            </div>
            <div className="financial-item">
              <span>ROE</span>
              <span>{company.roe}%</span>
            </div>
            <div className="financial-item">
              <span>ROA</span>
              <span>{company.roa}%</span>
            </div>
          </div>
        </div>

        <div className="analysis-section">
          <h3>Recent News Impact</h3>
          <div className="news-sentiment">
            <div className="sentiment-item positive">
              <span>Positive News</span>
              <span>+12 articles</span>
            </div>
            <div className="sentiment-item neutral">
              <span>Neutral News</span>
              <span>8 articles</span>
            </div>
            <div className="sentiment-item negative">
              <span>Negative News</span>
              <span>-3 articles</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const FilterBar = ({ filters, onFilterChange }) => (
  <div className="filter-bar">
    <div className="filter-group">
      <label>Sector:</label>
      <select value={filters.sector} onChange={(e) => onFilterChange('sector', e.target.value)}>
        <option value="">All Sectors</option>
        <option value="technology">Technology</option>
        <option value="financials">Financials</option>
        <option value="healthcare">Healthcare</option>
        <option value="consumer">Consumer Discretionary</option>
        <option value="energy">Energy</option>
      </select>
    </div>
    
    <div className="filter-group">
      <label>Risk Level:</label>
      <select value={filters.risk} onChange={(e) => onFilterChange('risk', e.target.value)}>
        <option value="">All Risk Levels</option>
        <option value="low">Low Risk</option>
        <option value="medium">Medium Risk</option>
        <option value="high">High Risk</option>
      </select>
    </div>
    
    <div className="filter-group">
      <label>Market Cap:</label>
      <select value={filters.marketCap} onChange={(e) => onFilterChange('marketCap', e.target.value)}>
        <option value="">All Sizes</option>
        <option value="large">Large Cap (&gt;$10B)</option>
        <option value="mid">Mid Cap ($2B-$10B)</option>
        <option value="small">Small Cap (&lt;$2B)</option>
      </select>
    </div>
  </div>
);

const CompanySearch = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [filters, setFilters] = useState({
    sector: '',
    risk: '',
    marketCap: ''
  });

  const sampleCompanies = [
    {
      symbol: 'AAPL',
      name: 'Apple Inc.',
      cdsSpread: 65,
      cdsChange: -2,
      price: '175.43',
      priceChange: 1.2,
      marketCap: '2.8T',
      sector: 'Technology',
      riskLevel: 'low',
      defaultProb: 0.8,
      rating: 'AA+',
      ratingAgency: 'S&P',
      leverage: 25,
      liquidity: 85,
      profitability: 78,
      revenue: 394.3,
      netIncome: 99.8,
      totalDebt: 111.1,
      cash: 166.0,
      roe: 26.4,
      roa: 22.0
    },
    {
      symbol: 'TSLA',
      name: 'Tesla Inc.',
      cdsSpread: 180,
      cdsChange: 15,
      price: '248.50',
      priceChange: -2.3,
      marketCap: '790B',
      sector: 'Consumer Discretionary',
      riskLevel: 'medium',
      defaultProb: 2.1,
      rating: 'BB+',
      ratingAgency: 'Moody\'s',
      leverage: 45,
      liquidity: 68,
      profitability: 65,
      revenue: 96.8,
      netIncome: 15.0,
      totalDebt: 29.4,
      cash: 24.0,
      roe: 19.3,
      roa: 7.5
    },
    {
      symbol: 'NFLX',
      name: 'Netflix Inc.',
      cdsSpread: 220,
      cdsChange: 8,
      price: '445.20',
      priceChange: 0.8,
      marketCap: '198B',
      sector: 'Communication Services',
      riskLevel: 'high',
      defaultProb: 3.2,
      rating: 'BB',
      ratingAgency: 'Fitch',
      leverage: 55,
      liquidity: 72,
      profitability: 45,
      revenue: 31.6,
      netIncome: 4.5,
      totalDebt: 14.5,
      cash: 6.2,
      roe: 12.8,
      roa: 6.1
    }
  ];

  const [companies, setCompanies] = useState(sampleCompanies);

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({ ...prev, [filterType]: value }));
  };

  const filteredCompanies = companies.filter(company => {
    const matchesSearch = company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         company.symbol.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSector = !filters.sector || company.sector.toLowerCase().includes(filters.sector.toLowerCase());
    const matchesRisk = !filters.risk || company.riskLevel === filters.risk;
    
    return matchesSearch && matchesSector && matchesRisk;
  });

  if (selectedCompany) {
    return <CompanyDetail company={selectedCompany} onBack={() => setSelectedCompany(null)} />;
  }

  return (
    <div className="company-search">
      <div className="search-header">
        <div>
          <h1>Company Analysis</h1>
          <p>Search and analyze credit risk for individual companies</p>
        </div>
        <Link href="/" className="back-link">
          ← Back to Dashboard
        </Link>
      </div>

      <div className="search-controls">
        <div className="search-bar">
          <FiSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search by company name or ticker symbol..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <FilterBar filters={filters} onFilterChange={handleFilterChange} />
      </div>

      <div className="search-results">
        <div className="results-header">
          <span>{filteredCompanies.length} companies found</span>
        </div>
        
        <div className="companies-grid">
          {filteredCompanies.map((company, idx) => (
            <CompanyCard
              key={idx}
              company={company}
              onSelect={setSelectedCompany}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default CompanySearch;
