import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { searchCompanies, getBatchPrices, getDomains } from '../utils/api';
import Link from 'next/link';

const CompanyCard = ({ company, price }) => {
    const dailyChange = price ? ((price.c - price.pc) / price.pc) * 100 : 0;

    return (
        <div style={{
            border: '1px solid var(--border-color)',
            padding: '1.5rem',
            margin: '1rem',
            borderRadius: '8px',
            backgroundColor: 'var(--secondary-color)',
            width: '300px',
            textAlign: 'center'
        }}>
            <Link href={`/company/${company.ticker_symbol}`}>
                <h3 style={{ color: 'var(--primary-color)', marginBottom: '1rem' }}>{company.name} ({company.ticker_symbol})</h3>
            </Link>
            <p style={{ fontSize: '1.2rem', fontWeight: 'bold', color: company.predicted_share_change_percentage >= 0 ? '#28a745' : '#dc3545' }}>
                Predicted Change: {company.predicted_share_change_percentage.toFixed(2)}%
            </p>
            {price && <p>Current Price: ${price.c.toFixed(2)} ({dailyChange.toFixed(2)}%)</p>}
        </div>
    );
};

const HomePage = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDomains, setSelectedDomains] = useState([]);
    const [allCompanies, setAllCompanies] = useState([]);
    const [allDomains, setAllDomains] = useState([]);
    const [priceData, setPriceData] = useState({});

    useEffect(() => {
        getDomains().then(setAllDomains);
        searchCompanies('', []).then(companies => {
            setAllCompanies(companies);
            const tickers = companies.map(c => c.ticker_symbol);
            if (tickers.length > 0) {
                getBatchPrices(tickers).then(setPriceData);
            }
        });
    }, []);

    const handleDomainToggle = (domain) => {
        setSelectedDomains(prev => 
            prev.includes(domain) ? prev.filter(d => d !== domain) : [...prev, domain]
        );
    };

    const filteredCompanies = useMemo(() => {
        let companies = allCompanies;
        if (searchQuery) {
            companies = companies.filter(c => 
                c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                c.ticker_symbol.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }
        if (selectedDomains.length > 0) {
            companies = companies.filter(c => 
                c.domains.some(d => selectedDomains.includes(d))
            );
        }
        return companies;
    }, [searchQuery, selectedDomains, allCompanies]);

    const highestPredicted = useMemo(() => {
        return [...allCompanies].sort((a, b) => 
            b.predicted_share_change_percentage - a.predicted_share_change_percentage
        ).slice(0, 3);
    }, [allCompanies]);

    return (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
            <h1>Real-Time Credit Intelligence</h1>
            
            <div style={{ margin: '3rem 0' }}>
                <h2>Highest Predicted Movers (Next Day)</h2>
                <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap' }}>
                    {highestPredicted.map(company => (
                        <CompanyCard key={company.ticker_symbol} company={company} price={priceData[company.ticker_symbol]} />
                    ))}
                </div>
            </div>

            <div style={{ margin: '3rem 0' }}>
                <h2>Search & Filter Companies</h2>
                <input 
                    type="text" 
                    value={searchQuery} 
                    onChange={e => setSearchQuery(e.target.value)} 
                    placeholder="Search by name or ticker..." 
                    style={{ width: '50%', padding: '1rem', marginBottom: '1rem' }}
                />
                <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '2rem' }}>
                    {allDomains.map(domain => (
                        <button 
                            key={domain} 
                            onClick={() => handleDomainToggle(domain)}
                            style={{ 
                                backgroundColor: selectedDomains.includes(domain) ? 'var(--primary-color)' : 'var(--secondary-color)',
                                border: `1px solid ${selectedDomains.includes(domain) ? 'var(--primary-color)' : 'var(--border-color)'}`
                            }}
                        >
                            {domain}
                        </button>
                    ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', marginTop: '2rem' }}>
                    {filteredCompanies.map(company => (
                        <CompanyCard key={company.ticker_symbol} company={company} price={priceData[company.ticker_symbol]} />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default HomePage;
