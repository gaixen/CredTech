import React, { useState } from 'react';
import { FiPlus, FiMinus, FiEdit, FiTrash2, FiTrendingUp, FiTrendingDown, FiDollarSign, FiPercent } from 'react-icons/fi';
import Link from 'next/link';

const PositionCard = ({ position, onEdit, onRemove }) => (
  <div className="position-card">
    <div className="position-header">
      <div className="position-info">
        <h4>{position.symbol}</h4>
        <span className="position-name">{position.name}</span>
      </div>
      <div className="position-actions">
        <button onClick={() => onEdit(position)} className="action-btn-small">
          <FiEdit />
        </button>
        <button onClick={() => onRemove(position)} className="action-btn-small danger">
          <FiTrash2 />
        </button>
      </div>
    </div>
    
    <div className="position-metrics">
      <div className="metric-row">
        <span>Notional:</span>
        <span className="metric-value">${position.notional.toLocaleString()}</span>
      </div>
      <div className="metric-row">
        <span>Current Spread:</span>
        <span className="metric-value">{position.currentSpread} bps</span>
      </div>
      <div className="metric-row">
        <span>P&L:</span>
        <span className={`metric-value ${position.pnl >= 0 ? 'positive' : 'negative'}`}>
          {position.pnl >= 0 ? '+' : ''}${position.pnl.toLocaleString()}
        </span>
      </div>
      <div className="metric-row">
        <span>Risk Score:</span>
        <span className={`risk-badge ${position.riskLevel}`}>
          {position.riskScore}/10
        </span>
      </div>
    </div>
  </div>
);

const PortfolioSummary = ({ data }) => (
  <div className="portfolio-summary">
    <h2>Portfolio Overview</h2>
    <div className="summary-metrics">
      <div className="summary-metric">
        <FiDollarSign className="summary-icon" />
        <div>
          <span className="summary-label">Total Value</span>
          <span className="summary-value">${data.totalValue.toLocaleString()}</span>
        </div>
      </div>
      <div className="summary-metric">
        <FiPercent className="summary-icon" />
        <div>
          <span className="summary-label">Total P&L</span>
          <span className={`summary-value ${data.totalPnl >= 0 ? 'positive' : 'negative'}`}>
            {data.totalPnl >= 0 ? '+' : ''}${data.totalPnl.toLocaleString()}
          </span>
        </div>
      </div>
      <div className="summary-metric">
        <FiTrendingUp className="summary-icon" />
        <div>
          <span className="summary-label">Positions</span>
          <span className="summary-value">{data.totalPositions}</span>
        </div>
      </div>
      <div className="summary-metric">
        <FiTrendingDown className="summary-icon" />
        <div>
          <span className="summary-label">Avg Risk Score</span>
          <span className="summary-value">{data.avgRiskScore.toFixed(1)}/10</span>
        </div>
      </div>
    </div>
  </div>
);

const AddPositionModal = ({ isOpen, onClose, onAdd }) => {
  const [formData, setFormData] = useState({
    symbol: '',
    name: '',
    notional: '',
    spread: '',
    direction: 'long'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd({
      ...formData,
      notional: parseInt(formData.notional),
      currentSpread: parseInt(formData.spread),
      pnl: 0,
      riskScore: Math.floor(Math.random() * 10) + 1,
      riskLevel: 'medium'
    });
    setFormData({ symbol: '', name: '', notional: '', spread: '', direction: 'long' });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>Add New Position</h3>
          <button onClick={onClose} className="close-btn">×</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Symbol</label>
            <input
              type="text"
              value={formData.symbol}
              onChange={(e) => setFormData({...formData, symbol: e.target.value})}
              placeholder="e.g., AAPL"
              required
            />
          </div>
          <div className="form-group">
            <label>Company Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="e.g., Apple Inc."
              required
            />
          </div>
          <div className="form-group">
            <label>Notional Amount ($)</label>
            <input
              type="number"
              value={formData.notional}
              onChange={(e) => setFormData({...formData, notional: e.target.value})}
              placeholder="1000000"
              required
            />
          </div>
          <div className="form-group">
            <label>CDS Spread (bps)</label>
            <input
              type="number"
              value={formData.spread}
              onChange={(e) => setFormData({...formData, spread: e.target.value})}
              placeholder="250"
              required
            />
          </div>
          <div className="form-group">
            <label>Direction</label>
            <select
              value={formData.direction}
              onChange={(e) => setFormData({...formData, direction: e.target.value})}
            >
              <option value="long">Long (Buy Protection)</option>
              <option value="short">Short (Sell Protection)</option>
            </select>
          </div>
          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn secondary">Cancel</button>
            <button type="submit" className="btn primary">Add Position</button>
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
      symbol: 'AAPL',
      name: 'Apple Inc.',
      notional: 5000000,
      currentSpread: 65,
      pnl: 125000,
      riskScore: 3,
      riskLevel: 'low'
    },
    {
      symbol: 'TSLA',
      name: 'Tesla Inc.',
      notional: 2000000,
      currentSpread: 180,
      pnl: -45000,
      riskScore: 7,
      riskLevel: 'medium'
    },
    {
      symbol: 'META',
      name: 'Meta Platforms',
      notional: 3000000,
      currentSpread: 95,
      pnl: 78000,
      riskScore: 4,
      riskLevel: 'low'
    },
    {
      symbol: 'NFLX',
      name: 'Netflix Inc.',
      notional: 1500000,
      currentSpread: 220,
      pnl: -32000,
      riskScore: 8,
      riskLevel: 'high'
    }
  ]);

  const portfolioData = {
    totalValue: positions.reduce((sum, pos) => sum + pos.notional, 0),
    totalPnl: positions.reduce((sum, pos) => sum + pos.pnl, 0),
    totalPositions: positions.length,
    avgRiskScore: positions.reduce((sum, pos) => sum + pos.riskScore, 0) / positions.length
  };

  const handleAddPosition = (newPosition) => {
    setPositions([...positions, newPosition]);
  };

  const handleEditPosition = (position) => {
    console.log('Edit position:', position);
  };

  const handleRemovePosition = (positionToRemove) => {
    setPositions(positions.filter(pos => pos.symbol !== positionToRemove.symbol));
  };

  return (
    <div className="portfolio-page">
      <div className="portfolio-header">
        <div>
          <h1>Portfolio Management</h1>
          <p>Manage your credit default swap positions</p>
        </div>
        <div className="header-actions">
          <button 
            onClick={() => setShowAddModal(true)}
            className="btn primary"
          >
            <FiPlus /> Add Position
          </button>
          <Link href="/" className="back-link">
            ← Back to Dashboard
          </Link>
        </div>
      </div>

      <PortfolioSummary data={portfolioData} />

      <div className="portfolio-content">
        <div className="positions-section">
          <div className="section-header">
            <h2>Active Positions</h2>
            <div className="section-controls">
              <select className="sort-select">
                <option value="symbol">Sort by Symbol</option>
                <option value="risk">Sort by Risk</option>
                <option value="pnl">Sort by P&L</option>
                <option value="notional">Sort by Size</option>
              </select>
            </div>
          </div>
          
          <div className="positions-grid">
            {positions.map((position, idx) => (
              <PositionCard
                key={idx}
                position={position}
                onEdit={handleEditPosition}
                onRemove={handleRemovePosition}
              />
            ))}
          </div>
        </div>

        <div className="portfolio-analytics">
          <div className="analytics-card">
            <h3>Risk Concentration</h3>
            <div className="concentration-chart">
              <div className="concentration-item">
                <span>Technology</span>
                <div className="concentration-bar">
                  <div className="bar-fill" style={{width: '45%'}}></div>
                </div>
                <span>45%</span>
              </div>
              <div className="concentration-item">
                <span>Consumer Discretionary</span>
                <div className="concentration-bar">
                  <div className="bar-fill" style={{width: '30%'}}></div>
                </div>
                <span>30%</span>
              </div>
              <div className="concentration-item">
                <span>Communication</span>
                <div className="concentration-bar">
                  <div className="bar-fill" style={{width: '25%'}}></div>
                </div>
                <span>25%</span>
              </div>
            </div>
          </div>

          <div className="analytics-card">
            <h3>Performance Metrics</h3>
            <div className="performance-metrics">
              <div className="metric-item">
                <span>Sharpe Ratio</span>
                <span className="metric-value">1.34</span>
              </div>
              <div className="metric-item">
                <span>Max Drawdown</span>
                <span className="metric-value">-8.2%</span>
              </div>
              <div className="metric-item">
                <span>Win Rate</span>
                <span className="metric-value">68%</span>
              </div>
              <div className="metric-item">
                <span>Avg Holding Period</span>
                <span className="metric-value">45 days</span>
              </div>
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
