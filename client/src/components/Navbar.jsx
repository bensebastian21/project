import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.8, ease: 'circOut' }}
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-white/80 dark:bg-black/80 backdrop-blur-md py-4 border-b border-black/5 dark:border-white/5'
          : 'bg-transparent py-8'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        <Link
          to="/"
          className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2 group"
        >
          <motion.div whileHover={{ rotate: 180 }} className="w-8 h-8 bg-black dark:bg-white" />
          <span className="hidden md:block">Evenite.</span>
        </Link>
        <div className="flex items-center gap-8 text-xs font-bold uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">
          <Link to="/" className="hover:text-black dark:hover:text-white transition-colors">
            Home
          </Link>
          <Link to="/about" className="hover:text-black dark:hover:text-white transition-colors">
            About
          </Link>
          <Link to="/contact" className="hover:text-black dark:hover:text-white transition-colors">
            Contact
          </Link>
          <Link to="/login" className="hover:text-black dark:hover:text-white transition-colors">
            Sign In
          </Link>
          <Link
            to="/register-host"
            className="px-6 py-3 bg-white text-black border border-neutral-200 hover:bg-neutral-100 transition-all dark:bg-white dark:text-black dark:border-white shadow-sm"
          >
            Host Event
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}
