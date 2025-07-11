import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }

    axios.get(`${API_BASE}/api/users/me`, { headers:{ Authorization:`Bearer ${token}` }, withCredentials:true })
      .then(res=>{ setUser(res.data); })
      .catch(err=>{
        // 401 등의 경우에만 토큰 제거
        if (err.response && err.response.status === 401) {
          localStorage.removeItem('token');
        }
      })
      .finally(()=> setLoading(false));
  }, []);

  const login = async (username, password) => {
    const response = await axios.post(`${API_BASE}/api/users/login`, { username, password }, { withCredentials:true });
    const { token, user } = response.data;
    localStorage.setItem('token', token);
    setUser(user);
    return user;
  };

  const register = async (userData) => {
    const response = await axios.post(`${API_BASE}/api/users/register`, userData, { withCredentials:true });
    const { token, user } = response.data;
    localStorage.setItem('token', token);
    setUser(user);
    return user;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 
