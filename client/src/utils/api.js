// utils/api.js
import axios from "axios";
const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";
export default axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
});
