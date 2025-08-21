import React from 'react';
import Link from 'next/link';

export default function Dashboard() {
  return (
    <div style={{ padding: '2rem' }}>
      <h1>CredTech Dashboard</h1>
      <p>Welcome to the Credit Risk Management System</p>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '2rem' }}>
        <div style={{ background: 'white', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <h3>Portfolio Value</h3>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>$12.5M</p>
        </div>
        
        <div style={{ background: 'white', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <h3>Risk Score</h3>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>7.2</p>
        </div>
        
        <div style={{ background: 'white', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <h3>Active Positions</h3>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>23</p>
        </div>
      </div>
      
      <div style={{ marginTop: '2rem' }}>
        <Link href="/analytics" style={{ marginRight: '1rem', padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', textDecoration: 'none', borderRadius: '4px' }}>
          Analytics
        </Link>
        <Link href="/portfolio" style={{ marginRight: '1rem', padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', textDecoration: 'none', borderRadius: '4px' }}>
          Portfolio
        </Link>
        <Link href="/company-search" style={{ padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', textDecoration: 'none', borderRadius: '4px' }}>
          Company Search
        </Link>
      </div>
    </div>
  );
}
