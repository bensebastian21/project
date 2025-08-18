// src/components/Register.jsx
import React, { useState } from "react";
import { toast } from "react-toastify";
import config from "../config";
import "react-toastify/dist/ReactToastify.css";

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

export default function Register({ onSwitchToLogin }) {
  const [formData, setFormData] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false); // for normal signup
  const [isGoogleLoading, setIsGoogleLoading] = useState(false); // separate for Google signup

  const validate = (field, value) => {
    switch (field) {
      case "email":
        return /\S+@\S+\.\S+/.test(value) ? "" : "Invalid email format";
      case "password":
        return value.length >= 6
          ? ""
          : "Password must be at least 6 characters";
      case "username":
        return /^[A-Za-z0-9_]{3,}$/.test(value)
          ? ""
          : "Username must be at least 3 characters (letters, numbers, underscore)";
      case "fullname":
        return /^[A-Za-z\s]+$/.test(value.trim())
          ? ""
          : "Full name should only contain letters and spaces";
      case "confirmPassword":
        return value === formData.password ? "" : "Passwords do not match";
      case "institute":
      case "street":
      case "city":
      case "course":
        return /^[A-Za-z\s]+$/.test(value.trim())
          ? ""
          : "Only letters and spaces allowed";
      case "pincode":
        return /^[0-9]{6}$/.test(value)
          ? ""
          : "Pincode must be 6 digits only";
      case "age":
        return /^[0-9]+$/.test(value) && value >= 10 && value <= 110
          ? ""
          : "Enter a valid age (10-110)";
      case "phone":
        return /^(\+91[\-\s]?)?[6-9]\d{9}$/.test(value.trim())
          ? ""
          : "Phone must start with 6, 7, 8, or 9 and be 10 digits";
      case "studentId":
        if (!value) return "Student ID is required";
        if (!value.type.startsWith("image/")) return "Only image files are allowed";
        if (value.size > 2 * 1024 * 1024) return "File size must be under 2MB";
        return "";
      default:
        return "";
    }
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    const val = name === "studentId" ? files[0] : value;
    setFormData((prev) => ({ ...prev, [name]: val }));
    const errorMsg = validate(name, val);
    setErrors((prev) => ({ ...prev, [name]: errorMsg }));
  };

  const handleBlur = (e) => {
    const { name, value, files } = e.target;
    const val = name === "studentId" ? files?.[0] : value;
    const errorMsg = validate(name, val);
    setErrors((prev) => ({ ...prev, [name]: errorMsg }));
  };

  const storeInMongoDB = async (userData) => {
    try {
      const mongoForm = new FormData();
      if (userData.studentId && typeof userData.studentId === "object") {
        mongoForm.append("studentId", userData.studentId);
      }
      Object.entries(userData).forEach(([k, v]) => {
        if (k !== "studentId" && v != null) mongoForm.append(k, v);
      });

      const response = await fetch(`${config.apiBaseUrl}/api/auth/register`, {
        method: "POST",
        body: mongoForm,
      });

      if (!response.ok) {
        let message = "MongoDB storage failed";
        try {
          const data = await response.json();
          if (data?.error) message = data.error;
        } catch (_) {
          // ignore parse errors
        }
        throw new Error(message);
      }
      return true;
    } catch (error) {
      console.error("MongoDB storage error:", error);
      return false;
    }
  };

  // Removed Firebase storage

  const handleRegister = async (e) => {
    e.preventDefault();
    if (isLoading) return;

    // Validate all fields
    const newErrors = {};
    for (const key in formData) {
      const error = validate(key, formData[key]);
      if (error) newErrors[key] = error;
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("❌ Fix form errors");
      return;
    }

    setIsLoading(true);
    toast.info("🔄 Creating your account...");

    try {
      const userData = {
        username: formData.username,
        fullname: formData.fullname,
        institute: formData.institute,
        street: formData.street,
        city: formData.city,
        pincode: formData.pincode,
        age: parseInt(formData.age),
        course: formData.course,
        email: formData.email,
        phone: formData.phone,
        countryCode: formData.countryCode,
        studentId: formData.studentId, // file object handled by storeInMongoDB
        password: formData.password,
        role: "student",
      };

      const mongoSaved = await storeInMongoDB(userData);

      if (!mongoSaved) {
        throw new Error("Failed to save to MongoDB");
      }

      toast.success("✅ Registration successful!");
      setTimeout(() => {
        onSwitchToLogin();
        setFormData(initialForm);
      }, 1500);
    } catch (err) {
      // Surface server message if present
      const msg = err?.message || "Registration failed";
      toast.error("❌ " + msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = () => {
    setIsGoogleLoading(true);
    window.location.href = config.oauthStartUrl;
  };

  return (
    <div className="space-y-3 animate-fadeIn">
      <h2 className="text-2xl font-semibold text-center mb-6">Create Account</h2>

      <form
        className="space-y-3"
        onSubmit={handleRegister}
        encType="multipart/form-data"
      >
        <div>
          <input
            name="username"
            placeholder="Username"
            className="input"
            value={formData.username}
            onChange={handleChange}
            onBlur={handleBlur}
          />
          {errors.username && <p className="error">{errors.username}</p>}
        </div>

        <div>
          <input
            name="fullname"
            placeholder="Full Name"
            className="input"
            value={formData.fullname}
            onChange={handleChange}
            onBlur={handleBlur}
          />
          {errors.fullname && <p className="error">{errors.fullname}</p>}
        </div>

        <div>
          <input
            name="institute"
            placeholder="College/School"
            className="input"
            value={formData.institute}
            onChange={handleChange}
            onBlur={handleBlur}
          />
          {errors.institute && <p className="error">{errors.institute}</p>}
        </div>

        <div className="flex gap-2">
          <input
            name="street"
            placeholder="Street"
            className="input"
            value={formData.street}
            onChange={handleChange}
            onBlur={handleBlur}
          />
          <input
            name="city"
            placeholder="City"
            className="input"
            value={formData.city}
            onChange={handleChange}
            onBlur={handleBlur}
          />
          <input
            name="pincode"
            placeholder="Pincode"
            className="input"
            value={formData.pincode}
            onChange={handleChange}
            onBlur={handleBlur}
          />
        </div>
        {errors.street && <p className="error">{errors.street}</p>}
        {errors.city && <p className="error">{errors.city}</p>}
        {errors.pincode && <p className="error">{errors.pincode}</p>}

        <div>
          <input
            name="age"
            type="number"
            placeholder="Age"
            className="input"
            value={formData.age}
            onChange={handleChange}
            onBlur={handleBlur}
          />
          {errors.age && <p className="error">{errors.age}</p>}
        </div>

        <div>
          <select
            name="course"
            className="input"
            value={formData.course}
            onChange={handleChange}
            onBlur={handleBlur}
          >
            <option value="">-- Select Course --</option>
            <option value="BCA">BCA</option>
            <option value="MCA">MCA</option>
            <option value="B.Tech">B.Tech</option>
            <option value="MBA">MBA</option>
          </select>
          {errors.course && <p className="error">{errors.course}</p>}
        </div>

        <div>
          <input
            name="email"
            type="email"
            placeholder="Email"
            className="input"
            value={formData.email}
            onChange={handleChange}
            onBlur={handleBlur}
          />
          {errors.email && <p className="error">{errors.email}</p>}
        </div>

        <div className="flex gap-2">
          <select
            name="countryCode"
            className="input max-w-[100px]"
            value={formData.countryCode}
            onChange={handleChange}
          >
            <option value="+91">+91</option>
            <option value="+1">+1</option>
            <option value="+44">+44</option>
          </select>
          <input
            name="phone"
            type="tel"
            placeholder="Phone Number"
            className="input"
            value={formData.phone}
            onChange={handleChange}
            onBlur={handleBlur}
          />
        </div>
        {errors.phone && <p className="error">{errors.phone}</p>}

        <div>
          <label className="text-sm mt-2 block text-gray-300">
            Student ID Upload (Image, &lt;2MB)
          </label>
          <input
            name="studentId"
            type="file"
            accept="image/*"
            className="input"
            onChange={handleChange}
            onBlur={handleBlur}
          />
          {errors.studentId && <p className="error">{errors.studentId}</p>}
        </div>

        <div>
          <input
            name="password"
            type="password"
            placeholder="Password"
            className="input"
            value={formData.password}
            onChange={handleChange}
            onBlur={handleBlur}
          />
          {errors.password && <p className="error">{errors.password}</p>}
        </div>

        <div>
          <input
            name="confirmPassword"
            type="password"
            placeholder="Confirm Password"
            className="input"
            value={formData.confirmPassword}
            onChange={handleChange}
            onBlur={handleBlur}
          />
          {errors.confirmPassword && <p className="error">{errors.confirmPassword}</p>}
        </div>

        <button type="submit" className="btn btn-register" disabled={isLoading}>
          {isLoading ? "Registering..." : "Register"}
        </button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-600"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-gray-800 text-gray-400">Or continue with</span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleGoogleAuth}
        className="btn btn-google"
        disabled={isGoogleLoading}
      >
        {isGoogleLoading ? "🔄 Processing..." : "Sign in with Google"}
      </button>

      <div className="text-center">
        <p className="text-gray-400">
          Already have an account?{" "}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-blue-400 hover:underline font-medium"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
