// src/App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import HomePage from "./pages/HomePage";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Dashboard from "./pages/Dashboard";
import AdminPanel from "./pages/AdminPanel"; // ✅ Import Admin Panel
import PasswordReset from "./components/PasswordReset"; // ✅ Import Password Reset
import OAuthCallback from "./components/OAuthCallback"; // ✅ OAuth callback handler
import HostDashboard from "./pages/HostDashboard";
import ReviewPage from "./pages/ReviewPage";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function App() {
  return (
    <Router>
      <ToastContainer 
        position="top-right" 
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick={true}
        rtl={false}
        pauseOnFocusLoss={true}
        draggable={true}
        pauseOnHover={true}
        theme="dark"
        style={{ top: '20px', right: '20px', zIndex: 9999 }}
      />
      <Routes>
        {/* New landing page as the first page */}
        <Route path="/" element={<LandingPage />} />

        {/* Keep old HomePage accessible as a login screen */}
        <Route path="/login" element={<HomePage />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />

        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/host-dashboard" element={<HostDashboard />} />
        <Route path="/review/:eventId" element={<ReviewPage />} />
        <Route path="/reset-password" element={<PasswordReset />} />
        <Route path="/oauth-callback" element={<OAuthCallback />} />
      </Routes>
    </Router>
  );
}
