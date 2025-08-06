import React, { useState, useEffect } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import { ToastContainer, toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import "react-toastify/dist/ReactToastify.css";

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

  return <canvas id="bg-canvas" className="absolute top-0 left-0 w-full h-full z-0" />;
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

const InputField = ({
  label,
  type = "text",
  name,
  value,
  onChange,
  onBlur,
  error,
  ...props
}) => (
  <div className="relative group w-full animate-fadeIn">
    <input
      id={name}
      name={name}
      type={type}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      className={`peer w-full bg-gray-100 dark:bg-gray-800 text-black dark:text-white px-4 pt-5 pb-2 rounded-lg border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-600 transition-all`}
      placeholder=" "
      {...props}
    />
    <label
      htmlFor={name}
      className="absolute left-4 top-2.5 text-gray-500 dark:text-gray-400 text-sm transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 dark:peer-placeholder-shown:text-gray-500 peer-focus:top-2.5 peer-focus:text-sm"
    >
      {label}
    </label>
    {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
  </div>
);

export default function HomePage() {
  const [mode, setMode] = useState("login");
  const [formData, setFormData] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const validate = (field, value) => {
    if (["username", "fullname", "institute", "street", "city"].includes(field)) {
      return /^[A-Za-z ]+$/.test(value) ? "" : "Only letters allowed";
    }
    if (["pincode", "phone", "age"].includes(field)) {
      return /^[0-9]+$/.test(value) ? "" : "Only numbers allowed";
    }
    switch (field) {
      case "email":
        return /\S+@\S+\.\S+/.test(value) ? "" : "Invalid email format";
      case "password":
        return value.length >= 6 ? "" : "Minimum 6 characters";
      case "confirmPassword":
        return value === formData.password ? "" : "Passwords do not match";
      case "course":
        return value ? "" : "Please select a course";
      default:
        return "";
    }
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    const val = name === "studentId" ? files[0] : value;
    setFormData((prev) => ({ ...prev, [name]: val }));

    if (name !== "studentId") {
      const error = validate(name, val);
      setErrors((prev) => ({ ...prev, [name]: error }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    const error = validate(name, value);
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const emailErr = validate("email", formData.email);
    const passErr = validate("password", formData.password);

    if (emailErr || passErr) {
      setErrors({ email: emailErr, password: passErr });
      toast.error("❌ Fix login errors");
      return;
    }

    try {
      const res = await api.post("/api/auth/login", {
        email: formData.email,
        password: formData.password,
      });
      toast.success("✅ Login successful");
      localStorage.setItem("token", res.data.token);
      navigate("/dashboard");
    } catch (err) {
      toast.error("❌ Login failed");
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    let allErrors = {};
    for (const key in formData) {
      if (key === "studentId") continue;
      const error = validate(key, formData[key]);
      if (error) allErrors[key] = error;
    }

    if (Object.keys(allErrors).length) {
      setErrors(allErrors);
      toast.error("❌ Fix registration errors");
      return;
    }

    const data = new FormData();
    Object.entries(formData).forEach(([k, v]) => data.append(k, v));

    try {
      await api.post("/api/auth/register", data);
      toast.success("✅ Registration successful");
      setFormData(initialForm);
      setMode("login");
    } catch (err) {
      toast.error("❌ Register failed");
    }
  };

  return (
    <div className="relative min-h-screen bg-white dark:bg-black text-black dark:text-white flex items-center justify-center p-4">
      <BackgroundAnimation />
      <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-2xl max-w-lg w-full z-10 overflow-y-auto space-y-4">
        <h1 className="text-2xl font-bold text-center">Student Event Portal</h1>
        <div className="flex justify-center gap-4">
          <button
            onClick={() => setMode("login")}
            className={`px-4 py-2 rounded-md font-semibold ${mode === "login"
              ? "bg-blue-600 text-white"
              : "bg-gray-200 dark:bg-gray-800"
              }`}
          >
            Login
          </button>
          <button
            onClick={() => setMode("register")}
            className={`px-4 py-2 rounded-md font-semibold ${mode === "register"
              ? "bg-green-600 text-white"
              : "bg-gray-200 dark:bg-gray-800"
              }`}
          >
            Register
          </button>
        </div>

        {mode === "login" ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <InputField
              name="email"
              label="Email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.email}
            />
            <InputField
              name="password"
              label="Password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.password}
            />
            <button type="submit" className="w-full py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition">
              Login
            </button>
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
          <form onSubmit={handleRegister} className="space-y-4" encType="multipart/form-data">
            <InputField name="username" label="Username" value={formData.username} onChange={handleChange} onBlur={handleBlur} error={errors.username} />
            <InputField name="fullname" label="Full Name" value={formData.fullname} onChange={handleChange} onBlur={handleBlur} error={errors.fullname} />
            <InputField name="institute" label="Institute" value={formData.institute} onChange={handleChange} onBlur={handleBlur} error={errors.institute} />

            <div className="flex gap-2">
              <InputField name="street" label="Street" value={formData.street} onChange={handleChange} onBlur={handleBlur} error={errors.street} />
              <InputField name="city" label="City" value={formData.city} onChange={handleChange} onBlur={handleBlur} error={errors.city} />
              <InputField name="pincode" label="Pincode" value={formData.pincode} onChange={handleChange} onBlur={handleBlur} error={errors.pincode} />
            </div>

            <InputField name="age" label="Age" type="number" value={formData.age} onChange={handleChange} onBlur={handleBlur} error={errors.age} />

            <div className="relative group animate-fadeIn">
              <select
                name="course"
                value={formData.course}
                onChange={handleChange}
                onBlur={handleBlur}
                className="peer w-full bg-gray-100 dark:bg-gray-800 text-black dark:text-white px-4 pt-5 pb-2 rounded-lg border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-600"
              >
                <option value="">Select Course</option>
                <option value="BCA">BCA</option>
                <option value="MCA">MCA</option>
                <option value="B.Tech">B.Tech</option>
                <option value="MBA">MBA</option>
              </select>
              <label className="absolute left-4 top-2.5 text-gray-500 dark:text-gray-400 text-sm peer-placeholder-shown:text-base peer-focus:text-sm">
                Course
              </label>
              {errors.course && <p className="text-red-400 text-sm mt-1">{errors.course}</p>}
            </div>

            <InputField name="email" label="Email" type="email" value={formData.email} onChange={handleChange} onBlur={handleBlur} error={errors.email} />

            <div className="flex gap-2">
              <select
                name="countryCode"
                value={formData.countryCode}
                onChange={handleChange}
                className="w-1/4 bg-gray-100 dark:bg-gray-800 text-black dark:text-white px-2 rounded-lg border border-gray-300 dark:border-gray-700"
              >
                <option value="+91">+91</option>
                <option value="+1">+1</option>
                <option value="+44">+44</option>
              </select>
              <InputField name="phone" label="Phone" value={formData.phone} onChange={handleChange} onBlur={handleBlur} error={errors.phone} />
            </div>

            <label className="text-sm">Upload Student ID (Image)</label>
            <input
              name="studentId"
              type="file"
              accept="image/*"
              onChange={handleChange}
              className="w-full text-sm text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-2"
            />

            <InputField name="password" label="Password" type="password" value={formData.password} onChange={handleChange} onBlur={handleBlur} error={errors.password} />
            <InputField name="confirmPassword" label="Confirm Password" type="password" value={formData.confirmPassword} onChange={handleChange} onBlur={handleBlur} error={errors.confirmPassword} />

            <button type="submit" className="w-full py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition">
              Register
            </button>

            <GoogleLogin
              onSuccess={(cred) => {
                const user = jwtDecode(cred.credential);
                toast.success("✅ Google signup success");
              }}
              onError={() => toast.error("❌ Google signup failed")}
            />
          </form>
        )}
        <ToastContainer />
      </div>
    </div>
  );
}
