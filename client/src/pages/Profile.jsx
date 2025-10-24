// src/pages/Profile.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../utils/api";
import { Mail, Phone, ShieldCheck, Send, CheckCircle2, Save, UserCircle2, Edit3, AlertCircle, CheckCircle, Loader2, Trophy, MapPin, ArrowLeft, ImagePlus, Upload } from "lucide-react";

// Local UI helpers
const Stat = ({ label, value }) => (
  <div className="p-3 rounded-lg bg-[#141418] border border-[#2a2a30]">
    <div className="text-xs text-gray-400">{label}</div>
    <div className="text-lg font-semibold text-gray-100">{value}</div>
  </div>
);

const Chip = ({ text }) => (
  <span className="px-2 py-1 rounded bg-[#141418] border border-[#2a2a30] text-xs text-gray-300">{text}</span>
);

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
  const [subTab, setSubTab] = useState('About'); // About | Progress | Attendance
  const [stats, setStats] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [certs, setCerts] = useState([]);
const uniqueKey = (c) => (c?.eventId) || String((c?.title || '')).trim().toLowerCase() || (c?.id);

const uniqueCerts = useMemo(() => {
  const seen = new Set();
  return (Array.isArray(certs) ? certs : []).filter((c) => {
    const key = uniqueKey(c);
    if (!key) return true; // keep items without identifiers
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
  
  // Derive page modes from URL query (fallback defaults)
  const params = new URLSearchParams(location.search || "");
  const mode = (params.get("mode") || "").toLowerCase();
  const tabParam = (params.get("tab") || "").toLowerCase();
  const isCredentials = mode === "credentials" || ["credentials","otp","verify","verification"].includes(tabParam);
  const isPhoto = mode === "photo" || tabParam === "photo";
  const isView = mode === "view" || params.get("view") === "1";
  const isUpdate = !isCredentials && !isPhoto; // default edit mode when not in special modes

  // Simple validators
  const isValidPhone = /^\d{10}$/.test(String(form.phone || ""));
  const isValidPhoneOTP = /^\d{6}$/.test(String(phoneCode || ""));

  // Initial profile load
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
        });
        // Optionally fetch stats/attendance/certs here later
      } catch (e) {
        toast.error(e?.response?.data?.error || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    })();
  }, []);
  // Initialize selected badges from profile or stats
  useEffect(() => {
    const initial = Array.isArray(me?.displayBadges) && me.displayBadges.length
      ? me.displayBadges
      : Array.isArray(stats?.badges) ? stats.badges.slice(0, 3) : [];
    setSelectedBadges(initial);
  }, [me, stats]);

  // Load stats, attendance, and certificates for current user
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
        // Fallback defaults so UI doesn't stick on "Loading stats..."
        setStats({ totalEvents: 0, completedEvents: 0, byCategory: {}, streak: 0, interests: [], badges: [] });
        setAttendance([]);
        setCerts([]);
      }
    })();
    return () => { cancelled = true; };
  }, [me?.id, me?._id]);

  // Badge helpers
  const toggleBadge = (badge) => {
    setSelectedBadges((prev) => {
      const exists = prev.includes(badge);
      let next = exists ? prev.filter((b) => b !== badge) : [...prev, badge];
      if (next.length > 3) next = next.slice(0, 3);
      return next;
    });
  };

  // Quick action: send both OTPs
  const sendBothOTPs = async () => {
    try {
      await sendEmailOTP();
    } catch (_) { /* toast already handled in sendEmailOTP */ }
    try {
      await sendPhoneOTP();
    } catch (_) { /* toast already handled in sendPhoneOTP */ }
  };

  const saveBadges = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem("token");
      await api.put(
        "/api/auth/display-badges",
        { badges: selectedBadges },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Badges updated");
      setBadgeEdit(false);
      const { data } = await api.get("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMe(data);
    } catch (e) {
      toast.error(e?.response?.data?.error || "Failed to update badges");
    } finally {
      setSaving(false);
    }
  };

  const validateField = (key, val) => {
    const value = String(val ?? "").trim();
    
    // Skip validation for empty required fields on initial focus
    if (value === '' && !touched[key]) {
      return '';
    }
    
    switch (key) {
      case "email":
        if (!value) return "Email is required";
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? "" : "Please enter a valid email address";
        
      case "phone":
        if (!value) return "Phone number is required";
        return /^\d{10}$/.test(value) ? "" : "Phone must be 10 digits";
        
      case "pincode":
        if (!value) return "Pincode is required";
        return /^\d{6}$/.test(value) ? "" : "Pincode must be 6 digits";
        
      case "countryCode":
        if (!value) return "Country code is required";
        return /^\+\d{1,4}$/.test(value) ? "" : "Enter a valid country code (e.g., +91)";
        
      case "age": {
        if (!value) return "Age is required";
        const n = parseInt(value, 10);
        if (isNaN(n)) return "Please enter a valid number";
        if (n < 16) return "You must be at least 16 years old";
        if (n > 100) return "Please enter a valid age";
        return "";
      }
      
      case "fullname":
        if (!value) return "Full name is required";
        if (value.length < 2) return "Name is too short";
        if (value.length > 100) return "Name is too long";
        return /^[a-zA-Z\s-']+$/.test(value) ? "" : "Name contains invalid characters";
        
      case "username":
        if (!value) return "Username is required";
        if (value.length < 3) return "Username must be at least 3 characters";
        if (value.length > 30) return "Username is too long";
        return /^[a-zA-Z0-9_.-]+$/.test(value) ? "" : "Only letters, numbers, ., -, _ allowed";
        
      case "institute":
        if (value && value.length > 200) return "Institute name is too long";
        return "";
        
      case "course":
        if (value && value.length > 100) return "Course name is too long";
        return "";
        
      case "street":
      case "city":
        if (value && value.length > 100) return `The ${key} is too long`;
        return "";
        
      default:
        return "";
    }
  };

  // Banner handlers (top-level)
  const handleBannerChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("File size must be < 5MB"); return; }
    if (!file.type.startsWith('image/')) { toast.error("Please select an image file"); return; }
    setSelectedBanner(file);
  };

  const uploadBanner = async () => {
    if (!selectedBanner) return;
    try {
      setUploading(true);
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append('banner', selectedBanner);
      await api.post('/api/auth/upload-banner', formData, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } });
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
    // Mark as focused and touched, and validate immediately on focus
    setFocused((prev) => ({ ...prev, [key]: true }));
    setTouched((prev) => ({ ...prev, [key]: true }));
    
    // Validate field on focus
    const error = validateField(key, form[key]);
    setErrors((prev) => ({ ...prev, [key]: error }));
    
    // Show immediate feedback if there's an error
    if (error) {
      toast.warn(error, { autoClose: 3000 });
    }
  };

  const handleBlur = (key) => {
    setFocused((prev) => ({ ...prev, [key]: false }));
    setTouched((prev) => ({ ...prev, [key]: true }));
    
    // Validate on blur and show error if needed
    const error = validateField(key, form[key]);
    setErrors((prev) => ({ ...prev, [key]: error }));
    
    // Show error toast if there's an error
    if (error) {
      toast.error(error, { autoClose: 3000 });
    }
  };

  const saveProfile = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem("token");
      // Final validate key fields (exclude fullname/username as they are locked)
      const keysToCheck = ["countryCode","pincode","age"];
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
      // Refresh from server truth and reflect in UI
      const { data } = await api.get("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
      setMe(data);
      setForm(prev => ({
        ...prev,
        username: data.username || "",
        fullname: data.fullname || "",
        institute: data.institute || "",
        street: data.street || "",
        city: data.city || "",
        pincode: data.pincode || "",
        age: data.age || "",
        course: data.course || "",
        countryCode: data.countryCode || "+91",
        bio: data.bio || "",
        bannerUrl: data.bannerUrl || "",
        profilePic: data.profilePic || prev.profilePic || "",
      }));
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
        bio: data.bio || "",
        bannerUrl: data.bannerUrl || "",
        profilePic: data.profilePic || "",
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
      const code = String(emailCode || '').trim();
      if (!/^\d{6}$/.test(code)) {
        toast.error('Enter the 6-digit email code');
        return;
      }
      const token = localStorage.getItem("token");
      const { data } = await api.post("/api/auth/verify-email-otp", { code }, { headers: { Authorization: `Bearer ${token}` } });
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
    <div className="min-h-screen bg-[#0b0b0c] text-white p-6 overflow-y-auto">
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
            {/* OTP quick actions removed per request; use controls in Contact section */}
          </div>
        </div>

        {/* Banner */}
        <div className="mb-6 rounded-xl overflow-hidden border border-[#2a2a30] bg-[#0e0e10]">
          <div className="relative h-40 sm:h-56 md:h-64 w-full bg-[#141418]">
            {form.bannerUrl ? (
              <img src={`http://localhost:5000/${form.bannerUrl}?v=${imgBust}`} alt="Banner" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-blue-700/40 to-indigo-700/30" />
            )}
            {/* Avatar overlay */}
            <div className="absolute -bottom-4 left-6 w-24 h-24 rounded-full border-4 border-[#0b0b0c] overflow-hidden bg-[#151518] flex items-center justify-center shadow-[0_6px_20px_rgba(0,0,0,0.35)]">
              {form.profilePic ? (
                <img src={`http://localhost:5000/${form.profilePic}?v=${imgBust}`} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <UserCircle2 className="w-10 h-10 text-yellow-400" />
              )}
            </div>
            {/* Banner controls */}
            <div className="absolute right-4 bottom-3 flex items-center gap-2">
              <input type="file" accept="image/*" onChange={handleBannerChange} className="hidden" id="banner-file" />
              <label htmlFor="banner-file" className="px-3 py-1.5 rounded bg-[#151518] border border-[#2a2a30] text-xs cursor-pointer">Choose Banner</label>
              {selectedBanner && (
                <button onClick={uploadBanner} className="px-3 py-1.5 rounded bg-yellow-500 text-black text-xs hover:bg-yellow-400 disabled:opacity-50">{uploading? 'Uploading...':'Upload'}</button>
              )}
            </div>
            {/* Profile photo controls */}
            <div className="absolute left-36 bottom-2 flex items-center gap-2">
              <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" id="profile-file" />
              <label htmlFor="profile-file" className="px-3 py-1.5 rounded bg-[#151518] border border-[#2a2a30] text-xs cursor-pointer hover:bg-[#1b1b20]">Change Profile Photo</label>
              {selectedFile && (
                <button onClick={uploadProfilePic} className="px-3 py-1.5 rounded bg-yellow-500 text-black text-xs hover:bg-yellow-400 disabled:opacity-50">{uploading? 'Uploading...':'Upload'}</button>
              )}
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="bg-[#0e0e10] border border-[#2a2a30] rounded-xl p-6">
          {/* Public-style tabs */}
          <div className="border-b border-[#2a2a30] mb-6 flex gap-6 text-sm">
            {['About','Progress','Attendance'].map(t => (
              <button key={t} onClick={()=>setSubTab(t)} className={`pb-3 -mb-px ${subTab===t?'text-yellow-400 border-b-2 border-yellow-400 font-semibold':'text-gray-400 hover:text-gray-200'}`}>{t}</button>
            ))}
            <div className="ml-auto">
              <button onClick={()=>navigate('/profile/friends')} className="text-xs text-yellow-400 hover:underline">View all friends</button>
            </div>
          </div>

          {/* About tab content (editable) */}
          {subTab === 'About' && (
            <div className="mb-6 text-sm text-gray-300">
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold">Bio</div>
                {!editing ? (
                  <button onClick={()=>setEditing(true)} className="text-xs px-2 py-1 rounded bg-[#151518] border border-[#2a2a30] hover:bg-[#1b1b20]">Edit</button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button onClick={async ()=>{ await saveProfile(); setEditing(false); }} className="text-xs px-3 py-1 rounded bg-yellow-500 text-black hover:bg-yellow-400">Save</button>
                    <button onClick={()=>{ setForm(prev=>({ ...prev, bio: original?.bio || '' })); setEditing(false); }} className="text-xs px-3 py-1 rounded bg-[#151518] border border-[#2a2a30] hover:bg-[#1b1b20]">Cancel</button>
                  </div>
                )}
              </div>
              {!editing ? (
                <div className="text-gray-400">{(form.bio||'').trim() || 'Add a short bio to tell others about yourself.'}</div>
              ) : (
                <textarea value={form.bio||''} onChange={(e)=>setForm(prev=>({ ...prev, bio: e.target.value }))} rows={4} className="w-full mt-1 px-3 py-2 rounded bg-[#141418] border border-[#2a2a30]" placeholder="Write a short bio..." />
              )}
              {!!(me?.interests||[]).length && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {(me?.interests||[]).map((i,idx)=>(<span key={idx} className="px-2 py-1 bg-blue-900/30 text-blue-200 rounded">{i}</span>))}
                </div>
              )}
            </div>
          )}

          {/* Progress tab content */}
          {subTab === 'Progress' && (
            <div className="mb-6 space-y-4">
              {!stats ? (
                <div className="text-sm text-gray-400">Loading stats...</div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Stat label="Events" value={stats.totalEvents} />
                    <Stat label="Completed" value={stats.completedEvents} />
                    <Stat label="Streak" value={`${stats.streak}d`} />
                    <Stat label="Interests" value={(stats.interests||[]).length} />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-200 mb-2">By Category</div>
                    <div className="space-y-2">
                      {Object.entries(stats.byCategory||{}).map(([cat, n]) => (
                        <div key={cat} className="flex items-center gap-3">
                          <div className="w-32 text-xs text-gray-400 truncate">{cat}</div>
                          <div className="flex-1 h-2 bg-[#1c1c21] rounded-full overflow-hidden">
                            <div className="h-2 bg-yellow-500" style={{ width: `${Math.min(100, (n / (stats.totalEvents||1)) * 100)}%` }} />
                          </div>
                          <div className="w-8 text-xs text-gray-400 text-right">{n}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-200 mb-2 flex items-center justify-between">
  <span>Badges</span>
  {!badgeEdit ? (
    <button onClick={() => setBadgeEdit(true)} className="text-xs px-2 py-1 rounded bg-[#151518] border border-[#2a2a30] hover:bg-[#1b1b20]">Edit</button>
  ) : (
    <div className="text-xs text-gray-400">Select up to 3</div>
  )}
</div>
{!badgeEdit ? (
  <div className="flex flex-wrap gap-2">
    {(selectedBadges.length ? selectedBadges : (stats.badges||[])).map((b,idx)=>(<span key={idx} className="px-2 py-1 bg-blue-900/30 text-blue-200 rounded">{b}</span>))}
    {(!selectedBadges.length && (!stats.badges||[]).length===0) && (<div className="text-sm text-gray-400">No badges yet.</div>)}
  </div>
) : (
  <div className="space-y-3">
    <div className="flex flex-wrap gap-2">
      {(stats.badges||[]).map((b)=>{
        const active = selectedBadges.includes(b);
        return (
          <button type="button" key={b} onClick={()=>toggleBadge(b)} className={`px-2 py-1 rounded border ${active? 'bg-yellow-500 text-black border-yellow-500':'bg-[#141418] text-gray-300 border-[#2a2a30]'} hover:opacity-90`}>
            {b}
          </button>
        );
      })}
    </div>
    <div className="text-xs text-gray-400">{selectedBadges.length}/3 selected</div>
    <div className="flex gap-2">
      <button onClick={saveBadges} disabled={selectedBadges.length===0} className="px-3 py-1.5 rounded bg-yellow-500 text-black text-xs disabled:opacity-50">Save</button>
      <button onClick={()=>{ setSelectedBadges(Array.isArray(me?.displayBadges)? me.displayBadges: []); setBadgeEdit(false); }} className="px-3 py-1.5 rounded bg-[#151518] border border-[#2a2a30] text-xs">Cancel</button>
    </div>
  </div>
)}
                  <div>
                    <div className="text-sm font-medium text-gray-200 mb-2">Certificates</div>
                    {uniqueCerts.length === 0 ? (
                      <div className="text-sm text-gray-400">No certificates yet.</div>
                    ) : (
                      <ul className="text-sm text-gray-300 space-y-2">
                        {uniqueCerts.map(c => (
                          <li key={c.id} className="flex items-center justify-between">
                            <span className="truncate mr-3">{c.title}</span>
                            <a href={`${c.url}`} target="_blank" rel="noreferrer" className="text-yellow-400 hover:underline">Download</a>
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

          {/* Attendance tab content */}
          {subTab === 'Attendance' && (
            <div className="mb-6">
              {attendance.length === 0 ? (
                <div className="text-sm text-gray-400">No events yet.</div>
              ) : (
                <div className="divide-y divide-[#1f1f25]">
                  {attendance.slice(0, 30).map(ev => (
                    <div key={ev.eventId} className="py-3 flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-200 truncate">{ev.title}</div>
                        <div className="text-xs text-gray-400">{new Date(ev.date).toLocaleString()} â€¢ {ev.category || 'Event'}</div>
                      </div>
                      <div className={`text-xs ${ev.isCompleted ? 'text-green-400' : 'text-gray-400'}`}>{ev.isCompleted ? 'Completed' : 'Upcoming'}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {/* Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Personal */}
            <section>
              <h3 className="font-semibold text-gray-200 mb-3 flex items-center gap-2"><Edit3 className="w-4 h-4 text-yellow-400"/> Personal</h3>
              <div className="space-y-3">
                                <div>
                  <label className="block text-sm text-gray-400 mb-1">Full Name</label>
                  <input
                    value={form.fullname ?? ""}
                    readOnly
                    disabled
                    className={`w-full px-3 py-2 rounded-lg bg-[#141418] border border-[#2a2a30] opacity-60 cursor-not-allowed`}
                  />
                  <div className="mt-1 text-xs text-gray-500">Full name cannot be changed.</div>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Username</label>
                  <input
                    value={form.username ?? ""}
                    readOnly
                    disabled
                    className={`w-full px-3 py-2 rounded-lg bg-[#141418] border border-[#2a2a30] opacity-60 cursor-not-allowed`}
                  />
                  <div className="mt-1 text-xs text-gray-500">Username cannot be changed.</div>
                </div>
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
                    readOnly
                    disabled
                    className={`w-full px-3 py-2 rounded-lg bg-[#141418] border border-[#2a2a30] opacity-60 cursor-not-allowed`}
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
                    disabled={!editing || isCredentials}
                    className={`w-full px-3 py-2 rounded-lg bg-[#141418] border ${errors.countryCode ? 'border-red-600' : 'border-[#2a2a30]'} ${(!editing || isCredentials) ? 'opacity-60 cursor-not-allowed' : 'focus:ring-2 focus:ring-yellow-500 focus-border-transparent'}`}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Phone</label>
                  <input
                    value={form.phone ?? ""}
                    readOnly
                    disabled
                    className={`w-full px-3 py-2 rounded-lg bg-[#141418] border border-[#2a2a30] opacity-60 cursor-not-allowed`}
                  />
                  <div className="mt-1 text-xs text-gray-500">Email and phone are managed via verification. Contact support to change.</div>
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
                  <input value={form.institute ?? ""} onChange={(e)=>handleChange('institute', e.target.value)} disabled={!editing} className={`w-full px-3 py-2 rounded-lg bg-[#141418] border border-[#2a2a30] ${!editing ? 'opacity-60 cursor-not-allowed' : 'focus:ring-2 focus:ring-yellow-500 focus:border-transparent'}`} />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Department</label>
                  <input value={form.course ?? ""} onChange={(e)=>handleChange('course', e.target.value)} disabled={!editing} className={`w-full px-3 py-2 rounded-lg bg-[#141418] border border-[#2a2a30] ${!editing ? 'opacity-60 cursor-not-allowed' : 'focus:ring-2 focus:ring-yellow-500 focus:border-transparent'}`} />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Age</label>
                  <input type="number" value={form.age ?? ""} onChange={(e)=>handleChange('age', e.target.value)} onFocus={()=>handleFocus('age')} onBlur={()=>handleBlur('age')} disabled={!editing} className={`w-full px-3 py-2 rounded-lg bg-[#141418] border ${errors.age ? 'border-red-600' : 'border-[#2a2a30]'} ${!editing ? 'opacity-60 cursor-not-allowed' : 'focus:ring-2 focus:ring-yellow-500 focus:border-transparent'}`} />
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
                  <input value={form.street ?? ""} onChange={(e)=>handleChange('street', e.target.value)} disabled={!editing} className={`w-full px-3 py-2 rounded-lg bg-[#141418] border border-[#2a2a30] ${!editing ? 'opacity-60 cursor-not-allowed' : 'focus:ring-2 focus:ring-yellow-500 focus:border-transparent'}`} />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">City</label>
                  <input value={form.city ?? ""} onChange={(e)=>handleChange('city', e.target.value)} disabled={!editing} className={`w-full px-3 py-2 rounded-lg bg-[#141418] border border-[#2a2a30] ${!editing ? 'opacity-60 cursor-not-allowed' : 'focus:ring-2 focus:ring-yellow-500 focus:border-transparent'}`} />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Pincode</label>
                  <input value={form.pincode ?? ""} onChange={(e)=>handleChange('pincode', e.target.value)} onFocus={()=>handleFocus('pincode')} onBlur={()=>handleBlur('pincode')} disabled={!editing} className={`w-full px-3 py-2 rounded-lg bg-[#141418] border ${errors.pincode ? 'border-red-600' : 'border-[#2a2a30]'} ${!editing ? 'opacity-60 cursor-not-allowed' : 'focus:ring-2 focus:ring-yellow-500 focus:border-transparent'}`} />
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
          </div>
        </div>
      </div>
    );
}
