import React, { useState, useEffect } from 'react';
import { FiTrendingUp, FiTrendingDown, FiBarChart, FiPieChart, FiActivity, FiTarget } from 'react-icons/fi';
import Link from 'next/link';

const ChartCard = ({ title, type, data, color = 'blue' }) => (
  <div className="chart-card">
    <div className="chart-header">
      <h3>{title}</h3>
      <div className={`chart-type ${type}`}>
        {type === 'line' ? <FiActivity /> : <FiBarChart />}
      </div>
    </div>
    <div className="chart-placeholder" style={{ borderColor: `var(--${color})` }}>
      <div className="chart-mock">
        <span>{type.toUpperCase()} CHART</span>
        <span className="chart-value">{data?.value || 'No Data'}</span>
      </div>
    </div>
  </div>
);

const RiskMatrix = () => (
  <div className="risk-matrix">
    <h3>Risk Assessment Matrix</h3>
    <div className="matrix-grid">
      <div className="matrix-header">
        <span></span>
        <span>Low Impact</span>
        <span>Medium Impact</span>
        <span>High Impact</span>
      </div>
      <div className="matrix-row">
        <span>High Probability</span>
        <div className="cell medium">3</div>
        <div className="cell high">8</div>
        <div className="cell critical">12</div>
      </div>
      <div className="matrix-row">
        <span>Medium Probability</span>
        <div className="cell low">2</div>
        <div className="cell medium">5</div>
        <div className="cell high">7</div>
      </div>
      <div className="matrix-row">
        <span>Low Probability</span>
        <div className="cell low">1</div>
        <div className="cell low">2</div>
        <div className="cell medium">4</div>
      </div>
    </div>
  </div>
);

const AnalyticsSummary = ({ title, value, trend, icon: Icon }) => (
  <div className="analytics-summary">
    <div className="summary-icon">
      <Icon />
    </div>
    <div className="summary-content">
      <h4>{title}</h4>
      <div className="summary-value">{value}</div>
      <div className={`summary-trend ${trend >= 0 ? 'positive' : 'negative'}`}>
        {trend >= 0 ? <FiTrendingUp /> : <FiTrendingDown />}
        {Math.abs(trend)}% vs last month
      </div>
    </div>
  </div>
);

const Analytics = () => {
  const [timeRange, setTimeRange] = useState('30d');
  const [selectedMetric, setSelectedMetric] = useState('cds_spreads');

  const summaryData = [
    { title: 'Avg CDS Spread', value: '245 bps', trend: -8.2, icon: FiTarget },
    { title: 'Portfolio VaR', value: '$1.2M', trend: 12.5, icon: FiBarChart },
    { title: 'Default Probability', value: '2.8%', trend: -15.3, icon: FiPieChart },
    { title: 'Risk-Adjusted Return', value: '18.4%', trend: 5.7, icon: FiTrendingUp }
  ];

  const chartData = [
    { title: 'CDS Spread Trends', type: 'line', data: { value: '245 bps' }, color: 'blue' },
    { title: 'Sector Exposure', type: 'pie', data: { value: '8 Sectors' }, color: 'green' },
    { title: 'Risk Distribution', type: 'bar', data: { value: '15 Assets' }, color: 'orange' },
    { title: 'Performance Attribution', type: 'line', data: { value: '+12.3%' }, color: 'red' }
  ];

  return (
    <div className="analytics-page">
      <div className="analytics-header">
        <div>
          <h1>Risk Analytics</h1>
          <p>Advanced credit risk analysis and portfolio insights</p>
        </div>
        <Link href="/" className="back-link">
          ← Back to Dashboard
        </Link>
      </div>

      <div className="analytics-controls">
        <div className="time-selector">
          <label>Time Range:</label>
          <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="1y">Last Year</option>
          </select>
        </div>
        <div className="metric-selector">
          <label>Primary Metric:</label>
          <select value={selectedMetric} onChange={(e) => setSelectedMetric(e.target.value)}>
            <option value="cds_spreads">CDS Spreads</option>
            <option value="default_prob">Default Probability</option>
            <option value="var">Value at Risk</option>
            <option value="expected_loss">Expected Loss</option>
          </select>
        </div>
      </div>

      <div className="analytics-summary-grid">
        {summaryData.map((item, idx) => (
          <AnalyticsSummary key={idx} {...item} />
        ))}
      </div>

      <div className="analytics-content">
        <div className="charts-section">
          <h2>Risk Visualization</h2>
          <div className="charts-grid">
            {chartData.map((chart, idx) => (
              <ChartCard key={idx} {...chart} />
            ))}
          </div>
        </div>

        <div className="analysis-section">
          <RiskMatrix />
          
          <div className="stress-testing">
            <h3>Stress Testing Results</h3>
            <div className="stress-scenarios">
              <div className="scenario">
                <span className="scenario-name">Market Crash (-30%)</span>
                <span className="scenario-impact">Portfolio Loss: $3.2M</span>
                <span className="scenario-probability">Probability: 5%</span>
              </div>
              <div className="scenario">
                <span className="scenario-name">Interest Rate Spike (+300bps)</span>
                <span className="scenario-impact">Portfolio Loss: $1.8M</span>
                <span className="scenario-probability">Probability: 15%</span>
              </div>
              <div className="scenario">
                <span className="scenario-name">Credit Crisis</span>
                <span className="scenario-impact">Portfolio Loss: $4.5M</span>
                <span className="scenario-probability">Probability: 2%</span>
              </div>
            </div>
          </div>

          <div className="correlation-analysis">
            <h3>Correlation Analysis</h3>
            <div className="correlation-grid">
              <div className="correlation-item">
                <span>CDS vs Stock Price</span>
                <span className="correlation-value negative">-0.73</span>
              </div>
              <div className="correlation-item">
                <span>CDS vs VIX</span>
                <span className="correlation-value positive">+0.64</span>
              </div>
              <div className="correlation-item">
                <span>CDS vs Credit Rating</span>
                <span className="correlation-value negative">-0.82</span>
              </div>
              <div className="correlation-item">
                <span>Sector Concentration</span>
                <span className="correlation-value neutral">0.23</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
