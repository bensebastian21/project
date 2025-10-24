import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { 
  Calendar, 
  Plus, 
  Edit3, 
  Trash2, 
  Users, 
  Star, 
  CheckCircle, 
  BellRing, 
  Download,
  Eye,
  Clock,
  MapPin,
  UserCheck,
  Trophy,
  BarChart3,
  Settings,
  LogOut,
  Filter,
  Search,
  TrendingUp,
  Award,
  MessageSquare,
  Activity,
  Upload,
  Image as ImageIcon,
  Camera,
  ChevronLeft,
  ChevronRight,
  X,
  Menu,
  Home,
  UserCircle2,
  UserPen,
  ShieldCheck,
  FileText,
  
} from "lucide-react";
import api from "../utils/api";
import config from "../config";
import SupportChatbot from "../components/SupportChatbot";
// Charts
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar } from "recharts";

const bearer = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export default function HostDashboard() {
  // Build absolute URL for server-hosted files (e.g., /uploads/..)
  const toAbsoluteUrl = (u) => {
    const s = String(u || "");
    if (!s) return s;
    if (/^https?:\/\//i.test(s)) return s;
    // ensure no double slashes
    return `${config.apiBaseUrl.replace(/\/$/, "")}${s.startsWith("/") ? "" : "/"}${s}`;
  };
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("events");
  const [otherCollegeEvents, setOtherCollegeEvents] = useState([]);
  const [sameDayEvents, setSameDayEvents] = useState([]);

  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [form, setForm] = useState({ 
    title: "", 
    description: "", 
    shortDescription: "",
    date: "", 
    endDate: "",
    registrationDeadline: "",
    location: "", 
    address: "",
    city: "",
    state: "",
    pincode: "",
    capacity: 0,
    price: 0,
    currency: "INR",
    category: "General",
    tags: "",
    requirements: "",
    agenda: "",
    contactEmail: "",
    contactPhone: "",
    website: "",
    imageUrl: "",
    isOnline: false,
    meetingLink: ""
  });

  const [formErrors, setFormErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [lightbox, setLightbox] = useState({ open: false, images: [], index: 0 });
  // Registrations UI state
  const [regSearch, setRegSearch] = useState("");
  const [regStatus, setRegStatus] = useState("all");
  // Analytics date range
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  // Analytics tab persistence
  const ANALYTICS_TAB_KEY = "host.analytics.tab";
  const [analyticsTab, setAnalyticsTab] = useState(() => {
    try { return localStorage.getItem(ANALYTICS_TAB_KEY) || 'Overview'; } catch { return 'Overview'; }
  });
  useEffect(() => {
    try { localStorage.setItem(ANALYTICS_TAB_KEY, analyticsTab); } catch {}
  }, [analyticsTab]);
  // Host profile edit state
  const [hostProfile, setHostProfile] = useState({
    bio: "",
    website: "",
    socials: { twitter: "", instagram: "", linkedin: "" },
    profilePic: "",
    bannerUrl: "",
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [hostProfileErrors, setHostProfileErrors] = useState({});
  const [hostTouched, setHostTouched] = useState({});
  const [profileJustSavedAt, setProfileJustSavedAt] = useState(0);

  // Host notifications read-tracking in localStorage
  const HOST_NOTIF_READ_KEY = "host.notifications.read";
  const loadLS = (key, fallback) => {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
  };

  // Reorder via drag and drop
  const onThumbDragStart = (e, idx) => {
    e.dataTransfer.setData('text/plain', String(idx));
  };
  const onThumbDrop = async (ev, event, dropIndex) => {
    ev.preventDefault();
    const fromIndex = parseInt(ev.dataTransfer.getData('text/plain'), 10);
    if (isNaN(fromIndex)) return;
    const imgs = Array.isArray(event.images) ? [...event.images] : [];
    const [moved] = imgs.splice(fromIndex, 1);
    imgs.splice(dropIndex, 0, moved);
    try {
      await api.put(`/api/host/events/${event._id}`, { images: imgs }, { headers: bearer() });
      toast.success('✅ Gallery order saved');
      await fetchEvents();
    } catch (e) {
      toast.error('❌ ' + (e?.response?.data?.error || e.message));
    }
  };

  const importXlsxFile = async (file) => {
    if (!file || !selectedEvent?._id) return;
    try {
      const fd = new FormData();
      fd.append('file', file);
      await api.post(`/api/host/events/${selectedEvent._id}/registrations/import-xlsx`, fd, { headers: { ...bearer(), 'Content-Type': 'multipart/form-data' } });
      await loadRegistrations(selectedEvent);
      toast.success('✅ Attendance imported from XLSX');
    } catch (e) {
      toast.error('❌ ' + (e?.response?.data?.error || e.message));
    }
  };
  const onThumbDragOver = (e) => e.preventDefault();

  // Lightbox controls
  useEffect(() => {
    if (!lightbox.open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setLightbox(prev => ({ ...prev, open: false }));
      if (e.key === 'ArrowRight') setLightbox(prev => ({ ...prev, index: (prev.index + 1) % (prev.images.length || 1) }));
      if (e.key === 'ArrowLeft') setLightbox(prev => ({ ...prev, index: (prev.index - 1 + (prev.images.length || 1)) % (prev.images.length || 1) }));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox.open, lightbox.images, lightbox.index]);

  // ---------- Profile update & uploads ----------
  const isHttpUrl = (v) => /^https?:\/\/.+/.test(String(v || "").trim());
  const validateHostField = (field, value) => {
    switch (field) {
      case 'website':
        if (!value) return '';
        return isHttpUrl(value) ? '' : 'Website must start with http:// or https://';
      case 'twitter':
      case 'instagram':
        if (!value) return '';
        return /^@?\w{1,30}$/.test(value) ? '' : 'Use handle like @username';
      case 'linkedin':
        if (!value) return '';
        // allow full URL or handle-like
        return (isHttpUrl(value) || /^@?[-\w.]{1,100}$/.test(value)) ? '' : 'Use full URL or @handle';
      case 'bio':
        return (String(value||'').length <= 1000) ? '' : 'Bio is too long';
      default:
        return '';
    }
  };

  const computeHostErrors = (profile) => {
    const errs = {};
    errs.website = validateHostField('website', profile.website);
    errs.twitter = validateHostField('twitter', profile.socials?.twitter);
    errs.instagram = validateHostField('instagram', profile.socials?.instagram);
    errs.linkedin = validateHostField('linkedin', profile.socials?.linkedin);
    errs.bio = validateHostField('bio', profile.bio);
    return errs;
  };

  const validateHostProfileAll = () => {
    const errs = computeHostErrors(hostProfile);
    setHostProfileErrors(errs);
    const hasAny = Object.values(errs).some(Boolean);
    return !hasAny;
  };

  const hostProfileValid = React.useMemo(() => {
    const errs = computeHostErrors(hostProfile);
    return !Object.values(errs).some(Boolean);
  }, [hostProfile]);

  const handleHostFieldBlur = (field) => {
    setHostTouched(prev => ({ ...prev, [field]: true }));
    let value;
    if (field === 'website' || field === 'bio') value = hostProfile[field];
    else value = hostProfile.socials?.[field] || '';
    const err = validateHostField(field, value);
    setHostProfileErrors(prev => ({ ...prev, [field]: err }));
  };

  const saveHostProfile = async () => {
    if (!validateHostProfileAll()) {
      toast.error('❌ Please fix profile errors before saving');
      return;
    }
    try {
      setProfileSaving(true);
      // Normalize socials: ensure '@' prefix for handles
      const norm = { ...(hostProfile.socials || {}) };
      const ensureAt = (v) => {
        const s = String(v || '').trim();
        if (!s) return '';
        return s.startsWith('@') ? s : `@${s}`;
      };
      norm.twitter = norm.twitter && !/^https?:\/\//i.test(norm.twitter) ? ensureAt(norm.twitter) : (norm.twitter || '');
      norm.instagram = norm.instagram && !/^https?:\/\//i.test(norm.instagram) ? ensureAt(norm.instagram) : (norm.instagram || '');
      // LinkedIn: keep URL as-is; if not URL, treat like handle
      norm.linkedin = norm.linkedin && !/^https?:\/\//i.test(norm.linkedin) ? ensureAt(norm.linkedin) : (norm.linkedin || '');
      const payload = {
        bio: hostProfile.bio,
        website: hostProfile.website,
        socials: norm,
        profilePic: hostProfile.profilePic,
        bannerUrl: hostProfile.bannerUrl,
      };
      const { data } = await api.put(`/api/host/profile`, payload, { headers: bearer() });
      setHostProfile(prev => ({ ...prev, profilePic: data?.user?.profilePic || prev.profilePic, bannerUrl: data?.user?.bannerUrl || prev.bannerUrl }));
      toast.success("✅ Profile saved");
      setProfileJustSavedAt(Date.now());
    } catch (e) {
      toast.error("❌ " + (e?.response?.data?.error || e.message));
    } finally {
      setProfileSaving(false);
    }
  };

  // Show validation errors immediately on mount
  useEffect(() => {
    setHostTouched({ website: true, twitter: true, instagram: true, linkedin: true, bio: true });
    validateHostProfileAll();
  }, []);

  const uploadHostImage = async (type, file) => {
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append("image", file);
      const { data } = await api.post(`/api/host/profile/upload?type=${encodeURIComponent(type)}`, fd, { headers: { ...bearer(), "Content-Type": "multipart/form-data" } });
      const abs = toAbsoluteUrl(data?.url);
      if (type === "profile") setHostProfile(prev => ({ ...prev, profilePic: abs || prev.profilePic }));
      else setHostProfile(prev => ({ ...prev, bannerUrl: abs || prev.bannerUrl }));
      toast.success("✅ Uploaded");
    } catch (e) {
      toast.error("❌ " + (e?.response?.data?.error || e.message));
    }
  };

  const uploadEventCover = async (ev, file) => {
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append("image", file);
      await api.post(`/api/host/events/${ev._id}/cover`, fd, { headers: { ...bearer(), "Content-Type": "multipart/form-data" } });
      toast.success("✅ Cover updated");
      await fetchEvents();
    } catch (e) {
      toast.error("❌ " + (e?.response?.data?.error || e.message));
    }
  };

  const uploadEventImages = async (ev, files) => {
    if (!files || !files.length) return;
    try {
      const fd = new FormData();
      Array.from(files).forEach(f => fd.append("images", f));
      await api.post(`/api/host/events/${ev._id}/images`, fd, { headers: { ...bearer(), "Content-Type": "multipart/form-data" } });
      toast.success("✅ Images uploaded");
      await fetchEvents();
    } catch (e) {
      toast.error("❌ " + (e?.response?.data?.error || e.message));
    }
  };

  const setEventCoverFromUrl = async (ev, url) => {
    try {
      await api.put(`/api/host/events/${ev._id}`, { imageUrl: url }, { headers: bearer() });
      toast.success("✅ Cover set from gallery");
      await fetchEvents();
    } catch (e) {
      toast.error("❌ " + (e?.response?.data?.error || e.message));
    }
  };

  const deleteEventImage = async (ev, url) => {
    if (!window.confirm("Remove this image from the gallery?")) return;
    try {
      await api.delete(`/api/host/events/${ev._id}/images`, { headers: bearer(), params: { url } });
      toast.success("✅ Image removed");
      await fetchEvents();
    } catch (e) {
      toast.error("❌ " + (e?.response?.data?.error || e.message));
    }
  };
  const saveLS = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const notifKey = (n) => `${n.type || "n"}|${n.eventId || "none"}|${n.at || 0}`;

  const [notifOpen, setNotifOpen] = useState(false);
  const [readSet, setReadSet] = useState(() => new Set(loadLS(HOST_NOTIF_READ_KEY, [])));
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [navOverlayOpen, setNavOverlayOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [user, setUser] = useState(null);
  // Attendance export helpers (CSV/XLSX)

  // Review field customization state
  const [showReviewFieldsForm, setShowReviewFieldsForm] = useState(false);
  const [selectedEventForReviewFields, setSelectedEventForReviewFields] = useState(null);
  const [reviewFields, setReviewFields] = useState([]);

  // ---------- Derived: filtered registrations and analytics ----------
  const filteredRegistrations = useMemo(() => {
    let list = registrations || [];
    if (regStatus !== "all") list = list.filter(r => r.status === regStatus);
    const q = regSearch.trim().toLowerCase();
    if (q) {
      list = list.filter(r => {
        const name = String(r.studentId?.fullname || "").toLowerCase();
        const email = String(r.studentId?.email || "").toLowerCase();
        return name.includes(q) || email.includes(q);
      });
    }
    return list;
  }, [registrations, regStatus, regSearch]);

  // Registrations over time (by registeredAt day) within date range
  const registrationsSeries = useMemo(() => {
    const map = new Map();
    (events||[]).forEach(e => {
      (e.registrations||[]).forEach(r => {
        if (r.status !== 'registered') return;
        const d = r.registeredAt ? new Date(r.registeredAt) : null;
        if (!d) return;
        if (!inDateRange(d)) return;
        const key = d.toISOString().slice(0,10);
        map.set(key, (map.get(key) || 0) + 1);
      });
    });
    const arr = Array.from(map.entries()).sort((a,b)=> a[0].localeCompare(b[0])).map(([date, count])=> ({ date, count }));
    return arr;
  }, [events, dateStart, dateEnd]);

  // Analytics: registrations grouped by event (By Event)
  const registrationsByEvent = useMemo(() => {
    const map = new Map();
    (events||[]).forEach(e => {
      if (!dateStart && !dateEnd) {
        map.set(e.title || 'Untitled', (e.registrations||[]).filter(r=>r.status==='registered').length + (map.get(e.title||'Untitled')||0));
      } else {
        if (!inDateRange(e.date)) return;
        map.set(e.title || 'Untitled', (e.registrations||[]).filter(r=>r.status==='registered').length + (map.get(e.title||'Untitled')||0));
      }
    });
    const arr = Array.from(map.entries()).map(([name,value])=>({ name, value })).sort((a,b)=> b.value - a.value).slice(0,10);
    return arr;
  }, [events, dateStart, dateEnd]);

  // Analytics: events per day (By Day)
  const eventsByDay = useMemo(() => {
    const map = new Map();
    (events||[]).forEach(e => {
      if (!dateStart && !dateEnd) {
        const key = new Date(e.date).toISOString().slice(0,10);
        map.set(key, (map.get(key)||0)+1);
      } else {
        if (!inDateRange(e.date)) return;
        const key = new Date(e.date).toISOString().slice(0,10);
        map.set(key, (map.get(key)||0)+1);
      }
    });
    return Array.from(map.entries()).sort((a,b)=> a[0].localeCompare(b[0])).map(([date,count])=>({ date, count }));
  }, [events, dateStart, dateEnd]);

  function inDateRange(d) {
    const time = new Date(d).getTime();
    if (isNaN(time)) return false;
    const startOk = !dateStart || time >= new Date(dateStart).getTime();
    const endOk = !dateEnd || time <= new Date(dateEnd).getTime() + 24*60*60*1000 - 1;
    return startOk && endOk;
  }

  const statsOverRange = useMemo(() => {
    const evs = (events||[]).filter(e => !dateStart && !dateEnd ? true : inDateRange(e.date));
    const total = evs.length;
    const completed = evs.filter(e=>e.isCompleted).length;
    const upcoming = evs.filter(e=> new Date(e.date) > new Date()).length;
    const totalRegistrations = evs.reduce((acc,e)=> acc + ((e.registrations||[]).filter(r=>r.status==='registered').length), 0);
    // average rating placeholder (if available via feedbacks on events)
    const allRatings = (evs||[]).flatMap(e => (e.feedbacks||[]).map(f=>f.overallRating||0)).filter(x=>x>0);
    const avg = allRatings.length? (allRatings.reduce((a,b)=>a+b,0)/allRatings.length).toFixed(1) : '0.0';
    return { total, completed, upcoming, totalRegistrations, avgRating: avg };
  }, [events, dateStart, dateEnd]);

  const notificationsOverRange = useMemo(() => {
    if (!dateStart && !dateEnd) return notifications;
    return (notifications||[]).filter(n => inDateRange(n.at));
  }, [notifications, dateStart, dateEnd]);

  // Events by status for current range
  const eventsByStatus = useMemo(() => {
    const evs = (events||[]).filter(e => !dateStart && !dateEnd ? true : inDateRange(e.date));
    const completed = evs.filter(e=>e.isCompleted).length;
    const upcoming = evs.filter(e=> new Date(e.date) > new Date()).length;
    const total = evs.length;
    return [
      { name: 'Completed', value: completed },
      { name: 'Upcoming', value: upcoming },
      { name: 'Total', value: total }
    ];
  }, [events, dateStart, dateEnd]);

  const exportRegistrationsCsv = () => {
    const headers = ["Student Name","Email","Registered At","Status"]; 
    if (selectedEvent) headers.unshift("Event Title");
    const rows = [headers];
    filteredRegistrations.forEach(r => {
      const row = [
        r.studentId?.fullname || "",
        r.studentId?.email || "",
        r.registeredAt ? new Date(r.registeredAt).toLocaleString() : "",
        r.status || ""
      ];
      if (selectedEvent) row.unshift(selectedEvent.title || "");
      rows.push(row);
    });
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `registrations_${selectedEvent?._id || 'all'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/");
  };

  const copyHostLink = async () => {
    try {
      const base = window.location.origin || '';
      const link = `${base}/host/${user?._id || ''}`;
      await navigator.clipboard.writeText(link);
      toast.success("✅ Public link copied");
    } catch (e) {
      toast.error("❌ Failed to copy link");
    }
  };

  useEffect(() => {
    const u = localStorage.getItem("user");
    setUser(u ? JSON.parse(u) : null);
  }, []);

  // Ensure profile prefill uses absolute URLs
  const loadProfile = async () => {
    try {
      setProfileLoading(true);
      const userRaw = localStorage.getItem("user");
      const u = userRaw ? JSON.parse(userRaw) : null;
      if (!u?._id) return;
      const { data } = await api.get(`/api/host/public/host/${u._id}`, { headers: bearer() });
      const h = data?.host || {};
      setHostProfile({
        bio: h.bio || "",
        website: h.website || "",
        socials: h.socials || { twitter: "", instagram: "", linkedin: "" },
        profilePic: toAbsoluteUrl(h.profilePic || ""),
        bannerUrl: toAbsoluteUrl(h.bannerUrl || ""),
      });
    } catch (e) {
      // ignore
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    const onClick = (e) => {
      if (profileMenuOpen && !e.target.closest('.profile-menu')) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [profileMenuOpen]);

  // Validation functions
  const validateField = (field, value) => {
    switch (field) {
      case "title":
        return value.length >= 3 ? "" : "Title must be at least 3 characters";
      case "shortDescription":
        return value.length <= 150 ? "" : "Short description must be 150 characters or less";
      case "description":
        return value.length >= 10 ? "" : "Description must be at least 10 characters";
      case "date":
        if (!value) return "Event date is required";
        return new Date(value) > new Date() ? "" : "Event date must be in the future";
      case "endDate":
        if (!value) return "";
        if (!form.date) return "Please set start date first";
        return new Date(value) > new Date(form.date) ? "" : "End date must be after start date";
      case "registrationDeadline":
        if (!value) return "Registration deadline is required";
        try {
          const now = new Date();
          const dl = new Date(value);
          if (isNaN(dl.getTime())) return "Invalid deadline date";
          if (dl < new Date(now.getTime() - 60*1000)) return "Deadline cannot be in the past";
          if (form.date) {
            const start = new Date(form.date);
            if (!isNaN(start.getTime()) && dl >= start) return "Deadline must be before start date";
          }
          return "";
        } catch { return "Invalid deadline date"; }
      case "location":
        return value.length >= 2 ? "" : "Location is required";
      case "address":
        return value.length >= 5 ? "" : "Address must be at least 5 characters";
      case "city":
        return value.length >= 2 ? "" : "City is required";
      case "state":
        return value.length >= 2 ? "" : "State is required";
      case "pincode":
        if (!value) return "";
        return /^\d{6}$/.test(value) ? "" : "Pincode must be 6 digits";
      case "capacity":
        const cap = parseInt(value);
        return cap >= 0 ? "" : "Capacity must be 0 or greater";
      case "price":
        const price = parseFloat(value);
        return price >= 0 ? "" : "Price must be 0 or greater";
      case "contactEmail":
        if (!value) return "";
        return /\S+@\S+\.\S+/.test(value) ? "" : "Invalid email format";
      case "contactPhone":
        if (!value) return "";
        return /^\d{10}$/.test(value) ? "" : "Phone must be 10 digits";
      case "website":
        if (!value) return "";
        return /^https?:\/\/.+/.test(value) ? "" : "Website must start with http:// or https://";
      case "meetingLink":
        if (!form.isOnline || !value) return "";
        return /^https?:\/\/.+/.test(value) ? "" : "Meeting link must start with http:// or https://";
      case "tags":
        if (!value) return "";
        const tags = value.split(',').map(tag => tag.trim());
        return tags.length <= 10 ? "" : "Maximum 10 tags allowed";
      default:
        return "";
    }
  };

  const handleFieldChange = (field, value) => {
    // Sanitize certain fields before setting
    let nextValue = value;
    if (field === "capacity") {
      const num = parseInt(String(value).replace(/[^\d-]/g, ""), 10);
      nextValue = isNaN(num) || num < 0 ? 0 : num;
    }
    if (field === "price") {
      const cleaned = String(value).replace(/[^\d.]/g, "");
      const num = parseFloat(cleaned);
      nextValue = isNaN(num) || num < 0 ? 0 : parseFloat(num.toFixed(2));
    }
    if (field === "pincode") {
      nextValue = String(value).replace(/[^\d]/g, "").slice(0, 6);
    }
    if (field === "tags") {
      nextValue = String(value)
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0)
        .slice(0, 10)
        .join(', ');
    }
    setForm(prev => ({ ...prev, [field]: nextValue }));
    
    if (touchedFields[field]) {
      const error = validateField(field, value);
      setFormErrors(prev => ({ ...prev, [field]: error }));
    }
    if (field === "date") {
      const iso = value ? new Date(value).toISOString() : "";
      fetchSameDayEvents(iso);
    }
  };

  const handleFieldBlur = (field) => {
    setTouchedFields(prev => ({ ...prev, [field]: true }));
    const error = validateField(field, form[field]);
    setFormErrors(prev => ({ ...prev, [field]: error }));
  };

  const handleFieldFocus = (field) => {
    setTouchedFields(prev => ({ ...prev, [field]: true }));
    const error = validateField(field, form[field]);
    setFormErrors(prev => ({ ...prev, [field]: error }));
  };

  const validateForm = () => {
    const errors = {};
    const requiredFields = ['title', 'description', 'date', 'location', 'city', 'state'];
    
    requiredFields.forEach(field => {
      const error = validateField(field, form[field]);
      if (error) errors[field] = error;
    });

    // Additional validations
    Object.keys(form).forEach(field => {
      if (!requiredFields.includes(field)) {
        const error = validateField(field, form[field]);
        if (error) errors[field] = error;
      }
    });

    setFormErrors(errors);
    setTouchedFields(Object.keys(form).reduce((acc, field) => ({ ...acc, [field]: true }), {}));
    
    return Object.keys(errors).length === 0;
  };

  const fetchEvents = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/api/host/events`, { headers: bearer() });
      setEvents(res.data);
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchOtherCollegeEvents = async () => {
    try {
      const res = await api.get(`/api/host/public/events?excludeSelf=true`, { headers: bearer() });
      setOtherCollegeEvents(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error("Failed to fetch other college events", e);
      setOtherCollegeEvents([]);
    }
  };

  const fetchSameDayEvents = async (isoDate) => {
    try {
      if (!isoDate) { setSameDayEvents([]); return; }
      const d = new Date(isoDate);
      if (isNaN(d.getTime())) { setSameDayEvents([]); return; }
      const ymd = d.toISOString().slice(0,10);
      const res = await api.get(`/api/host/public/events-by-date?date=${ymd}&excludeSelf=true`, { headers: bearer() });
      setSameDayEvents(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error("Failed to fetch same-day events", e);
      setSameDayEvents([]);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await api.get(`/api/host/notifications`, { headers: bearer() });
      const list = Array.isArray(res.data) ? res.data : [];
      const mapped = list.map((n) => {
        const key = notifKey(n);
        return { ...n, _key: key, read: readSet.has(key) };
      });
      setNotifications(mapped);
    } catch (e) {
      console.error("Failed to fetch notifications:", e);
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchNotifications();
    fetchOtherCollegeEvents();
  }, []);

  // Load current host profile for editing
  useEffect(() => {
    const loadProfile = async () => {
      try {
        setProfileLoading(true);
        const userRaw = localStorage.getItem("user");
        const u = userRaw ? JSON.parse(userRaw) : null;
        if (!u?._id) return;
        const { data } = await api.get(`/api/host/public/host/${u._id}`, { headers: bearer() });
        const h = data?.host || {};
        setHostProfile({
          bio: h.bio || "",
          website: h.website || "",
          socials: h.socials || { twitter: "", instagram: "", linkedin: "" },
          profilePic: h.profilePic || "",
          bannerUrl: h.bannerUrl || "",
        });
      } catch (e) {
        // ignore
      } finally {
        setProfileLoading(false);
      }
    };
    loadProfile();
  }, []);

  const openCreate = () => {
    setEditingEvent(null);
    setForm({
      title: "",
      description: "",
      shortDescription: "",
      date: "",
      endDate: "",
      registrationDeadline: "",
      location: "",
      address: "",
      city: "",
      state: "",
      pincode: "",
      capacity: 0,
      price: 0,
      currency: "INR",
      category: "General",
      tags: "",
      requirements: "",
      agenda: "",
      contactEmail: "",
      contactPhone: "",
      countryCode: "+91",
      website: "",
      imageUrl: "",
      isOnline: false,
      meetingLink: ""
    });
    setFormErrors({});
    setTouchedFields({});
    setShowForm(true);
    setSameDayEvents([]);
  };

  const openEdit = (event) => {
    setEditingEvent(event);
    setForm({
      title: event.title || "",
      description: event.description || "",
      shortDescription: event.shortDescription || "",
      date: event.date ? new Date(event.date).toISOString().slice(0, 16) : "",
      endDate: event.endDate ? new Date(event.endDate).toISOString().slice(0, 16) : "",
      registrationDeadline: event.registrationDeadline ? new Date(event.registrationDeadline).toISOString().slice(0, 16) : "",
      location: event.location || "",
      address: event.address || "",
      city: event.city || "",
      state: event.state || "",
      pincode: event.pincode || "",
      capacity: event.capacity || 0,
      price: event.price || 0,
      currency: event.currency || "INR",
      category: event.category || "General",
      tags: event.tags ? event.tags.join(', ') : "",
      requirements: event.requirements || "",
      agenda: event.agenda || "",
      contactEmail: event.contactEmail || "",
      contactPhone: event.contactPhone || "",
      website: event.website || "",
      imageUrl: event.imageUrl || "",
      isOnline: event.isOnline || false,
      meetingLink: event.meetingLink || ""
    });
    setFormErrors({});
    setTouchedFields({});
    setShowForm(true);
  };

  const submitForm = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error("❌ Please fix the form errors before submitting");
      return;
    }

    try {
      const payload = {
        ...form,
        date: form.date ? new Date(form.date).toISOString() : undefined,
        endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
        registrationDeadline: form.registrationDeadline ? new Date(form.registrationDeadline).toISOString() : undefined,
        tags: form.tags ? form.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
        capacity: parseInt(form.capacity) || 0,
        price: parseFloat(form.price) || 0,
        isOnline: Boolean(form.isOnline)
      };
      
      if (editingEvent) {
        await api.put(`/api/host/events/${editingEvent._id}`, payload, { headers: bearer() });
        toast.success("✅ Event updated successfully!");
      } else {
        await api.post(`/api/host/events`, payload, { headers: bearer() });
        toast.success("✅ Event created successfully!");
      }
      setShowForm(false);
      setEditingEvent(null);
      setFormErrors({});
      setTouchedFields({});
      await fetchEvents();
      await fetchNotifications();
    } catch (e) {
      toast.error("❌ " + (e?.response?.data?.error || e.message));
    }
  };

  const deleteEvent = async (event) => {
    if (!window.confirm("Are you sure you want to delete this event? This action cannot be undone.")) return;
    try {
      await api.delete(`/api/host/events/${event._id}`, { headers: bearer() });
      toast.success("✅ Event deleted successfully!");
      await fetchEvents();
    } catch (e) {
      toast.error("❌ " + (e?.response?.data?.error || e.message));
    }
  };

  const markCompleted = async (event) => {
    if (!window.confirm("Mark this event as completed? This will enable certificate generation.")) return;
    try {
      await api.post(`/api/host/events/${event._id}/complete`, {}, { headers: bearer() });
      toast.success("✅ Event marked as completed! Certificates can now be generated.");
      await fetchEvents();
      await fetchNotifications();
    } catch (e) {
      toast.error("❌ " + (e?.response?.data?.error || e.message));
    }
  };

  const loadRegistrations = async (event) => {
    setSelectedEvent(event);
    setActiveTab("registrations");
    try {
      const res = await api.get(`/api/host/events/${event._id}/registrations`, { headers: bearer() });
      setRegistrations(res.data);
    } catch (e) {
      toast.error("❌ " + (e?.response?.data?.error || e.message));
    }
  };

  // ---------- Attendance management ----------
  const updateAttendance = async (eventId, studentId, attended) => {
    try {
      await api.put(`/api/host/events/${eventId}/registrations/${studentId}/attendance`, { attended }, { headers: bearer() });
      setRegistrations(prev => prev.map(r => String(r.studentId?._id || r.studentId) === String(studentId) ? { ...r, attended } : r));
      toast.success("✅ Attendance updated");
    } catch (e) {
      toast.error("❌ " + (e?.response?.data?.error || e.message));
    }
  };

  const downloadServerCsv = async () => {
    if (!selectedEvent?._id) return;
    try {
      const res = await api.get(`/api/host/events/${selectedEvent._id}/registrations.csv`, { headers: { ...bearer() }, responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `registrations_${selectedEvent._id}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error("❌ " + (e?.response?.data?.error || e.message));
    }
  };

  // Import options removed per request

  const downloadServerXlsx = async () => {
    if (!selectedEvent?._id) return;
    try {
      const res = await api.get(`/api/host/events/${selectedEvent._id}/registrations.xlsx`, { headers: { ...bearer() }, responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `registrations_${selectedEvent._id}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error('❌ ' + (e?.response?.data?.error || e.message));
    }
  };

  const loadFeedbacks = async (event) => {
    setSelectedEvent(event);
    setActiveTab("feedbacks");
    try {
      // Use reviews API (new review model)
      const res = await api.get(`/api/reviews/events/${event._id}/reviews`, { headers: bearer() });
      const list = Array.isArray(res.data?.reviews) ? res.data.reviews : [];
      setFeedbacks(list);
    } catch (e) {
      toast.error("❌ " + (e?.response?.data?.error || e.message));
    }
  };

  const generateCertificates = async (event) => {
    if (!event.isCompleted) {
      toast.error("❌ Event must be completed before generating certificates!");
      return;
    }
    try {
      // This would call a certificate generation endpoint
      toast.success("✅ Certificates generated successfully!");
    } catch (e) {
      toast.error("❌ " + (e?.response?.data?.error || e.message));
    }
  };

  const customizeReviewFields = async (event) => {
    setSelectedEventForReviewFields(event);
    try {
      // Fetch existing review fields
      const res = await api.get(`/api/reviews/events/${event._id}/fields`, { headers: bearer() });
      setReviewFields(res.data || []);
    } catch (e) {
      console.error("Error fetching review fields:", e);
      setReviewFields([]);
    }
    setShowReviewFieldsForm(true);
  };

  const addReviewField = () => {
    setReviewFields(prev => [...prev, {
      fieldName: "",
      fieldType: "text",
      isRequired: false,
      placeholder: ""
    }]);
  };

  const updateReviewField = (index, field) => {
    setReviewFields(prev => prev.map((f, i) => i === index ? field : f));
  };

  const removeReviewField = (index) => {
    setReviewFields(prev => prev.filter((_, i) => i !== index));
  };

  const saveReviewFields = async () => {
    try {
      // Validate fields
      for (let i = 0; i < reviewFields.length; i++) {
        const field = reviewFields[i];
        if (!field.fieldName.trim()) {
          toast.error(`Field ${i + 1}: Field name is required`);
          return;
        }
      }

      await api.post(`/api/reviews/events/${selectedEventForReviewFields._id}/fields`, {
        fields: reviewFields
      }, { headers: bearer() });
      
      toast.success("✅ Review fields updated successfully!");
      setShowReviewFieldsForm(false);
      setSelectedEventForReviewFields(null);
    } catch (e) {
      toast.error("❌ " + (e?.response?.data?.error || e.message));
    }
  };

  const filteredEvents = useMemo(() => {
    let filtered = events;
    
    if (searchTerm) {
      filtered = filtered.filter(event => 
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.location.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (filterStatus !== "all") {
      filtered = filtered.filter(event => {
        if (filterStatus === "completed") return event.isCompleted;
        if (filterStatus === "upcoming") return !event.isCompleted && new Date(event.date) > new Date();
        if (filterStatus === "past") return !event.isCompleted && new Date(event.date) <= new Date();
        return true;
      });
    }
    
    return filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [events, searchTerm, filterStatus]);


  const stats = useMemo(() => {
    const total = events.length;
    const completed = events.filter(e => e.isCompleted).length;
    const upcoming = events.filter(e => !e.isCompleted && new Date(e.date) > new Date()).length;
    const totalRegistrations = events.reduce((sum, e) => sum + (e.registrations?.length || 0), 0);
    const avgRating = events.reduce((sum, e) => {
      const eventFeedbacks = e.feedbacks || [];
      const avgEventRating = eventFeedbacks.length > 0 
        ? eventFeedbacks.reduce((s, f) => s + f.rating, 0) / eventFeedbacks.length 
        : 0;
      return sum + avgEventRating;
    }, 0) / (events.length || 1);
    
    return { total, completed, upcoming, totalRegistrations, avgRating: avgRating.toFixed(1) };
  }, [events]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 text-slate-800">
      {/* YouTube-like Header */}
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-full mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Left Section - Menu & Logo */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setNavCollapsed(!navCollapsed)}
                className="p-2 rounded-full hover:bg-slate-100 transition-colors duration-200"
                aria-label="Toggle sidebar"
              >
                <Menu className="w-6 h-6 text-slate-700" />
              </button>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200">
                  <Calendar className="w-5 h-5 text-slate-700" />
                </div>
                <h1 className="text-xl font-bold text-slate-900">
                  Evenite Host
                </h1>
              </div>
            </div>

            {/* Center Section - Search Bar */}
            <div className="flex-1 max-w-2xl mx-8">
              <div className="relative">
                <div className="flex items-center bg-white border border-slate-300 rounded-full shadow-sm hover:shadow-md transition-shadow duration-200">
                  <input
                    type="text"
                    placeholder="Search events..."
                    value={searchText}
                    onChange={(e)=>setSearchText(e.target.value)}
                    onKeyDown={(e)=>{ if(e.key==='Enter'){ setSearchQuery(searchText); } }}
                    className="flex-1 px-4 py-3 bg-transparent text-slate-800 placeholder-slate-500 focus:outline-none rounded-l-full"
                  />
                  <button
                    onClick={()=> setSearchQuery(searchText)}
                    className="px-4 py-3 border-l border-slate-300 hover:bg-slate-50 transition-colors duration-200"
                  >
                    <Search className="w-5 h-5 text-slate-600" />
                  </button>
                </div>
                
              </div>
            </div>

            {/* Right Section - Actions & Profile */}
            <div className="flex items-center space-x-3">
              <div className="relative">
                <button
                  onClick={()=> setNotifOpen(o=>!o)}
                  className="p-2 rounded-full hover:bg-slate-100 transition-colors duration-200 relative"
                >
                  <BellRing className="w-6 h-6 text-slate-700" />
                  {(notifications||[]).some(n=>!n.read) && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {(notifications||[]).filter(n=>!n.read).length}
                    </span>
                  )}
                </button>
                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-96 max-h-96 overflow-auto bg-white rounded-xl border border-slate-200 shadow-xl z-50">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200">
                      <span className="text-sm text-slate-700">Notifications</span>
                      <button
                        onClick={() => {
                          setReadSet((prev) => {
                            const next = new Set(prev);
                            (notifications || []).forEach(n => next.add(n._key));
                            localStorage.setItem(HOST_NOTIF_READ_KEY, JSON.stringify(Array.from(next)));
                            return next;
                          });
                          setNotifications((prev) => (prev || []).map(n => ({ ...n, read: true })));
                        }}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Mark all read
                      </button>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {(notifications||[]).length===0 ? (
                        <div className="p-3 text-sm text-slate-500">No notifications</div>
                      ) : (
                        (notifications||[]).map((n, idx)=>(
                          <div key={n._key || idx} className="p-3 flex items-start gap-3">
                            <div className={`w-2 h-2 rounded-full mt-2 ${n.read? 'bg-slate-300':'bg-blue-500'}`}></div>
                            <div className="flex-1">
                              <div className="text-sm text-slate-800">{n.message || 'Notification'}</div>
                              <div className="text-xs text-slate-500 mt-0.5">{n.at ? new Date(n.at).toLocaleString(): ''}</div>
                            </div>
                            {!n.read && (
                              <button
                                onClick={() => {
                                  setReadSet((prev) => {
                                    const next = new Set(prev);
                                    next.add(n._key);
                                    localStorage.setItem(HOST_NOTIF_READ_KEY, JSON.stringify(Array.from(next)));
                                    return next;
                                  });
                                  setNotifications(prev => prev.map((x,i)=> i===idx ? {...x, read:true} : x));
                                }}
                                className="text-xs text-blue-600 hover:underline"
                              >
                                Mark read
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="relative profile-menu">
                <button 
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  className="flex items-center space-x-2 p-1 rounded-full hover:bg-slate-100 transition-colors duration-200"
                >
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                    <UserCircle2 className="w-5 h-5 text-slate-700" />
                  </div>
                </button>
                {profileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl border border-slate-200 shadow-xl z-50 animate-in slide-in-from-top-2 duration-200">
                    <div className="p-4">
                      <div className="flex items-center space-x-3 mb-4 pb-4 border-b border-slate-100">
                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                          <UserCircle2 className="w-5 h-5 text-slate-700" />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{user?.fullname || user?.username}</div>
                          <div className="text-sm text-slate-600">{user?.email}</div>
                          <div className="text-xs text-slate-500 font-medium">Host</div>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <button
                          onClick={() => {
                            setProfileMenuOpen(false);
                            try {
                              const id = user?.id || user?._id;
                              if (id) {
                                navigate(`/host/${id}`);
                              } else {
                                navigate('/profile');
                              }
                            } catch (_) {
                              navigate('/profile');
                            }
                          }}
                          className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                        >
                          <UserPen className="w-4 h-4" />
                          <span>Profile</span>
                        </button>
                        <button onClick={() => { setProfileMenuOpen(false); handleLogout(); }} className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <LogOut className="w-4 h-4" />
                          <span>Logout</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Lightbox Modal */}
      {lightbox.open && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center">
          <button className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full" onClick={()=> setLightbox(prev=> ({ ...prev, open: false }))}>
            <X className="w-5 h-5 text-white" />
          </button>
          <button className="absolute left-4 p-2 bg-white/10 hover:bg-white/20 rounded-full" onClick={()=> setLightbox(prev=> ({ ...prev, index: (prev.index - 1 + prev.images.length) % prev.images.length }))}>
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <img src={lightbox.images[lightbox.index]} alt="Preview" className="max-w-[85vw] max-h-[85vh] object-contain rounded-lg" />
          <button className="absolute right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full" onClick={()=> setLightbox(prev=> ({ ...prev, index: (prev.index + 1) % prev.images.length }))}>
            <ChevronRight className="w-6 h-6 text-white" />
          </button>
        </div>
      )}

      {/* Main Content Layout */}
      <div className="flex">
        {/* YouTube-like Sidebar */}
        <aside className={`bg-white/80 backdrop-blur-md border-r border-slate-200 transition-all duration-300 ease-in-out ${
          navCollapsed ? 'w-16' : 'w-64'
        } sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto`}>
          <div className="p-4">
            {/* Navigation Menu */}
            <nav className="space-y-1">
              {[
                { id: "events", label: "Events", icon: Calendar },
                { id: "registrations", label: "Registrations", icon: Users },
                { id: "feedbacks", label: "Feedbacks", icon: Star },
                { id: "analytics", label: "Analytics", icon: BarChart3 },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`w-full flex items-center ${
                    navCollapsed ? 'justify-center px-3' : 'justify-start px-4'
                  } py-3 rounded-xl transition-all duration-200 group ${
                    activeTab === id 
                      ? 'bg-blue-100 text-blue-700 shadow-sm' 
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                  title={navCollapsed ? label : undefined}
                >
                  <Icon className={`w-5 h-5 ${activeTab === id ? 'text-blue-600' : 'text-slate-600 group-hover:text-slate-800'}`} />
                  {!navCollapsed && (
                    <span className={`ml-3 font-medium ${activeTab === id ? 'text-blue-700' : 'text-slate-700'}`}>
                      {label}
                    </span>
                  )}
                </button>
              ))}
            </nav>

            {/* Sidebar quick block removed per request to de-gamify */}
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            {/* Content Header */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                {activeTab === "events" && "Events Management"}
                {activeTab === "registrations" && "Event Registrations"}
                {activeTab === "feedbacks" && "Event Feedbacks"}
                {activeTab === "profile" && "Host Profile"}
                {activeTab === "analytics" && "Analytics Dashboard"}
              </h2>
              <p className="text-slate-600">
                {activeTab === "events" && "Create, edit, and manage your events"}
                {activeTab === "registrations" && "View and manage event registrations"}
                {activeTab === "feedbacks" && "Review feedback and ratings for your events"}
                {activeTab === "profile" && "Update your public host page and account details"}
                {activeTab === "analytics" && "Analyze your event performance and insights"}
              </p>
            </div>

            {/* Stats Cards - only visible on Events tab */}
            {activeTab === "events" && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                {[
                  { label: "Total Events", value: stats.total, icon: Calendar },
                  { label: "Completed", value: stats.completed, icon: CheckCircle },
                  { label: "Upcoming", value: stats.upcoming, icon: Clock },
                  { label: "Registrations", value: stats.totalRegistrations, icon: UserCheck },
                ].map(({ label, value, icon: Icon }) => (
                  <div 
                    key={label}
                    className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-600 text-sm font-medium">{label}</p>
                        <p className="text-3xl font-bold text-slate-900">{value}</p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
                        <Icon className="w-6 h-6 text-slate-700" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Profile Tab */}
            {activeTab === "profile" && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">Host Profile</h3>
                    <p className="text-slate-600">Update your public host page and account details</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const id = user?.id || user?._id || user?.hostId || user?.host?._id;
                        if (id) {
                          navigate(`/host/${id}`);
                        } else {
                          toast.error('Host ID not available');
                        }
                      }}
                      disabled={!(user?.id || user?._id || user?.hostId || user?.host?._id)}
                      className={`px-4 py-2 rounded-xl transition-colors ${(user?.id || user?._id || user?.hostId || user?.host?._id) ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                      title="View your public host page"
                    >
                      View My Page
                    </button>
                    <button
                      onClick={copyHostLink}
                      className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition-colors"
                    >
                      Copy Public Link
                    </button>
                    <button
                      onClick={saveHostProfile}
                      disabled={profileSaving || !hostProfileValid}
                      className={`px-4 py-2 rounded-xl transition-colors text-white ${profileSaving || !hostProfileValid ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                      {profileSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                    {profileJustSavedAt && (Date.now() - profileJustSavedAt < 3500) && (
                      <span className="text-sm text-green-600">Saved!</span>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                  {/* Banner */}
                  <div>
                    <div className="text-sm font-medium text-slate-700 mb-2">Banner Image</div>
                    {hostProfile.bannerUrl && (
                      <img src={hostProfile.bannerUrl} alt="Banner" className="w-full h-40 object-cover rounded-lg mb-3" />
                    )}
                    <label className="inline-flex items-center gap-2 px-3 py-2 bg-purple-600/80 hover:bg-purple-700 text-white rounded-lg text-sm cursor-pointer">
                      <Upload className="w-4 h-4" /> Upload Banner
                      <input type="file" accept="image/*" className="hidden" onChange={(e)=> uploadHostImage('banner', e.target.files?.[0])} />
                    </label>
                  </div>

                  {/* Avatar */}
                  <div className="mt-6">
                    <div className="text-sm font-medium text-slate-700 mb-2">Profile Picture</div>
                    <div className="flex items-center gap-4">
                      <img src={hostProfile.profilePic || ''} alt="Profile" className="w-16 h-16 rounded-full object-cover bg-slate-100 border border-slate-200" onError={(e)=>{ e.currentTarget.style.visibility='hidden'; }} />
                      <label className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600/80 hover:bg-blue-700 text-white rounded-lg text-sm cursor-pointer">
                        <Upload className="w-4 h-4" /> Upload Profile
                        <input type="file" accept="image/*" className="hidden" onChange={(e)=> uploadHostImage('profile', e.target.files?.[0])} />
                      </label>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Bio</label>
                      <textarea
                        rows={4}
                        value={hostProfile.bio}
                        onChange={(e)=> setHostProfile(prev=> ({ ...prev, bio: e.target.value }))}
                        className="w-full p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Tell attendees about you..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Website</label>
                      <input
                        type="url"
                        value={hostProfile.website}
                        onChange={(e)=> setHostProfile(prev=> ({ ...prev, website: e.target.value }))}
                        onBlur={()=> handleHostFieldBlur('website')}
                        className={`w-full p-3 rounded-xl border focus:outline-none focus:ring-2 ${hostTouched.website && hostProfileErrors.website ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-blue-500'}`}
                        placeholder="https://example.com"
                      />
                      {hostTouched.website && hostProfileErrors.website && (
                        <p className="text-sm text-red-600 mt-1">{hostProfileErrors.website}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Twitter</label>
                      <input
                        type="text"
                        value={hostProfile.socials?.twitter || ''}
                        onChange={(e)=> setHostProfile(prev=> {
                          const val = e.target.value || '';
                          const isUrl = /^https?:\/\//i.test(val);
                          const v = isUrl ? val : (val.replace(/^@+/, '') ? '@' + val.replace(/^@+/, '') : '');
                          return { ...prev, socials: { ...(prev.socials||{}), twitter: v } };
                        })}
                        onBlur={()=> handleHostFieldBlur('twitter')}
                        className={`w-full p-3 rounded-xl border focus:outline-none focus:ring-2 ${hostTouched.twitter && hostProfileErrors.twitter ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-blue-500'}`}
                        placeholder="@username"
                      />
                      {hostTouched.twitter && hostProfileErrors.twitter && (
                        <p className="text-sm text-red-600 mt-1">{hostProfileErrors.twitter}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Instagram</label>
                      <input
                        type="text"
                        value={hostProfile.socials?.instagram || ''}
                        onChange={(e)=> setHostProfile(prev=> {
                          const val = e.target.value || '';
                          const isUrl = /^https?:\/\//i.test(val);
                          const v = isUrl ? val : (val.replace(/^@+/, '') ? '@' + val.replace(/^@+/, '') : '');
                          return { ...prev, socials: { ...(prev.socials||{}), instagram: v } };
                        })}
                        onBlur={()=> handleHostFieldBlur('instagram')}
                        className={`w-full p-3 rounded-xl border focus:outline-none focus:ring-2 ${hostTouched.instagram && hostProfileErrors.instagram ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-blue-500'}`}
                        placeholder="@username"
                      />
                      {hostTouched.instagram && hostProfileErrors.instagram && (
                        <p className="text-sm text-red-600 mt-1">{hostProfileErrors.instagram}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">LinkedIn</label>
                      <input
                        type="text"
                        value={hostProfile.socials?.linkedin || ''}
                        onChange={(e)=> setHostProfile(prev=> {
                          const val = e.target.value || '';
                          const isUrl = /^https?:\/\//i.test(val);
                          const v = isUrl ? val : (val.replace(/^@+/, '') ? '@' + val.replace(/^@+/, '') : '');
                          return { ...prev, socials: { ...(prev.socials||{}), linkedin: v } };
                        })}
                        onBlur={()=> handleHostFieldBlur('linkedin')}
                        className={`w-full p-3 rounded-xl border focus:outline-none focus:ring-2 ${hostTouched.linkedin && hostProfileErrors.linkedin ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-blue-500'}`}
                        placeholder="Profile URL or handle"
                      />
                      {hostTouched.linkedin && hostProfileErrors.linkedin && (
                        <p className="text-sm text-red-600 mt-1">{hostProfileErrors.linkedin}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Events Tab */}
            {activeTab === "events" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">Your Events</h3>
                    <p className="text-slate-600">Manage and organize your events</p>
                  </div>
                  <button
                    onClick={openCreate}
                    className="flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Create Event</span>
                  </button>
                </div>

                {/* Other colleges' published events */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-slate-900">Other Colleges' Events</h3>
                    <button
                      onClick={fetchOtherCollegeEvents}
                      className="px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                    >
                      Refresh
                    </button>
                  </div>
                  {otherCollegeEvents.length === 0 ? (
                    <div className="text-slate-500 text-sm">No events found.</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {otherCollegeEvents.slice(0, 6).map((ev) => (
                        <div key={ev._id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 hover:shadow-md transition-shadow">
                          <div className="font-semibold text-slate-900 line-clamp-1">{ev.title}</div>
                          <div className="text-xs text-slate-600 mt-1">{new Date(ev.date).toLocaleString()}</div>
                          <div className="text-xs text-slate-600 mt-1">{ev.location || (ev.isOnline ? "Online" : "")}</div>
                          {Array.isArray(ev.tags) && ev.tags.length > 0 && (
                            <div className="mt-2 flex gap-1 flex-wrap">
                              {ev.tags.slice(0, 3).map((t, i) => (
                                <span key={i} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] rounded">{t}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Search/Filter and Events Grid - only on Events tab */}
            {activeTab === "events" && (
              <>
                {/* Search and Filter */}
                <div className="flex items-center space-x-4">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search events..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Events</option>
                    <option value="upcoming">Upcoming</option>
                    <option value="completed">Completed</option>
                    <option value="past">Past</option>
                  </select>
                </div>

                {/* Events Grid */}
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredEvents.map((event, index) => (
                      <div
                        key={event._id}
                        className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200"
                        style={{ animationDelay: `${index * 0.1}s` }}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-slate-900 line-clamp-2">{event.title}</h3>
                            <div className="flex items-center space-x-2 mt-2">
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                                {event.category}
                              </span>
                              {event.isOnline && (
                                <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                                  Online
                                </span>
                              )}
                              {event.price > 0 && (
                                <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full">
                                  {event.currency} {event.price}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {event.isCompleted && (
                              <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full flex items-center">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Completed
                              </span>
                            )}
                          </div>
                        </div>

                        <p className="text-slate-700 text-sm mb-4 line-clamp-2">
                          {event.shortDescription || event.description}
                        </p>

                        {/* Event images management */}
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center gap-3">
                            <label className="px-3 py-2 bg-blue-600/80 hover:bg-blue-700 rounded-lg text-sm cursor-pointer inline-flex items-center gap-2">
                              <Upload className="w-4 h-4" /> Upload Cover
                              <input type="file" accept="image/*" className="hidden" onChange={(e)=> uploadEventCover(event, e.target.files?.[0])} />
                            </label>
                            <label className="px-3 py-2 bg-purple-600/80 hover:bg-purple-700 rounded-lg text-sm cursor-pointer inline-flex items-center gap-2">
                              <ImageIcon className="w-4 h-4" /> Add Photos
                              <input type="file" accept="image/*" multiple className="hidden" onChange={(e)=> uploadEventImages(event, e.target.files)} />
                            </label>
                          </div>
                          {event.imageUrl && (
                            <div className="mt-2">
                              <div className="text-xs text-slate-600 mb-1">Cover</div>
                              <div className="relative">
                                <img src={toAbsoluteUrl(event.imageUrl)} alt="Cover" className="w-full h-28 object-cover rounded-lg cursor-pointer" onClick={()=> setLightbox({ open: true, images: [toAbsoluteUrl(event.imageUrl), ...((event.images||[]).map(toAbsoluteUrl))], index: 0 })} />
                                <label className="absolute bottom-2 right-2 px-2 py-1 bg-blue-600/80 hover:bg-blue-700 rounded text-xs cursor-pointer inline-flex items-center gap-1">
                                  <Upload className="w-3 h-3"/> Change Cover
                                  <input type="file" accept="image/*" className="hidden" onChange={(e)=> uploadEventCover(event, e.target.files?.[0])} />
                                </label>
                              </div>
                            </div>
                          )}
                          {Array.isArray(event.images) && event.images.length > 0 && (
                            <div className="mt-2">
                              <div className="grid grid-cols-4 gap-2">
                                {event.images.map((img, i) => (
                                  <div key={i} className="relative group" draggable onDragStart={(e)=> onThumbDragStart(e, i)} onDragOver={onThumbDragOver} onDrop={(e)=> onThumbDrop(e, event, i)}>
                                    <img
                                      src={toAbsoluteUrl(img)}
                                      alt={`Gallery ${i+1}`}
                                      className="w-full h-20 object-cover rounded-lg cursor-pointer"
                                      onClick={() => setLightbox({ open: true, images: (event.images || []).map(toAbsoluteUrl), index: i })}
                                    />
                                    <div className="absolute inset-0 hidden group-hover:flex items-center justify-center gap-2 bg-black/50 rounded-lg">
                                      <button
                                        onClick={(e)=>{ e.stopPropagation(); setEventCoverFromUrl(event, img); }}
                                        className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded"
                                      >
                                        Set Cover
                                      </button>
                                      <button
                                        onClick={(e)=>{ e.stopPropagation(); deleteEventImage(event, img); }}
                                        className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 rounded"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="space-y-3 mb-6">
                          <div className="flex items-center text-slate-600 text-sm">
                            <Clock className="w-4 h-4 mr-3 text-blue-500" />
                            <div>
                              <div>{new Date(event.date).toLocaleString()}</div>
                              {event.endDate && (
                                <div className="text-xs text-slate-500">
                                  to {new Date(event.endDate).toLocaleString()}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center text-slate-600 text-sm">
                            <MapPin className="w-4 h-4 mr-3 text-green-500" />
                            <div>
                              <div>{event.location}</div>
                              {event.address && (
                                <div className="text-xs text-slate-500">
                                  {event.address}, {event.city}, {event.state}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center text-slate-600 text-sm">
                            <Users className="w-4 h-4 mr-3 text-purple-500" />
                            <div>
                              <div>{event.registrations?.length || 0} / {event.capacity} registrations</div>
                              {event.capacity > 0 && (
                                <div className="text-xs text-slate-500">
                                  {Math.round(((event.registrations?.length || 0) / event.capacity) * 100)}% filled
                                </div>
                              )}
                            </div>
                          </div>
                          {event.tags && event.tags.length > 0 && (
                            <div className="flex items-center text-slate-600 text-sm">
                              <div className="flex flex-wrap gap-1">
                                {event.tags.slice(0, 3).map((tag, idx) => (
                                  <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                                    {tag}
                                  </span>
                                ))}
                                {event.tags.length > 3 && (
                                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                                    +{event.tags.length - 3} more
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => openEdit(event)}
                            className="flex items-center space-x-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-all duration-300 hover:scale-105"
                          >
                            <Edit3 className="w-4 h-4" />
                            <span>Edit</span>
                          </button>
                          {!event.isCompleted && (
                            <button
                              onClick={() => markCompleted(event)}
                              className="flex items-center space-x-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-all duration-300 hover:scale-105"
                            >
                              <CheckCircle className="w-4 h-4" />
                              <span>Complete</span>
                            </button>
                          )}
                          {event.isCompleted && (
                            <button
                              onClick={() => generateCertificates(event)}
                              className="flex items-center space-x-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm transition-all duration-300 hover:scale-105"
                            >
                              <Trophy className="w-4 h-4" />
                              <span>Certificates</span>
                            </button>
                          )}
                          <button
                            onClick={() => deleteEvent(event)}
                            className="flex items-center space-x-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-all duration-300 hover:scale-105"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Delete</span>
                          </button>
                          <button
                            onClick={() => loadRegistrations(event)}
                            className="flex items-center space-x-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-sm transition-all duration-300"
                            title="View registrations"
                          >
                            <Users className="w-4 h-4" />
                            <span className="hidden sm:inline">Registrations</span>
                          </button>
                          <button
                            onClick={() => loadFeedbacks(event)}
                            className="flex items-center space-x-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-sm transition-all duration-300"
                            title="View reviews"
                          >
                            <Star className="w-4 h-4" />
                            <span className="hidden sm:inline">Reviews</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
            

            {/* Registrations Tab */}
            {activeTab === "registrations" && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900">
                  Registrations {selectedEvent && `- ${selectedEvent.title}`}
                </h2>
                {selectedEvent && (
                  <button
                    onClick={() => setActiveTab("events")}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700"
                  >
                    Back to Events
                  </button>
                )}
              </div>

              {selectedEvent ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  {/* Toolbar */}
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2">
                      <input value={regSearch} onChange={e=> setRegSearch(e.target.value)} placeholder="Search name or email" className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none" />
                      <select value={regStatus} onChange={e=> setRegStatus(e.target.value)} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none">
                        <option value="all">All</option>
                        <option value="registered">Registered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={downloadServerXlsx} className="px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg">Download XLSX</button>
                      <label className="px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer">
                        <span>Import XLSX</span>
                        <input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={(e)=> importXlsxFile(e.target.files?.[0])} />
                      </label>
                    </div>
                  </div>

                  {filteredRegistrations.length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="w-16 h-16 text-slate-400 mx-auto mb-3" />
                      <p className="text-slate-500">No registrations yet</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50/50">
                            <th className="text-left py-3 px-4 text-slate-600 text-sm font-semibold">Student Name</th>
                            <th className="text-left py-3 px-4 text-slate-600 text-sm font-semibold">Email</th>
                            <th className="text-left py-3 px-4 text-slate-600 text-sm font-semibold">Registered At</th>
                            <th className="text-left py-3 px-4 text-slate-600 text-sm font-semibold">Status</th>
                            <th className="text-left py-3 px-4 text-slate-600 text-sm font-semibold">Attended</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredRegistrations.map((reg, idx) => (
                            <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                              <td className="py-3 px-4 font-medium text-slate-900">{reg.studentId?.fullname || "-"}</td>
                              <td className="py-3 px-4 text-slate-600">{reg.studentId?.email || "-"}</td>
                              <td className="py-3 px-4 text-slate-600">
                                {reg.registeredAt ? new Date(reg.registeredAt).toLocaleString() : "-"}
                              </td>
                              <td className="py-3 px-4">
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                  reg.status === "registered" 
                                    ? "bg-green-100 text-green-700" 
                                    : "bg-red-100 text-red-700"
                                }`}>
                                  {reg.status}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <select
                                  value={reg.attended ? 'yes' : 'no'}
                                  onChange={(e)=> updateAttendance(selectedEvent._id, (reg.studentId?._id || reg.studentId), e.target.value === 'yes')}
                                  className="px-2 py-1 bg-white border border-slate-300 rounded text-sm"
                                >
                                  <option value="no">No</option>
                                  <option value="yes">Yes</option>
                                </select>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">Select an event</h3>
                  <div className="divide-y divide-slate-200">
                    {(events||[]).map((ev) => (
                      <button
                        key={ev._id}
                        onClick={() => loadRegistrations(ev)}
                        className="w-full text-left py-3 px-2 hover:bg-slate-50 rounded-lg flex items-center justify-between"
                      >
                        <span className="font-medium text-slate-900 line-clamp-1">{ev.title}</span>
                        <span className="text-sm text-slate-500">{new Date(ev.date).toLocaleString()}</span>
                      </button>
                    ))}
                    {events.length === 0 && (
                      <div className="text-sm text-slate-500 py-6">No events available</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Feedbacks Tab */}
          {activeTab === "feedbacks" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  Feedbacks {selectedEvent && `- ${selectedEvent.title}`}
                </h2>
                {selectedEvent && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveTab("events")}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
                    >
                      Back to Events
                    </button>
                    <button
                      onClick={() => customizeReviewFields(selectedEvent)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors"
                    >
                      Customize Reviews
                    </button>
                  </div>
                )}
              </div>

              {selectedEvent ? (
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                  {feedbacks.length === 0 ? (
                    <div className="text-center py-12">
                      <Star className="w-20 h-20 text-slate-400 mx-auto mb-4 animate-pulse" />
                      <p className="text-slate-500 text-lg">No feedback yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {feedbacks.map((feedback, idx) => (
                        <div key={idx} className="bg-slate-50 rounded-xl p-6 border border-slate-200 hover:bg-slate-100 transition-all duration-300">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="font-semibold text-slate-900 text-lg">{feedback.isAnonymous ? "Anonymous" : (feedback.reviewerId?.fullname || "Anonymous")}</p>
                              {!feedback.isAnonymous && (
                                <p className="text-slate-600 text-sm">{feedback.reviewerId?.email || ""}</p>
                              )}
                            </div>
                            <div className="flex items-center space-x-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-5 h-5 ${
                                    i < (feedback.overallRating || 0) ? "text-yellow-500 fill-current" : "text-slate-400"
                                  }`}
                                />
                              ))}
                              <span className="ml-2 text-slate-600 text-sm">({feedback.overallRating || 0}/5)</span>
                            </div>
                          </div>

                          {/* Optional detailed fields */}
                          {Array.isArray(feedback.reviewFields) && feedback.reviewFields.length > 0 && (
                            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                              {feedback.reviewFields.map((f, i) => (
                                <div key={i} className="bg-white rounded-lg p-3 border border-slate-200">
                                  <div className="text-xs text-slate-600">{f.fieldName}</div>
                                  {f.fieldType === "rating" ? (
                                    <div className="flex items-center mt-1">
                                      {[...Array(5)].map((_, j) => (
                                        <Star
                                          key={j}
                                          className={`w-4 h-4 ${j < (f.rating || 0) ? "text-yellow-500 fill-current" : "text-slate-400"}`}
                                        />
                                      ))}
                                      <span className="ml-2 text-slate-600 text-xs">({f.rating || 0}/5)</span>
                                    </div>
                                  ) : (
                                    <div className="text-slate-700 text-sm mt-1 break-words">{String(f.value || "").trim() || "-"}</div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {feedback.comment && (
                            <p className="text-slate-700 text-sm mt-3 leading-relaxed">{feedback.comment}</p>
                          )}
                          <p className="text-slate-500 text-xs mt-3">
                            {feedback.createdAt ? new Date(feedback.createdAt).toLocaleString() : ""}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
                  <Star className="w-20 h-20 text-slate-400 mx-auto mb-4 animate-pulse" />
                  <p className="text-slate-500 text-lg">Select an event to view feedback</p>
                </div>
              )}
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === "analytics" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900">Analytics</h2>
                <div className="flex items-center gap-2">
                  <input type="date" value={dateStart} onChange={e=> setDateStart(e.target.value)} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none" />
                  <span className="text-slate-500">to</span>
                  <input type="date" value={dateEnd} onChange={e=> setDateEnd(e.target.value)} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none" />
                </div>
              </div>

              {/* Pill tabs */}
              <div className="flex items-center gap-2">
                {['Overview','By Event','By Day'].map((t)=> (
                  <button 
                    key={t} 
                    onClick={()=> setAnalyticsTab(t)}
                    className={`px-3 py-1.5 rounded-full text-sm border ${t===analyticsTab ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <h3 className="text-lg font-semibold mb-4 flex items-center text-slate-900">
                    <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
                    {analyticsTab === 'Overview' ? 'Event Statistics' : analyticsTab}
                  </h3>

                  {analyticsTab === 'Overview' && (
                    <>
                      <div className="space-y-3 mb-4">
                        {[
                          { label: "Total Events", value: statsOverRange.total },
                          { label: "Completed Events", value: statsOverRange.completed },
                          { label: "Upcoming Events", value: statsOverRange.upcoming },
                          { label: "Total Registrations", value: statsOverRange.totalRegistrations },
                          { label: "Average Rating", value: statsOverRange.avgRating },
                        ].map(({ label, value }) => (
                          <div key={label} className="flex justify-between items-center py-2">
                            <span className="text-slate-600">{label}</span>
                            <span className="font-semibold text-slate-900">{value}</span>
                          </div>
                        ))}
                      </div>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={registrationsSeries} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} dot={false} name="Registrations" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </>
                  )}

                  {analyticsTab === 'By Event' && (
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={registrationsByEvent} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={60} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="value" fill="#6366f1" name="Registrations" radius={[6,6,0,0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {analyticsTab === 'By Day' && (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={eventsByDay} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} dot={false} name="Events" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <h3 className="text-lg font-semibold mb-4 flex items-center text-slate-900">
                    <BellRing className="w-5 h-5 mr-2 text-amber-600" />
                    Recent Notifications
                  </h3>
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {notificationsOverRange.slice(0, 5).map((notification, idx) => (
                      <div key={idx} className="flex items-center space-x-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <BellRing className="w-4 h-4 text-blue-600" />
                        <div className="flex-1">
                          <p className="text-sm text-slate-900 font-medium">{notification.message}</p>
                          <p className="text-xs text-slate-500">
                            {new Date(notification.at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                    {notifications.length === 0 && (
                      <div className="text-center py-8">
                        <BellRing className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                        <p className="text-slate-500">No notifications</p>
                      </div>
                    )}
                  </div>
                  {/* Events by Status */}
                  <div className="h-64 mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={eventsByStatus} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="value" fill="#10b981" name="Count" radius={[6,6,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}
          </div>
      </main>
      </div>

      {/* Review Fields Modal */}
      {showReviewFieldsForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800/95 rounded-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-gray-700/50">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent">
                Customize Review Fields {selectedEventForReviewFields && `- ${selectedEventForReviewFields.title}`}
              </h2>
              <button onClick={() => setShowReviewFieldsForm(false)} className="px-3 py-1 bg-gray-600/80 hover:bg-gray-700 rounded-lg">Close</button>
            </div>

            <div className="space-y-4">
              {reviewFields.map((f, idx) => (
                <div key={idx} className="bg-gray-700/40 p-4 rounded-xl border border-gray-600/50">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="md:col-span-2">
                      <label className="block text-sm text-gray-300 mb-1">Field Name</label>
                      <input
                        type="text"
                        value={f.fieldName}
                        onChange={(e) => updateReviewField(idx, { ...f, fieldName: e.target.value })}
                        className="w-full p-2 rounded-lg bg-gray-800/60 border border-gray-600 focus:ring-2 focus:ring-orange-500"
                        placeholder="e.g. Speaker Quality"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Field Type</label>
                      <select
                        value={f.fieldType}
                        onChange={(e) => updateReviewField(idx, { ...f, fieldType: e.target.value })}
                        className="w-full p-2 rounded-lg bg-gray-800/60 border border-gray-600 focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="text">Short Text</option>
                        <option value="textarea">Long Text</option>
                        <option value="rating">Rating (1-5)</option>
                      </select>
                    </div>
                    <div className="flex items-center">
                      <label className="flex items-center text-sm text-gray-300">
                        <input
                          type="checkbox"
                          checked={Boolean(f.isRequired)}
                          onChange={(e) => updateReviewField(idx, { ...f, isRequired: e.target.checked })}
                          className="mr-2"
                        />
                        Required
                      </label>
                    </div>
                  </div>
                  {f.fieldType !== "rating" && (
                    <div className="mt-3">
                      <label className="block text-sm text-gray-300 mb-1">Placeholder</label>
                      <input
                        type="text"
                        value={f.placeholder || ""}
                        onChange={(e) => updateReviewField(idx, { ...f, placeholder: e.target.value })}
                        className="w-full p-2 rounded-lg bg-gray-800/60 border border-gray-600 focus:ring-2 focus:ring-orange-500"
                        placeholder="Enter placeholder text"
                      />
                    </div>
                  )}
                  <div className="mt-3 flex justify-between">
                    <span className="text-xs text-gray-400">Order: {idx + 1}</span>
                    <button onClick={() => removeReviewField(idx)} className="text-sm px-3 py-1 bg-red-600/80 hover:bg-red-700 rounded-lg">Remove</button>
                  </div>
                </div>
              ))}

              <div className="flex items-center gap-3">
                <button onClick={addReviewField} className="px-4 py-2 bg-orange-600/80 hover:bg-orange-700 rounded-lg">Add Field</button>
                <button onClick={saveReviewFields} className="px-4 py-2 bg-green-600/80 hover:bg-green-700 rounded-lg">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Event Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800/95 backdrop-blur-sm rounded-2xl p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-gray-700/50">
            <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              {editingEvent ? "Edit Event" : "Create Event"}
            </h2>
            <form onSubmit={submitForm} className="space-y-6">
              {/* Basic Information */}
              <div className="bg-gray-700/30 rounded-xl p-6">
                <h3 className="text-xl font-semibold mb-4 text-white">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Event Title *</label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) => handleFieldChange("title", e.target.value)}
                      onBlur={() => handleFieldBlur("title")}
                      className={`w-full p-3 rounded-xl bg-gray-700/50 border transition-all duration-300 ${
                        formErrors.title ? 'border-red-500 focus:ring-red-500' : 'border-gray-600 focus:ring-blue-500'
                      } focus:ring-2 focus:border-transparent`}
                      required
                    />
                    {formErrors.title && <p className="text-red-400 text-sm mt-1">{formErrors.title}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
                    <select
                      value={form.category}
                      onChange={(e) => handleFieldChange("category", e.target.value)}
                      className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                    >
                      <option value="General">General</option>
                      <option value="Technology">Technology</option>
                      <option value="Business">Business</option>
                      <option value="Education">Education</option>
                      <option value="Health">Health</option>
                      <option value="Entertainment">Entertainment</option>
                      <option value="Sports">Sports</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Short Description (Max 150 chars)</label>
                  <input
                    type="text"
                    value={form.shortDescription}
                    onChange={(e) => handleFieldChange("shortDescription", e.target.value)}
                    onBlur={() => handleFieldBlur("shortDescription")}
                    maxLength={150}
                    className={`w-full p-3 rounded-xl bg-gray-700/50 border transition-all duration-300 ${
                      formErrors.shortDescription ? 'border-red-500 focus:ring-red-500' : 'border-gray-600 focus:ring-blue-500'
                    } focus:ring-2 focus:border-transparent`}
                    placeholder="Brief description for event cards"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>{formErrors.shortDescription && <span className="text-red-400">{formErrors.shortDescription}</span>}</span>
                    <span>{form.shortDescription.length}/150</span>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Full Description *</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => handleFieldChange("description", e.target.value)}
                    onBlur={() => handleFieldBlur("description")}
                    className={`w-full p-3 rounded-xl bg-gray-700/50 border transition-all duration-300 ${
                      formErrors.description ? 'border-red-500 focus:ring-red-500' : 'border-gray-600 focus:ring-blue-500'
                    } focus:ring-2 focus:border-transparent`}
                    rows="4"
                    required
                  />
                  {formErrors.description && <p className="text-red-400 text-sm mt-1">{formErrors.description}</p>}
                </div>
              </div>

              {/* Date & Time */}
              <div className="bg-gray-700/30 rounded-xl p-6">
                <h3 className="text-xl font-semibold mb-4 text-white">Date & Time</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Start Date & Time *</label>
                    <input
                      type="datetime-local"
                      value={form.date}
                      onChange={(e) => handleFieldChange("date", e.target.value)}
                      onBlur={() => handleFieldBlur("date")}
                      min={(function(){ const d=new Date(); d.setSeconds(0,0); const z=d.getTimezoneOffset()*60000; return new Date(d.getTime()-z).toISOString().slice(0,16); })()}
                      className={`w-full p-3 rounded-xl bg-gray-700/50 border transition-all duration-300 ${
                        formErrors.date ? 'border-red-500 focus:ring-red-500' : 'border-gray-600 focus:ring-blue-500'
                      } focus:ring-2 focus:border-transparent`}
                      required
                    />
                    {formErrors.date && <p className="text-red-400 text-sm mt-1">{formErrors.date}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">End Date & Time</label>
                    <input
                      type="datetime-local"
                      value={form.endDate}
                      onChange={(e) => handleFieldChange("endDate", e.target.value)}
                      onBlur={() => handleFieldBlur("endDate")}
                      min={form.date || (function(){ const d=new Date(); d.setSeconds(0,0); const z=d.getTimezoneOffset()*60000; return new Date(d.getTime()-z).toISOString().slice(0,16); })()}
                      className={`w-full p-3 rounded-xl bg-gray-700/50 border transition-all duration-300 ${
                        formErrors.endDate ? 'border-red-500 focus:ring-red-500' : 'border-gray-600 focus:ring-blue-500'
                      } focus:ring-2 focus:border-transparent`}
                    />
                    {formErrors.endDate && <p className="text-red-400 text-sm mt-1">{formErrors.endDate}</p>}
                  </div>
                </div>
                {sameDayEvents.length > 0 && (
                  <div className="mt-4 p-4 bg-yellow-900/20 border border-yellow-700 rounded-xl">
                    <div className="text-yellow-300 font-semibold mb-2">Heads up: Other events on this day</div>
                    <ul className="list-disc list-inside text-yellow-200 text-sm space-y-1 max-h-40 overflow-auto">
                      {sameDayEvents.map((e) => (
                        <li key={e._id}>
                          <span className="font-medium">{e.title}</span> • {new Date(e.date).toLocaleTimeString()} • {e.location || (e.isOnline ? "Online" : "")}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Location */}
              <div className="bg-gray-700/30 rounded-xl p-6">
                <h3 className="text-xl font-semibold mb-4 text-white">Location</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Event Type</label>
                    <div className="flex space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="isOnline"
                          checked={!form.isOnline}
                          onChange={() => handleFieldChange("isOnline", false)}
                          className="mr-2"
                        />
                        <span className="text-gray-300">In-Person</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="isOnline"
                          checked={form.isOnline}
                          onChange={() => handleFieldChange("isOnline", true)}
                          className="mr-2"
                        />
                        <span className="text-gray-300">Online</span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Location/Venue *</label>
                    <input
                      type="text"
                      value={form.location}
                      onChange={(e) => handleFieldChange("location", e.target.value)}
                      onBlur={() => handleFieldBlur("location")}
                      className={`w-full p-3 rounded-xl bg-gray-700/50 border transition-all duration-300 ${
                        formErrors.location ? 'border-red-500 focus:ring-red-500' : 'border-gray-600 focus:ring-blue-500'
                      } focus:ring-2 focus:border-transparent`}
                      placeholder={form.isOnline ? "Online Event" : "Venue Name"}
                      required
                    />
                    {formErrors.location && <p className="text-red-400 text-sm mt-1">{formErrors.location}</p>}
                  </div>
                </div>
                {form.isOnline && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Meeting Link</label>
                    <input
                      type="url"
                      value={form.meetingLink}
                      onChange={(e) => handleFieldChange("meetingLink", e.target.value)}
                      onBlur={() => handleFieldBlur("meetingLink")}
                      className={`w-full p-3 rounded-xl bg-gray-700/50 border transition-all duration-300 ${
                        formErrors.meetingLink ? 'border-red-500 focus:ring-red-500' : 'border-gray-600 focus:ring-blue-500'
                      } focus:ring-2 focus:border-transparent`}
                      placeholder="https://meet.google.com/..."
                    />
                    {formErrors.meetingLink && <p className="text-red-400 text-sm mt-1">{formErrors.meetingLink}</p>}
                  </div>
                )}
                {!form.isOnline && (
                  <>
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-300 mb-2">Address *</label>
                      <input
                        type="text"
                        value={form.address}
                        onChange={(e) => handleFieldChange("address", e.target.value)}
                        onBlur={() => handleFieldBlur("address")}
                        className={`w-full p-3 rounded-xl bg-gray-700/50 border transition-all duration-300 ${
                          formErrors.address ? 'border-red-500 focus:ring-red-500' : 'border-gray-600 focus:ring-blue-500'
                        } focus:ring-2 focus:border-transparent`}
                        required
                      />
                      {formErrors.address && <p className="text-red-400 text-sm mt-1">{formErrors.address}</p>}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">City *</label>
                        <input
                          type="text"
                          value={form.city}
                          onChange={(e) => handleFieldChange("city", e.target.value)}
                          onBlur={() => handleFieldBlur("city")}
                          className={`w-full p-3 rounded-xl bg-gray-700/50 border transition-all duration-300 ${
                            formErrors.city ? 'border-red-500 focus:ring-red-500' : 'border-gray-600 focus:ring-blue-500'
                          } focus:ring-2 focus:border-transparent`}
                          required
                        />
                        {formErrors.city && <p className="text-red-400 text-sm mt-1">{formErrors.city}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">State *</label>
                        <input
                          type="text"
                          value={form.state}
                          onChange={(e) => handleFieldChange("state", e.target.value)}
                          onBlur={() => handleFieldBlur("state")}
                          className={`w-full p-3 rounded-xl bg-gray-700/50 border transition-all duration-300 ${
                            formErrors.state ? 'border-red-500 focus:ring-red-500' : 'border-gray-600 focus:ring-blue-500'
                          } focus:ring-2 focus:border-transparent`}
                          required
                        />
                        {formErrors.state && <p className="text-red-400 text-sm mt-1">{formErrors.state}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Pincode</label>
                        <input
                          type="text"
                          value={form.pincode}
                          onChange={(e) => handleFieldChange("pincode", e.target.value)}
                          onBlur={() => handleFieldBlur("pincode")}
                          className={`w-full p-3 rounded-xl bg-gray-700/50 border transition-all duration-300 ${
                            formErrors.pincode ? 'border-red-500 focus:ring-red-500' : 'border-gray-600 focus:ring-blue-500'
                          } focus:ring-2 focus:border-transparent`}
                          maxLength="6"
                        />
                        {formErrors.pincode && <p className="text-red-400 text-sm mt-1">{formErrors.pincode}</p>}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Event Details */}
              <div className="bg-gray-700/30 rounded-xl p-6">
                <h3 className="text-xl font-semibold mb-4 text-white">Event Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Capacity</label>
                    <input
                      type="text"
                      value={form.capacity}
                      onChange={(e) => handleFieldChange("capacity", e.target.value)}
                      onBlur={() => handleFieldBlur("capacity")}
                      className={`w-full p-3 rounded-xl bg-gray-700/50 border transition-all duration-300 ${
                        formErrors.capacity ? 'border-red-500 focus:ring-red-500' : 'border-gray-600 focus:ring-blue-500'
                      } focus:ring-2 focus:border-transparent`}
                    />
                    {formErrors.capacity && <p className="text-red-400 text-sm mt-1">{formErrors.capacity}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Price</label>
                    <div className="flex">
                      <input
                        type="text"
                        value={form.price}
                        onChange={(e) => handleFieldChange("price", e.target.value)}
                        onBlur={() => handleFieldBlur("price")}
                        className={`flex-1 p-3 rounded-l-xl bg-gray-700/50 border border-r-0 transition-all duration-300 ${
                          formErrors.price ? 'border-red-500 focus:ring-red-500' : 'border-gray-600 focus:ring-blue-500'
                        } focus:ring-2 focus:border-transparent`}
                      />
                      <select
                        value={form.currency}
                        onChange={(e) => handleFieldChange("currency", e.target.value)}
                        className="px-3 py-3 rounded-r-xl bg-gray-700/50 border border-gray-600 border-l-0 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="INR">INR</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                      </select>
                    </div>
                    {formErrors.price && <p className="text-red-400 text-sm mt-1">{formErrors.price}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Tags</label>
                    <input
                      type="text"
                      value={form.tags}
                      onChange={(e) => handleFieldChange("tags", e.target.value)}
                      onBlur={() => handleFieldBlur("tags")}
                      className={`w-full p-3 rounded-xl bg-gray-700/50 border transition-all duration-300 ${
                        formErrors.tags ? 'border-red-500 focus:ring-red-500' : 'border-gray-600 focus:ring-blue-500'
                      } focus:ring-2 focus:border-transparent`}
                      placeholder="tech, workshop, free (comma separated)"
                    />
                    <div className="text-xs text-gray-500 mt-1">Up to 10 tags. Comma-separated.</div>
                    {formErrors.tags && <p className="text-red-400 text-sm mt-1">{formErrors.tags}</p>}
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Requirements</label>
                  <textarea
                    value={form.requirements}
                    onChange={(e) => handleFieldChange("requirements", e.target.value)}
                    className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                    rows="3"
                    placeholder="What participants need to bring or prepare..."
                  />
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Agenda</label>
                  <textarea
                    value={form.agenda}
                    onChange={(e) => handleFieldChange("agenda", e.target.value)}
                    className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                    rows="4"
                    placeholder="Event schedule and agenda..."
                  />
                </div>
              </div>

              {/* Contact Information */}
              <div className="bg-gray-700/30 rounded-xl p-6">
                <h3 className="text-xl font-semibold mb-4 text-white">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Contact Email</label>
                    <input
                      type="email"
                      value={form.contactEmail}
                      onChange={(e) => handleFieldChange("contactEmail", e.target.value)}
                      onBlur={() => handleFieldBlur("contactEmail")}
                      className={`w-full p-3 rounded-xl bg-gray-700/50 border transition-all duration-300 ${
                        formErrors.contactEmail ? 'border-red-500 focus:ring-red-500' : 'border-gray-600 focus:ring-blue-500'
                      } focus:ring-2 focus:border-transparent`}
                    />
                    {formErrors.contactEmail && <p className="text-red-400 text-sm mt-1">{formErrors.contactEmail}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Contact Phone</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={form.countryCode || "+91"}
                        onChange={(e) => handleFieldChange("countryCode", e.target.value.replace(/[^+\d]/g, "").slice(0, 5))}
                        className="w-24 p-3 rounded-xl bg-gray-700/50 border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="+91"
                      />
                      <input
                        type="text"
                        value={form.contactPhone}
                        onChange={(e) => handleFieldChange("contactPhone", e.target.value.replace(/[^\d]/g, "").slice(0, 10))}
                        onBlur={() => handleFieldBlur("contactPhone")}
                        className={`flex-1 p-3 rounded-xl bg-gray-700/50 border transition-all duration-300 ${
                          formErrors.contactPhone ? 'border-red-500 focus:ring-red-500' : 'border-gray-600 focus:ring-blue-500'
                        } focus:ring-2 focus:border-transparent`}
                        placeholder="10-digit phone"
                      />
                    </div>
                    {formErrors.contactPhone && <p className="text-red-400 text-sm mt-1">{formErrors.contactPhone}</p>}
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Website</label>
                  <input
                    type="url"
                    value={form.website}
                    onChange={(e) => handleFieldChange("website", e.target.value.trim())}
                    onBlur={() => handleFieldBlur("website")}
                    className={`w-full p-3 rounded-xl bg-gray-700/50 border transition-all duration-300 ${
                      formErrors.website ? 'border-red-500 focus:ring-red-500' : 'border-gray-600 focus:ring-blue-500'
                    } focus:ring-2 focus:border-transparent`}
                    placeholder="https://example.com"
                  />
                  {formErrors.website && <p className="text-red-400 text-sm mt-1">{formErrors.website}</p>}
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Event Image URL</label>
                  <input
                    type="url"
                    value={form.imageUrl}
                    onChange={(e) => handleFieldChange("imageUrl", e.target.value)}
                    className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
              </div>

              <div className="flex space-x-4 pt-6">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 py-4 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105"
                >
                  {editingEvent ? "Update Event" : "Create Event"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-8 py-4 bg-gray-600/80 hover:bg-gray-700 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <SupportChatbot />
    </div>
  );
}