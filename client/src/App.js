// src/App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import HomePage from "./pages/HomePage";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Dashboard from "./pages/Dashboard";
import AdminPanel from "./pages/AdminPanel"; // ✅ Import Admin Panel
import Profile from "./pages/Profile";
import PasswordReset from "./components/PasswordReset"; // ✅ Import Password Reset
import OAuthCallback from "./components/OAuthCallback"; // ✅ OAuth callback handler
import RequireAuth from "./components/RequireAuth";
import HostDashboard from "./pages/HostDashboard";
import ReviewPage from "./pages/ReviewPage";
import HostRegister from "./components/HostRegister";
import PaymentUIDemo from "./components/PaymentUIDemo";
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

        <Route
          path="/dashboard"
          element={
            <RequireAuth allowedRoles={["student", "admin", "host"]}>
              <Dashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/admin"
          element={
            <RequireAuth allowedRoles={["admin"]}>
              <AdminPanel />
            </RequireAuth>
          }
        />
        <Route
          path="/host-dashboard"
          element={
            <RequireAuth allowedRoles={["host", "admin"]}>
              <HostDashboard />
            </RequireAuth>
          }
        />
        <Route path="/review/:eventId" element={<ReviewPage />} />
        <Route path="/register-host" element={<HostRegister />} />
        <Route path="/reset-password" element={<PasswordReset />} />
        <Route path="/oauth-callback" element={<OAuthCallback />} />
        <Route path="/payment-demo" element={<PaymentUIDemo />} />
        <Route
          path="/profile"
          element={
            <RequireAuth allowedRoles={["student", "host", "admin"]}>
              <Profile />
            </RequireAuth>
          }
        />
      </Routes>
    </Router>
  );
}
