import axios from 'axios';

// Base API configuration targeting Node server
let rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
rawApiUrl = rawApiUrl.replace(/\/+$/, '');
if (!rawApiUrl.endsWith('/api')) {
  rawApiUrl = `${rawApiUrl}/api`;
}

const api = axios.create({
  baseURL: rawApiUrl,
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json'
  }
});

// Automatically inject logged user JWT in each request header
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('devsync_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
