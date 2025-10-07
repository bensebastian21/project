// src/pages/Profile.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../utils/api";
import { Mail, Phone, ShieldCheck, Send, CheckCircle2, Save, UserCircle2, Edit3, AlertCircle, CheckCircle, Loader2, Trophy, MapPin, ArrowLeft, ImagePlus, Upload } from "lucide-react";

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [me, setMe] = useState(null);
  const [form, setForm] = useState({});
  const [original, setOriginal] = useState(null);
  const [emailCode, setEmailCode] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [touched, setTouched] = useState({});
  const [focused, setFocused] = useState({});
  const [errors, setErrors] = useState({});
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Derived mode from query param: tab=view|update|otp|photo
  const qs = new URLSearchParams(location.search);
  const tab = (qs.get("tab") || "view").toLowerCase();
  const isView = tab === "view";
  const isUpdate = tab === "update";
  const isCredentials = tab === "otp"; // credentials-only
  const isPhoto = tab === "photo";

  // Derived validators
  const isValidPhone = useMemo(() => /^\d{10}$/.test(String(form.phone ?? "")), [form.phone]);
  const isValidPhoneOTP = useMemo(() => /^\d{6}$/.test(String(phoneCode ?? "")), [phoneCode]);

  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const { data } = await api.get("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
        setMe(data);
        setForm({
          username: data.username || "",
          fullname: data.fullname || "",
          institute: data.institute || "",
          street: data.street || "",
          city: data.city || "",
          pincode: data.pincode || "",
          age: data.age || "",
          course: data.course || "",
          email: data.email || "",
          phone: data.phone || "",
          countryCode: data.countryCode || "+91",
          profilePic: data.profilePic || "",
        });
        setOriginal({
          username: data.username || "",
          fullname: data.fullname || "",
          institute: data.institute || "",
          street: data.street || "",
          city: data.city || "",
          pincode: data.pincode || "",
          age: data.age || "",
          course: data.course || "",
          email: data.email || "",
          phone: data.phone || "",
          countryCode: data.countryCode || "+91",
          profilePic: data.profilePic || "",
        });
      } catch (e) {
        toast.error(e?.response?.data?.error || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const isDirty = useMemo(() => {
    if (!original) return false;
    return Object.keys(original).some((k) => String(original[k] ?? "") !== String(form[k] ?? ""));
  }, [original, form]);

  const validateField = (key, val) => {
    const value = String(val ?? "").trim();
    switch (key) {
      case "email":
        return /\S+@\S+\.\S+/.test(value) ? "" : "Invalid email";
      case "phone":
        return /^\d{10}$/.test(value) ? "" : "Phone must be 10 digits";
      case "pincode":
        return /^\d{6}$/.test(value) ? "" : "Pincode must be 6 digits";
      case "countryCode":
        return /^\+\d{1,4}$/.test(value) ? "" : "Invalid country code";
      case "age": {
        const n = parseInt(value || "0", 10);
        return !isNaN(n) && n >= 16 && n <= 100 ? "" : "Age 16-100";
      }
      case "fullname":
      case "username":
        return value.length >= 2 ? "" : "Too short";
      default:
        return "";
    }
  };

  const handleChange = (key, value) => {
    // Sanitize phone digits
    if (key === 'phone') {
      value = String(value || '').replace(/\D/g, '').slice(0, 10);
    }
    if (key === 'countryCode') {
      // Normalize + prefix
      value = (String(value || '+').startsWith('+') ? String(value) : `+${value}`);
    }
    setForm((prev) => ({ ...prev, [key]: value }));
    const hasFocusAndChange = focused[key] && touched[key];
    if (hasFocusAndChange) {
      setErrors((prev) => ({ ...prev, [key]: validateField(key, value) }));
    }
  };

  const handleFocus = (key) => {
    setFocused((prev) => ({ ...prev, [key]: true }));
  };

  const handleBlur = (key) => {
    const hasFocus = focused[key];
    setTouched((prev) => ({ ...prev, [key]: true }));
    if (hasFocus) {
      setErrors((prev) => ({ ...prev, [key]: validateField(key, form[key]) }));
    }
  };

  const saveProfile = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem("token");
      // Final validate key fields
      const keysToCheck = ["fullname","username","email","countryCode","phone","pincode","age"];
      const newErrors = {};
      keysToCheck.forEach((k)=>{
        const msg = validateField(k, form[k]);
        if (msg) newErrors[k] = msg;
      });
      setErrors((prev)=>({ ...prev, ...newErrors }));
      if (Object.values(newErrors).some(Boolean)) {
        toast.error("Please fix validation errors");
        return;
      }
      await api.put("/api/auth/me", form, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Profile updated");
      // Refresh
      const { data } = await api.get("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
      setMe(data);
      setOriginal({
        username: data.username || "",
        fullname: data.fullname || "",
        institute: data.institute || "",
        street: data.street || "",
        city: data.city || "",
        pincode: data.pincode || "",
        age: data.age || "",
        course: data.course || "",
        email: data.email || "",
        phone: data.phone || "",
        countryCode: data.countryCode || "+91",
      });
    } catch (e) {
      toast.error(e?.response?.data?.error || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const sendEmailOTP = async () => {
    try {
      const token = localStorage.getItem("token");
      const { data } = await api.post("/api/auth/send-email-otp", {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(data.message || "Email OTP sent");
      if (data.devCode) toast.info(`Dev code: ${data.devCode}`);
    } catch (e) {
      toast.error(e?.response?.data?.error || "Failed to send email OTP");
    }
  };

  const verifyEmailOTP = async () => {
    try {
      const token = localStorage.getItem("token");
      const { data } = await api.post("/api/auth/verify-email-otp", { code: emailCode }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(data.message || "Email verified");
      const meRes = await api.get("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
      setMe(meRes.data);
      setEmailCode("");
    } catch (e) {
      toast.error(e?.response?.data?.error || "Invalid code");
    }
  };

  const sendPhoneOTP = async () => {
    try {
      if (!isValidPhone) {
        setTouched((prev)=>({ ...prev, phone: true }));
        setErrors((prev)=>({ ...prev, phone: validateField('phone', form.phone) }));
        return toast.error("Enter a valid 10-digit phone first");
      }
      const token = localStorage.getItem("token");
      const { data } = await api.post("/api/auth/send-phone-otp", {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(data.message || "Phone OTP sent");
      if (data.devCode) toast.info(`Dev code: ${data.devCode}`);
    } catch (e) {
      toast.error(e?.response?.data?.error || "Failed to send phone OTP");
    }
  };

  const verifyPhoneOTP = async () => {
    try {
      if (!isValidPhoneOTP) {
        return toast.error("Enter the 6-digit OTP");
      }
      const token = localStorage.getItem("token");
      const { data } = await api.post("/api/auth/verify-phone-otp", { code: phoneCode }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(data.message || "Phone verified");
      const meRes = await api.get("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
      setMe(meRes.data);
      setPhoneCode("");
    } catch (e) {
      toast.error(e?.response?.data?.error || "Invalid code");
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error("File size must be less than 5MB");
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast.error("Please select an image file");
        return;
      }
      setSelectedFile(file);
    }
  };

  const uploadProfilePic = async () => {
    if (!selectedFile) return;
    try {
      setUploading(true);
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append('profilePic', selectedFile);
      const { data } = await api.post("/api/auth/upload-profile-pic", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      toast.success("Profile picture updated");
      const meRes = await api.get("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
      setMe(meRes.data);
      setForm(prev => ({ ...prev, profilePic: meRes.data.profilePic }));
      setOriginal(prev => ({ ...prev, profilePic: meRes.data.profilePic }));
      setSelectedFile(null);
    } catch (e) {
      toast.error(e?.response?.data?.error || "Failed to upload profile picture");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0b0c] text-white flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-300"><Loader2 className="w-5 h-5 animate-spin"/> Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0b0c] text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 rounded-lg bg-[#0e0e10] border border-[#2a2a30] hover:bg-[#151518]"
            aria-label="Back"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5 text-gray-200" />
          </button>
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-yellow-500 to-yellow-300 flex items-center justify-center shadow-[0_0_20px_rgba(234,179,8,0.25)]">
            <UserCircle2 className="w-8 h-8 text-black" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold truncate">
              {isView && 'Profile (View Only)'}
              {isUpdate && 'Update Profile'}
              {isCredentials && 'Verify Credentials'}
              {isPhoto && 'Change Profile Photo'}
            </h1>
            <p className="text-sm text-gray-400 truncate">
              {isView && 'View your profile details'}
              {isUpdate && 'Edit your personal details'}
              {isCredentials && 'Verify your email and phone'}
              {isPhoto && 'Upload or change your profile picture'}
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-[#0e0e10] border border-[#2a2a30] rounded-xl p-6">
          {/* Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Personal */}
            <section>
              <h3 className="font-semibold text-gray-200 mb-3 flex items-center gap-2"><Edit3 className="w-4 h-4 text-yellow-400"/> Personal</h3>
              <div className="space-y-3">
                {[["fullname","Full Name"],["username","Username"]].map(([key,label]) => (
                  <div key={key}>
                    <label className="block text-sm text-gray-400 mb-1">{label}</label>
                    <input
                      value={form[key] ?? ""}
                      onChange={(e)=>handleChange(key, e.target.value)}
                      onFocus={()=>handleFocus(key)}
                      onBlur={()=>handleBlur(key)}
                      className={`w-full px-3 py-2 rounded-lg bg-[#141418] border ${errors[key] ? 'border-red-600' : 'border-[#2a2a30]'} focus:ring-2 focus:ring-yellow-500 focus:border-transparent`}
                    />
                    {errors[key] && touched[key] && (
                      <div className="mt-1 text-xs text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {errors[key]}</div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Contact */}
            {!isPhoto && (
            <section>
              <h3 className="font-semibold text-gray-200 mb-3 flex items-center gap-2"><Mail className="w-4 h-4 text-yellow-400"/> Contact</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-sm text-gray-400 mb-1">Email</label>
                  <input
                    value={form.email ?? ""}
                    onChange={(e)=>handleChange('email', e.target.value)}
                    onFocus={()=>handleFocus('email')}
                    onBlur={()=>handleBlur('email')}
                    disabled={isView || isCredentials}
                    className={`w-full px-3 py-2 rounded-lg bg-[#141418] border ${errors.email ? 'border-red-600' : 'border-[#2a2a30]'} ${(isView || isCredentials) ? 'opacity-60 cursor-not-allowed' : 'focus:ring-2 focus:ring-yellow-500 focus:border-transparent'}`}
                  />
                  {isCredentials && (
                    <>
                      <div className="mt-1 flex items-center gap-2 text-xs">
                        {me?.emailVerified ? (
                          <span className="text-green-400 inline-flex items-center gap-1"><ShieldCheck className="w-3 h-3"/> Verified</span>
                        ) : (
                          <span className="text-red-400 inline-flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Not verified</span>
                        )}
                      </div>
                      {!me?.emailVerified && (
                        <div className="mt-2 space-y-2" aria-live="polite">
                          <div className="flex items-center gap-2 text-xs">
                            <button onClick={sendEmailOTP} className="text-blue-400 hover:underline inline-flex items-center gap-1"><Send className="w-3 h-3"/> Send OTP</button>
                          </div>
                          <div className="flex gap-2">
                            <input value={emailCode} onChange={e=>setEmailCode(e.target.value)} placeholder="Enter 6-digit code" className="flex-1 px-3 py-2 rounded bg-[#141418] border border-[#2a2a30]" />
                            <button onClick={verifyEmailOTP} className="inline-flex items-center gap-2 px-3 py-2 rounded bg-green-600 hover:bg-green-700"><CheckCircle2 className="w-4 h-4"/> Verify</button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  {!isCredentials && errors.email && touched.email && !isView && (
                    <div className="mt-1 text-xs text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {errors.email}</div>
                  )}
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Country Code</label>
                  <input
                    value={form.countryCode ?? ""}
                    onChange={(e)=>handleChange('countryCode', e.target.value)}
                    onFocus={()=>handleFocus('countryCode')}
                    onBlur={()=>handleBlur('countryCode')}
                    disabled={isView || isCredentials}
                    className={`w-full px-3 py-2 rounded-lg bg-[#141418] border ${errors.countryCode ? 'border-red-600' : 'border-[#2a2a30]'} ${(isView || isCredentials) ? 'opacity-60 cursor-not-allowed' : 'focus:ring-2 focus:ring-yellow-500 focus-border-transparent'}`}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Phone</label>
                  <input
                    value={form.phone ?? ""}
                    onChange={(e)=>handleChange('phone', e.target.value)}
                    onFocus={()=>handleFocus('phone')}
                    onBlur={()=>handleBlur('phone')}
                    disabled={isView || isCredentials}
                    className={`w-full px-3 py-2 rounded-lg bg-[#141418] border ${errors.phone ? 'border-red-600' : 'border-[#2a2a30]'} ${(isView || isCredentials) ? 'opacity-60 cursor-not-allowed' : 'focus:ring-2 focus:ring-yellow-500 focus-border-transparent'}`}
                  />
                  {isCredentials && (
                    <>
                      <div className="mt-2 flex items-center gap-2 text-xs">
                        {me?.phoneVerified ? (
                          <span className="text-green-400 inline-flex items-center gap-1"><ShieldCheck className="w-3 h-3"/> Verified</span>
                        ) : (
                          <span className="text-red-400 inline-flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Not verified</span>
                        )}
                      </div>
                      {!me?.phoneVerified && (
                        <div className="mt-2 space-y-2" aria-live="polite">
                          <div className="flex items-center gap-2 text-xs">
                            <button onClick={sendPhoneOTP} className="text-blue-400 hover:underline inline-flex items-center gap-1"><Send className="w-3 h-3"/> Send OTP</button>
                          </div>
                          <div className="flex gap-2">
                            <input value={phoneCode} onChange={e=>setPhoneCode(e.target.value)} placeholder="Enter 6-digit code" className="flex-1 px-3 py-2 rounded bg-[#141418] border border-[#2a2a30]" />
                            <button onClick={verifyPhoneOTP} className="inline-flex items-center gap-2 px-3 py-2 rounded bg-green-600 hover:bg-green-700"><CheckCircle2 className="w-4 h-4"/> Verify</button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  {!isCredentials && errors.phone && touched.phone && !isView && (
                    <div className="mt-1 text-xs text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {errors.phone}</div>
                  )}
                </div>
              </div>
            </section>
            )}

            {/* Academic */}
            {(!isCredentials && !isPhoto) && (
            <section>
              <h3 className="font-semibold text-gray-200 mb-3 flex items-center gap-2"><Trophy className="w-4 h-4 text-yellow-400"/> Academic</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Institute</label>
                  <input value={form.institute ?? ""} onChange={(e)=>handleChange('institute', e.target.value)} disabled={isView} className={`w-full px-3 py-2 rounded-lg bg-[#141418] border border-[#2a2a30] ${isView ? 'opacity-60 cursor-not-allowed' : 'focus:ring-2 focus:ring-yellow-500 focus:border-transparent'}`} />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Department</label>
                  <input value={form.course ?? ""} onChange={(e)=>handleChange('course', e.target.value)} disabled={isView} className={`w-full px-3 py-2 rounded-lg bg-[#141418] border border-[#2a2a30] ${isView ? 'opacity-60 cursor-not-allowed' : 'focus:ring-2 focus:ring-yellow-500 focus:border-transparent'}`} />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Age</label>
                  <input type="number" value={form.age ?? ""} onChange={(e)=>handleChange('age', e.target.value)} onBlur={()=>handleBlur('age')} disabled={isView} className={`w-full px-3 py-2 rounded-lg bg-[#141418] border ${errors.age ? 'border-red-600' : 'border-[#2a2a30]'} ${isView ? 'opacity-60 cursor-not-allowed' : 'focus:ring-2 focus:ring-yellow-500 focus:border-transparent'}`} />
                  {!isView && errors.age && touched.age && (
                    <div className="mt-1 text-xs text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {errors.age}</div>
                  )}
                </div>
              </div>
            </section>
            )}

            {/* Address */}
            {(!isCredentials && !isPhoto) && (
            <section>
              <h3 className="font-semibold text-gray-200 mb-3 flex items-center gap-2"><MapPin className="w-4 h-4 text-yellow-400"/> Address</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-sm text-gray-400 mb-1">Street</label>
                  <input value={form.street ?? ""} onChange={(e)=>handleChange('street', e.target.value)} disabled={isView} className={`w-full px-3 py-2 rounded-lg bg-[#141418] border border-[#2a2a30] ${isView ? 'opacity-60 cursor-not-allowed' : 'focus:ring-2 focus:ring-yellow-500 focus:border-transparent'}`} />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">City</label>
                  <input value={form.city ?? ""} onChange={(e)=>handleChange('city', e.target.value)} disabled={isView} className={`w-full px-3 py-2 rounded-lg bg-[#141418] border border-[#2a2a30] ${isView ? 'opacity-60 cursor-not-allowed' : 'focus:ring-2 focus:ring-yellow-500 focus:border-transparent'}`} />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Pincode</label>
                  <input value={form.pincode ?? ""} onChange={(e)=>handleChange('pincode', e.target.value)} onBlur={()=>handleBlur('pincode')} disabled={isView} className={`w-full px-3 py-2 rounded-lg bg-[#141418] border ${errors.pincode ? 'border-red-600' : 'border-[#2a2a30]'} ${isView ? 'opacity-60 cursor-not-allowed' : 'focus:ring-2 focus:ring-yellow-500 focus:border-transparent'}`} />
                  {!isView && errors.pincode && touched.pincode && (
                    <div className="mt-1 text-xs text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {errors.pincode}</div>
                  )}
                </div>
              </div>
            </section>
            )}
          </div>

          {/* Profile Picture - only in photo tab */}
          {isPhoto && (
            <section className="mt-6">
              <h3 className="font-semibold text-gray-200 mb-3 flex items-center gap-2"><ImagePlus className="w-4 h-4 text-yellow-400"/> Profile Picture</h3>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-[#151518] border border-[#2a2a30] flex items-center justify-center overflow-hidden">
                  {form.profilePic ? (
                    <img src={`http://localhost:5000/${form.profilePic}`} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <UserCircle2 className="w-10 h-10 text-yellow-400" />
                  )}
                </div>
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-yellow-500 file:text-black hover:file:bg-yellow-400"
                  />
                  {selectedFile && (
                    <button
                      onClick={uploadProfilePic}
                      disabled={uploading}
                      className="mt-2 inline-flex items-center gap-2 px-3 py-2 rounded bg-yellow-500 text-black hover:bg-yellow-400 disabled:opacity-50"
                    >
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Upload className="w-4 h-4"/>}
                      {uploading ? "Uploading..." : "Upload"}
                    </button>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Save bar only in update mode */}
          {isUpdate && (
            <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-gray-400">
                {isDirty ? (
                  <span className="inline-flex items-center gap-1 text-yellow-400"><AlertCircle className="w-3 h-3"/> You have unsaved changes</span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-gray-400"><CheckCircle className="w-3 h-3"/> All changes saved</span>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  disabled={!isDirty || saving}
                  onClick={() => { setForm(original || form); setTouched({}); setErrors({}); }}
                  className="px-4 py-2 rounded bg-[#151518] border border-[#2a2a30] text-gray-300 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  disabled={!isDirty || saving}
                  onClick={saveProfile}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded bg-yellow-500 text-black hover:bg-yellow-400 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
