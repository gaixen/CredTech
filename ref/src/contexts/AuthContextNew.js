import React, { createContext, useState, useContext, useEffect } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [authToken, setAuthToken] = useState(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("authToken");
      if (token) {
        setAuthToken(token);
        setCurrentUser({
          id: 1,
          name: "Demo User",
          email: "demo@credtech.com",
        });
      }
    }
  }, []);

  const login = async (email, password) => {
    setIsLoading(true);
    try {
      // Mock login
      const mockToken = "demo-token-" + Date.now();
      const mockUser = { id: 1, name: "Demo User", email };

      if (typeof window !== "undefined") {
        localStorage.setItem("authToken", mockToken);
      }
      setAuthToken(mockToken);
      setCurrentUser(mockUser);
      return { success: true };
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email, password, name) => {
    setIsLoading(true);
    try {
      // Mock register
      const mockToken = "demo-token-" + Date.now();
      const mockUser = { id: 1, name, email };

      if (typeof window !== "undefined") {
        localStorage.setItem("authToken", mockToken);
      }
      setAuthToken(mockToken);
      setCurrentUser(mockUser);
      return { success: true };
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("authToken");
    }
    setAuthToken(null);
    setCurrentUser(null);
  };

  const value = {
    user: currentUser,
    isLoading,
    authToken,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      user: null,
      isLoading: false,
      authToken: null,
      login: () => Promise.resolve({ success: false }),
      register: () => Promise.resolve({ success: false }),
      logout: () => {},
    };
  }
  return context;
};
