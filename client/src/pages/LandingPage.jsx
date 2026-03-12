import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useInView,
  AnimatePresence,
  LayoutGroup,
} from 'framer-motion';
import { Calendar } from 'lucide-react';
import config from '../config';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import { logEvent } from '../utils/analytics';

// --- Advanced Animation Components ---

// Complex 3D Twist & Fade Reveal
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

// Parallax Wrapper
const ParallaxEl = ({ children, speed = 1, className = '' }) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [50 * speed, -50 * speed]);

  return (
    <motion.div ref={ref} style={{ y }} className={className}>
      {children}
    </motion.div>
  );
};

const CountUp = ({ value }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const num = parseFloat(String(value).replace(/[^0-9.]/g, '')) || 0;
  const springValue = useSpring(0, { stiffness: 40, damping: 30, duration: 2500 });
  const displayValue = useTransform(springValue, (current) => {
    return num % 1 !== 0 ? current.toFixed(1) : Math.floor(current);
  });

  useEffect(() => {
    if (isInView) springValue.set(num);
  }, [isInView, num, springValue]);

  return (
    <div
      ref={ref}
      className="text-4xl md:text-5xl font-light tracking-tighter text-neutral-900 dark:text-white mb-2"
    >
      <motion.span>{displayValue}</motion.span>
      {String(value).includes('k') && <span className="text-2xl text-neutral-400">k+</span>}
      {String(value).includes('+') && !String(value).includes('k') && (
        <span className="text-2xl text-neutral-400">+</span>
      )}
    </div>
  );
};

// --- Reusable Redefined Box Content ---
const RedefinedBoxContent = () => (
  <>
    {/* Animated Background Layers */}
    <motion.div
      className="absolute inset-0 z-0 opacity-100 blur-xl"
      animate={{
        background: [
          'radial-gradient(at 0% 0%, #7c3aed 0%, transparent 50%), radial-gradient(at 100% 0%, #db2777 0%, transparent 50%), radial-gradient(at 100% 100%, #2563eb 0%, transparent 50%), radial-gradient(at 0% 100%, #10b981 0%, transparent 50%)',
          'radial-gradient(at 100% 0%, #7c3aed 0%, transparent 50%), radial-gradient(at 100% 100%, #db2777 0%, transparent 50%), radial-gradient(at 0% 100%, #2563eb 0%, transparent 50%), radial-gradient(at 0% 0%, #10b981 0%, transparent 50%)',
          'radial-gradient(at 100% 100%, #7c3aed 0%, transparent 50%), radial-gradient(at 0% 100%, #db2777 0%, transparent 50%), radial-gradient(at 0% 0%, #2563eb 0%, transparent 50%), radial-gradient(at 100% 0%, #10b981 0%, transparent 50%)',
          'radial-gradient(at 0% 100%, #7c3aed 0%, transparent 50%), radial-gradient(at 0% 0%, #db2777 0%, transparent 50%), radial-gradient(at 100% 0%, #2563eb 0%, transparent 50%), radial-gradient(at 100% 100%, #10b981 0%, transparent 50%)',
        ],
      }}
      transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
    />
    <motion.div
      className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] z-0 opacity-80 mix-blend-multiply"
      animate={{ rotate: 360 }}
      transition={{ duration: 45, repeat: Infinity, ease: 'linear' }}
      style={{ background: 'conic-gradient(from 0deg at 50% 50%, #4c1d95, #1e3a8a, #4c1d95)' }}
    />

    <motion.h1
      layout="position"
      className="relative z-10 text-[10vw] lg:text-[11vw] leading-[0.8] font-bold tracking-tighter uppercase transform skew-x-6 hover:skew-x-0 transition-transform duration-500 text-white"
    >
      Redefined
    </motion.h1>
  </>
);

const EventCard = ({ event, index }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-10%' });

  useEffect(() => {
    if (isInView && event._id) {
      logEvent({ 
        eventId: event._id, 
        type: 'impression', 
        source: 'landing' 
      });
    }
  }, [isInView, event._id]);

  const handleClick = () => {
    if (event._id) {
      logEvent({ 
        eventId: event._id, 
        type: 'click', 
        source: 'landing' 
      });
    }
  };

  return (
    <ScrollReveal delay={index * 0.1} className="flex justify-center">
      <Link 
        ref={ref}
        to={`/events/${event._id}`}
        onClick={handleClick}
        className="group w-full max-w-md flex flex-col gap-6 cursor-pointer"
      >
        {/* Image Container - Square */}
        <div className="w-full aspect-square relative overflow-hidden bg-neutral-900 box-border border-4 border-transparent group-hover:border-black dark:group-hover:border-white transition-all duration-500">
          <motion.div
            whileHover={{ scale: 1.1 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="w-full h-full"
          >
            {event.imageUrl ? (
              <img
                src={event.imageUrl}
                alt={event.title}
                className="object-cover w-full h-full grayscale-0 group-hover:grayscale transition-all duration-700"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center opacity-20">
                <Calendar className="w-16 h-16 text-white" />
              </div>
            )}
          </motion.div>

          <div className="absolute top-0 left-0 bg-black text-white px-4 py-2 text-xs font-bold uppercase tracking-widest z-10">
            {event.category || 'Event'}
          </div>
        </div>

        {/* Info - Increased Text Size */}
        <div className="space-y-2 relative border-l-4 border-neutral-200 dark:border-neutral-800 pl-6 transition-colors group-hover:border-black dark:group-hover:border-white">
          <h3 className="text-4xl md:text-5xl font-bold uppercase tracking-tighter text-neutral-900 dark:text-white leading-[0.9] group-hover:text-neutral-500 transition-colors">
            {event.title}
          </h3>
          <div className="flex flex-col gap-1 pt-2">
            <span className="text-sm font-bold uppercase tracking-widest text-neutral-400">
              {new Date(event.date).toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </span>
            <span className="text-sm font-bold uppercase tracking-widest text-neutral-400">
              {event.location || 'Campus'}
            </span>
          </div>
        </div>
      </Link>
    </ScrollReveal>
  );
};

export default function LandingPage() {
  const [stats, setStats] = useState({ students: 0, hosts: 0, events: 0, campuses: 0 });
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasScrolled, setHasScrolled] = useState(false);

  // Parallax for hero
  const { scrollY } = useScroll();
  const opacityHero = useTransform(scrollY, [0, 600], [1, 0]);
  const yHero = useTransform(scrollY, [0, 600], [0, 200]);

  // Scroll Trigger Logic
  useEffect(() => {
    // Disable scroll initially
    if (!hasScrolled) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }

    const handleScroll = () => {
      if (!hasScrolled) {
        setHasScrolled(true);
      }
    };

    window.addEventListener('wheel', handleScroll, { passive: true });
    window.addEventListener('touchmove', handleScroll, { passive: true });
    window.addEventListener('keydown', handleScroll, { passive: true }); // also unlock on key press

    return () => {
      document.body.style.overflow = 'auto';
      window.removeEventListener('wheel', handleScroll);
      window.removeEventListener('touchmove', handleScroll);
      window.removeEventListener('keydown', handleScroll);
    };
  }, [hasScrolled]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        let baseUrl = config?.apiBaseUrl || 'http://localhost:5000/api';
        if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
        if (!baseUrl.endsWith('/api')) baseUrl += '/api';

        const [statsRes, eventsRes] = await Promise.all([
          fetch(`${baseUrl}/host/public/stats`),
          fetch(`${baseUrl}/host/public/events?limit=4`),
        ]);
        if (statsRes.ok) setStats(await statsRes.json());
        if (eventsRes.ok) setEvents(await eventsRes.json());
      } catch (err) {
        console.error('Failed to fetch landing data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <LayoutGroup>
      <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white font-sans selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black overflow-x-hidden perspective-[1px]">
        <Navbar />

        {/* --- INITIAL FULLSCREEN OVERLAY (Before Scroll) --- */}
        <AnimatePresence>
          {!hasScrolled && (
            <motion.div
              layoutId="redefined-box"
              className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black overflow-hidden"
              transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="flex flex-col items-center justify-center">
                <motion.span
                  layoutId="events-text"
                  className="text-[10vw] lg:text-[11vw] leading-[0.85] font-bold tracking-tighter uppercase mb-6 text-white"
                >
                  Events
                </motion.span>
                <RedefinedBoxContent />
              </div>

              {/* Optional Prompt to Scroll */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="absolute bottom-10 left-1/2 -translate-x-1/2 text-neutral-500 font-bold uppercase tracking-widest text-sm"
              >
                Scroll to enter
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- HERO SECTION (Centered Correctly) --- */}
        <section className="relative min-h-screen flex flex-col justify-center items-center px-6">
          {/* Background Elements */}
          <div
            className="absolute inset-0 z-0 pointer-events-none opacity-20 dark:opacity-10"
            style={{
              backgroundImage:
                'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
              backgroundSize: '40px 40px',
            }}
          ></div>

          <div className="max-w-[1800px] mx-auto w-full relative z-10">
            <motion.div
              style={{ y: yHero, opacity: opacityHero }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center"
            >
              {/* Text Content - Centered */}
              <div className="lg:col-span-8 flex flex-col items-start z-20">
                <ScrollReveal delay={0}>
                  {/* BIG TYPOGRAPHY */}
                  <h1 className="text-[10vw] lg:text-[11vw] leading-[0.85] font-bold tracking-tighter uppercase mb-6">
                    <span
                      className="block text-transparent stroke-text hover:text-black dark:hover:text-white transition-colors duration-500"
                      style={{ WebkitTextStroke: '2px currentColor', color: 'transparent' }}
                    >
                      Campus
                    </span>
                    {/* Events Text - Color Shift Animation */}
                    {hasScrolled ? (
                      <motion.span
                        layoutId="events-text"
                        className="block text-black dark:text-white"
                        transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                      >
                        Events
                      </motion.span>
                    ) : (
                      <span className="block opacity-0">Events</span>
                    )}
                  </h1>
                </ScrollReveal>

                <div className="w-full">
                  {/* INVERTED BLOCK for REDEFINED - Only render when scrolled into place */}
                  {hasScrolled ? (
                    <motion.div
                      layoutId="redefined-box"
                      className="relative px-6 py-4 md:px-10 md:py-6 inline-block w-full md:w-auto transform -skew-x-6 hover:skew-x-0 transition-transform duration-500 origin-left overflow-hidden border border-neutral-800 bg-black shadow-2xl shadow-purple-500/20"
                      transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <RedefinedBoxContent />
                    </motion.div>
                  ) : (
                    // Placeholder to maintain layout space while box is fullscreen
                    <div className="px-6 py-4 md:px-10 md:py-6 inline-block w-full md:w-auto opacity-0 pointer-events-none">
                      <h1 className="text-[10vw] lg:text-[11vw] leading-[0.8] font-bold tracking-tighter uppercase">
                        Redefined
                      </h1>
                    </div>
                  )}
                </div>

                <ScrollReveal delay={0.4}>
                  <div className="mt-16 flex flex-col md:flex-row gap-8 items-center">
                    <Link
                      to="/dashboard"
                      className="px-12 py-6 bg-transparent border-2 border-black dark:border-white text-xl font-bold uppercase tracking-widest hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all"
                    >
                      Get Started
                    </Link>
                    <p className="text-xl max-w-sm font-medium text-neutral-500 dark:text-neutral-400 leading-tight">
                      Connect, Host, Certify. <br /> The Ultimate Student Platform.
                    </p>
                  </div>
                </ScrollReveal>
              </div>

              {/* Hero Image (Right Side, Centered) */}
              <div className="lg:col-span-4 flex flex-col justify-center items-center mt-12 lg:mt-0">
                <ScrollReveal delay={0.6}>
                  <ParallaxEl speed={0.5}>
                    <motion.div
                      whileHover={{ scale: 0.98 }}
                      className="w-[80vw] lg:w-full aspect-[4/5] max-w-[500px] bg-neutral-100 dark:bg-neutral-900 relative overflow-hidden ring-1 ring-black/10 dark:ring-white/10 p-2"
                    >
                      <div className="absolute inset-2 border border-black/10 dark:border-white/10 z-20 pointer-events-none" />
                      <img
                        src="https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?q=80&w=1000&auto=format&fit=crop"
                        alt="Concert"
                        className="w-full h-full object-cover grayscale-0 hover:grayscale transition-all duration-1000"
                      />
                    </motion.div>
                  </ParallaxEl>
                </ScrollReveal>
              </div>
            </motion.div>
          </div>

          {/* Down Arrow */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, y: [0, 20, 0] }}
            transition={{ delay: 1, duration: 2, repeat: Infinity }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 text-2xl font-bold text-black dark:text-white"
          >
            ↓
          </motion.div>
        </section>

        {/* --- STATS SECTION --- */}
        <section className="py-24 bg-neutral-50 dark:bg-neutral-900/50 border-t border-black dark:border-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-neutral-300 dark:divide-neutral-700">
              {[
                { label: 'Active Students', val: stats.students },
                { label: 'Active Hosts', val: stats.hosts },
                { label: 'Events Hosted', val: stats.events },
              ].map((s, i) => (
                <ScrollReveal key={i} delay={i * 0.2}>
                  <div className="py-12 px-6 flex flex-col items-center justify-center text-center group hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors cursor-default">
                    <CountUp value={loading ? 0 : s.val} />
                    <div className="h-1 w-12 bg-black dark:bg-white my-4 group-hover:w-24 transition-all duration-500" />
                    <span className="text-sm font-bold uppercase tracking-[0.2em]">{s.label}</span>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* --- EVENTS SECTION --- */}
        <section className="py-40">
          <div className="max-w-[1600px] mx-auto px-6">
            <ScrollReveal>
              <div className="mb-24 border-b-4 border-black dark:border-white pb-6 flex justify-between items-end">
                <h2 className="text-6xl md:text-8xl font-bold tracking-tighter uppercase leading-[0.8]">
                  Trending
                </h2>
                <Link
                  to="/dashboard"
                  className="hidden md:block text-xl font-bold uppercase tracking-widest hover:underline mb-4"
                >
                  View All
                </Link>
              </div>
            </ScrollReveal>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-20">
              {loading ? (
                [1, 2, 3, 4].map((n) => (
                  <div
                    key={n}
                    className="aspect-square bg-neutral-100 dark:bg-neutral-900 animate-pulse"
                  />
                ))
              ) : events.length > 0 ? (
                events.map((ev, i) => <EventCard key={ev._id} event={ev} index={i} />)
              ) : (
                <p className="col-span-2 text-center py-20 uppercase tracking-widest">
                  No events found.
                </p>
              )}
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </LayoutGroup>
  );
}
