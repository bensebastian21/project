// axiosConfig.js
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000", // 👈 Fix this
  withCredentials: true,
});

export default api;
