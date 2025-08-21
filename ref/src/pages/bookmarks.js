import React, { useState, useEffect, useCallback } from 'react';
import { getBookmarkedCompanies, getBatchPrices } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
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
                <h3 style={{ color: 'var(--primary-color)' }}>{company.name} ({company.ticker_symbol})</h3>
            </Link>
            {price && <p>Current Price: ${price.c.toFixed(2)} ({dailyChange.toFixed(2)}%)</p>}
        </div>
    );
};

const BookmarksPage = () => {
    const [bookmarkedCompanies, setBookmarkedCompanies] = useState([]);
    const [priceData, setPriceData] = useState({});
    const { currentUser } = useAuth();

    const fetchBookmarks = useCallback(async () => {
        if (!currentUser) return;
        const bookmarks = await getBookmarkedCompanies();
        setBookmarkedCompanies(bookmarks);

        const tickers = bookmarks.map(b => b.ticker_symbol);
        if (tickers.length > 0) {
            const prices = await getBatchPrices(tickers);
            setPriceData(prices);
        }
    }, [currentUser]);

    useEffect(() => {
        fetchBookmarks();
    }, [fetchBookmarks]);

    if (!currentUser) {
        return <p style={{ textAlign: 'center', padding: '2rem' }}>Please log in to see your bookmarked companies.</p>;
    }

    return (
        <div style={{ padding: '2rem' }}>
            <h1 style={{ textAlign: 'center' }}>My Bookmarked Companies</h1>
            {bookmarkedCompanies.length > 0 ? (
                <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', marginTop: '2rem' }}>
                    {bookmarkedCompanies.map(company => (
                        <CompanyCard key={company.ticker_symbol} company={company} price={priceData[company.ticker_symbol]} />
                    ))}
                </div>
            ) : (
                <p style={{ textAlign: 'center', marginTop: '2rem' }}>You haven't bookmarked any companies yet.</p>
            )}
        </div>
    );
};

export default BookmarksPage;
