// src/components/Login.jsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import config from '../config';
import 'react-toastify/dist/ReactToastify.css';

export default function Login({ onSwitchToRegister }) {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const validate = (field, value) => {
    switch (field) {
      case 'email':
        return /\S+@\S+\.\S+/.test(value) ? '' : 'Invalid email format';
      case 'password':
        return value.length >= 6 ? '' : 'Password must be at least 6 characters';
      default:
        return '';
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
      'student.registrations',
      'student.bookmarks',
      'student.subscriptions',
      'student.subscriptions.meta',
      'student.notifications',
      'student.feedbacks',
    ];
    KEYS.forEach((k) => localStorage.removeItem(k));
  };

  const redirectByRole = (role) => {
    if (role === 'admin') {
      navigate('/admin');
    } else if (role === 'host') {
      navigate('/host-dashboard');
    } else {
      navigate('/dashboard');
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
      toast.error('❌ Fix login form errors');
      return;
    }

    try {
      // First attempt: generic user login
      let res = await fetch(`${config.apiBaseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      let data = await res.json();

      // If not ok and looks like a host (or generic failure), attempt host login fallback
      if (!res.ok) {
        // Retry against host login endpoint
        const resHost = await fetch(`${config.apiBaseUrl}/api/auth/login-host`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        const dataHost = await resHost.json();
        if (!resHost.ok) {
          throw new Error(dataHost.error || data.error || 'Login failed');
        }
        data = dataHost;
      }

      // Clear any previous student's cached data before setting new user
      clearStudentCache();
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      toast.success('✅ Login successful');

      redirectByRole(data.user.role);
    } catch (err) {
      toast.error('❌ ' + err.message);
    }
  };

  const handleForgotPassword = () => {
    navigate('/reset-password');
  };

  const handleGoogleAuth = () => {
    window.location.href = config.oauthStartUrl;
  };

  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Background Elements (if passing props, or just styled container) */}

      <motion.div
        key="login-form"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.4, ease: 'backOut' }}
        className="bg-white border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 relative z-10"
      >
        <h2 className="text-3xl font-black uppercase tracking-tighter mb-8 text-center text-black">
          Student Login
        </h2>

        <form className="space-y-6" onSubmit={handleLogin}>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-neutral-500">
              Email Address
            </label>
            <input
              name="email"
              type="email"
              placeholder="YOUR@EMAIL.COM"
              className="w-full bg-neutral-50 border-2 border-black p-4 font-bold placeholder:text-neutral-400 focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
              value={formData.email}
              onChange={handleChange}
              onBlur={handleBlur}
            />
            <AnimatePresence>
              {errors.email && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-red-600 text-xs font-bold mt-2 uppercase tracking-wide"
                >
                  {errors.email}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-neutral-500">
              Password
            </label>
            <input
              name="password"
              type="password"
              placeholder="••••••••"
              className="w-full bg-neutral-50 border-2 border-black p-4 font-bold placeholder:text-neutral-400 focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
              value={formData.password}
              onChange={handleChange}
              onBlur={handleBlur}
            />
            <AnimatePresence>
              {errors.password && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-red-600 text-xs font-bold mt-2 uppercase tracking-wide"
                >
                  {errors.password}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            className="w-full py-4 bg-black text-white font-black uppercase tracking-widest border-2 border-transparent hover:bg-neutral-800 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
          >
            Enter Dashboard
          </motion.button>

          <button
            type="button"
            className="block w-full text-center text-xs font-bold uppercase tracking-widest text-neutral-500 hover:text-black hover:underline mt-4"
            onClick={handleForgotPassword}
          >
            Forgot Password?
          </button>
        </form>

        <div className="relative py-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t-2 border-black opacity-20"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="px-4 bg-white text-xs font-bold uppercase tracking-widest text-neutral-400">
              Or continue with
            </span>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={handleGoogleAuth}
          className="w-full py-3 bg-white text-black font-bold uppercase tracking-widest border-2 border-black flex items-center justify-center gap-3 hover:bg-neutral-50 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#000"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#000"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#000"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#000"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Google
        </motion.button>

        <div className="mt-8 pt-6 border-t-2 border-dashed border-neutral-200">
          <p className="text-center text-xs font-bold uppercase tracking-wide text-neutral-500 mb-2">
            New here?
          </p>
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="w-full py-2 text-black font-black uppercase tracking-widest border-2 border-transparent hover:border-black hover:bg-neutral-50 transition-all"
          >
            Create Student Account
          </button>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => navigate('/register-host')}
              className="text-xs font-bold text-neutral-400 hover:text-black uppercase tracking-widest hover:underline"
            >
              Are you a Host? Register here
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
