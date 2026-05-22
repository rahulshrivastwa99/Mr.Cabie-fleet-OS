import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const CorporateAuthContext = createContext(null);

const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api/corporate`;

// Create a separate axios instance for corporate requests
const corporateAxios = axios.create();

export const CorporateAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('corporate_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      corporateAxios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const response = await corporateAxios.get(`${API_BASE}/auth/me`);
      setUser(response.data);
    } catch (error) {
      console.error('Error fetching corporate user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await axios.post(`${API_BASE}/auth/login`, { email, password });
    const { access_token, user: userData } = response.data;
    localStorage.setItem('corporate_token', access_token);
    setToken(access_token);
    setUser(userData);
    corporateAxios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
    return userData;
  };

  const register = async (email, password, name, client_id, role = 'VIEWER') => {
    const response = await axios.post(`${API_BASE}/auth/register`, {
      email,
      password,
      name,
      client_id,
      role
    });
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem('corporate_token');
    setToken(null);
    setUser(null);
    delete corporateAxios.defaults.headers.common['Authorization'];
  };

  // Provide the corporate axios instance for use in corporate pages
  const getAxios = () => corporateAxios;

  return (
    <CorporateAuthContext.Provider value={{ user, token, login, register, logout, loading, getAxios }}>
      {children}
    </CorporateAuthContext.Provider>
  );
};

export const useCorporateAuth = () => {
  const context = useContext(CorporateAuthContext);
  if (!context) {
    throw new Error('useCorporateAuth must be used within CorporateAuthProvider');
  }
  return context;
};

// Export the corporate axios for direct use in components
export { corporateAxios };