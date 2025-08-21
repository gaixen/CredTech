import React, { useState, useEffect, useCallback } from 'react';
import { getAlertRules, createAlertRule, deleteAlertRule } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

const CreateAlertForm = ({ onCreated }) => {
    const [ticker, setTicker] = useState('');
    const [alertType, setAlertType] = useState('PERCENT_CHANGE');
    const [value, setValue] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!ticker || !value) return alert("Please fill out all fields.");

        const rule = {
            ticker_symbol: ticker.toUpperCase(),
            alert_type: alertType,
            threshold_value: alertType !== 'KEYWORD_MATCH' ? parseFloat(value) : null,
            keyword: alertType === 'KEYWORD_MATCH' ? value : null,
        };

        createAlertRule(rule).then(() => {
            setTicker('');
            setValue('');
            onCreated();
        });
    };

    return (
        <form onSubmit={handleSubmit} style={{ padding: '2rem', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'var(--secondary-color)' }}>
            <h3>Create New Alert</h3>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <input 
                    type="text" 
                    value={ticker} 
                    onChange={e => setTicker(e.target.value)} 
                    placeholder="Ticker Symbol (e.g., AAPL)" 
                />
                <select value={alertType} onChange={e => setAlertType(e.target.value)} style={{ padding: '10px', borderRadius: '5px', border: '1px solid var(--border-color)', backgroundColor: 'var(--secondary-color)', color: 'var(--text-color)' }}>
                    <option value="PERCENT_CHANGE">Score % Change</option>
                    <option value="ABSOLUTE_THRESHOLD">Score Threshold</option>
                    <option value="KEYWORD_MATCH">Keyword Match</option>
                </select>
                <input 
                    type={alertType === 'KEYWORD_MATCH' ? 'text' : 'number'}
                    value={value}
                    onChange={e => setValue(e.target.value)}
                    placeholder={alertType === 'KEYWORD_MATCH' ? 'e.g., bankruptcy' : 'e.g., 5 or 60'}
                />
                <button type="submit">Create Alert</button>
            </div>
        </form>
    );
};

const AlertsPage = () => {
    const [rules, setRules] = useState([]);
    const { currentUser } = useAuth();

    const fetchRules = useCallback(() => {
        if (currentUser) {
            getAlertRules().then(setRules);
        }
    }, [currentUser]);

    useEffect(() => {
        fetchRules();
    }, [fetchRules]);

    const handleDelete = (ruleId) => {
        if (window.confirm("Are you sure you want to delete this alert rule?")) {
            deleteAlertRule(ruleId).then(fetchRules);
        }
    };

    if (!currentUser) {
        return <p style={{ textAlign: 'center', padding: '2rem' }}>Please log in to manage your alerts.</p>;
    }

    return (
        <div style={{ padding: '2rem' }}>
            <h1 style={{ textAlign: 'center' }}>Manage Alerts</h1>
            <CreateAlertForm onCreated={fetchRules} />
            <div style={{ marginTop: '2rem' }}>
                <h2>Your Alert Rules</h2>
                {rules.length > 0 ? (
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        {rules.map(rule => (
                            <li key={rule.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '5px', backgroundColor: 'var(--secondary-color)', marginBottom: '1rem' }}>
                                <span>
                                    <strong>{rule.ticker_symbol}:</strong> Alert when {rule.alert_type.replace('_', ' ').toLowerCase()} is {rule.alert_type === 'KEYWORD_MATCH' ? rule.keyword : `> ${rule.threshold_value}`}
                                </span>
                                <button onClick={() => handleDelete(rule.id)} style={{ backgroundColor: '#dc3545' }}>Delete</button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p style={{ textAlign: 'center', marginTop: '2rem' }}>You have no active alert rules.</p>
                )}
            </div>
        </div>
    );
};

export default AlertsPage;
