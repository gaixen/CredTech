import React, { createContext, useState, useContext, useEffect } from 'react';
import { register as apiRegister, login as apiLogin, getMe, logout as apiLogout } from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [authToken, setAuthToken] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('authToken');
        if (token) {
            setAuthToken(token);
            getMe(token).then(user => {
                setCurrentUser(user);
                setIsLoading(false);
            }).catch(() => {
                // Token is invalid
                localStorage.removeItem('authToken');
                setAuthToken(null);
                setIsLoading(false);
            });
        } else {
            setIsLoading(false);
        }
    }, []);

    const login = async (email, password) => {
        const { authToken } = await apiLogin(email, password);
        const user = await getMe(authToken);
        setAuthToken(authToken);
        setCurrentUser(user);
        localStorage.setItem('authToken', authToken);
    };

    const register = async (email, password) => {
        await apiRegister(email, password);
        // Optionally log in the user directly after registration
        await login(email, password);
    };

    const logout = async () => {
        await apiLogout();
        setCurrentUser(null);
        setAuthToken(null);
        localStorage.removeItem('authToken');
    };

    const value = {
        currentUser,
        isLoading,
        authToken,
        login,
        register,
        logout
    };

    return <AuthContext.Provider value={value}>{!isLoading && children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
