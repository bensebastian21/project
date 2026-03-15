﻿// src/pages/Profile.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../utils/api";
import { uploadProfilePicture, uploadBanner } from "../utils/cloudinary";
import { getProfilePictureUrl, getBannerUrl } from "../utils/imageUtils";
import { Mail, Phone, ShieldCheck, Send, CheckCircle2, Save, UserCircle2, Edit3, AlertCircle, CheckCircle, Loader2, Trophy, MapPin, ArrowLeft, ImagePlus, Upload } from "lucide-react";

// Local UI helpers — brutalist style
const Stat = ({ label, value }) => (
  <div className="p-4 bg-blue-50 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
    <div className="text-[10px] text-black font-black uppercase tracking-widest mb-1">{label}</div>
    <div className="text-3xl font-black text-black">{value}</div>
  </div>
);

const Chip = ({ text }) => (
  <span className="px-3 py-1.5 bg-blue-50 border-2 border-black text-black text-xs font-black uppercase tracking-wide shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">{text}</span>
);

// Brutalist input
const Field = ({ label, error, touched, children }) => (
  <div>
    <label className="block text-[10px] font-black uppercase tracking-widest text-black mb-1.5">{label}</label>
    {children}
    {error && touched && (
      <div className="mt-1 text-[10px] text-red-700 font-bold flex items-center gap-1 uppercase tracking-wide">
        <AlertCircle className="w-3 h-3" /> {error}
      </div>
    )}
  </div>
);

const inputBase = "w-full px-3 py-2.5 bg-white border-2 border-black outline-none text-black font-medium text-sm focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-shadow";
const inputDisabled = "opacity-50 cursor-not-allowed bg-neutral-100";

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
  const [selectedBanner, setSelectedBanner] = useState(null);
  const [friends, setFriends] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [subTab, setSubTab] = useState('About');
  const [stats, setStats] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [certs, setCerts] = useState([]);
  const uniqueKey = (c) => (c?.eventId) || String((c?.title || '')).trim().toLowerCase() || (c?.id);

  const uniqueCerts = useMemo(() => {
    const seen = new Set();
    return (Array.isArray(certs) ? certs : []).filter((c) => {
      const key = uniqueKey(c);
      if (!key) return true;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [certs]);

  const [imgBust, setImgBust] = useState(0);
  const [editing, setEditing] = useState(false);
  const [badgeEdit, setBadgeEdit] = useState(false);
  const [selectedBadges, setSelectedBadges] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();

  const params = new URLSearchParams(location.search || "");
  const mode = (params.get("mode") || "").toLowerCase();
  const tabParam = (params.get("tab") || "").toLowerCase();
  const isCredentials = mode === "credentials" || ["credentials", "otp", "verify", "verification"].includes(tabParam);
  const isPhoto = mode === "photo" || tabParam === "photo";
  const isView = mode === "view" || params.get("view") === "1";
  const isUpdate = !isCredentials && !isPhoto;

  const isValidPhone = /^\d{10}$/.test(String(form.phone || ""));
  const isValidPhoneOTP = /^\d{6}$/.test(String(phoneCode || ""));

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const meRes = await api.get("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
        const d = meRes.data || {};
        setMe(d);
        setForm(prev => ({
          ...prev,
          username: d.username || "",
          fullname: d.fullname || "",
          institute: d.institute || "",
          street: d.street || "",
          city: d.city || "",
          pincode: d.pincode || "",
          age: d.age || "",
          course: d.course || "",
          email: d.email || "",
          phone: d.phone || "",
          countryCode: d.countryCode || "+91",
          bio: d.bio || "",
          bannerUrl: d.bannerUrl || "",
          profilePic: d.profilePic || "",
        }));
        setOriginal({
          username: d.username || "", fullname: d.fullname || "", institute: d.institute || "",
          street: d.street || "", city: d.city || "", pincode: d.pincode || "",
          age: d.age || "", course: d.course || "", email: d.email || "", phone: d.phone || "",
          countryCode: d.countryCode || "+91", bio: d.bio || "", bannerUrl: d.bannerUrl || "", profilePic: d.profilePic || "",
        });
      } catch (e) {
        toast.error(e?.response?.data?.error || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const initial = Array.isArray(me?.displayBadges) && me.displayBadges.length
      ? me.displayBadges
      : Array.isArray(stats?.badges) ? stats.badges.slice(0, 3) : [];
    setSelectedBadges(initial);
  }, [me, stats]);

  useEffect(() => {
    const uid = me?.id || me?._id;
    if (!uid) return;
    let cancelled = false;
    (async () => {
      try {
        const token = localStorage.getItem('token');
        const auth = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
        const [st, att, cert] = await Promise.all([
          api.get(`/api/users/${uid}/stats`, auth),
          api.get(`/api/users/${uid}/attendance`, auth),
          api.get(`/api/users/${uid}/certificates`, auth)
        ]);
        if (cancelled) return;
        setStats(st.data || null);
        setAttendance(Array.isArray(att.data) ? att.data : []);
        setCerts(Array.isArray(cert.data) ? cert.data : []);
      } catch (e) {
        if (cancelled) return;
        setStats({ totalEvents: 0, completedEvents: 0, byCategory: {}, streak: 0, interests: [], badges: [] });
        setAttendance([]);
        setCerts([]);
      }
    })();
    return () => { cancelled = true; };
  }, [me?.id, me?._id]);

  const toggleBadge = (badge) => {
    setSelectedBadges((prev) => {
      const exists = prev.includes(badge);
      let next = exists ? prev.filter((b) => b !== badge) : [...prev, badge];
      if (next.length > 3) next = next.slice(0, 3);
      return next;
    });
  };

  const sendBothOTPs = async () => {
    try { await sendEmailOTP(); } catch (_) { }
    try { await sendPhoneOTP(); } catch (_) { }
  };

  const saveBadges = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem("token");
      await api.put("/api/auth/display-badges", { badges: selectedBadges }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Badges updated");
      setBadgeEdit(false);
      const { data } = await api.get("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
      setMe(data);
    } catch (e) {
      toast.error(e?.response?.data?.error || "Failed to update badges");
    } finally {
      setSaving(false);
    }
  };

  const validateField = (key, val) => {
    const value = String(val ?? "").trim();
    if (value === '' && !touched[key]) return '';
    switch (key) {
      case "email": if (!value) return "Email is required"; return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? "" : "Please enter a valid email address";
      case "phone": if (!value) return "Phone number is required"; return /^\d{10}$/.test(value) ? "" : "Phone must be 10 digits";
      case "pincode": if (!value) return "Pincode is required"; return /^\d{6}$/.test(value) ? "" : "Pincode must be 6 digits";
      case "countryCode": if (!value) return "Country code is required"; return /^\+\d{1,4}$/.test(value) ? "" : "Enter a valid country code (e.g., +91)";
      case "age": { if (!value) return "Age is required"; const n = parseInt(value, 10); if (isNaN(n)) return "Please enter a valid number"; if (n < 16) return "You must be at least 16 years old"; if (n > 100) return "Please enter a valid age"; return ""; }
      case "fullname": if (!value) return "Full name is required"; if (value.length < 2) return "Name is too short"; if (value.length > 100) return "Name is too long"; return /^[a-zA-Z\s-']+$/.test(value) ? "" : "Name contains invalid characters";
      case "username": if (!value) return "Username is required"; if (value.length < 3) return "Username must be at least 3 characters"; if (value.length > 30) return "Username is too long"; return /^[a-zA-Z0-9_.-]+$/.test(value) ? "" : "Only letters, numbers, ., -, _ allowed";
      case "institute": if (!value) return "Institute is required"; if (value.length > 200) return "Institute name is too long"; if (value.length < 2) return "Institute name is too short"; return "";
      case "course": if (!value) return "Department is required"; if (value.length > 100) return "Department name is too long"; if (value.length < 1) return "Department name is required"; return "";
      case "street": if (!value) return "Street address is required"; if (value.length > 100) return "Street address is too long"; if (value.length < 3) return "Street address is too short"; return "";
      case "city": if (!value) return "City is required"; if (value.length > 100) return "City name is too long"; if (value.length < 2) return "City name is too short"; return "";
      default: return "";
    }
  };

  const handleBannerChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("File size must be < 5MB"); return; }
    if (!file.type.startsWith('image/')) { toast.error("Please select an image file"); return; }
    setSelectedBanner(file);
  };

  const uploadBannerImg = async () => {
    if (!selectedBanner) return;
    try {
      setUploading(true);
      const token = localStorage.getItem("token");
      const uploadResult = await uploadBanner(selectedBanner);
      if (!uploadResult.success) { toast.error(uploadResult.error || 'Failed to upload banner'); return; }
      await api.put('/api/auth/me', { bannerUrl: uploadResult.url }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Banner updated');
      const meRes = await api.get("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
      setMe(meRes.data);
      setForm(prev => ({ ...prev, bannerUrl: meRes.data.bannerUrl }));
      setOriginal(prev => ({ ...prev, bannerUrl: meRes.data.bannerUrl }));
      setSelectedBanner(null);
      setImgBust(Date.now());
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to upload banner');
    } finally { setUploading(false); }
  };

  const handleChange = (key, value) => {
    if (key === 'phone') value = String(value || '').replace(/\D/g, '').slice(0, 10);
    if (key === 'countryCode') value = (String(value || '+').startsWith('+') ? String(value) : `+${value}`);
    setForm((prev) => ({ ...prev, [key]: value }));
    const hasFocusAndTouched = focused[key] && touched[key];
    if (hasFocusAndTouched) setErrors((prev) => ({ ...prev, [key]: validateField(key, value) }));
  };

  const handleFocus = (key) => {
    setFocused((prev) => ({ ...prev, [key]: true }));
    setTouched((prev) => ({ ...prev, [key]: true }));
    const error = validateField(key, form[key]);
    setErrors((prev) => ({ ...prev, [key]: error }));
    if (error) toast.warn(error, { autoClose: 3000 });
  };

  const handleBlur = (key) => {
    setFocused((prev) => ({ ...prev, [key]: false }));
    setTouched((prev) => ({ ...prev, [key]: true }));
    const error = validateField(key, form[key]);
    setErrors((prev) => ({ ...prev, [key]: error }));
    if (error) toast.error(error, { autoClose: 3000 });
  };

  const saveProfile = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem("token");
      const keysToCheck = ["institute", "course", "street", "city", "countryCode", "pincode", "age"];
      const newErrors = {};
      keysToCheck.forEach((k) => { const msg = validateField(k, form[k]); if (msg) newErrors[k] = msg; });
      setErrors((prev) => ({ ...prev, ...newErrors }));
      const allTouched = {};
      keysToCheck.forEach((k) => { allTouched[k] = true; });
      setTouched((prev) => ({ ...prev, ...allTouched }));
      if (Object.values(newErrors).some(Boolean)) { toast.error("Please fix validation errors"); return; }
      await api.put("/api/auth/me", form, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Profile updated");
      const { data } = await api.get("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
      setMe(data);
      setForm(prev => ({ ...prev, username: data.username || "", fullname: data.fullname || "", institute: data.institute || "", street: data.street || "", city: data.city || "", pincode: data.pincode || "", age: data.age || "", course: data.course || "", countryCode: data.countryCode || "+91", bio: data.bio || "", bannerUrl: data.bannerUrl || "", profilePic: data.profilePic || prev.profilePic || "" }));
      setOriginal({ username: data.username || "", fullname: data.fullname || "", institute: data.institute || "", street: data.street || "", city: data.city || "", pincode: data.pincode || "", age: data.age || "", course: data.course || "", email: data.email || "", phone: data.phone || "", countryCode: data.countryCode || "+91", bio: data.bio || "", bannerUrl: data.bannerUrl || "", profilePic: data.profilePic || "" });
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
    } catch (e) { toast.error(e?.response?.data?.error || "Failed to send email OTP"); }
  };

  const verifyEmailOTP = async () => {
    try {
      const code = String(emailCode || '').trim();
      if (!/^\d{6}$/.test(code)) { toast.error('Enter the 6-digit email code'); return; }
      const token = localStorage.getItem("token");
      const { data } = await api.post("/api/auth/verify-email-otp", { code }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(data.message || "Email verified");
      if (data.xpAwarded) toast.success(`🎉 +${data.xpAwarded} XP earned! Verified Member badge unlocked!`);
      const meRes = await api.get("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
      setMe(meRes.data);
      setEmailCode("");
    } catch (e) { toast.error(e?.response?.data?.error || "Invalid code"); }
  };

  const sendPhoneOTP = async () => {
    try {
      if (!isValidPhone) { setTouched((prev) => ({ ...prev, phone: true })); setErrors((prev) => ({ ...prev, phone: validateField('phone', form.phone) })); return toast.error("Enter a valid 10-digit phone first"); }
      const token = localStorage.getItem("token");
      const { data } = await api.post("/api/auth/send-phone-otp", {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(data.message || "Phone OTP sent");
      if (data.devCode) toast.info(`Dev code: ${data.devCode}`);
    } catch (e) { toast.error(e?.response?.data?.error || "Failed to send phone OTP"); }
  };

  const verifyPhoneOTP = async () => {
    try {
      if (!isValidPhoneOTP) return toast.error("Enter the 6-digit OTP");
      const token = localStorage.getItem("token");
      const { data } = await api.post("/api/auth/verify-phone-otp", { code: phoneCode }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(data.message || "Phone verified");
      const meRes = await api.get("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
      setMe(meRes.data);
      setPhoneCode("");
    } catch (e) { toast.error(e?.response?.data?.error || "Invalid code"); }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { toast.error("File size must be less than 5MB"); return; }
      if (!file.type.startsWith('image/')) { toast.error("Please select an image file"); return; }
      setSelectedFile(file);
    }
  };

  const uploadProfilePic = async () => {
    if (!selectedFile) return;
    try {
      setUploading(true);
      const token = localStorage.getItem("token");
      const uploadResult = await uploadProfilePicture(selectedFile);
      if (!uploadResult.success) { toast.error(uploadResult.error || 'Failed to upload profile picture'); return; }
      await api.put('/api/auth/me', { profilePic: uploadResult.url }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Profile picture updated");
      const meRes = await api.get("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
      setMe(meRes.data);
      setForm(prev => ({ ...prev, profilePic: meRes.data.profilePic }));
      setOriginal(prev => ({ ...prev, profilePic: meRes.data.profilePic }));
      setSelectedFile(null);
    } catch (e) { toast.error(e?.response?.data?.error || "Failed to upload profile picture"); }
    finally { setUploading(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex items-center gap-3 font-black uppercase tracking-widest text-black text-sm">
          <div className="w-5 h-5 border-2 border-black border-t-transparent animate-spin" />
          Loading profile...
        </div>
      </div>
    );
  }

  const tabTitle = isView ? 'Profile' : isCredentials ? 'Verify Credentials' : isPhoto ? 'Change Photo' : 'Edit Profile';
  const tabDesc = isView ? 'View your profile details' : isCredentials ? 'Verify your email and phone number' : isPhoto ? 'Upload or change your profile picture' : 'Manage your personal details';

  return (
    <div className="min-h-screen bg-neutral-50 selection:bg-black selection:text-white">
      <div className="max-w-4xl mx-auto p-6 md:p-8">

        {/* ── Header ── */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 border-2 border-black bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5 text-black" />
          </button>
          <div className="p-3 border-2 border-black bg-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]">
            <UserCircle2 className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-black uppercase tracking-tighter">{tabTitle}</h1>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{tabDesc}</p>
          </div>
        </div>

        {/* ── Banner + Avatar ── */}
        <div className="mb-8 border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          {/* Banner */}
          <div className="relative h-48 w-full bg-neutral-200 overflow-hidden">
            {form.bannerUrl ? (
              <img src={getBannerUrl(form.bannerUrl)} alt="Banner" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-black to-neutral-700" />
            )}
            {/* Banner controls */}
            <div className="absolute right-4 bottom-3 flex items-center gap-2">
              <input type="file" accept="image/*" onChange={handleBannerChange} className="hidden" id="banner-file" />
              <label htmlFor="banner-file" className="px-3 py-1.5 bg-white border-2 border-black text-xs font-black uppercase tracking-widest cursor-pointer hover:bg-neutral-100 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all">
                Choose Banner
              </label>
              {selectedBanner && (
                <button onClick={uploadBannerImg} className="px-3 py-1.5 bg-black text-white border-2 border-black text-xs font-black uppercase tracking-widest hover:bg-neutral-800 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)]">
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              )}
            </div>
          </div>
          {/* Avatar row — outside overflow-hidden so it's never clipped */}
          <div className="relative bg-white px-6 pb-3" style={{ minHeight: '3.5rem' }}>
            {/* Avatar sits half above this row */}
            <div className="absolute -top-10 left-6 w-20 h-20 border-4 border-black overflow-hidden bg-neutral-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              {form.profilePic ? (
                <img src={getProfilePictureUrl(form.profilePic)} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-neutral-200">
                  <UserCircle2 className="w-10 h-10 text-black" />
                </div>
              )}
            </div>
            {/* Photo controls */}
            <div className="flex items-center gap-2 pt-2 pl-24">
              <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" id="profile-file" />
              <label htmlFor="profile-file" className="px-3 py-1.5 bg-white border-2 border-black text-xs font-black uppercase tracking-widest cursor-pointer hover:bg-neutral-100 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                Change Photo
              </label>
              {selectedFile && (
                <button onClick={uploadProfilePic} className="px-3 py-1.5 bg-black text-white border-2 border-black text-xs font-black uppercase tracking-widest hover:bg-neutral-800">
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Main Card ── */}
        <div className="bg-white border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">

          {/* Sub-tabs */}
          <div className="border-b-2 border-black flex">
            {['About', 'Progress', 'Attendance'].map(t => (
              <button
                key={t}
                onClick={() => setSubTab(t)}
                className={`px-6 py-4 text-xs font-black uppercase tracking-widest transition-all border-r-2 border-black last:border-r-0 ${subTab === t ? 'bg-black text-white' : 'bg-white text-black hover:bg-neutral-100'}`}
              >
                {t}
              </button>
            ))}
            <div className="flex-1 border-l-0" />
            <button
              onClick={() => navigate('/profile/friends')}
              className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-black hover:bg-neutral-100 border-l-2 border-black transition-all"
            >
              All Friends →
            </button>
          </div>

          <div className="p-6 md:p-8">

            {/* ── ABOUT TAB ── */}
            {subTab === 'About' && (
              <div className="m-0">

                {/* Bio */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-xs font-black uppercase tracking-widest text-black border-b-2 border-black pb-1 inline-block">Bio</div>
                    {!editing ? (
                      <button onClick={() => setEditing(true)} className="px-3 py-1.5 bg-white border-2 border-black text-xs font-black uppercase tracking-widest shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all">
                        <Edit3 className="w-3.5 h-3.5 inline mr-1" />Edit
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button onClick={async () => { await saveProfile(); setEditing(false); }} className="px-3 py-1.5 bg-black text-white border-2 border-black text-xs font-black uppercase tracking-widest hover:bg-neutral-800 transition-all">
                          <Save className="w-3.5 h-3.5 inline mr-1" />Save
                        </button>
                        <button onClick={() => { setForm(prev => ({ ...prev, bio: original?.bio || '' })); setEditing(false); }} className="px-3 py-1.5 bg-white border-2 border-black text-xs font-black uppercase tracking-widest hover:bg-neutral-100 transition-all">
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                  {!editing ? (
                    <div className="text-sm text-slate-600 font-medium leading-relaxed">{(form.bio || '').trim() || 'Add a short bio to tell others about yourself.'}</div>
                  ) : (
                    <textarea
                      value={form.bio || ''}
                      onChange={(e) => setForm(prev => ({ ...prev, bio: e.target.value }))}
                      rows={4}
                      className={`${inputBase} resize-none`}
                      placeholder="Write a short bio..."
                    />
                  )}
                  {!!(me?.interests || []).length && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(me?.interests || []).map((i, idx) => <Chip key={idx} text={i} />)}
                    </div>
                  )}
                </div>

                {/* Form Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                  {/* Personal */}
                  <section className="bg-blue-50 border-2 border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <h3 className="text-xs font-black uppercase tracking-widest text-black mb-4 flex items-center gap-2 border-b-2 border-black pb-2">
                      <Edit3 className="w-4 h-4" /> Personal
                    </h3>
                    <div className="space-y-4">
                      <Field label="Full Name">
                        <input value={form.fullname ?? ""} readOnly disabled className={`${inputBase} ${inputDisabled}`} />
                        <div className="mt-1 text-[10px] text-slate-500 font-bold uppercase tracking-wide">Full name cannot be changed.</div>
                      </Field>
                      <Field label="Username">
                        <input value={form.username ?? ""} readOnly disabled className={`${inputBase} ${inputDisabled}`} />
                        <div className="mt-1 text-[10px] text-slate-500 font-bold uppercase tracking-wide">Username cannot be changed.</div>
                      </Field>
                    </div>
                  </section>

                  {/* Contact */}
                  {!isPhoto && (
                    <section className="bg-violet-50 border-2 border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                      <h3 className="text-xs font-black uppercase tracking-widest text-black mb-4 flex items-center gap-2 border-b-2 border-black pb-2">
                        <Mail className="w-4 h-4" /> Contact
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                          <Field label="Email" error={errors.email} touched={touched.email && !isView && !isCredentials}>
                            <input value={form.email ?? ""} readOnly disabled className={`${inputBase} ${inputDisabled}`} />
                          </Field>
                          {isCredentials && (
                            <div className="mt-2">
                              <div className="flex items-center gap-2 mb-2">
                                {me?.emailVerified ? (
                                  <span className="text-green-700 inline-flex items-center gap-1 text-xs font-black uppercase tracking-wide bg-green-100 border-2 border-black px-2 py-0.5"><ShieldCheck className="w-3 h-3" /> Verified</span>
                                ) : (
                                  <span className="text-amber-700 inline-flex items-center gap-1 text-xs font-black uppercase tracking-wide bg-amber-100 border-2 border-black px-2 py-0.5">⭐ Verify for +150 XP & Badge</span>
                                )}
                              </div>
                              {!me?.emailVerified && (
                                <div className="space-y-2">
                                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Optional — earn the Verified Member badge and 150 XP</p>
                                  <button onClick={sendEmailOTP} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border-2 border-black text-xs font-black uppercase tracking-widest shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-neutral-50 transition-all">
                                    <Send className="w-3 h-3" /> Send OTP
                                  </button>
                                  <div className="flex gap-2">
                                    <input value={emailCode} onChange={e => setEmailCode(e.target.value)} placeholder="6-digit code" className={`${inputBase} flex-1`} />
                                    <button onClick={verifyEmailOTP} className="px-3 py-2 bg-green-500 border-2 border-black font-black uppercase tracking-widest text-xs text-black hover:bg-green-600 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all">
                                      <CheckCircle2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div>
                          <Field label="Country Code" error={errors.countryCode} touched={touched.countryCode && !isView}>
                            <input value={form.countryCode ?? ""} onChange={(e) => handleChange('countryCode', e.target.value)} onFocus={() => handleFocus('countryCode')} onBlur={() => handleBlur('countryCode')} disabled={!editing || isCredentials} className={`${inputBase} ${(!editing || isCredentials) ? inputDisabled : ''}`} />
                          </Field>
                        </div>
                        <div>
                          <Field label="Phone">
                            <input value={form.phone ?? ""} readOnly disabled className={`${inputBase} ${inputDisabled}`} />
                          </Field>
                        </div>
                        <div className="sm:col-span-2 text-[10px] text-slate-500 font-bold uppercase tracking-wide">
                          Email and phone are managed via verification. Contact support to change.
                        </div>
                      </div>
                    </section>
                  )}

                  {/* Academic */}
                  {(!isCredentials && !isPhoto) && (
                    <section className="bg-amber-50 border-2 border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                      <h3 className="text-xs font-black uppercase tracking-widest text-black mb-4 flex items-center gap-2 border-b-2 border-black pb-2">
                        <Trophy className="w-4 h-4" /> Academic
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Field label="Institute" error={errors.institute} touched={touched.institute && !isView}>
                            <input value={form.institute ?? ""} onChange={(e) => handleChange('institute', e.target.value)} onFocus={() => handleFocus('institute')} onBlur={() => handleBlur('institute')} disabled={!editing} className={`${inputBase} ${!editing ? inputDisabled : ''}`} />
                          </Field>
                        </div>
                        <div>
                          <Field label="Department" error={errors.course} touched={touched.course && !isView}>
                            <input value={form.course ?? ""} onChange={(e) => handleChange('course', e.target.value)} onFocus={() => handleFocus('course')} onBlur={() => handleBlur('course')} disabled={!editing} className={`${inputBase} ${!editing ? inputDisabled : ''}`} />
                          </Field>
                        </div>
                        <div>
                          <Field label="Age" error={errors.age} touched={touched.age && !isView}>
                            <input type="number" value={form.age ?? ""} onChange={(e) => handleChange('age', e.target.value)} onFocus={() => handleFocus('age')} onBlur={() => handleBlur('age')} disabled={!editing} className={`${inputBase} ${!editing ? inputDisabled : ''}`} />
                          </Field>
                        </div>
                      </div>
                    </section>
                  )}

                  {/* Address */}
                  {(!isCredentials && !isPhoto) && (
                    <section className="bg-teal-50 border-2 border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                      <h3 className="text-xs font-black uppercase tracking-widest text-black mb-4 flex items-center gap-2 border-b-2 border-black pb-2">
                        <MapPin className="w-4 h-4" /> Address
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                          <Field label="Street" error={errors.street} touched={touched.street && !isView}>
                            <input value={form.street ?? ""} onChange={(e) => handleChange('street', e.target.value)} onFocus={() => handleFocus('street')} onBlur={() => handleBlur('street')} disabled={!editing} className={`${inputBase} ${!editing ? inputDisabled : ''}`} />
                          </Field>
                        </div>
                        <div>
                          <Field label="City" error={errors.city} touched={touched.city && !isView}>
                            <input value={form.city ?? ""} onChange={(e) => handleChange('city', e.target.value)} onFocus={() => handleFocus('city')} onBlur={() => handleBlur('city')} disabled={!editing} className={`${inputBase} ${!editing ? inputDisabled : ''}`} />
                          </Field>
                        </div>
                        <div>
                          <Field label="Pincode" error={errors.pincode} touched={touched.pincode && !isView}>
                            <input value={form.pincode ?? ""} onChange={(e) => handleChange('pincode', e.target.value)} onFocus={() => handleFocus('pincode')} onBlur={() => handleBlur('pincode')} disabled={!editing} className={`${inputBase} ${!editing ? inputDisabled : ''}`} />
                          </Field>
                        </div>
                      </div>
                    </section>
                  )}

                  {/* Profile Photo Upload section (photo tab) */}
                  {isPhoto && (
                    <section className="lg:col-span-2 bg-pink-50 border-2 border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                      <h3 className="text-xs font-black uppercase tracking-widest text-black mb-4 flex items-center gap-2 border-b-2 border-black pb-2">
                        <ImagePlus className="w-4 h-4" /> Profile Picture
                      </h3>
                      <div className="flex items-center gap-4">
                        <div className="w-20 h-20 border-2 border-black overflow-hidden bg-neutral-100 flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                          {form.profilePic ? (
                            <img src={getProfilePictureUrl(form.profilePic)} alt="Profile" className="w-full h-full object-cover" />
                          ) : (
                            <UserCircle2 className="w-10 h-10 text-black" />
                          )}
                        </div>
                        <div className="flex-1">
                          <input type="file" accept="image/*" onChange={handleFileChange} className="block w-full text-sm text-black font-bold file:mr-4 file:py-2 file:px-4 file:border-2 file:border-black file:bg-black file:text-white file:font-black file:uppercase file:tracking-widest hover:file:bg-neutral-800 file:transition-all" />
                          {selectedFile && (
                            <button onClick={uploadProfilePic} disabled={uploading} className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-black text-white border-2 border-black font-black uppercase tracking-widest text-xs hover:bg-neutral-800 disabled:opacity-50 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)] transition-all">
                              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                              {uploading ? "Uploading..." : "Upload Photo"}
                            </button>
                          )}
                        </div>
                      </div>
                    </section>
                  )}

                </div>

                {/* Save CTA */}
                {!isView && !isCredentials && !isPhoto && (
                  <div className="mt-8 flex items-center justify-end gap-3 pt-6 border-t-2 border-black">
                    {!editing ? (
                      <button onClick={() => setEditing(true)} className="px-6 py-3 bg-white border-2 border-black text-black font-black uppercase tracking-widest text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all">
                        <Edit3 className="w-4 h-4 inline mr-2" /> Edit Profile
                      </button>
                    ) : (
                      <>
                        <button onClick={() => { setForm(original || {}); setEditing(false); setErrors({}); }} className="px-6 py-3 bg-white border-2 border-black text-black font-black uppercase tracking-widest text-xs hover:bg-neutral-100 transition-all">
                          Cancel
                        </button>
                        <button onClick={async () => { await saveProfile(); setEditing(false); }} disabled={saving} className="px-6 py-3 bg-black text-white border-2 border-black font-black uppercase tracking-widest text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] hover:bg-neutral-800 disabled:opacity-50 transition-all">
                          {saving ? <><Loader2 className="w-4 h-4 inline animate-spin mr-2" />Saving...</> : <><Save className="w-4 h-4 inline mr-2" />Save Changes</>}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── PROGRESS TAB ── */}
            {subTab === 'Progress' && (
              <div className="space-y-8">
                {!stats ? (
                  <div className="flex items-center gap-3 text-black font-black uppercase tracking-widest text-xs py-8">
                    <div className="w-4 h-4 border-2 border-black border-t-transparent animate-spin" /> Loading stats...
                  </div>
                ) : (
                  <>
                    {/* Stat cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Stat label="Events" value={stats.totalEvents} />
                      <Stat label="Completed" value={stats.completedEvents} />
                      <Stat label="Streak" value={`${stats.streak}d`} />
                      <Stat label="Interests" value={(stats.interests || []).length} />
                    </div>

                    {/* By Category */}
                    <div className="bg-violet-50 border-2 border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                      <div className="text-xs font-black uppercase tracking-widest text-black mb-4 border-b-2 border-black pb-2">By Category</div>
                      <div className="space-y-3">
                        {Object.entries(stats.byCategory || {}).map(([cat, n]) => (
                          <div key={cat} className="flex items-center gap-3">
                            <div className="w-28 text-[10px] text-black font-bold uppercase tracking-wide truncate">{cat}</div>
                            <div className="flex-1 h-4 bg-white border-2 border-black overflow-hidden">
                              <div className="h-full bg-black" style={{ width: `${Math.min(100, (n / (stats.totalEvents || 1)) * 100)}%` }} />
                            </div>
                            <div className="w-6 text-xs text-black font-black text-right">{n}</div>
                          </div>
                        ))}
                        {Object.keys(stats.byCategory || {}).length === 0 && (
                          <div className="text-xs text-slate-500 font-bold uppercase">No category data yet.</div>
                        )}
                      </div>
                    </div>

                    {/* Badges */}
                    <div className="bg-amber-50 border-2 border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                      <div className="text-xs font-black uppercase tracking-widest text-black flex items-center justify-between border-b-2 border-black pb-2 mb-4">
                        <span>Badges</span>
                        {!badgeEdit ? (
                          <button onClick={() => setBadgeEdit(true)} className="px-3 py-1 bg-white border-2 border-black text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-neutral-50 transition-all">Edit Display</button>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-black uppercase">Select up to 3</span>
                        )}
                      </div>
                      {!badgeEdit ? (
                        <div className="flex flex-wrap gap-2">
                          {(selectedBadges.length ? selectedBadges : (stats.badges || [])).map((b, idx) => <Chip key={idx} text={b} />)}
                          {(!selectedBadges.length && (!stats.badges || stats.badges.length === 0)) && (
                            <div className="text-xs text-slate-500 font-bold uppercase">No badges yet.</div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex flex-wrap gap-2">
                            {(stats.badges || []).map((b) => {
                              const active = selectedBadges.includes(b);
                              return (
                                <button type="button" key={b} onClick={() => toggleBadge(b)} className={`px-3 py-1.5 border-2 border-black text-xs font-black uppercase tracking-wide transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] ${active ? 'bg-black text-white' : 'bg-white text-black hover:bg-neutral-50'}`}>
                                  {b}
                                </button>
                              );
                            })}
                          </div>
                          <div className="text-[10px] text-slate-500 font-bold uppercase">{selectedBadges.length}/3 selected</div>
                          <div className="flex gap-2">
                            <button onClick={saveBadges} disabled={selectedBadges.length === 0 || saving} className="px-4 py-2 bg-black text-white border-2 border-black text-xs font-black uppercase tracking-widest hover:bg-neutral-800 disabled:opacity-50 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)] transition-all">
                              {saving ? 'Saving...' : 'Save Badges'}
                            </button>
                            <button onClick={() => { setSelectedBadges(Array.isArray(me?.displayBadges) ? me.displayBadges : []); setBadgeEdit(false); }} className="px-4 py-2 bg-white border-2 border-black text-xs font-black uppercase tracking-widest hover:bg-neutral-100 transition-all">
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Certificates */}
                      <div className="mt-6 pt-4 border-t-2 border-black">
                        <div className="text-xs font-black uppercase tracking-widest text-black mb-3">Certificates</div>
                        {uniqueCerts.length === 0 ? (
                          <div className="text-xs text-slate-500 font-bold uppercase">No certificates yet.</div>
                        ) : (
                          <ul className="space-y-2">
                            {uniqueCerts.map(c => (
                              <li key={c.id} className="flex items-center justify-between p-3 bg-white border-2 border-black">
                                <span className="text-sm font-bold text-black truncate mr-3">{c.title}</span>
                                <a href={`${c.url}`} target="_blank" rel="noreferrer" className="px-3 py-1 bg-black text-white border-2 border-black text-[10px] font-black uppercase tracking-widest hover:bg-neutral-800 transition-all flex-shrink-0">
                                  Download
                                </a>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── ATTENDANCE TAB ── */}
            {subTab === 'Attendance' && (
              <div>
                {attendance.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-black">
                    <div className="text-xs font-black uppercase tracking-widest text-slate-500">No events attended yet.</div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {attendance.slice(0, 30).map(ev => (
                      <div key={ev.eventId} className="flex items-center justify-between p-4 bg-white border-2 border-black hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all">
                        <div className="min-w-0">
                          <div className="text-sm font-black text-black uppercase tracking-tight truncate">{ev.title}</div>
                          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{new Date(ev.date).toLocaleString()} • {ev.category || 'Event'}</div>
                        </div>
                        <span className={`flex-shrink-0 ml-4 px-3 py-1 border-2 border-black text-[10px] font-black uppercase tracking-wider ${ev.isCompleted ? 'bg-green-100 text-green-900' : 'bg-slate-100 text-black'}`}>
                          {ev.isCompleted ? 'Completed' : 'Upcoming'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
