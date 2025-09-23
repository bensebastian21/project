// src/components/Login.jsx
import React, { useState } from "react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import config from "../config";
import "react-toastify/dist/ReactToastify.css";

export default function Login({ onSwitchToRegister }) {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const validate = (field, value) => {
    switch (field) {
      case "email":
        return /\S+@\S+\.\S+/.test(value) ? "" : "Invalid email format";
      case "password":
        return value.length >= 6 ? "" : "Password must be at least 6 characters";
      default:
        return "";
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: validate(name, value) }));
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setErrors((prev) => ({ ...prev, [name]: validate(name, value) }));
  };

  const clearStudentCache = () => {
    const KEYS = [
      "student.registrations",
      "student.bookmarks",
      "student.subscriptions",
      "student.subscriptions.meta",
      "student.notifications",
      "student.feedbacks",
    ];
    KEYS.forEach((k) => localStorage.removeItem(k));
  };

  const redirectByRole = (role) => {
    if (role === "admin") {
      navigate("/admin");
    } else if (role === "host") {
      navigate("/host-dashboard");
    } else {
      navigate("/dashboard");
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    const newErrors = {};
    Object.keys(formData).forEach((key) => {
      const error = validate(key, formData[key]);
      if (error) newErrors[key] = error;
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("❌ Fix login form errors");
      return;
    }

    try {
      const res = await fetch(`${config.apiBaseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");

      // Clear any previous student's cached data before setting new user
      clearStudentCache();
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      toast.success("✅ Login successful");

      redirectByRole(data.user.role);
    } catch (err) {
      toast.error("❌ " + err.message);
    }
  };

  const handleForgotPassword = () => {
    navigate("/reset-password");
  };

  const handleGoogleAuth = () => {
    window.location.href = config.oauthStartUrl;
  };

  return (
    <div className="space-y-4 animate-fadeIn overflow-hidden"> {/* 🔹 Hides scrollbar */}
      <form className="space-y-4" onSubmit={handleLogin}>
        <div>
          <input
            name="email"
            type="email"
            placeholder="Email"
            className="input"
            value={formData.email}
            onChange={handleChange}
            onBlur={handleBlur}
          />
          {errors.email && <p className="error">{errors.email}</p>}
        </div>

        <div>
          <input
            name="password"
            type="password"
            placeholder="Password"
            className="input"
            value={formData.password}
            onChange={handleChange}
            onBlur={handleBlur}
          />
          {errors.password && <p className="error">{errors.password}</p>}
        </div>

        <button type="submit" className="btn btn-login">Login</button>

        <button
          type="button"
          className="text-sm text-blue-400 hover:underline"
          onClick={handleForgotPassword}
        >
          Forgot Password?
        </button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-600"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-gray-800 text-gray-400">Or continue with</span>
        </div>
      </div>

      <button type="button" onClick={handleGoogleAuth} className="btn btn-google">
        <svg className="google-icon" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Sign in with Google
      </button>

      <div className="text-center">
        <p className="text-gray-400">
          Don't have an account?{" "}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="text-blue-400 hover:underline font-medium"
          >
            Sign up as Student
          </button>
        </p>
        <p className="text-gray-400 mt-2">
          Want to host events?{" "}
          <button
            type="button"
            onClick={() => navigate("/register-host")}
            className="text-orange-400 hover:underline font-medium"
          >
            Register as Host
          </button>
        </p>
      </div>
    </div>
  );
}
