import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../utils/api";
import config from "../config";
import { GamifiedEventCard } from "../components/GamifiedComponents";
import EventDetailModal from "../components/EventDetailModal";
import { payForEvent } from "../utils/openRazorpay";
import { Users, Building2, ArrowLeft, Search, CheckCircle, Link as LinkIcon, Camera } from "lucide-react";

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

  useEffect(()=>{ const u=localStorage.getItem("user"); setUser(u?JSON.parse(u):null); },[]);

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
          } catch {}
          try {
            const regs = await api.get("/api/host/public/my-registrations", { headers: { Authorization: `Bearer ${token}` } });
            const mapped = (regs.data || []).map(r=>({ eventId: r.eventId }));
            setRegistrations(mapped);
          } catch {}
        }
        try { const raw = localStorage.getItem("student.bookmarks"); setBookmarks(raw? JSON.parse(raw): []); } catch {}
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
    return list.filter(e => [e.title, e.location, e.category, ...(Array.isArray(e.tags)?e.tags:[])]
      .filter(Boolean)
      .map(String)
      .map(s => s.toLowerCase())
      .some(t => t.includes(query)));
  }, [events, q]);

  const isSubscribed = useMemo(() => (subscribedHosts || []).some(h => String(h._id || h) === String(hostId)), [subscribedHosts, hostId]);
  const upcomingEvents = useMemo(() => (events||[]).filter(e => new Date(e.date) > new Date()).sort((a,b)=> new Date(a.date)-new Date(b.date)).slice(0,6), [events]);
  const recentEvents = useMemo(() => (events||[]).filter(e => new Date(e.date) <= new Date()).sort((a,b)=> new Date(b.date)-new Date(a.date)).slice(0,6), [events]);
  const eventsByCategory = useMemo(() => {
    const map = {};
    (events||[]).forEach(e => {
      const cat = e.category || 'Other';
      if (!map[cat]) map[cat] = [];
      map[cat].push(e);
    });
    // sort each category by date desc and cap
    Object.keys(map).forEach(k => map[k] = map[k].sort((a,b)=> new Date(b.date)-new Date(a.date)).slice(0,6));
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
        setSubscribedHosts(prev => prev.filter(h => String(h._id||h) !== String(hostId)));
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

  const registerForEvent = async (event) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) { toast.error("Please login to register"); navigate("/login"); return false; }
      const ok = await ensureVerified(); if (!ok) return false;
      if ((event.price||0) > 0) {
        await payForEvent({ event, user });
        setRegistrations(prev => prev.some(r=>r.eventId===event._id) ? prev : [{ eventId: event._id }, ...prev]);
        toast.success("Payment successful and registered");
      } else {
        await api.post(`/api/host/public/events/${event._id}/register`, {}, { headers: bearer() });
        setRegistrations(prev => prev.some(r=>r.eventId===event._id) ? prev : [{ eventId: event._id }, ...prev]);
        toast.success("Registered successfully");
      }
      return true;
    } catch (e) { toast.error(e?.response?.data?.error || "Failed to register"); return false; }
  };

  const openDetails = (event) => { setSelectedEvent(event); setDetailOpen(true); };
  const closeDetails = () => { setDetailOpen(false); setSelectedEvent(null); };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-300 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-700 text-xl">Loading host page...</p>
        </div>

      {/* Floating mobile Edit button */}
      {isOwnHost && !editMode && (
        <button
          onClick={startEdit}
          className="fixed md:hidden bottom-4 right-4 z-50 inline-flex items-center gap-2 px-4 py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
          aria-label="Edit Profile"
        >
          <Camera className="w-4 h-4" /> Edit Profile
        </button>
      )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      {/* Channel cover/banner */}
      <div className="relative w-full h-40 md:h-56 bg-gradient-to-r from-blue-600 to-purple-600">
        { (editMode ? draft?.bannerUrl : host?.bannerUrl) && (
          <img src={editMode ? draft.bannerUrl : host.bannerUrl} alt="Banner" className="w-full h-full object-cover" />
        )}
        {/* Readability overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/0 to-black/40 pointer-events-none" />
        {isOwnHost && editMode && (
          <label className="absolute bottom-3 right-3 inline-flex items-center gap-2 px-3 py-2 bg-black/60 hover:bg-black/70 text-white rounded-lg text-xs cursor-pointer">
            <Camera className="w-4 h-4" /> Change banner
            <input type="file" accept="image/*" className="hidden" onChange={(e)=> uploadImage('banner', e.target.files?.[0])} />
          </label>
        )}
      </div>

      {/* Channel header */}
      <div className="max-w-6xl mx-auto px-4 mt-4 md:mt-6">
        <div className="flex items-start gap-4 md:gap-6">
          {/* Avatar */}
          <div className="relative w-20 h-20 md:w-28 md:h-28 rounded-full overflow-hidden ring-4 ring-[#0f0f0f] bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
            {(editMode ? draft?.profilePic : host?.profilePic) ? (
              <img src={editMode ? draft.profilePic : host.profilePic} alt={host?.fullname||'Host'} className="w-full h-full object-cover" />
            ) : (
              <Users className="w-10 h-10 md:w-14 md:h-14 text-white" />
            )}
            {isOwnHost && editMode && (
              <label className="absolute bottom-1 right-1 inline-flex items-center gap-1 px-2 py-1 bg-black/60 hover:bg-black/70 text-white rounded text-[10px] cursor-pointer">
                <Camera className="w-3 h-3" /> Change
                <input type="file" accept="image/*" className="hidden" onChange={(e)=> uploadImage('profile', e.target.files?.[0])} />
              </label>
            )}
          </div>
          {/* Meta */}
          <div className="flex-1">
            <div className="flex items-center gap-2 md:gap-3">
              {isOwnHost && editMode ? (
                <div className="flex-1">
                  <input
                    value={draft.fullname}
                    onChange={(e)=> handleDraftChange('fullname', e.target.value)}
                    onFocus={()=> handleEditFocus('fullname')}
                    className="w-full text-2xl md:text-4xl font-extrabold tracking-tight bg-transparent border-b border-white/20 focus:outline-none"
                  />
                  {editTouched.fullname && editErrors.fullname && (
                    <p className="text-red-400 text-sm mt-1">{editErrors.fullname}</p>
                  )}
                </div>
              ) : (
                <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight">{host?.fullname || host?.username || "Host"}</h1>
              )}
              <CheckCircle className="w-5 h-5 md:w-6 md:h-6 text-blue-400" />
            </div>
            <div className="text-sm md:text-base text-gray-300 mt-1 flex items-center gap-2">
              <span>@{(host?.username || (host?.fullname||"").replace(/\s+/g,'').toLowerCase())}</span>
              <span>•</span>
              <span>{hostEvents.length} events</span>
              {typeof host?.subscribersCount === 'number' && (
                <>
                  <span>•</span>
                  <span>{host.subscribersCount.toLocaleString()} subscribers</span>
                </>
              )}
              {host?.institute && (
                <>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1"><Building2 className="w-4 h-4" /> {host.institute}</span>
                </>
              )}
            </div>

            <div className="mt-3 flex items-center gap-2">
              <button onClick={()=>{
                // Check if user came from student dashboard and navigate back to appropriate section
                const user = JSON.parse(localStorage.getItem("user") || "null");
                if (user?.role === "student") {
                  // Check if user came from a specific dashboard section via URL state
                  const state = location.state;
                  if (state?.fromSection) {
                    // Navigate back to the specific section they came from
                    navigate(`/dashboard?tab=${state.fromSection}`);
                  } else {
                    // Default to SubscribedHosts section for students
                    navigate("/dashboard?tab=SubscribedHosts");
                  }
                } else {
                  // Fallback to browser back navigation for non-students
                  navigate(-1);
                }
              }} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-full text-sm mr-auto">Back</button>
              {isOwnHost ? (
                !editMode ? (
                  <div className="flex items-center gap-2">
                    <button onClick={startEdit} className="px-4 py-2 rounded-full text-sm font-semibold bg-white text-black">Edit</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button onClick={cancelEdit} className="px-4 py-2 rounded-full text-sm font-semibold bg-white/10 hover:bg-white/20">Cancel</button>
                    <button onClick={saveProfile} disabled={saving} className={`px-4 py-2 rounded-full text-sm font-semibold ${saving ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}>{saving ? 'Saving...' : 'Save'}</button>
                  </div>
                )
              ) : (
                <button
                  onClick={toggleSubscribe}
                  className={`px-4 py-2 rounded-full text-sm font-semibold ${isSubscribed ? 'bg-white text-black' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  {isSubscribed ? 'Unfollow' : 'Follow'}
                </button>
              )}
            </div>

            {/* Social links */}
                <div className="mt-3 text-sm text-gray-300">
              {isOwnHost && editMode ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-20 text-gray-400">Website</span>
                    <div className="flex-1">
                      <input value={draft.website} onChange={(e)=> handleDraftChange('website', e.target.value)} onFocus={()=> handleEditFocus('website')} className="w-full bg-white/10 px-3 py-2 rounded outline-none" placeholder="https://..." />
                      {editTouched.website && editErrors.website && (
                        <p className="text-red-400 text-xs mt-1">{editErrors.website}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-20 text-gray-400">Twitter</span>
                    <div className="flex-1">
                      <input value={draft.socials.twitter} onChange={(e)=> handleDraftChange('twitter', e.target.value)} onFocus={()=> handleEditFocus('twitter')} className="w-full bg-white/10 px-3 py-2 rounded outline-none" placeholder="https://twitter.com/... or @handle" />
                      {editTouched.twitter && editErrors.twitter && (
                        <p className="text-red-400 text-xs mt-1">{editErrors.twitter}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-20 text-gray-400">Instagram</span>
                    <div className="flex-1">
                      <input value={draft.socials.instagram} onChange={(e)=> handleDraftChange('instagram', e.target.value)} onFocus={()=> handleEditFocus('instagram')} className="w-full bg-white/10 px-3 py-2 rounded outline-none" placeholder="https://instagram.com/... or @handle" />
                      {editTouched.instagram && editErrors.instagram && (
                        <p className="text-red-400 text-xs mt-1">{editErrors.instagram}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-20 text-gray-400">LinkedIn</span>
                    <div className="flex-1">
                      <input value={draft.socials.linkedin} onChange={(e)=> handleDraftChange('linkedin', e.target.value)} onFocus={()=> handleEditFocus('linkedin')} className="w-full bg-white/10 px-3 py-2 rounded outline-none" placeholder="https://linkedin.com/in/... or @handle" />
                      {editTouched.linkedin && editErrors.linkedin && (
                        <p className="text-red-400 text-xs mt-1">{editErrors.linkedin}</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                (host?.website || host?.socials?.twitter || host?.socials?.instagram || host?.socials?.linkedin) && (
                  <div className="flex flex-wrap items-center gap-3">
                    {host.website && <a href={host.website} target="_blank" rel="noreferrer" className="hover:underline">Website</a>}
                    {host?.socials?.twitter && <a href={host.socials.twitter} target="_blank" rel="noreferrer" className="hover:underline">Twitter</a>}
                    {host?.socials?.instagram && <a href={host.socials.instagram} target="_blank" rel="noreferrer" className="hover:underline">Instagram</a>}
                    {host?.socials?.linkedin && <a href={host.socials.linkedin} target="_blank" rel="noreferrer" className="hover:underline">LinkedIn</a>}
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        {/* Tabs (visual only) */}
        <div className="mt-6 border-b border-white/10">
          <div className="flex items-center gap-4 text-sm">
            <button onClick={()=>setActiveTab('home')} className={`px-1 pb-3 ${activeTab==='home' ? 'border-b-2 border-white font-semibold' : 'text-gray-400 hover:text-white'}`}>Home</button>
            <button onClick={()=>setActiveTab('events')} className={`px-1 pb-3 ${activeTab==='events' ? 'border-b-2 border-white font-semibold' : 'text-gray-400 hover:text-white'}`}>Events</button>
            <button onClick={()=>setActiveTab('about')} className={`px-1 pb-3 ${activeTab==='about' ? 'border-b-2 border-white font-semibold' : 'text-gray-400 hover:text-white'}`}>About</button>
            <a href={host?.website || '#'} target="_blank" rel="noreferrer" className="px-1 pb-3 inline-flex items-center gap-1 text-gray-400 hover:text-white">
              <LinkIcon className="w-4 h-4"/> Links
            </a>
          </div>
        </div>

        {/* Search within host */}
        <div className="mt-4 flex items-center gap-3">
          <div className="flex items-center bg-white/10 border border-white/10 rounded-full">
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search this host's events" className="px-3 py-2 rounded-l-full outline-none bg-transparent placeholder-gray-400"/>
            <button onClick={()=>setQ(q)} className="px-3 py-2 border-l border-white/10 hover:bg-white/10"><Search className="w-4 h-4"/></button>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto p-6">
        {activeTab==='home' && (
          <div className="space-y-8">
            {/* Upcoming Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-semibold">Upcoming</h3>
                {upcomingEvents.length > 0 && <button onClick={()=>setActiveTab('events')} className="text-sm text-blue-400 hover:underline">See all</button>}
              </div>
              {upcomingEvents.length === 0 ? (
                <div className="text-sm text-gray-400">No upcoming events.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {upcomingEvents.map(ev => (
                    <GamifiedEventCard key={ev._id} event={ev} onRegister={()=>registerForEvent(ev)} onBookmark={()=>toggleBookmark(ev)} onViewMore={()=>openDetails(ev)} isRegistered={registrations.some(r=>r.eventId===ev._id)} isBookmarked={bookmarks.includes(ev._id)} />
                  ))}
                </div>
              )}
            </div>

            {/* Recent Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-semibold">Recent</h3>
                {recentEvents.length > 0 && <button onClick={()=>setActiveTab('events')} className="text-sm text-blue-400 hover:underline">See all</button>}
              </div>
              {recentEvents.length === 0 ? (
                <div className="text-sm text-gray-400">No recent events.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {recentEvents.map(ev => (
                    <GamifiedEventCard key={ev._id} event={ev} onRegister={()=>registerForEvent(ev)} onBookmark={()=>toggleBookmark(ev)} onViewMore={()=>openDetails(ev)} isRegistered={registrations.some(r=>r.eventId===ev._id)} isBookmarked={bookmarks.includes(ev._id)} />
                  ))}
                </div>
              )}
            </div>

            {/* Categories Section */}
            <div>
              <h3 className="text-xl font-semibold mb-3">Explore by Category</h3>
              <div className="space-y-6">
                {Object.keys(eventsByCategory).slice(0,4).map(cat => (
                  <div key={cat}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-lg font-semibold">{cat}</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {eventsByCategory[cat].map(ev => (
                        <GamifiedEventCard key={ev._id} event={ev} onRegister={()=>registerForEvent(ev)} onBookmark={()=>toggleBookmark(ev)} onViewMore={()=>openDetails(ev)} isRegistered={registrations.some(r=>r.eventId===ev._id)} isBookmarked={bookmarks.includes(ev._id)} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab==='events' && (hostEvents.length === 0 ? (
          <div className="text-center py-16 bg-white/5 rounded-2xl border border-white/10">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
              <Users className="w-8 h-8 text-white/70" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No Events</h3>
            <p className="text-white/70">This host doesn't have any events yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {hostEvents.map(ev => (
              <GamifiedEventCard
                key={ev._id}
                event={ev}
                onRegister={()=>registerForEvent(ev)}
                onBookmark={()=>toggleBookmark(ev)}
                onViewMore={()=>openDetails(ev)}
                isRegistered={registrations.some(r=>r.eventId===ev._id)}
                isBookmarked={bookmarks.includes(ev._id)}
              />
            ))}
          </div>
        ))}

        {activeTab==='about' && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h3 className="text-xl font-semibold mb-4">About</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-200">
              <div><span className="text-gray-400">Name:</span> {host?.fullname || host?.username}</div>
              <div><span className="text-gray-400">Institute:</span> {host?.institute || '—'}</div>
              <div><span className="text-gray-400">City:</span> {host?.city || '—'}</div>
              <div><span className="text-gray-400">Address:</span> {host?.street ? `${host.street}, ${host.city||''} ${host.pincode||''}` : '—'}</div>
              <div className="md:col-span-2"><span className="text-gray-400">Website:</span> {host?.website ? <a className="text-blue-400 hover:underline" href={host.website} target="_blank" rel="noreferrer">{host.website}</a> : '—'}</div>
            </div>
            {host?.bio && (
              <div className="mt-4 text-sm text-gray-200 whitespace-pre-line">
                {host.bio}
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
            { ...(!isOwnHost ? { onSubscribe: () => toggleSubscribe() } : {}) }
            onNavigateToReview={(eventId)=>{ closeDetails(); navigate(`/review/${eventId}`); }}
            onDownloadCertificate={()=> toast.info('Coming soon')}
            isRegistered={registrations.some(r => r.eventId === (selectedEvent?._id))}
            isBookmarked={bookmarks.includes(selectedEvent?._id)}
            isSubscribed={isOwnHost ? false : isSubscribed}
          />
        </div>
      )}
    </div>
  );
}
