import React, { useState, useEffect, useCallback } from 'react';
import { 
    getWatchlists, 
    getBatchPrices, 
    createWatchlist, 
    deleteWatchlist, 
    removeStockFromWatchlist 
} from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

const WatchlistItem = ({ item, price, onRemove }) => (
    <li style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem' }}>
        <span>{item.name} ({item.ticker_symbol})</span>
        <span>{price ? `$${price.c.toFixed(2)}` : 'Loading...'}</span>
        <button onClick={onRemove}>Remove</button>
    </li>
);

const Watchlist = ({ watchlist, priceData, onUpdate }) => {
    const handleRemoveStock = (tickerSymbol) => {
        if (window.confirm(`Are you sure you want to remove ${tickerSymbol}?`)) {
            removeStockFromWatchlist(watchlist.id, tickerSymbol).then(onUpdate);
        }
    };

    const handleDeleteWatchlist = () => {
        if (window.confirm(`Are you sure you want to delete the "${watchlist.name}" watchlist?`)) {
            deleteWatchlist(watchlist.id).then(onUpdate);
        }
    };

    return (
        <div style={{ border: '1px solid #ccc', padding: '1rem', margin: '1rem 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>{watchlist.name}</h2>
                <button onClick={handleDeleteWatchlist} style={{backgroundColor: 'red', color: 'white'}}>Delete Watchlist</button>
            </div>
            <ul>
                {watchlist.items.map(item => (
                    <WatchlistItem 
                        key={item.ticker_symbol} 
                        item={item} 
                        price={priceData[item.ticker_symbol]} 
                        onRemove={() => handleRemoveStock(item.ticker_symbol)}
                    />
                ))}
            </ul>
        </div>
    );
};

const CreateWatchlistForm = ({ onCreated }) => {
    const [name, setName] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        createWatchlist(name).then(() => {
            setName('');
            onCreated();
        });
    };

    return (
        <form onSubmit={handleSubmit}>
            <input 
                type="text" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                placeholder="New watchlist name..." 
            />
            <button type="submit">Create Watchlist</button>
        </form>
    );
};

const WatchlistsPage = () => {
    const [watchlists, setWatchlists] = useState([]);
    const [priceData, setPriceData] = useState({});
    const { currentUser } = useAuth();

    const fetchWatchlistsAndPrices = useCallback(async () => {
        const userWatchlists = await getWatchlists();
        setWatchlists(userWatchlists);

        const allTickers = userWatchlists.flatMap(w => w.items.map(i => i.ticker_symbol));
        if (allTickers.length > 0) {
            const prices = await getBatchPrices(allTickers);
            setPriceData(prices);
        }
    }, []);

    useEffect(() => {
        if (currentUser) {
            fetchWatchlistsAndPrices();
        }
    }, [currentUser, fetchWatchlistsAndPrices]);

    if (!currentUser) {
        return <p>Please log in to view your watchlists.</p>;
    }

    return (
        <div>
            <h1>My Watchlists</h1>
            <CreateWatchlistForm onCreated={fetchWatchlistsAndPrices} />
            <div>
                {watchlists.map(w => (
                    <Watchlist 
                        key={w.id} 
                        watchlist={w} 
                        priceData={priceData} 
                        onUpdate={fetchWatchlistsAndPrices}
                    />
                ))}
            </div>
        </div>
    );
};

export default WatchlistsPage;
