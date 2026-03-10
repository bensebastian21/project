import React from 'react';
import { motion } from 'framer-motion';

const AuthBackground = () => (
  <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-white">
    {/* Layer 1: Base drifting mesh (Deepened Colors + Faster) */}
    <motion.div
      className="absolute inset-0 z-0 opacity-80 blur-3xl"
      animate={{
        background: [
          'radial-gradient(at 0% 0%, #f472b6 0%, transparent 50%), radial-gradient(at 100% 0%, #34d399 0%, transparent 50%), radial-gradient(at 100% 100%, #60a5fa 0%, transparent 50%), radial-gradient(at 0% 100%, #fbbf24 0%, transparent 50%)',
          'radial-gradient(at 100% 0%, #f472b6 0%, transparent 50%), radial-gradient(at 100% 100%, #34d399 0%, transparent 50%), radial-gradient(at 0% 100%, #60a5fa 0%, transparent 50%), radial-gradient(at 0% 0%, #fbbf24 0%, transparent 50%)',
          'radial-gradient(at 100% 100%, #f472b6 0%, transparent 50%), radial-gradient(at 0% 100%, #34d399 0%, transparent 50%), radial-gradient(at 0% 0%, #60a5fa 0%, transparent 50%), radial-gradient(at 100% 0%, #fbbf24 0%, transparent 50%)',
          'radial-gradient(at 0% 100%, #f472b6 0%, transparent 50%), radial-gradient(at 0% 0%, #34d399 0%, transparent 50%), radial-gradient(at 100% 0%, #60a5fa 0%, transparent 50%), radial-gradient(at 100% 100%, #fbbf24 0%, transparent 50%)',
        ],
      }}
      transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
    />

    {/* Layer 2: Floating accent orbs (Faster Rotation + Richer Conic) */}
    <motion.div
      className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] z-0 opacity-60 mix-blend-multiply"
      animate={{ rotate: 360 }}
      transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
      style={{
        background:
          'conic-gradient(from 0deg at 50% 50%, #f472b6, #60a5fa, #34d399, #fbbf24, #f472b6)',
      }}
    />
  </div>
);

export default AuthBackground;
