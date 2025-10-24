// src/pages/HomePage.jsx
import React, { useState } from "react";
import Login from "../components/Login";
import Register from "../components/Register";
import "./HomePage.css";

// Canvas particle background
function BackgroundAnimation() {
  const canvasRef = React.useRef(null);
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf = 0;

    const resize = () => {
      // Full-screen background, simpler sizing to ensure visibility
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();

    const width = () => window.innerWidth;
    const height = () => window.innerHeight;

    // Create particles
    const particles = Array.from({ length: 160 }, () => ({
      x: Math.random() * width(),
      y: Math.random() * height(),
      r: Math.random() * 2 + 1,
      dx: Math.random() * 0.6 - 0.3,
      dy: Math.random() * 0.6 - 0.3,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, width(), height());
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.fill();
        p.x += p.dx; p.y += p.dy;
        if (p.x < 0 || p.x > width()) p.dx *= -1;
        if (p.y < 0 || p.y > height()) p.dy *= -1;
      }
      raf = requestAnimationFrame(draw);
    };

    window.addEventListener('resize', resize);
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      id="bg-canvas"
      ref={canvasRef}
      className="fixed inset-0 z-10 w-screen h-screen pointer-events-none"
    />
  );
}

export default function HomePage() {
  const [mode, setMode] = useState("login");
  const [isTransitioning, setIsTransitioning] = useState(false);

  const switchToLogin = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setMode("login");
      setIsTransitioning(false);
    }, 150);
  };

  const switchToRegister = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setMode("register");
      setIsTransitioning(false);
    }, 150);
  };



  return (
    <div className="relative h-screen flex items-center justify-center text-white overflow-hidden">
      {/* Gradient animated background layer */}
      <div className="auth-bg" aria-hidden="true" />
      {/* Particles canvas */}
      <BackgroundAnimation />
      <div className="form-container relative z-20">
     <h1
  style={{
    fontFamily: "'Poppins', sans-serif",
    color: "white",
    textShadow: "1px 1px 4px rgba(0,0,0,0.5)",
    letterSpacing: "1px"
  }}
  className="text-5xl font-extrabold animate-fadeIn"
>
  Student Event Portal
</h1>

        
        <div className={`transition-opacity duration-150 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
          {mode === "login" ? (
            <Login onSwitchToRegister={switchToRegister} />
          ) : (
            <Register onSwitchToLogin={switchToLogin} />
          )}
        </div>


      </div>
      
      {/* ToastContainer moved to App.js for global placement */}
    </div>
  );
}
