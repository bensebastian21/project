// src/pages/LandingPage.jsx
import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";

// Note: Place your images under public/assets and update the file names below
// e.g., d:\\ben\\Project\\client\\public\\assets\\hero.jpg
const IMG = {
  hero: "/assets/hero.jpg", // Big header background
  tour1: "/assets/hackathon.jpg",
  tour2: "/assets/hackathon.jpg",
  tour3: "/assets/section3.jpg",
  tour4: "/assets/banner.jpg",
  sky: "/assets/banner.jpg", // Milky-way like banner
};

export default function LandingPage() {
  // Smooth-scroll anchors
  const heroRef = useRef(null);
  const exploreRef = useRef(null);
  const popularRef = useRef(null);
  const contactRef = useRef(null);

  // Add a class to body and html to hide the scrollbar only on this page
  useEffect(() => {
    document.body.classList.add("no-scrollbar");
    document.documentElement.classList.add("no-scrollbar");
    return () => {
      document.body.classList.remove("no-scrollbar");
      document.documentElement.classList.remove("no-scrollbar");
    };
  }, []);

  useEffect(() => {
    const reveal = () => {
      document.querySelectorAll("[data-reveal]").forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.9) {
          el.classList.add("opacity-100", "translate-y-0");
        }
      });
    };
    reveal();
    window.addEventListener("scroll", reveal);
    return () => window.removeEventListener("scroll", reveal);
  }, []);

  const scrollTo = (ref) => ref?.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="min-h-screen bg-[#0b0f14] text-white no-scrollbar">
      {/* Top Nav (fluid) */}
      <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-md bg-black/30 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-14 flex items-center justify-between">
          <button onClick={() => scrollTo(heroRef)} className="flex items-center gap-2 group">
            <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center group-hover:scale-110 transition">★</div>
            <span className="font-semibold tracking-wide">Evenite</span>
          </button>
          <nav className="hidden md:flex items-center gap-6 text-sm text-white/80">
            <button onClick={() => scrollTo(exploreRef)} className="hover:text-white transition">Explore</button>
            <button onClick={() => scrollTo(popularRef)} className="hover:text-white transition">Popular</button>
            <button onClick={() => scrollTo(contactRef)} className="hover:text-white transition">Contact</button>
            <Link to="/login" className="px-4 py-1.5 rounded bg-white text-black hover:bg-white/90 transition">Login</Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section ref={heroRef} className="relative h-[88vh] flex items-center overflow-hidden">
        <img src={IMG.hero} alt="Evenite hero" className="absolute inset-0 w-full h-full object-cover scale-105 animate-[pulse_6s_ease-in-out_infinite]" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/40 to-[#0b0f14]" />
        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 w-full">
          <div className="max-w-2xl" data-reveal>
            <p className="uppercase tracking-[0.35em] text-xs md:text-sm text-white/80 mb-3">Student Event Registration</p>
            <h1 className="text-5xl md:text-7xl font-extrabold leading-[0.95]">Plan. Register. Celebrate with Evenite.</h1>
            <p className="mt-5 text-white/80">Discover campus events, hackathons, fests and workshops. Register in seconds, collect certificates, and share reviews.</p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link to="/dashboard" className="px-6 py-3 rounded-xl bg-white text-black font-semibold hover:scale-[1.02] transition">Explore Events</Link>
              <button onClick={() => scrollTo(popularRef)} className="px-6 py-3 rounded-xl border border-white/40 hover:bg-white/10 transition">Popular Now</button>
            </div>
          </div>
        </div>
      </section>

      {/* Explore (features) */}
      <section ref={exploreRef} className="py-16 md:py-24 px-6 md:px-10 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { title: "One-click Registration", desc: "Seamless signups with smart capacity checks.", img: IMG.tour1 },
            { title: "Host Tools", desc: "Manage attendees, reviews, and certificates.", img: IMG.tour2 },
            { title: "Student Reviews", desc: "Share experiences with star ratings & custom fields.", img: IMG.tour3 },
          ].map((c, i) => (
            <article key={c.title} data-reveal className="opacity-0 translate-y-6 transition-all duration-700 bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-white/20">
              <img src={c.img} alt={c.title} className="h-48 w-full object-cover hover:scale-105 transition duration-500" />
              <div className="p-6">
                <h3 className="font-semibold text-lg mb-1">{c.title}</h3>
                <p className="text-sm text-white/70">{c.desc}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Popular Events */}
      <section ref={popularRef} className="py-12 md:py-16 px-6 md:px-10 max-w-7xl mx-auto">
        <h2 className="text-center text-2xl md:text-3xl font-bold mb-10">Popular on Evenite</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { title: "Tech Fest", img: IMG.tour1 },
            { title: "AI Hackathon", img: IMG.tour2 },
            { title: "Cultural Night", img: IMG.tour3 },
            { title: "Design Sprint", img: IMG.tour4 },
          ].map((e, idx) => (
            <div key={idx} data-reveal className="opacity-0 translate-y-6 transition-all duration-700 bg-white/5 border border-white/10 rounded-xl overflow-hidden">
              <img src={e.img} alt={e.title} className="h-44 w-full object-cover" />
              <div className="p-4">
                <div className="text-white/80 text-xs">Event</div>
                <div className="font-semibold">{e.title}</div>
                <div className="mt-3 flex items-center justify-between">
                  <Link to="/dashboard" className="text-sm text-black bg-white px-3 py-1.5 rounded hover:bg-white/90">Register</Link>
                  <Link to="/dashboard" className="text-sm text-white/70 hover:text-white">Details →</Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Sky Banner + mini gallery */}
      <section className="relative">
        <img src={IMG.sky} alt="Inspire" className="w-full h-[360px] object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f14] via-black/40 to-black/30" />
        <div className="absolute inset-0 max-w-7xl mx-auto px-6 md:px-10 flex items-center">
          <div data-reveal className="opacity-0 translate-y-6 transition-all duration-700">
            <h3 className="text-3xl md:text-4xl font-extrabold">Travel the campus. Inspire your life.</h3>
            <p className="text-white/80 mt-2 max-w-xl">Find your next event and collect unforgettable moments. Evenite brings students and hosts together.</p>
            <div className="mt-6">
              <Link to="/dashboard" className="px-6 py-3 rounded-xl bg-white text-black font-semibold hover:scale-[1.02] transition">Browse Events</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Contact (inline) */}
      <section ref={contactRef} className="py-16 md:py-20 px-6 md:px-10 max-w-5xl mx-auto">
        <h3 className="text-2xl font-semibold mb-6">Get in touch</h3>
        <form className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input className="bg-white/5 border border-white/10 rounded px-3 py-2" placeholder="Name" required />
          <input className="bg-white/5 border border-white/10 rounded px-3 py-2" placeholder="Email" type="email" required />
          <input className="bg-white/5 border border-white/10 rounded px-3 py-2" placeholder="Subject" />
          <input className="bg-white/5 border border-white/10 rounded px-3 py-2" placeholder="Phone" />
          <textarea className="bg-white/5 border border-white/10 rounded px-3 py-2 md:col-span-2" placeholder="Message" rows={5} required />
          <button type="submit" className="bg-white text-black px-5 py-2 rounded w-max hover:bg-white/90">Send</button>
        </form>
      </section>

      {/* Footer */}
      <footer className="bg-black/60 text-white">
        <div className="px-6 md:px-10 py-10 max-w-7xl mx-auto grid md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 bg-white/10 rounded-full flex items-center justify-center text-xl">★</div>
              <div className="text-lg font-semibold tracking-wider">Evenite</div>
            </div>
            <p className="text-white/70 text-sm">A student event registration portal. Discover, register and review.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Contact</h4>
            <p className="text-white/70 text-sm">Campus Road, Kerala</p>
            <p className="text-white/70 text-sm">Email: hello@evenite.app</p>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Quick Links</h4>
            <ul className="space-y-2 text-white/80 text-sm">
              <li><button onClick={() => scrollTo(exploreRef)} className="hover:underline">Explore</button></li>
              <li><button onClick={() => scrollTo(popularRef)} className="hover:underline">Popular</button></li>
              <li><Link to="/login" className="hover:underline">Login</Link></li>
            </ul>
          </div>
        </div>
        <div className="px-6 md:px-10 py-4 text-center text-xs text-white/60 border-t border-white/10">© {new Date().getFullYear()} Evenite</div>
      </footer>
    </div>
  );
}