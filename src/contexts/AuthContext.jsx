import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authService from '../services/authService';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Check if token is a valid unexpired JWT
const isTokenValid = (token) => {
  if (!token || typeof token !== 'string') return false;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true; // Non-JWT token, treat as valid string
    const payload = JSON.parse(atob(parts[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return false; // Token has expired
    }
    return true;
  } catch (e) {
    return true;
  }
};

// Synchronously restore initial state from localStorage to prevent flash of login screen
const getInitialAuthState = () => {
  try {
    const token = localStorage.getItem('devsync_token');
    const userStr = localStorage.getItem('devsync_user');
    const user = userStr ? JSON.parse(userStr) : null;

    if (!token || !isTokenValid(token)) {
      if (token) {
        localStorage.removeItem('devsync_token');
        localStorage.removeItem('devsync_user');
      }
      return {
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false
      };
    }

    return {
      user: user || { username: 'Developer', email: '' },
      token,
      isAuthenticated: true,
      isLoading: false
    };
  } catch (err) {
    console.error('[AuthContext] Error reading initial auth state:', err);
    return {
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false
    };
  }
};

export const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState(getInitialAuthState);

  const login = useCallback((userData, token) => {
    if (token) {
      localStorage.setItem('devsync_token', token);
    }
    if (userData) {
      localStorage.setItem('devsync_user', JSON.stringify(userData));
    }
    setAuthState({
      user: userData,
      token: token || localStorage.getItem('devsync_token'),
      isAuthenticated: true,
      isLoading: false
    });
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logoutUser();
    } catch (e) {
      console.warn('[AuthContext] Logout failed:', e);
    } finally {
      localStorage.removeItem('devsync_token');
      localStorage.removeItem('devsync_user');
      setAuthState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false
      });
    }
  }, []);

  const updateUser = useCallback((newUserData) => {
    setAuthState(prev => {
      const updated = { ...prev.user, ...newUserData };
      localStorage.setItem('devsync_user', JSON.stringify(updated));
      return { ...prev, user: updated };
    });
  }, []);

  // Sync auth state across browser tabs
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'devsync_token' || e.key === 'devsync_user') {
        setAuthState(getInitialAuthState());
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user: authState.user,
        token: authState.token,
        isAuthenticated: authState.isAuthenticated,
        isLoading: authState.isLoading,
        login,
        logout,
        updateUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
