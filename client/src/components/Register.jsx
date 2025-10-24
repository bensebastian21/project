// src/components/Register.jsx
import React, { useState } from "react";
import Tesseract from "tesseract.js";
import { toast } from "react-toastify";
import config from "../config";
import "react-toastify/dist/ReactToastify.css";
import { INSTITUTES } from "../data/institutes";

const COUNTRIES = ["India"];
const STATES_BY_COUNTRY = { India: ["Kerala", "Tamil Nadu", "Karnataka", "Andhra Pradesh", "Telangana"] };
const DISTRICTS_BY_STATE = {
  Kerala: ["Kottayam", "Ernakulam", "Alappuzha", "Idukki", "Pathanamthitta", "Kollam", "Thiruvananthapuram", "Thrissur", "Palakkad", "Malappuram", "Kozhikode", "Wayanad", "Kannur", "Kasaragod"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai"],
  Karnataka: ["Bengaluru Urban", "Mysuru", "Mangaluru"],
  "Andhra Pradesh": ["Visakhapatnam", "Vijayawada"],
  Telangana: ["Hyderabad", "Warangal"],
};

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
  secondDoc: null, // bonafide letter OR fee receipt
  password: "",
  confirmPassword: "",
  country: "",
  state: "",
  district: "",
  agreeVerification: false,
  ocrRaw: "",
  ocrMismatch: false,
};

export default function Register({ onSwitchToLogin }) {
  const [formData, setFormData] = useState(initialForm);
  const [instQuery, setInstQuery] = useState("");
  const [instOpen, setInstOpen] = useState(false);
  const [touched, setTouched] = useState({});
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
        return value && value.toString().trim() ? "" : "Institute is required";
      case "street":
        return value && value.toString().trim() ? "" : "Address line 1 is required";
      case "city":
        return "";
      case "course":
        return /^[A-Za-z\s]+$/.test(value.trim())
          ? ""
          : "Only letters and spaces allowed";
      case "pincode":
        return /^[0-9]{6}$/.test(value)
          ? ""
          : "Pincode must be 6 digits only";
      case "country":
      case "state":
      case "district":
        return value && value.toString().trim() ? "" : "Required";
      case "age":
        return /^[0-9]+$/.test(value) && value >= 5 && value <= 40
          ? ""
          : "Enter a valid age (5-40 years)";
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

  const checkAvailability = async (field, val) => {
    try {
      const params = new URLSearchParams({ [field]: String(val) });
      const res = await fetch(`${config.apiBaseUrl}/api/auth/check-availability?${params.toString()}`);
      if (!res.ok) return;
      const data = await res.json();
      const available = data?.available?.[field];
      if (available === false) {
        const msg = field === 'username' ? 'Username already in use' : field === 'email' ? 'Email already in use' : 'Phone number already in use';
        setErrors(prev => ({ ...prev, [field]: msg }));
        toast.error(`❌ ${msg}`);
      }
    } catch (_) {}
  };

  const handleChange = (e) => {
    const { name, value, files, type, checked } = e.target;
    const isFile = type === "file";
    const val = isFile ? files?.[0] : type === "checkbox" ? !!checked : value;
    setFormData((prev) => ({ ...prev, [name]: val }));
    const errorMsg = validate(name, val);
    setErrors((prev) => ({ ...prev, [name]: errorMsg }));
    if (isFile && (name === "studentId" || name === "secondDoc") && val) {
      runOcr(val);
    }
  };

  const handleFocus = (e) => {
    const { name, value, files, type, checked } = e.target;
    const val = type === "file" ? files?.[0] : type === "checkbox" ? !!checked : value;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const errorMsg = validate(name, val);
    setErrors((prev) => ({ ...prev, [name]: errorMsg }));
  };

  const handleBlur = (e) => {
    const { name, value, files, type, checked } = e.target;
    const val = type === "file" ? files?.[0] : type === "checkbox" ? !!checked : value;
    const errorMsg = validate(name, val);
    setErrors((prev) => ({ ...prev, [name]: errorMsg }));
    if (!errorMsg && (name === "username" || name === "email" || name === "phone")) {
      checkAvailability(name, val);
    }
  };

  // Simple OCR pipeline: extract raw text and compare against entered fullname/institute
  const runOcr = async (file) => {
    try {
      const { data } = await Tesseract.recognize(file, 'eng');
      const raw = (data?.text || '').trim();
      const txt = raw.toLowerCase();
      const nameToken = (formData.fullname || '').toLowerCase().split(/\s+/).filter(Boolean)[0] || '';
      const instToken = (formData.institute || '').toLowerCase().split(/\s+/).filter(Boolean)[0] || '';
      const nameOk = nameToken ? txt.includes(nameToken) : true;
      const instOk = instToken ? txt.includes(instToken) : true;
      const mismatch = !(nameOk && instOk);
      setFormData((prev)=> ({ ...prev, ocrRaw: raw, ocrMismatch: mismatch }));
      if (mismatch) {
        toast.warn("⚠️ ID text doesn't seem to match name or institute. Admin will review.");
      } else {
        toast.success("✅ Student ID looks consistent (pre-check)");
      }
    } catch (err) {
      console.error('OCR error', err);
      toast.error("❌ Could not read the document text. You can still submit.");
      setFormData((prev)=> ({ ...prev, ocrRaw: '', ocrMismatch: false }));
    }
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

  const handleRegister = async (e) => {
    e.preventDefault();
    if (isLoading) return;

    // Validate all fields
    const newErrors = {};
    for (const key in formData) {
      const error = validate(key, formData[key]);
      if (error) newErrors[key] = error;
    }
    // At least one verification document required
    if (!formData.studentId && !formData.secondDoc) {
      newErrors.studentId = newErrors.studentId || "Student ID or Bonafide/Receipt is required";
      newErrors.secondDoc = newErrors.secondDoc || "Upload at least one document";
    }
    // Consent required
    if (!formData.agreeVerification) {
      newErrors.agreeVerification = "You must agree to verification";
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
        secondDoc: formData.secondDoc, // optional second verification doc
        password: formData.password,
        role: "student",
        country: formData.country,
        state: formData.state,
        district: formData.district,
        agreeVerification: formData.agreeVerification ? "true" : "false",
        ocrRaw: formData.ocrRaw,
        ocrMismatch: formData.ocrMismatch ? "true" : "false",
      };

      const mongoSaved = await storeInMongoDB(userData);

      if (!mongoSaved) {
        throw new Error("Failed to save to MongoDB");
      }

      toast.success("✅ Registration successful!");
      setTimeout(() => {
        // Redirect to login page where user can sign in and trigger onboarding
        window.location.href = "/login";
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
    <div className="space-y-3 animate-fadeIn max-h-[70vh] md:max-h-[75vh] overflow-y-auto no-scrollbar pr-2">

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

        <div className="relative">
          <input
            name="institute"
            placeholder="Select institute"
            className="input"
            value={formData.institute}
            onChange={(e) => {
              const q = e.target.value;
              setInstQuery(q);
              setFormData((prev) => ({ ...prev, institute: q }));
              setInstOpen(true);
            }}
            onFocus={() => setInstOpen(true)}
            onBlur={(e) => {
              // small timeout to allow click selection before closing
              setTimeout(() => setInstOpen(false), 120);
              handleBlur(e);
            }}
            autoComplete="off"
          />
          {instOpen && (
            <div className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto no-scrollbar bg-white text-slate-900 border border-slate-200 rounded-lg shadow-lg">
              {INSTITUTES
                .filter((i) =>
                  (instQuery || formData.institute || "").toLowerCase().split(" ").every((p) => i.name.toLowerCase().includes(p))
                )
                .slice(0, 50)
                .map((i) => (
                  <button
                    type="button"
                    key={i.name}
                    className="w-full text-left px-3 py-2 hover:bg-slate-100"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, institute: i.name }));
                      setInstQuery("");
                      setInstOpen(false);
                    }}
                    title={`${i.address}${i.phone ? ` • ${i.phone}` : ""}`}
                  >
                    <div className="font-medium truncate">{i.name}</div>
                    <div className="text-xs text-slate-600 truncate">{i.address}{i.pincode ? ` • ${i.pincode}` : ""}</div>
                  </button>
                ))}
              <div className="border-t border-slate-200 my-1"></div>
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-100"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  // Keep current typed value; just close the list to allow manual entry
                  setInstOpen(false);
                }}
              >
                Other (not listed) — type your institute
              </button>
              {INSTITUTES.filter((i) =>
                (instQuery || formData.institute || "").toLowerCase().split(" ").every((p) => i.name.toLowerCase().includes(p))
              ).length === 0 && (
                <div className="px-3 py-2 text-sm text-slate-600">No matches</div>
              )}
            </div>
          )}
          {errors.institute && <p className="error">{errors.institute}</p>}
          {formData.institute && (
            <p className="text-xs text-slate-400 mt-1">
              Selected: {formData.institute}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <input
            name="street"
            placeholder="Address Line 1"
            className="input"
            value={formData.street}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
          <input
            name="city"
            placeholder="Address Line 2"
            className="input"
            value={formData.city}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
          <input
            name="pincode"
            placeholder="Pincode"
            className="input"
            value={formData.pincode}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
        </div>
        {touched.street && errors.street && <p className="error">{errors.street}</p>}
        {touched.city && errors.city && <p className="error">{errors.city}</p>}
        {touched.pincode && errors.pincode && <p className="error">{errors.pincode}</p>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <select
            name="country"
            className="input"
            value={formData.country || ""}
            onChange={(e)=>{
              const val = e.target.value;
              setFormData(prev=> ({ ...prev, country: val, state: "", district: "" }));
              setErrors(prev=> ({ ...prev, country: validate("country", val), state: "", district: "" }));
            }}
            onFocus={handleFocus}
            onBlur={handleBlur}
          >
            <option value="">Select Country</option>
            {COUNTRIES.map(c=> (<option key={c} value={c}>{c}</option>))}
          </select>
          <select
            name="state"
            className="input"
            value={formData.state || ""}
            onChange={(e)=>{
              const val = e.target.value;
              setFormData(prev=> ({ ...prev, state: val, district: "" }));
              setErrors(prev=> ({ ...prev, state: validate("state", val), district: "" }));
            }}
            onFocus={handleFocus}
            onBlur={handleBlur}
            disabled={!formData.country}
          >
            <option value="">Select State</option>
            {(STATES_BY_COUNTRY[formData.country] || []).map(s=> (<option key={s} value={s}>{s}</option>))}
          </select>
          <select
            name="district"
            className="input"
            value={formData.district || ""}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            disabled={!formData.state}
          >
            <option value="">Select District</option>
            {(DISTRICTS_BY_STATE[formData.state] || []).map(d=> (<option key={d} value={d}>{d}</option>))}
          </select>
        </div>
        {touched.country && errors.country && <p className="error">{errors.country}</p>}
        {touched.state && errors.state && <p className="error">{errors.state}</p>}
        {touched.district && errors.district && <p className="error">{errors.district}</p>}

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
          <label className="text-sm mt-2 block text-gray-300">
            Bonafide Letter or Current Fee Receipt (optional, image/PDF)
          </label>
          <input
            name="secondDoc"
            type="file"
            accept="image/*,.pdf"
            className="input"
            onChange={handleChange}
            onBlur={handleBlur}
          />
          {errors.secondDoc && <p className="error">{errors.secondDoc}</p>}
          {formData.ocrRaw && (
            <p className="text-xs text-slate-400 mt-1 truncate" title={formData.ocrRaw}>
              OCR preview: {formData.ocrRaw}
            </p>
          )}
          {formData.ocrMismatch && (
            <p className="text-xs text-yellow-400 mt-1">⚠️ The text on your document may not match your name or institute. Admin will review.</p>
          )}
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

        <div className="flex items-start gap-2 my-2">
          <input
            id="agreeVerification"
            name="agreeVerification"
            type="checkbox"
            className="mt-1"
            checked={!!formData.agreeVerification}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
          <label htmlFor="agreeVerification" className="text-sm text-gray-300">
            I confirm that the uploaded document is my own student ID or valid proof and consent to its use for verification.
          </label>
        </div>
        {errors.agreeVerification && <p className="error">{errors.agreeVerification}</p>}

        <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-3 text-sm text-blue-200">
          📋 Your account will be created immediately, and your documents will be reviewed by an admin. You’ll be notified when verification is complete.
        </div>

        <button type="submit" className="btn btn-register mt-2" disabled={isLoading}>
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