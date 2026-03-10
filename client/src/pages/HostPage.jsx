import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../utils/api";
import config from "../config";
import { GamifiedEventCard } from "../components/GamifiedComponents";
import EventDetailModal from "../components/EventDetailModal";
import { payForEvent } from "../utils/openRazorpay";
import { Users, Building2, ArrowLeft, Search, CheckCircle, Link as LinkIcon, Camera, ScanLine } from "lucide-react";
import QRCodeScanner from "../components/QRCodeScanner";

export default function HostPage() {
  const { hostId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [host, setHost] = useState(null);
  const [subscribedHosts, setSubscribedHosts] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [q, setQ] = useState("");
  const [activeTab, setActiveTab] = useState("home");
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({ fullname: "", bio: "", institute: "", website: "", socials: { twitter: "", instagram: "", linkedin: "" }, bannerUrl: "", profilePic: "" });
  const [editTouched, setEditTouched] = useState({});
  const [editErrors, setEditErrors] = useState({});
  const [scannerOpen, setScannerOpen] = useState(false);
  const processingScan = useRef(false);

  useEffect(() => { const u = localStorage.getItem("user"); setUser(u ? JSON.parse(u) : null); }, []);

  const isOwnHost = useMemo(() => {
    const uid = user?.id || user?._id;
    return uid && String(uid) === String(hostId);
  }, [user, hostId]);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        // Host profile + events
        const res = await api.get(`/api/host/public/host/${hostId}`);
        const h = res.data?.host || null;
        setHost(h);
        if (h && !editMode) {
          setDraft({
            fullname: h.fullname || h.username || "",
            bio: h.bio || "",
            institute: h.institute || "",
            website: h.website || "",
            socials: {
              twitter: h?.socials?.twitter || "",
              instagram: h?.socials?.instagram || "",
              linkedin: h?.socials?.linkedin || "",
            },
            bannerUrl: h.bannerUrl || "",
            profilePic: h.profilePic || "",
          });
        }
        setEvents(Array.isArray(res.data?.events) ? res.data.events : []);
        // Subscriptions and registrations
        const token = localStorage.getItem("token");
        if (token) {
          try {
            const subs = await api.get("/api/subscriptions", { headers: { Authorization: `Bearer ${token}` } });
            setSubscribedHosts(Array.isArray(subs.data) ? subs.data : []);
          } catch { }
          try {
            const regs = await api.get("/api/host/public/my-registrations", { headers: { Authorization: `Bearer ${token}` } });
            const mapped = (regs.data || []).map(r => ({ eventId: r.eventId }));
            setRegistrations(mapped);
          } catch { }
        }
        try { const raw = localStorage.getItem("student.bookmarks"); setBookmarks(raw ? JSON.parse(raw) : []); } catch { }
      } catch (e) {
        console.error(e);
        toast.error("Failed to load host or events");
      } finally {
        setLoading(false);
      }
    };
    // run fetch
    fetchAll();
  }, [hostId]);

  // If query has ?edit=1 and this is own host page, enter edit mode
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('edit') && isOwnHost) {
      setEditMode(true);
    }
  }, [location.search, isOwnHost]);

  const startEdit = () => {
    if (!host) return;
    setDraft({
      fullname: host.fullname || host.username || "",
      bio: host.bio || "",
      institute: host.institute || "",
      website: host.website || "",
      socials: {
        twitter: host?.socials?.twitter || "",
        instagram: host?.socials?.instagram || "",
        linkedin: host?.socials?.linkedin || "",
      },
      bannerUrl: host.bannerUrl || "",
      profilePic: host.profilePic || "",
    });
    setEditMode(true);
  };

  const isDirty = useMemo(() => {
    if (!host) return false;
    const base = {
      fullname: host.fullname || host.username || "",
      bio: host.bio || "",
      institute: host.institute || "",
      website: host.website || "",
      socials: {
        twitter: host?.socials?.twitter || "",
        instagram: host?.socials?.instagram || "",
        linkedin: host?.socials?.linkedin || "",
      },
      bannerUrl: host.bannerUrl || "",
      profilePic: host.profilePic || "",
    };
    try { return JSON.stringify(base) !== JSON.stringify(draft); } catch { return true; }
  }, [host, draft]);

  const cancelEdit = () => {
    if (isDirty) toast.info('Changes discarded');
    setEditMode(false);
  };

  // Edit field validation (client-side hints)
  const validateEdit = (field, value) => {
    const v = String(value || '').trim();
    if (field === 'fullname') {
      return v.length >= 2 ? '' : 'Name must be at least 2 characters';
    }
    if (field === 'website') {
      return !v || /^https?:\/\//i.test(v) ? '' : 'Website must start with http:// or https://';
    }
    if (field === 'twitter' || field === 'instagram' || field === 'linkedin') {
      if (!v) return '';
      // allow url or @handle
      const isUrl = /^https?:\/\//i.test(v);
      const isHandle = /^@?[-\w.]{1,100}$/i.test(v);
      return (isUrl || isHandle) ? '' : 'Use full URL or @handle';
    }
    return '';
  };

  const handleEditFocus = (field) => {
    setEditTouched(prev => ({ ...prev, [field]: true }));
    const val = field === 'twitter' || field === 'instagram' || field === 'linkedin'
      ? draft.socials?.[field] || ''
      : draft[field] || '';
    const msg = validateEdit(field, val);
    setEditErrors(prev => ({ ...prev, [field]: msg }));
  };

  const handleDraftChange = (field, value) => {
    if (field === 'twitter' || field === 'instagram' || field === 'linkedin') {
      setDraft(prev => ({ ...prev, socials: { ...prev.socials, [field]: value } }));
      if (editTouched[field]) {
        const msg = validateEdit(field, value);
        setEditErrors(prev => ({ ...prev, [field]: msg }));
      }
      return;
    }
    setDraft(prev => ({ ...prev, [field]: value }));
    if (editTouched[field]) {
      const msg = validateEdit(field, value);
      setEditErrors(prev => ({ ...prev, [field]: msg }));
    }
  };

  const saveProfile = async () => {
    try {
      setSaving(true);
      const payload = {
        fullname: draft.fullname,
        bio: draft.bio,
        institute: draft.institute,
        website: draft.website,
        socials: draft.socials,
        bannerUrl: draft.bannerUrl,
        profilePic: draft.profilePic,
      };
      const { data } = await api.put('/api/host/profile', payload, { headers: bearer() });
      const updated = data?.host || { ...host, ...payload };
      setHost(updated);
      setEditMode(false);
      toast.success('Profile updated');
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const uploadImage = async (type, file) => {
    try {
      if (!file) return;
      const fd = new FormData();
      // Server expects Multer single('image') and type in query
      fd.append('image', file);
      const res = await api.post(`/api/host/profile/upload?type=${encodeURIComponent(type)}`, fd, { headers: { ...bearer() } });
      const raw = res?.data || {};
      const url = raw.url || raw.path || raw.location || raw.secure_url;
      if (url) {
        const abs = /^https?:\/\//i.test(url)
          ? url
          : `${config.apiBaseUrl.replace(/\/$/, '')}${url.startsWith('/') ? '' : '/'}${url}`;
        setDraft(prev => ({ ...prev, [type === 'banner' ? 'bannerUrl' : 'profilePic']: abs }));
        toast.success('Image updated');
      } else {
        toast.error('Upload failed');
      }
    } catch (e) {
      const status = e?.response?.status;
      const msg = e?.response?.data?.error || e?.response?.data?.message || e?.message || 'Upload failed';
      toast.error(`Upload failed${status ? ` (${status})` : ''}: ${msg}`);
    }
  };

  const hostEvents = useMemo(() => {
    const list = events || [];
    const query = q.trim().toLowerCase();
    if (!query) return list;
    return list.filter(e => [e.title, e.location, e.category, ...(Array.isArray(e.tags) ? e.tags : [])]
      .filter(Boolean)
      .map(String)
      .map(s => s.toLowerCase())
      .some(t => t.includes(query)));
  }, [events, q]);

  const isSubscribed = useMemo(() => (subscribedHosts || []).some(h => String(h._id || h) === String(hostId)), [subscribedHosts, hostId]);
  const upcomingEvents = useMemo(() => (events || []).filter(e => new Date(e.date) > new Date()).sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 6), [events]);
  const recentEvents = useMemo(() => (events || []).filter(e => new Date(e.date) <= new Date()).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6), [events]);
  const eventsByCategory = useMemo(() => {
    const map = {};
    (events || []).forEach(e => {
      const cat = e.category || 'Other';
      if (!map[cat]) map[cat] = [];
      map[cat].push(e);
    });
    // sort each category by date desc and cap
    Object.keys(map).forEach(k => map[k] = map[k].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6));
    return map;
  }, [events]);

  const bearer = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const ensureVerified = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return false;
      const { data } = await api.get("/api/auth/me", { headers: bearer() });
      if (!data?.emailVerified || !data?.phoneVerified) {
        toast.info("Please verify your email and phone to continue");
        navigate("/profile?tab=otp");
        return false;
      }
      return true;
    } catch { return false; }
  };

  const toggleSubscribe = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) { toast.error("Please login"); navigate("/login"); return; }
      if (isSubscribed) {
        await api.delete(`/api/subscriptions/${hostId}`, { headers: bearer() });
        setSubscribedHosts(prev => prev.filter(h => String(h._id || h) !== String(hostId)));
        toast.success("Unfollowed host");
      } else {
        const { data } = await api.post(`/api/subscriptions`, { hostId }, { headers: bearer() });
        setSubscribedHosts(Array.isArray(data?.subscribedHosts) ? data.subscribedHosts : prev => [...prev, { _id: hostId }]);
        toast.success("Following host");
      }
    } catch (e) {
      toast.error(e?.response?.data?.error || "Failed to update follow");
    }
  };

  const toggleBookmark = async (event) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) { toast.error("Please login to manage bookmarks"); navigate("/login"); return false; }
      const ok = await ensureVerified(); if (!ok) return false;
      const already = bookmarks.includes(event._id);
      if (already) {
        await api.delete(`/api/bookmarks/${event._id}`, { headers: bearer() });
        setBookmarks(prev => prev.filter(id => id !== event._id));
        toast.success("Removed from bookmarks");
      } else {
        await api.post("/api/bookmarks", { eventId: event._id }, { headers: bearer() });
        setBookmarks(prev => [event._id, ...prev]);
        toast.success("Bookmarked");
      }
      return true;
    } catch (e) { toast.error(e?.response?.data?.error || "Failed to update bookmark"); return false; }
  };

  const registerForEvent = async (event, squadId) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) { toast.error("Please login to register"); navigate("/login"); return false; }
      const ok = await ensureVerified(); if (!ok) return false;
      if ((event.price || 0) > 0) {
        await payForEvent({ event, user, squadId });
        setRegistrations(prev => prev.some(r => r.eventId === event._id) ? prev : [{ eventId: event._id }, ...prev]);
        toast.success("Payment successful and registered");
      } else {
        await api.post(`/api/host/public/events/${event._id}/register`, { squadId }, { headers: bearer() });
        setRegistrations(prev => prev.some(r => r.eventId === event._id) ? prev : [{ eventId: event._id }, ...prev]);
        toast.success("Registered successfully");
      }
      return true;
    } catch (e) { toast.error(e?.response?.data?.error || "Failed to register"); return false; }
  };

  const openDetails = (event) => { setSelectedEvent(event); setDetailOpen(true); };
  const closeDetails = () => { setDetailOpen(false); setSelectedEvent(null); };

  const handleScanSuccess = async (decodedText) => {
    if (processingScan.current) return;
    processingScan.current = true;
    try {
      // Pause or close immediately to prevent multiple scans
      setScannerOpen(false);
      const { data } = await api.post('/api/host/verify-qr', { qrData: decodedText }, { headers: bearer() });
      toast.success(`Verified: ${data.student?.name} for ${data.event?.title}`);
      // Optional: Play a success sound
    } catch (e) {
      console.error("Scan verification failed", e);
      // Re-open if failed? Or just show error? 
      // Better to keep it closed or user has to tap "Scan" again, 
      // or we handle "pause" logic better. 
      // For now, closing it is safest UI UX to avoid spam.
      toast.error(e?.response?.data?.error || "Verification failed");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-300 border-t-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 text-xl font-medium">Loading host page...</p>
        </div>

        {/* Floating mobile Edit button */}
        {isOwnHost && !editMode && (
          <button
            onClick={startEdit}
            className="fixed md:hidden bottom-4 right-4 z-50 inline-flex items-center gap-2 px-4 py-3 rounded-full bg-slate-900 hover:bg-slate-800 text-white shadow-lg"
            aria-label="Edit Profile"
          >
            <Camera className="w-4 h-4" /> Edit Profile
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Channel cover/banner */}
      <div className="relative w-full h-48 md:h-64 bg-slate-200 overflow-hidden group">
        {(editMode ? draft?.bannerUrl : host?.bannerUrl) ? (
          <img
            src={editMode ? draft.bannerUrl : host.bannerUrl}
            alt="Banner"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => {
              e.target.onerror = null;
              e.target.style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-slate-200 to-slate-300" />
        )}
        {/* Subtle gradient overlay for text readability if needed, though most text is below now */}
        <div className="absolute inset-0 bg-black/10 pointer-events-none" />

        {isOwnHost && editMode && (
          <label className="absolute bottom-4 right-4 inline-flex items-center gap-2 px-4 py-2 bg-white/90 hover:bg-white text-slate-900 rounded-full text-sm font-medium shadow-sm cursor-pointer transition-colors backdrop-blur-sm ring-1 ring-slate-900/10">
            <Camera className="w-4 h-4" /> Change Banner
            <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadImage('banner', e.target.files?.[0])} />
          </label>
        )}
      </div>

      {/* Channel header */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 md:-mt-10 relative z-10">
        <div className="flex flex-col md:flex-row items-center md:items-end gap-6 pb-6 border-b border-slate-200">
          {/* Avatar */}
          <div className="relative group">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full ring-4 ring-white bg-white shadow-md overflow-hidden flex items-center justify-center">
              {(editMode ? draft?.profilePic : host?.profilePic) ? (
                <img
                  src={editMode ? draft.profilePic : host.profilePic}
                  alt={host?.fullname || 'Host'}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div className="hidden w-full h-full items-center justify-center bg-slate-100 text-slate-400">
                <Users className="w-12 h-12" />
              </div>
            </div>
            {isOwnHost && editMode && (
              <label className="absolute bottom-2 right-2 p-2 bg-white text-slate-700 rounded-full shadow-md cursor-pointer hover:bg-slate-50 border border-slate-200 transition-colors">
                <Camera className="w-4 h-4" />
                <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadImage('profile', e.target.files?.[0])} />
              </label>
            )}
          </div>

          {/* Meta */}
          <div className="flex-1 text-center md:text-left min-w-0">
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-2">
              {isOwnHost && editMode ? (
                <div className="flex-1 max-w-lg">
                  <input
                    value={draft.fullname}
                    onChange={(e) => handleDraftChange('fullname', e.target.value)}
                    onFocus={() => handleEditFocus('fullname')}
                    className="w-full text-3xl font-bold bg-white border border-slate-300 rounded-lg px-3 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="Full Name"
                  />
                  {editTouched.fullname && editErrors.fullname && (
                    <p className="text-red-500 text-xs mt-1 text-left">{editErrors.fullname}</p>
                  )}
                </div>
              ) : (
                <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 flex items-center justify-center md:justify-start gap-2">
                  {host?.fullname || host?.username || "Host"}
                  <CheckCircle className="w-6 h-6 text-blue-500 fill-blue-50" />
                </h1>
              )}
            </div>

            <div className="text-slate-600 flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-1 text-sm md:text-base">
              <span className="font-medium text-slate-900">@{(host?.username || (host?.fullname || "").replace(/\s+/g, '').toLowerCase())}</span>
              <span className="text-slate-300 hidden md:inline">•</span>
              <span>{hostEvents.length} events</span>
              {typeof host?.subscribersCount === 'number' && (
                <>
                  <span className="text-slate-300 hidden md:inline">•</span>
                  <span>{host.subscribersCount.toLocaleString()} subscribers</span>
                </>
              )}
              {host?.institute && (
                <>
                  <span className="text-slate-300 hidden md:inline">•</span>
                  <span className="inline-flex items-center gap-1"><Building2 className="w-4 h-4 text-slate-400" /> {host.institute}</span>
                </>
              )}
            </div>

            {/* Socials & Actions */}
            <div className="mt-4 flex flex-wrap items-center justify-center md:justify-start gap-3">
              {isOwnHost ? (
                !editMode ? (
                  <button onClick={startEdit} className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm transition-all">
                    Edit Profile
                  </button>
                ) : (
                  <>
                    <button onClick={cancelEdit} className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm transition-all">
                      Cancel
                    </button>
                    <button onClick={saveProfile} disabled={saving} className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 shadow-sm disabled:opacity-70 transition-all">
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </>
                )
              ) : (
                <button
                  onClick={toggleSubscribe}
                  className={`px-6 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all ${isSubscribed
                    ? 'bg-white border border-slate-200 text-slate-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
                    : 'bg-slate-900 text-white hover:bg-slate-800'
                    }`}
                >
                  {isSubscribed ? 'Unfollow' : 'Follow'}
                </button>
              )}

              <button onClick={() => {
                // Check if user came from student dashboard and navigate back to appropriate section
                const user = JSON.parse(localStorage.getItem("user") || "null");
                if (user?.role === "student") {
                  // Check if user came from a specific dashboard section via URL state
                  const state = location.state;
                  if (state?.fromSection) {
                    navigate(`/dashboard?tab=${state.fromSection}`);
                  } else {
                    navigate("/dashboard?tab=SubscribedHosts");
                  }
                } else {
                  navigate(-1);
                }
              }} className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all ml-2">Back</button>

              {/* Social Links */}
              <div className="flex items-center gap-3 md:ml-4 pl-4 md:border-l border-slate-200">
                {isOwnHost && editMode ? (
                  <div className="flex gap-2">
                    {/* Social inputs simplified for layout */}
                  </div>
                ) : (
                  (host?.website || host?.socials?.twitter || host?.socials?.instagram || host?.socials?.linkedin) && (
                    <div className="flex items-center gap-3">
                      {host.website && <a href={host.website} target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-colors"><LinkIcon className="w-4 h-4" /></a>}
                      {host?.socials?.twitter && <a href={host.socials.twitter} target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-400 transition-colors text-xs font-bold">TW</a>}
                      {host?.socials?.instagram && <a href={host.socials.instagram} target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-pink-50 hover:text-pink-600 transition-colors text-xs font-bold">IG</a>}
                      {host?.socials?.linkedin && <a href={host.socials.linkedin} target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition-colors text-xs font-bold">IN</a>}
                    </div>
                  )
                )}
              </div>
            </div>
            {/* Edit Socials Area */}
            {isOwnHost && editMode && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-left">
                <input value={draft.website} onChange={(e) => handleDraftChange('website', e.target.value)} className="text-sm border border-slate-200 rounded px-2 py-1.5 focus:border-blue-500 outline-none" placeholder="Website URL" />
                <input value={draft.socials.twitter} onChange={(e) => handleDraftChange('twitter', e.target.value)} className="text-sm border border-slate-200 rounded px-2 py-1.5 focus:border-blue-500 outline-none" placeholder="Twitter URL" />
                <input value={draft.socials.instagram} onChange={(e) => handleDraftChange('instagram', e.target.value)} className="text-sm border border-slate-200 rounded px-2 py-1.5 focus:border-blue-500 outline-none" placeholder="Instagram URL" />
                <input value={draft.socials.linkedin} onChange={(e) => handleDraftChange('linkedin', e.target.value)} className="text-sm border border-slate-200 rounded px-2 py-1.5 focus:border-blue-500 outline-none" placeholder="LinkedIn URL" />
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 mt-6 overflow-x-auto pb-1 scrollbar-hide">
          {['home', 'events', 'about'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-colors capitalize whitespace-nowrap ${activeTab === tab
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-200/50'
                }`}
            >
              {tab}
            </button>
          ))}
          <div className="flex-1" />
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search events..."
              className="pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-200 focus:border-slate-400 outline-none w-40 focus:w-60 transition-all"
            />
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'home' && (
          <div className="space-y-10">
            {/* Upcoming Section */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-blue-500 rounded-full" />
                  Upcoming Events
                </h3>
                {upcomingEvents.length > 0 && <button onClick={() => setActiveTab('events')} className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline">View all</button>}
              </div>
              {upcomingEvents.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 border-dashed">
                  <p className="text-slate-500 text-sm">No upcoming events scheduled.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                  {upcomingEvents.map(ev => (
                    <GamifiedEventCard key={ev._id} event={ev} onRegister={() => registerForEvent(ev)} onBookmark={() => toggleBookmark(ev)} onViewMore={() => openDetails(ev)} isRegistered={registrations.some(r => r.eventId === ev._id)} isBookmarked={bookmarks.includes(ev._id)} />
                  ))}
                </div>
              )}
            </section>

            {/* Recent Section */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-slate-300 rounded-full" />
                  Past Events
                </h3>
              </div>
              {recentEvents.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 border-dashed">
                  <p className="text-slate-500 text-sm">No past events found.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                  {recentEvents.map(ev => (
                    <GamifiedEventCard key={ev._id} event={ev} onRegister={() => registerForEvent(ev)} onBookmark={() => toggleBookmark(ev)} onViewMore={() => openDetails(ev)} isRegistered={registrations.some(r => r.eventId === ev._id)} isBookmarked={bookmarks.includes(ev._id)} />
                  ))}
                </div>
              )}
            </section>

            {/* Categories Section */}
            <section>
              <h3 className="text-lg font-bold text-slate-900 mb-6">Explore by Category</h3>
              <div className="space-y-8">
                {Object.keys(eventsByCategory).slice(0, 4).map(cat => (
                  <div key={cat}>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-base font-semibold text-slate-800">{cat}</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                      {eventsByCategory[cat].map(ev => (
                        <GamifiedEventCard key={ev._id} event={ev} onRegister={() => registerForEvent(ev)} onBookmark={() => toggleBookmark(ev)} onViewMore={() => openDetails(ev)} isRegistered={registrations.some(r => r.eventId === ev._id)} isBookmarked={bookmarks.includes(ev._id)} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'events' && (
          hostEvents.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 border-dashed">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-50 flex items-center justify-center">
                <Users className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">No Events Found</h3>
              <p className="text-slate-500 text-sm">Try adjusting your search or come back later.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {hostEvents.map(ev => (
                <GamifiedEventCard
                  key={ev._id}
                  event={ev}
                  onRegister={() => registerForEvent(ev)}
                  onBookmark={() => toggleBookmark(ev)}
                  onViewMore={() => openDetails(ev)}
                  isRegistered={registrations.some(r => r.eventId === ev._id)}
                  isBookmarked={bookmarks.includes(ev._id)}
                />
              ))}
            </div>
          )
        )}

        {activeTab === 'about' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm max-w-4xl mx-auto">
            <h3 className="text-xl font-bold text-slate-900 mb-6 border-b border-slate-100 pb-4">About the Host</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12 text-sm">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Host Name</span>
                <div className="text-base font-medium text-slate-900">{host?.fullname || host?.username}</div>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Institute/Organization</span>
                <div className="text-base font-medium text-slate-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-400" /> {host?.institute || 'Not specified'}
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Location</span>
                <div className="text-base font-medium text-slate-900">{host?.city || 'Not specified'}</div>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Website</span>
                <div>
                  {host?.website ? <a className="text-blue-600 hover:underline font-medium" href={host.website} target="_blank" rel="noreferrer">{host.website}</a> : <span className="text-slate-400">Not available</span>}
                </div>
              </div>
            </div>
            {host?.bio && (
              <div className="mt-8 pt-6 border-t border-slate-100">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-3">Bio</span>
                <div className="text-slate-600 leading-relaxed whitespace-pre-line text-base">
                  {host.bio}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {detailOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <EventDetailModal
            event={selectedEvent}
            isOpen={detailOpen}
            onClose={() => { closeDetails(); }}
            user={user}
            onRegister={registerForEvent}
            onBookmark={toggleBookmark}
            {...(!isOwnHost ? { onSubscribe: () => toggleSubscribe() } : {})}
            onNavigateToReview={(eventId) => { closeDetails(); navigate(`/review/${eventId}`); }}
            onDownloadCertificate={() => toast.info('Coming soon')}
            isRegistered={registrations.some(r => r.eventId === (selectedEvent?._id))}
            isBookmarked={bookmarks.includes(selectedEvent?._id)}
            isSubscribed={isOwnHost ? false : isSubscribed}
          />
        </div>
      )}
      {scannerOpen && (
        <QRCodeScanner
          onScanSuccess={handleScanSuccess}
          onClose={() => setScannerOpen(false)}
        />
      )}
    </div>
  );
}
