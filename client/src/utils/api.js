// utils/api.js
import axios from 'axios';
import config from '../config';
const apiBaseUrl = config.apiBaseUrl;

const instance = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
});

// Attach JWT token automatically
instance.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (_) {
    /* ignore */
  }
  return config;
});

export default instance;
