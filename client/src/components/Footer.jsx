import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Twitter, Instagram, Linkedin, Github } from 'lucide-react';

// Standard ScrollReveal for internal footer elements
const ScrollReveal = ({ children, delay = 0, className = '' }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 80, rotateX: 15, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
      viewport={{ once: true, margin: '-10%' }}
      transition={{
        duration: 0.8,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={`transform-gpu ${className}`}
    >
      {children}
    </motion.div>
  );
};

export default function Footer() {
  return (
    <footer className="pt-24 pb-12 px-6 bg-white text-black border-t border-neutral-200 relative overflow-hidden">
      {/* Layer 1: Base drifting mesh */}
      <motion.div
        className="absolute inset-0 z-0 opacity-40 blur-3xl"
        animate={{
          background: [
            'radial-gradient(at 0% 0%, #ffdee9 0%, transparent 50%), radial-gradient(at 100% 0%, #c1fcd3 0%, transparent 50%), radial-gradient(at 100% 100%, #b5fffc 0%, transparent 50%), radial-gradient(at 0% 100%, #fffc00 0%, transparent 50%)',
            'radial-gradient(at 100% 0%, #ffdee9 0%, transparent 50%), radial-gradient(at 100% 100%, #c1fcd3 0%, transparent 50%), radial-gradient(at 0% 100%, #b5fffc 0%, transparent 50%), radial-gradient(at 0% 0%, #fffc00 0%, transparent 50%)',
            'radial-gradient(at 100% 100%, #ffdee9 0%, transparent 50%), radial-gradient(at 0% 100%, #c1fcd3 0%, transparent 50%), radial-gradient(at 0% 0%, #b5fffc 0%, transparent 50%), radial-gradient(at 100% 0%, #fffc00 0%, transparent 50%)',
            'radial-gradient(at 0% 100%, #ffdee9 0%, transparent 50%), radial-gradient(at 0% 0%, #c1fcd3 0%, transparent 50%), radial-gradient(at 100% 0%, #b5fffc 0%, transparent 50%), radial-gradient(at 100% 100%, #fffc00 0%, transparent 50%)',
          ],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
      />

      {/* Layer 2: Floating accent orbs */}
      <motion.div
        className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] z-0 opacity-30 mix-blend-multiply"
        animate={{ rotate: 360 }}
        transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
        style={{
          background: 'conic-gradient(from 0deg at 50% 50%, #fbc2eb, #a6c1ee, #fbc2eb)',
        }}
      />

      <ScrollReveal className="relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start">
          <div className="mb-12 md:mb-0">
            <h4 className="text-8xl font-bold tracking-tighter mb-4 text-black mix-blend-multiply">
              Evenite.
            </h4>
            <p className="text-neutral-600 max-w-xs font-medium">
              Redefining how you experience campus life. Join the revolution.
            </p>
          </div>
          <div className="flex flex-col gap-4 text-right">
            {/* Replaced Terms/Privacy links with Social Icons */}
            <div className="flex gap-6 items-center">
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-black text-white hover:bg-neutral-800 transition-colors rounded-full"
              >
                <Twitter size={20} />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-black text-white hover:bg-neutral-800 transition-colors rounded-full"
              >
                <Instagram size={20} />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-black text-white hover:bg-neutral-800 transition-colors rounded-full"
              >
                <Linkedin size={20} />
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-black text-white hover:bg-neutral-800 transition-colors rounded-full"
              >
                <Github size={20} />
              </a>
            </div>
          </div>
        </div>
        <div className="mt-16 pt-8 border-t border-black/10 flex justify-between items-end text-[10px] uppercase tracking-widest text-neutral-500 font-bold">
          <span>© {new Date().getFullYear()} Evenite Inc.</span>
          <span>All Rights Reserved</span>
        </div>
      </ScrollReveal>
    </footer>
  );
}
