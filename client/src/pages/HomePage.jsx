import React, { useState, useEffect } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import { ToastContainer, toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import "react-toastify/dist/ReactToastify.css";
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

const initialForm = {
  username: "",
  fullname: "",
  institute: "",
  street: "",
  city: "",
  pincode: "",
  age: "",
  course: "",
  email: "",
  phone: "",
  countryCode: "+91",
  studentId: null,
  password: "",
  confirmPassword: "",
};


export default function HomePage() {
  const [mode, setMode] = useState("login");
  const [formData, setFormData] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const validate = (field, value) => {
    switch (field) {
      case "email":
        return /\S+@\S+\.\S+/.test(value) ? "" : "Invalid email format";
      case "password":
        return value.length >= 6 ? "" : "Password must be at least 6 characters";
      case "username":
      case "fullname":
      case "institute":
      case "address":
      case "course":
        return value.trim() ? "" : "This field is required";
      case "age":
        return value >= 10 && value <= 100 ? "" : "Enter a valid age";
      case "phone":
        return /^\d{10}$/.test(value) ? "" : "Enter a valid 10-digit phone number";
      default:
        return "";
    }
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    const val = name === "studentId" ? files[0] : value;
    setFormData((prev) => ({ ...prev, [name]: val }));

    // Live validation on change
    if (name !== "studentId") {
      const errorMsg = validate(name, val);
      setErrors((prev) => ({ ...prev, [name]: errorMsg }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    const errorMsg = validate(name, value);
    setErrors((prev) => ({ ...prev, [name]: errorMsg }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const emailErr = validate("email", formData.email);
    const passErr = validate("password", formData.password);

    if (emailErr || passErr) {
      setErrors({ email: emailErr, password: passErr });
      toast.error("❌ Fix login form errors");
      return;
    }

    try {
      const res = await api.post("/api/auth/login", {
        email: formData.email,
        password: formData.password,
      });
      toast.success("✅ Login Successful");
      localStorage.setItem("token", res.data.token);
      navigate("/dashboard");
    } catch (err) {
      toast.error("❌ Login Failed: " + err.response?.data?.error);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const newErrors = {};
    for (const key in formData) {
      if (key === "studentId") continue; // skip file validation
      const error = validate(key, formData[key]);
      if (error) newErrors[key] = error;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("❌ Fix registration form errors");
      return;
    }

    const data = new FormData();
    Object.entries(formData).forEach(([k, v]) => data.append(k, v));

    try {
      await api.post("/api/auth/register", data);
      toast.success("✅ Registered Successfully");
      setMode("login");
      setFormData(initialForm);
    } catch (err) {
      toast.error("❌ Register Failed: " + err.response?.data?.error);
    }
  };

  return (
    <div className="relative h-screen flex items-center justify-center text-white overflow-auto">
      <BackgroundAnimation />
      <div className="form-container">
        <h1 className="text-3xl font-bold mb-4">Student Event Portal</h1>
        <div className="flex justify-center gap-4 mb-6">
          <button onClick={() => setMode("login")} className={`tab ${mode === "login" ? "active" : ""}`}>Login</button>
          <button onClick={() => setMode("register")} className={`tab ${mode === "register" ? "active" : ""}`}>Register</button>
        </div>

        {mode === "login" ? (
          <form className="space-y-4 animate-fadeIn" onSubmit={handleLogin}>
            <input name="email" type="email" placeholder="Email" className="input" onChange={handleChange} onBlur={handleBlur} required />
            {errors.email && <p className="error">{errors.email}</p>}
            <input name="password" type="password" placeholder="Password" className="input" onChange={handleChange} onBlur={handleBlur} required />
            {errors.password && <p className="error">{errors.password}</p>}
            <button className="btn btn-login">Login</button>
            <GoogleLogin
              onSuccess={(cred) => {
                const user = jwtDecode(cred.credential);
                console.log("Google User:", user);
                toast.success("✅ Google login success");
                localStorage.setItem("user", JSON.stringify(user));
                navigate("/dashboard");
              }}
              onError={() => toast.error("❌ Google login failed")}
            />
          </form>
        ) : (
<form className="space-y-3 animate-fadeIn" onSubmit={handleRegister} encType="multipart/form-data">
  <input name="username" placeholder="Username" className="input" onChange={handleChange} onBlur={handleBlur} />
  {errors.username && <p className="error">{errors.username}</p>}

  <input name="fullname" placeholder="Full Name" className="input" onChange={handleChange} onBlur={handleBlur} />
  {errors.fullname && <p className="error">{errors.fullname}</p>}

  <input name="institute" placeholder="College/School" className="input" onChange={handleChange} onBlur={handleBlur} />
  {errors.institute && <p className="error">{errors.institute}</p>}

  <div className="flex gap-2">
    <input name="street" placeholder="Street" className="input" onChange={handleChange} onBlur={handleBlur} />
    <input name="city" placeholder="City" className="input" onChange={handleChange} onBlur={handleBlur} />
    <input name="pincode" placeholder="Pincode" className="input" onChange={handleChange} onBlur={handleBlur} />
  </div>

  <input name="age" type="number" placeholder="Age" className="input" onChange={handleChange} onBlur={handleBlur} />
  {errors.age && <p className="error">{errors.age}</p>}

  <select name="course" className="input" onChange={handleChange} onBlur={handleBlur}>
    <option value="">-- Select Course --</option>
    <option value="BCA">BCA</option>
    <option value="MCA">MCA</option>
    <option value="B.Tech">B.Tech</option>
    <option value="MBA">MBA</option>
  </select>
  {errors.course && <p className="error">{errors.course}</p>}

  <input name="email" type="email" placeholder="Email" className="input" onChange={handleChange} onBlur={handleBlur} />
  {errors.email && <p className="error">{errors.email}</p>}

  <div className="flex gap-2">
    <select name="countryCode" className="input max-w-[100px]" onChange={handleChange}>
      <option value="+91">+91</option>
      <option value="+1">+1</option>
      <option value="+44">+44</option>
    </select>
    <input name="phone" type="tel" placeholder="Phone Number" className="input" onChange={handleChange} onBlur={handleBlur} />
  </div>
  {errors.phone && <p className="error">{errors.phone}</p>}

  <label className="text-sm mt-2">Student ID Upload (Image only)</label>
  <input name="studentId" type="file" accept="image/*" className="input" onChange={handleChange} />

  <input name="password" type="password" placeholder="Password" className="input" onChange={handleChange} onBlur={handleBlur} />
  {errors.password && <p className="error">{errors.password}</p>}

  <input name="confirmPassword" type="password" placeholder="Confirm Password" className="input" onChange={handleChange} onBlur={handleBlur} />
  {errors.confirmPassword && <p className="error">{errors.confirmPassword}</p>}

  <button className="btn btn-register">Register</button>

  <GoogleLogin
    onSuccess={(cred) => {
      const user = jwtDecode(cred.credential);
      toast.success("✅ Google signup success");
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
