import React from 'react';
import Link from 'next/link';
import { useAuth } from '../../contexts/AuthContext';
import NotificationBell from '../NotificationBell';

const Header = () => {
    const { currentUser, logout } = useAuth();

    return (
        <header style={{
            padding: '1rem 2rem',
            backgroundColor: 'var(--secondary-color)',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
        }}>
            <Link href="/"><h2 style={{ margin: 0 }}>Credit Intelligence</h2></Link>
            <nav style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <Link href="/watchlists">Watchlists</Link>
                <Link href="/bookmarks">Bookmarks</Link>
                <Link href="/alerts">Alerts</Link>
                {currentUser ? (
                    <>
                        <NotificationBell />
                        <button onClick={logout}>Logout</button>
                    </>
                ) : (
                    <>
                        <Link href="/login">Login</Link>
                        <Link href="/register">Register</Link>
                    </>
                )}
            </nav>
        </header>
    );
};

export default Header;
