// HomePage.jsx
import React, { useState, useEffect } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import "./HomePage.css";

function BackgroundAnimation() {
  useEffect(() => {
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
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const validateRegister = (formData) => {
    const errs = {};
    if (!formData.get("username")) errs.username = "Username is required";
    if (!formData.get("fullname")) errs.fullname = "Full name is required";
    if (!formData.get("email")) errs.email = "Email is required";
    if (!formData.get("password")) errs.password = "Password is required";
    if (formData.get("password") !== formData.get("confirmPassword"))
      errs.confirmPassword = "Passwords do not match";
    if (!formData.get("studentId")?.name.match(/\.(jpg|jpeg|png)$/i))
      errs.studentId = "Upload only image files";
    const age = parseInt(formData.get("age"));
    if (isNaN(age) || age < 13) errs.age = "Age must be 13 or older";
    return errs;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const validation = validateRegister(formData);
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }
    try {
      await api.post("/api/auth/register", formData);
      toast.success("✅ Registered Successfully");
      setMode("login");
    } catch (err) {
      toast.error("❌ Register Failed: " + err.response?.data?.error);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const form = e.target;
    const email = form.email.value;
    const password = form.password.value;
    const loginErrors = {};
    if (!email) loginErrors.email = "Email is required";
    if (!password) loginErrors.password = "Password is required";
    if (Object.keys(loginErrors).length > 0) {
      setErrors(loginErrors);
      return;
    }
    try {
      const res = await api.post("/api/auth/login", { email, password });
      localStorage.setItem("token", res.data.token);
      toast.success("✅ Login Successful");
      navigate("/dashboard");
    } catch (err) {
      toast.error("❌ Login Failed: " + err.response?.data?.error);
    }
  };

  const courses = ["B.Tech", "B.Sc", "B.Com", "M.Tech", "MCA", "MBA"];

  return (
    <div className="relative h-screen overflow-y-auto text-white">
      <BackgroundAnimation />
      <div className="form-container">
        <h1 className="text-3xl font-bold mb-4">Student Event Portal</h1>
        <div className="tabs">
          <button onClick={() => setMode("login")} className={mode === "login" ? "active" : ""}>Login</button>
          <button onClick={() => setMode("register")} className={mode === "register" ? "active" : ""}>Register</button>
        </div>

        {mode === "login" ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <input name="email" placeholder="Email" className="input" />
            {errors.email && <p className="error">{errors.email}</p>}
            <input name="password" type="password" placeholder="Password" className="input" />
            {errors.password && <p className="error">{errors.password}</p>}
            <button className="btn">Login</button>
            <GoogleLogin
              onSuccess={(cred) => {
                const user = jwtDecode(cred.credential);
                toast.success("✅ Google login success");
                localStorage.setItem("user", JSON.stringify(user));
                navigate("/dashboard");
              }}
              onError={() => toast.error("❌ Google login failed")}
            />
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-3">
            <input name="username" placeholder="Username" className="input" />
            {errors.username && <p className="error">{errors.username}</p>}

            <input name="fullname" placeholder="Full Name" className="input" />
            {errors.fullname && <p className="error">{errors.fullname}</p>}

            <div className="flex gap-2">
              <input name="street" placeholder="Street" className="input" />
              <input name="city" placeholder="City" className="input" />
              <input name="pincode" placeholder="Pincode" className="input" />
            </div>

            <input name="age" placeholder="Age" className="input" />
            {errors.age && <p className="error">{errors.age}</p>}

            <select name="course" className="input">
              <option value="">Select Course</option>
              {courses.map((c, i) => (
                <option key={i} value={c}>{c}</option>
              ))}
            </select>

            <input name="email" placeholder="Email" className="input" />
            {errors.email && <p className="error">{errors.email}</p>}

            <div className="flex">
              <select name="countryCode" className="input w-1/3">
                <option value="+91">+91</option>
                <option value="+1">+1</option>
                <option value="+44">+44</option>
              </select>
              <input name="phone" placeholder="Phone" className="input w-2/3" />
            </div>

            <label className="text-sm font-semibold">Student ID Upload (image only)</label>
            <input name="studentId" type="file" className="input" accept="image/*" />
            {errors.studentId && <p className="error">{errors.studentId}</p>}

            <input name="password" type="password" placeholder="Password" className="input" />
            <input name="confirmPassword" type="password" placeholder="Confirm Password" className="input" />
            {errors.confirmPassword && <p className="error">{errors.confirmPassword}</p>}

            <button className="btn">Register</button>
            <GoogleLogin
              onSuccess={(cred) => {
                const user = jwtDecode(cred.credential);
                toast.success("✅ Google signup success");
                localStorage.setItem("user", JSON.stringify(user));
                navigate("/dashboard");
              }}
              onError={() => toast.error("❌ Google signup failed")}
            />
          </form>
        )}
        <ToastContainer position="top-right" autoClose={3000} />
      </div>
    </div>
  );
}
