// src/pages/HomePage.jsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Login from '../components/Login';
import Register from '../components/Register';
// import "./HomePage.css"; // Removed obsolete CSS

import AuthBackground from '../components/AuthBackground';

export default function HomePage() {
  const [mode, setMode] = useState('login');

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Isolated Auth Background */}
      <AuthBackground />

      <div className="relative z-20 w-full max-w-md px-4">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="text-4xl md:text-5xl font-black mt-12 mb-6 text-center text-black tracking-tighter uppercase"
          style={{ textShadow: '4px 4px 0px rgba(0,0,0,0.1)' }}
        >
          Evenite
        </motion.h1>

        <AnimatePresence mode="wait">
          {mode === 'login' ? (
            <Login key="login" onSwitchToRegister={() => setMode('register')} />
          ) : (
            <Register key="register" onSwitchToLogin={() => setMode('login')} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
