// src/pages/HomePage.jsx
import React, { useState } from "react";
import Login from "../components/Login";
import Register from "../components/Register";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./HomePage.css";

// Canvas particle background
function BackgroundAnimation() {
  React.useEffect(() => {
    const canvas = document.getElementById("bg-canvas");
    const ctx = canvas.getContext("2d");
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    let particles = [];

    for (let i = 0; i < 100; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 2 + 1,
        dx: Math.random() * 0.5 - 0.25,
        dy: Math.random() * 0.5 - 0.25,
      });
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);
      particles.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff88";
        ctx.fill();
        p.x += p.dx;
        p.y += p.dy;
        if (p.x < 0 || p.x > width) p.dx *= -1;
        if (p.y < 0 || p.y > height) p.dy *= -1;
      });
      requestAnimationFrame(draw);
    }

    draw();
  }, []);

  return <canvas id="bg-canvas" className="absolute top-0 left-0 z-0" />;
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
    <div className="relative h-screen flex items-center justify-center text-white overflow-auto">
      <BackgroundAnimation />
      <div className="form-container">
        <h1>Student Event Portal</h1>
        
        {/* Mode indicator */}
        <div className="text-center mb-4">
          <span className={`text-sm px-3 py-1 rounded-full transition-all duration-300 ${
            mode === "login" 
              ? "bg-blue-500 text-white" 
              : "bg-green-500 text-white"
          }`}>
            {mode === "login" ? "🔐 Login Mode" : "📝 Registration Mode"}
          </span>
        </div>
        
        <div className={`transition-opacity duration-150 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
          {mode === "login" ? (
            <Login onSwitchToRegister={switchToRegister} />
          ) : (
            <Register onSwitchToLogin={switchToLogin} />
          )}
        </div>
      </div>
      
      {/* Global Toast Container - Positioned at top right of page */}
      <ToastContainer 
        position="top-right" 
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick={true}
        rtl={false}
        pauseOnFocusLoss={true}
        draggable={true}
        pauseOnHover={true}
        theme="dark"
        style={{
          top: '20px',
          right: '20px',
          zIndex: 9999
        }}
      />
    </div>
  );
}
