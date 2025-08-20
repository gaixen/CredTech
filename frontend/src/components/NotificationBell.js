import React, { useState, useEffect } from 'react';
import { getNotifications, markNotificationsRead } from '../utils/api';

const NotificationBell = () => {
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);

    const unreadCount = notifications.filter(n => !n.is_read).length;

    useEffect(() => {
        if (isOpen) {
            getNotifications().then(setNotifications);
        }
    }, [isOpen]);

    const handleToggle = () => {
        setIsOpen(!isOpen);
        if (!isOpen && unreadCount > 0) {
            // Mark as read when opening
            markNotificationsRead([]); // Empty array marks all as read in our mock
        }
    };

    return (
        <div style={{ position: 'relative', marginRight: '1rem' }}>
            <button onClick={handleToggle}>Bell ({unreadCount})</button>
            {isOpen && (
                <div style={{ position: 'absolute', top: '100%', right: 0, border: '1px solid #ccc', backgroundColor: 'white', width: '300px' }}>
                    {notifications.length > 0 ? (
                        <ul>
                            {notifications.map(n => <li key={n.id}>{n.message}</li>)}
                        </ul>
                    ) : (
                        <p>No new notifications.</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
