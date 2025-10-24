// src/App.js
import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import HomePage from "./pages/HomePage";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Dashboard from "./pages/Dashboard";
import AdminPanel from "./pages/AdminPanel"; // ✅ Import Admin Panel
import Profile from "./pages/Profile";
import AllFriends from "./pages/AllFriends";
import PasswordReset from "./components/PasswordReset"; // Import Password Reset
import OAuthCallback from "./components/OAuthCallback"; // OAuth callback handler
import RequireAuth from "./components/RequireAuth";
import HostDashboard from "./pages/HostDashboard";
import HostPage from "./pages/HostPage";
import ReviewPage from "./pages/ReviewPage";
import CertificateVerify from "./pages/CertificateVerify";
import AdminVerification from "./pages/AdminVerification";
import HostRegister from "./components/HostRegister";
import PaymentUIDemo from "./components/PaymentUIDemo";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Settings from "./pages/Settings";
import SupportChatbot from "./components/SupportChatbot";
function ChatbotGate() {
  const location = useLocation();
  const path = location.pathname;
  let role = null;
  try {
    const u = JSON.parse(localStorage.getItem("user") || "null");
    role = u?.role || null;
  } catch {}
  const show = (path === "/dashboard" && role === "student") || (path === "/host-dashboard" && role === "host");
  return show ? <SupportChatbot /> : null;
}

export default function App() {
  // Apply persisted UI preferences (density) on startup
  useEffect(() => {
    try {
      const d = localStorage.getItem('ui_density');
      if (d) {
        document.documentElement.setAttribute('data-density', d);
      } else {
        document.documentElement.setAttribute('data-density', 'compact');
      }
    } catch {
      document.documentElement.setAttribute('data-density', 'compact');
    }
  }, []);
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
          path="/admin/verification"
          element={
            <RequireAuth allowedRoles={["admin"]}>
              <AdminVerification />
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
        <Route path="/host/:hostId" element={<HostPage />} />
        <Route path="/certificate/:id" element={<CertificateVerify />} />
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
        <Route
          path="/settings"
          element={
            <RequireAuth allowedRoles={["student", "host", "admin"]}>
              <Settings />
            </RequireAuth>
          }
        />
        <Route
          path="/profile/friends"
          element={
            <RequireAuth allowedRoles={["student", "host", "admin"]}>
              <AllFriends />
            </RequireAuth>
          }
        />
      </Routes>
      <ChatbotGate />
    </Router>
  );
}
