// utils/api.js
import axios from "axios";
const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";

const instance = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
});

// Attach JWT token automatically
instance.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (_) { /* ignore */ }
  return config;
});

export default instance;
