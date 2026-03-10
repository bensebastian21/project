import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';

const Reveal = ({ children, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
  >
    {children}
  </motion.div>
);

export default function About() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });
  const y = useTransform(scrollYProgress, [0, 1], [0, -50]);

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white font-sans selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black">
      <Navbar />

      <main className="pt-32 pb-24 px-6 relative overflow-hidden" ref={containerRef}>
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20">
          <div className="flex flex-col justify-center z-10">
            <Reveal>
              <h1 className="text-[12vw] lg:text-[8rem] leading-[0.85] font-bold tracking-tighter uppercase mb-8">
                Our <br /> Story
              </h1>
            </Reveal>
            <Reveal delay={0.2}>
              <div className="text-xl md:text-2xl font-medium leading-relaxed max-w-lg text-neutral-600 dark:text-neutral-400">
                <p className="mb-8">
                  Evenite was born from a simple observation: campus life is vibrant, but often
                  disconnected. We set out to build the digital bridge.
                </p>
                <p>
                  Today, we are the leading platform for student connectivity, empowering thousands
                  of hosts to create unforgettable experiences and verified communities.
                </p>
              </div>
            </Reveal>
          </div>

          <div className="relative h-[60vh] lg:h-auto z-0">
            <motion.div
              style={{ y }}
              className="w-full h-full bg-neutral-100 dark:bg-neutral-900 overflow-hidden relative"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-black via-transparent to-transparent z-10" />
              <img
                src="https://images.unsplash.com/photo-1523580494863-6f3031224c94?q=80&w=1000&auto=format&fit=crop"
                alt="Campus Life"
                className="w-full h-full object-cover grayscale opacity-80"
              />
            </motion.div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-40 mb-20">
          <div className="border-t border-black dark:border-white pt-10 grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              {
                title: 'Connect',
                desc: 'Bringing students together across disciplines and interests.',
              },
              {
                title: 'Create',
                desc: 'Tools for hosts to design, manage, and promote events effortlessly.',
              },
              {
                title: 'Celebrate',
                desc: 'Capturing moments and verifying participation with digital certificates.',
              },
            ].map((item, i) => (
              <Reveal key={i} delay={0.4 + i * 0.1}>
                <h3 className="text-4xl font-bold uppercase tracking-tighter mb-4">{item.title}</h3>
                <p className="text-neutral-500 font-medium">{item.desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
