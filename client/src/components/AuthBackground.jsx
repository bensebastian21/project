import React from 'react';
import { motion } from 'framer-motion';

const AuthBackground = () => (
  <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-black">
    {/* Layer 1: Base drifting mesh (Deepened Colors + Faster) */}
    <motion.div
      className="absolute inset-0 z-0 opacity-80 blur-3xl"
      animate={{
        background: [
          'radial-gradient(at 0% 0%, #7c3aed 0%, transparent 50%), radial-gradient(at 100% 0%, #db2777 0%, transparent 50%), radial-gradient(at 100% 100%, #2563eb 0%, transparent 50%), radial-gradient(at 0% 100%, #10b981 0%, transparent 50%)',
          'radial-gradient(at 100% 0%, #7c3aed 0%, transparent 50%), radial-gradient(at 100% 100%, #db2777 0%, transparent 50%), radial-gradient(at 0% 100%, #2563eb 0%, transparent 50%), radial-gradient(at 0% 0%, #10b981 0%, transparent 50%)',
          'radial-gradient(at 100% 100%, #7c3aed 0%, transparent 50%), radial-gradient(at 0% 100%, #db2777 0%, transparent 50%), radial-gradient(at 0% 0%, #2563eb 0%, transparent 50%), radial-gradient(at 100% 0%, #10b981 0%, transparent 50%)',
          'radial-gradient(at 0% 100%, #7c3aed 0%, transparent 50%), radial-gradient(at 0% 0%, #db2777 0%, transparent 50%), radial-gradient(at 100% 0%, #2563eb 0%, transparent 50%), radial-gradient(at 100% 100%, #10b981 0%, transparent 50%)',
        ],
      }}
      transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
    />

    {/* Layer 2: Floating accent orbs (Faster Rotation + Richer Conic) */}
    <motion.div
      className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] z-0 opacity-60"
      animate={{ rotate: 360 }}
      transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
      style={{
        background:
          'conic-gradient(from 0deg at 50% 50%, #4c1d95, #1e3a8a, #4338ca, #4c1d95)',
      }}
    />
  </div>
);

export default AuthBackground;
