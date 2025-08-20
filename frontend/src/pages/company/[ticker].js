import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { 
    getCompanyDetails, 
    getHistoricalPrices, 
    addBookmark, 
    removeBookmark, 
    getBookmarkedCompanies 
} from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

// A simple SVG chart component as a placeholder
const SimpleLineChart = ({ data, width = 500, height = 200 }) => {
    if (!data || data.length === 0) return <p>No historical data available.</p>;

    const maxPrice = Math.max(...data.map(p => p.c));
    const minPrice = Math.min(...data.map(p => p.c));
    const priceRange = maxPrice - minPrice;

    const points = data.map((point, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((point.c - minPrice) / priceRange) * height;
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ border: '1px solid var(--border-color)', backgroundColor: 'var(--secondary-color)' }}>
            <polyline
                fill="none"
                stroke="var(--primary-color)"
                strokeWidth="2"
                points={points}
            />
        </svg>
    );
};

const CompanyDetailPage = () => {
    const router = useRouter();
    const { ticker } = router.query;
    const { currentUser } = useAuth();

    const [companyDetails, setCompanyDetails] = useState(null);
    const [historicalData, setHistoricalData] = useState([]);
    const [isBookmarked, setIsBookmarked] = useState(false);

    useEffect(() => {
        if (ticker) {
            getCompanyDetails(ticker).then(setCompanyDetails);
            const to = Math.floor(Date.now() / 1000);
            const from = to - (6 * 30 * 24 * 60 * 60); // 6 months
            getHistoricalPrices(ticker, 'D', from, to).then(setHistoricalData);

            if (currentUser) {
                getBookmarkedCompanies().then(bookmarks => {
                    setIsBookmarked(bookmarks.some(b => b.ticker_symbol === ticker));
                });
            }
        }
    }, [ticker, currentUser]);

    const dailyChange = useMemo(() => {
        if (!companyDetails?.live_price_data) return { value: 0, color: '' };
        const { c, pc } = companyDetails.live_price_data;
        const change = ((c - pc) / pc) * 100;
        return {
            value: change.toFixed(2),
            color: change >= 0 ? '#28a745' : '#dc3545'
        };
    }, [companyDetails]);

    const handleBookmarkToggle = () => {
        if (!currentUser) return alert("Please log in to bookmark companies.");
        const action = isBookmarked ? removeBookmark(ticker) : addBookmark(ticker);
        action.then(() => setIsBookmarked(!isBookmarked));
    };

    if (!companyDetails) return <p style={{ textAlign: 'center' }}>Loading...</p>;

    return (
        <div style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1>{companyDetails.name} ({companyDetails.ticker_symbol})</h1>
                {currentUser && (
                    <button onClick={handleBookmarkToggle}>
                        {isBookmarked ? '★ Unbookmark' : '☆ Bookmark'}
                    </button>
                )}
            </div>

            <div style={{ display: 'flex', gap: '2rem', margin: '2rem 0' }}>
                <div>
                    <h4>Current Share Price</h4>
                    <p style={{ fontSize: '1.5rem' }}>${companyDetails.live_price_data.c.toFixed(2)}</p>
                </div>
                <div>
                    <h4>% Diff from Previous Close</h4>
                    <p style={{ fontSize: '1.5rem', color: dailyChange.color }}>{dailyChange.value}%</p>
                </div>
                <div>
                    <h4>Predicted % Change (Next Day)</h4>
                    <p style={{ fontSize: '1.5rem', color: companyDetails.predicted_share_change_percentage >= 0 ? '#28a745' : '#dc3545' }}>
                        {companyDetails.predicted_share_change_percentage.toFixed(2)}%
                    </p>
                </div>
            </div>

            <div style={{ margin: '2rem 0' }}>
                <h3>Previous 6 Months Closing Prices</h3>
                <SimpleLineChart data={historicalData} />
            </div>

            <div style={{ margin: '2rem 0' }}>
                <h3>Cause of Prediction / Relevant Sentiments</h3>
                {companyDetails.sentiments.map((item, index) => (
                    <div key={index} style={{ border: '1px solid var(--border-color)', padding: '1rem', margin: '1rem 0', borderRadius: '5px', backgroundColor: 'var(--secondary-color)' }}>
                        <p><strong>{item.source}:</strong> {item.text}</p>
                        <p style={{ color: item.score >= 0 ? '#28a745' : '#dc3545' }}>Sentiment Score: {item.score}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CompanyDetailPage;
