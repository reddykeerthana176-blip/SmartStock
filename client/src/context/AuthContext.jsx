import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { initClientSocket, disconnectClientSocket } from '../services/socket';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [business, setBusiness] = useState(() => {
    try {
      const stored = localStorage.getItem('business');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  // Initialize socket when authenticated
  useEffect(() => {
    if (token && business?.id) {
      initClientSocket(business.id, token);
    } else {
      disconnectClientSocket();
    }
  }, [token, business?.id]);

  // Check current session on mount
  useEffect(() => {
    const verifySession = async () => {
      if (token) {
        try {
          const res = await api.get('/auth/me');
          if (res.data?.success) {
            setUser(res.data.data.user);
            setBusiness(res.data.data.business);
            localStorage.setItem('user', JSON.stringify(res.data.data.user));
            localStorage.setItem('business', JSON.stringify(res.data.data.business));
          }
        } catch {
          // Keep offline state if server is not reachable
        }
      }
      setLoading(false);
    };

    verifySession();
  }, [token]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data?.success) {
      const { token, user, business } = res.data.data;
      setToken(token);
      setUser(user);
      setBusiness(business);
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('business', JSON.stringify(business));
      return { success: true };
    }
    return { success: false, message: res.data?.message || 'Login failed' };
  };

  const register = async (payload) => {
    const res = await api.post('/auth/register', payload);
    if (res.data?.success) {
      const { token, user, business } = res.data.data;
      setToken(token);
      setUser(user);
      setBusiness(business);
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('business', JSON.stringify(business));
      return { success: true };
    }
    return { success: false, message: res.data?.message || 'Registration failed' };
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setBusiness(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('business');
    disconnectClientSocket();
    window.location.href = '/login';
  };

  const updateBusiness = (updatedFields) => {
    setBusiness((prev) => {
      const updated = { ...prev, ...updatedFields };
      localStorage.setItem('business', JSON.stringify(updated));
      return updated;
    });
  };

  const isAdmin = user?.role === 'ADMIN';
  const isStaff = user?.role === 'STAFF';

  return (
    <AuthContext.Provider
      value={{
        user,
        business,
        token,
        loading,
        isAuthenticated: !!token && !!user,
        isAdmin,
        isStaff,
        login,
        register,
        logout,
        updateBusiness,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
