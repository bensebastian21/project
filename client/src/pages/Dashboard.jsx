// src/pages/Dashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../utils/api";
import {
  Search,
  Calendar,
  MapPin,
  Bookmark,
  BookmarkCheck,
  BellRing,
  Star,
  Trophy,
  Building2,
  Layers,
  LogOut,
  UserCircle2,
  CheckCircle,
  MessageSquare,
  FileText,
  UserPen,
  ShieldCheck,
  ImagePlus,
} from "lucide-react";
import config from "../config";
import PaymentModal from "../components/PaymentModal";
import EventDetailModal from "../components/EventDetailModal";

const STORAGE = {
  registrations: "student.registrations",
  bookmarks: "student.bookmarks",
  subscriptions: "student.subscriptions",
  subscriptionsMeta: "student.subscriptions.meta", // hostId -> lastSeenCreatedAt (ms)
  notifications: "student.notifications",
  feedbacks: "student.feedbacks",
};

const loadLS = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (_) {
    return fallback;
  }
};
const saveLS = (key, value) => localStorage.setItem(key, JSON.stringify(value));

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [events, setEvents] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [activeTab, setActiveTab] = useState("Explore"); // Explore | MyRegs | Bookmarks | SubscribedHosts | Notifications
  const [subscribedHosts, setSubscribedHosts] = useState([]);

  // Start empty; load user-scoped values once user is known
  const [registrations, setRegistrations] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [subsMeta, setSubsMeta] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventDetailModalOpen, setEventDetailModalOpen] = useState(false);
  const [selectedEventForDetail, setSelectedEventForDetail] = useState(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [profilePic, setProfilePic] = useState(null);

  // Normalize notifications to include read flag on first load
  useEffect(() => {
    const needsNormalization = (notifications || []).some(n => typeof n.read !== "boolean");
    if (needsNormalization) {
      setNotifications((prev) =>
        (prev || []).map((n) => (typeof n.read === "boolean" ? n : { ...n, read: false }))
      );
    }
  }, []); // Run only once on mount

  // Derived unread count
  const unreadCount = useMemo(
    () => (notifications || []).filter((n) => !n.read).length,
    [notifications]
  );

  // Mark as read helpers
  const markNotifRead = (idx) => {
    setNotifications((prev) => {
      const copy = [...prev];
      if (copy[idx]) copy[idx] = { ...copy[idx], read: true };
      return copy;
    });
  };

  const markAllNotifRead = () => {
    setNotifications((prev) => (prev || []).map((n) => ({ ...n, read: true })));
  };

  const navigate = useNavigate();

  // Ensure user email & phone are verified; if not, navigate to Profile
  const ensureVerified = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return false;
      const { data } = await api.get("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
      if (!data?.emailVerified || !data?.phoneVerified) {
        toast.info("Please verify your email and phone to continue");
        navigate("/profile");
        return false;
      }
      return true;
    } catch (e) {
      return false;
    }
  };

  // Navigate to review page
  const navigateToReview = (eventId) => {
    navigate(`/review/${eventId}`);
  };

  // Fetch public events
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    setUser(storedUser ? JSON.parse(storedUser) : null);

    const fetchEvents = async () => {
      try {
        const res = await api.get("/api/host/public/events");
        setEvents(res.data || []);
      } catch (e) {
        toast.error("Failed to load events");
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();

    // Poll for new events every 60s
    const interval = setInterval(fetchEvents, 60000);
    return () => clearInterval(interval);
  }, []);

  // Helpers to scope keys per user (by email). If user unknown, use base keys.
  const userKey = (base) => {
    const email = user?.email || null;
    return email ? `${base}:${email}` : base;
  };

  // Load scoped values when user changes (e.g., on login)
  useEffect(() => {
    // When user logs in, load their scoped data; if no user, keep defaults
    const scopedRegs = loadLS(userKey(STORAGE.registrations), []);
    const scopedBookmarks = loadLS(userKey(STORAGE.bookmarks), []);
    const scopedSubs = loadLS(userKey(STORAGE.subscriptions), []);
    const scopedMeta = loadLS(userKey(STORAGE.subscriptionsMeta), {});
    const scopedNotifs = loadLS(userKey(STORAGE.notifications), []);
    const scopedFeedbacks = loadLS(userKey(STORAGE.feedbacks), []);
    setRegistrations(Array.isArray(scopedRegs) ? scopedRegs : []);
    setBookmarks(Array.isArray(scopedBookmarks) ? scopedBookmarks : []);
    setSubscriptions(Array.isArray(scopedSubs) ? scopedSubs : []);
    setSubsMeta(scopedMeta && typeof scopedMeta === 'object' ? scopedMeta : {});
    setNotifications(Array.isArray(scopedNotifs) ? scopedNotifs : []);
    setFeedbacks(Array.isArray(scopedFeedbacks) ? scopedFeedbacks : []);
  }, [user]);

  // After user is known, sync registrations from server (source of truth)
  useEffect(() => {
    const sync = async () => {
      try {
        if (!user) return;
        const token = localStorage.getItem("token");
        if (!token) return;
        const { data } = await api.get("/api/host/public/my-registrations", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const serverRegs = (Array.isArray(data) ? data : []).map((r) => ({
          eventId: r.eventId,
          title: r.title,
          at: Date.now(),
        }));
        setRegistrations(serverRegs);
      } catch (e) {
        // Non-fatal; keep local values if server fetch fails
        console.warn("Registrations sync failed:", e?.response?.data || e?.message || e);
      }
    };
    sync();
    // Only when user changes
  }, [user]);

  // Fetch profile pic for UI
  useEffect(() => {
    const fetchProfilePic = async () => {
      try {
        const token = localStorage.getItem("token");
        if (token && user) {
          const { data } = await api.get("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
          setProfilePic(data.profilePic);
        }
      } catch (e) {
        // ignore
      }
    };
    if (user) fetchProfilePic();
  }, [user]);

  // Persist local states (scoped per user)
  useEffect(() => saveLS(userKey(STORAGE.registrations), registrations), [registrations, user]);
  useEffect(() => saveLS(userKey(STORAGE.bookmarks), bookmarks), [bookmarks, user]);
  useEffect(() => saveLS(userKey(STORAGE.subscriptions), subscriptions), [subscriptions, user]);
  useEffect(() => saveLS(userKey(STORAGE.subscriptionsMeta), subsMeta), [subsMeta, user]);
  useEffect(() => saveLS(userKey(STORAGE.notifications), notifications), [notifications, user]);
  useEffect(() => saveLS(userKey(STORAGE.feedbacks), feedbacks), [feedbacks, user]);

  // Load subscribed host details when subscriptions change (local storage driven)
  useEffect(() => {
    const loadHosts = async () => {
      try {
        if (!subscriptions || subscriptions.length === 0) {
          setSubscribedHosts([]);
          return;
        }
        const isValidId = (s) => typeof s === "string" && /^[a-f\d]{24}$/i.test(s);
        const filtered = Array.from(new Set((subscriptions || []).filter(isValidId)));
        if (filtered.length === 0) {
          setSubscribedHosts([]);
          return;
        }
        const uniqueIds = filtered.join(",");
        const res = await api.get(`/api/auth/hosts/by-ids?ids=${encodeURIComponent(uniqueIds)}`);
        setSubscribedHosts(Array.isArray(res.data) ? res.data : []);
      } catch (e) {
        console.error(e);
        toast.error("Failed to load subscribed hosts");
        setSubscribedHosts([]);
      }
    };
    loadHosts();
  }, [subscriptions]);

  const handleLogout = () => {
    // Clear all student-local cached data to prevent leaking between accounts
    const KEYS = [
      "student.registrations",
      "student.bookmarks",
      "student.subscriptions",
      "student.subscriptions.meta",
      "student.notifications",
      "student.feedbacks",
    ];
    KEYS.forEach((k) => localStorage.removeItem(k));
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/");
  };

  // Derived lists
  const filteredEvents = useMemo(() => {
    let data = events.filter((e) => e.isPublished !== false);
    if (category !== "All") data = data.filter((e) => (e.category || "").toLowerCase() === category.toLowerCase());
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (e) => (e.title || "").toLowerCase().includes(q) || (e.location || "").toLowerCase().includes(q) || (e.shortDescription || e.description || "").toLowerCase().includes(q)
      );
    }
    return data.sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [events, category, search]);

  const myEvents = useMemo(() => {
    const ids = new Set(registrations.map((r) => r.eventId));
    return events.filter((e) => ids.has(e._id));
  }, [events, registrations]);

  const bookmarked = useMemo(() => {
    const ids = new Set(bookmarks);
    return events.filter((e) => ids.has(e._id));
  }, [events, bookmarks]);

  // Actions
  const registerEvent = async (event) => {
    if (!user) return toast.error("Please login to register");
    if (registrations.find((r) => r.eventId === event._id)) return toast.info("Already registered");
    const ok = await ensureVerified();
    if (!ok) return;
    
    if ((event.price || 0) > 0) {
      // Paid registration → Show custom payment modal
      setSelectedEvent(event);
      setPaymentModalOpen(true);
    } else {
      // Free registration
      handleFreeRegistration(event);
    }
  };

  const handleFreeRegistration = async (event) => {
    try {
      const token = localStorage.getItem("token");
      await api.post(`/api/host/public/events/${event._id}/register`, {}, { headers: { Authorization: `Bearer ${token}` } });
      const entry = { eventId: event._id, title: event.title, at: Date.now() };
      setRegistrations((prev) => [...prev, entry]);
      setNotifications((prev) => [{ type: "registration", message: `Registered for ${event.title}`, at: Date.now(), eventId: event._id, read: false }, ...prev]);
      toast.success("Registered successfully");
    } catch (e) {
      toast.error(e?.response?.data?.error || "Registration failed");
    }
  };

  const handlePaymentSuccess = async () => {
    // PaymentModal already processed payment + registration via payForEvent
    try {
      const event = selectedEvent;
      if (event) {
        // Optimistically add to local registrations
        const entry = { eventId: event._id, title: event.title, at: Date.now() };
        setRegistrations((prev) => (prev.some(r => r.eventId === event._id) ? prev : [...prev, entry]));
        setNotifications((prev) => [{ type: "registration", message: `Registered for ${event.title}`, at: Date.now(), eventId: event._id, read: false }, ...prev]);
      }
      // Also sync from server to ensure consistency
      const token = localStorage.getItem("token");
      if (token) {
        const { data } = await api.get("/api/host/public/my-registrations", { headers: { Authorization: `Bearer ${token}` } });
        const serverRegs = (Array.isArray(data) ? data : []).map((r) => ({ eventId: r.eventId, title: r.title, at: Date.now() }));
        setRegistrations(serverRegs);
      }
      toast.success("Payment successful and registered");
    } catch (e) {
      // Non-fatal; UI already updated optimistically
      console.warn("Post-payment sync failed:", e?.response?.data || e?.message || e);
    } finally {
      setPaymentModalOpen(false);
      setSelectedEvent(null);
    }
  };

  const handlePaymentError = (error) => {
    console.error("Payment error:", error);
    toast.error("Payment failed. Please try again.");
  };

  const handlePaymentCancel = () => {
    setPaymentModalOpen(false);
    setSelectedEvent(null);
  };

  const handleViewMore = (event) => {
    setSelectedEventForDetail(event);
    setEventDetailModalOpen(true);
  };

  const handleEventDetailClose = () => {
    setEventDetailModalOpen(false);
    setSelectedEventForDetail(null);
  };

  const handleRegisterFromDetail = async (event) => {
    if (!user) return toast.error("Please login to register");
    if (registrations.find((r) => r.eventId === event._id)) return toast.info("Already registered");
    
    if ((event.price || 0) > 0) {
      // Close event detail modal and open payment modal
      setEventDetailModalOpen(false);
      setSelectedEvent(event);
      setPaymentModalOpen(true);
    } else {
      // Free registration
      await handleFreeRegistration(event);
    }
  };

  const toggleBookmark = async (event) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return toast.error("Please login to bookmark events");
      const ok = await ensureVerified();
      if (!ok) return;

      const isCurrentlyBookmarked = bookmarks.includes(event._id);
      
      if (isCurrentlyBookmarked) {
        // Remove bookmark
        await api.delete(`/api/bookmarks/${event._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setBookmarks((prev) => prev.filter((id) => id !== event._id));
        toast("Removed bookmark");
      } else {
        // Add bookmark
        await api.post("/api/bookmarks", 
          { eventId: event._id }, 
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        setBookmarks((prev) => [event._id, ...prev]);
        toast.success("Bookmarked");
      }
    } catch (error) {
      console.error("Bookmark toggle error:", error);
      toast.error(error.response?.data?.error || "Failed to update bookmark");
    }
  };

  const subscribeHost = async (event) => {
    const hostId = event.hostId;
    // Only allow valid ObjectId-like IDs
    if (!hostId || !/^[a-f\d]{24}$/i.test(String(hostId))) {
      console.error("Invalid host ID:", hostId);
      return toast.error("Unable to subscribe: invalid host ID");
    }
    const ok = await ensureVerified();
    if (!ok) return;
    // Local-only subscribe flow (no backend subscriptions API)
    if (subscriptions.includes(hostId)) return toast.info("Already subscribed to this host");
    setSubscriptions((prev) => [hostId, ...prev]);
    // Initialize last-seen to now so old events don't trigger notifications
    setSubsMeta((prev) => ({ ...prev, [hostId]: Date.now() }));
    setNotifications((prev) => [{ 
      type: "subscribe", 
      message: `Subscribed for updates from this host`, 
      at: Date.now(), 
      hostId, 
      read: false 
    }, ...prev]);
    toast.success("Subscribed to host updates");
  };

  const submitFeedback = (event, rating, comment) => {
    if (!user) return toast.error("Please login to submit feedback");
    const entry = { eventId: event._id, rating, comment, at: Date.now() };
    setFeedbacks((prev) => [entry, ...prev]);
    toast.success("Feedback saved");
  };

  const downloadCertificate = (event) => {
    if (!event.isCompleted) return toast.error("Certificate available after event completion");
    const hasReg = registrations.find((r) => r.eventId === event._id);
    if (!hasReg) return toast.error("Register to get a certificate");
    const blob = new Blob([
      `Certificate of Participation\n\nThis certifies that ${user?.fullname || user?.username || "Student"}\nattended: ${event.title}\nDate: ${new Date(event.date).toLocaleString()}`,
    ], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${event.title}-certificate.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isBookmarked = (id) => bookmarks.includes(id);
  const isRegistered = (id) => registrations.some((r) => r.eventId === id);

  // Notify on new events from subscribed hosts
  useEffect(() => {
    if (!events.length || !subscriptions.length) return;
    const newMeta = { ...subsMeta };
    let hasChanges = false;

    events.forEach((ev) => {
      const hostId = ev.hostId;
      if (!hostId) return;
      if (!subscriptions.includes(hostId)) return;
      const createdAtMs = ev.createdAt ? new Date(ev.createdAt).getTime() : (ev.date ? new Date(ev.date).getTime() : 0);
      const lastSeen = newMeta[hostId] || 0;
      if (createdAtMs > lastSeen) {
        // New event detected for this host
        setNotifications((prev) => [{ type: "new_event", message: `New event from your subscribed host: ${ev.title}`, at: Date.now(), eventId: ev._id, hostId, read: false }, ...prev]);
        newMeta[hostId] = Math.max(createdAtMs, Date.now());
        hasChanges = true;
      }
    });

    if (hasChanges) setSubsMeta(newMeta);
  }, [events, subscriptions]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0b0c] text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0b0c] text-white flex">
      {/* Sidebar */}
      <aside className="w-72 bg-[#0e0e10] border-r border-[#1f1f22] flex flex-col p-6 sticky top-0 h-screen">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-yellow-500 to-yellow-300 flex items-center justify-center shadow-[0_0_20px_rgba(234,179,8,0.25)]">
            <Layers className="w-6 h-6 text-black" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Student</h2>
            <p className="text-xs text-gray-400">Explore & Register</p>
          </div>
          </div>

        <nav className="space-y-2 flex-1">
          {[
            { id: "Explore", label: "Explore Events" },
            { id: "MyRegs", label: "My Registrations" },
            { id: "Bookmarks", label: "Bookmarks" },
            { id: "SubscribedHosts", label: "Subscribed Hosts" },
            { id: "Notifications", label: "Notifications" },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                activeTab === id ? "bg-yellow-500 text-black font-semibold" : "bg-[#151518] text-gray-300 hover:bg-[#1b1b20]"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        {/* User info card removed as requested */}
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8">
        {/* Top controls */}
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search events, venues, descriptions..."
              className="w-full pl-10 pr-4 py-3 bg-[#0e0e10] border border-[#2a2a30] rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-gray-200 placeholder:text-gray-500"
            />
          </div>
          <div className="flex items-center gap-2 relative">
            <button
              onClick={() => {
                /* Trigger search explicitly (filtering already reacts to inputs) */
                setSearch((s) => s.trim());
              }}
              className="px-3 py-2 rounded-lg bg-yellow-500 text-black hover:bg-yellow-400 border border-yellow-400"
            >
              Search
            </button>
            <button
              onClick={() => setCategoriesOpen((o) => !o)}
              className="px-3 py-2 rounded-lg border bg-[#0e0e10] text-gray-300 border-[#2a2a30] hover:bg-[#151518]"
            >
              Categories
            </button>
            {categoriesOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-[#0e0e10] border border-[#2a2a30] rounded-lg shadow-lg z-50">
                {(["All", ...Array.from(new Set((events || []).map(e => (e.category || 'Uncategorized').trim())))]).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setCategory(cat);
                      setCategoriesOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-[#151518] ${
                      category === cat ? "text-yellow-400" : "text-gray-300"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

          {/* Profile + Notifications (top-right) */}
        <div className="flex justify-end mb-4 gap-3 relative z-40">
          <div className="relative">
            <button
              onClick={() => setProfileMenuOpen((prev) => !prev)}
              className="flex items-center gap-2 p-2 rounded-lg bg-[#0e0e10] border border-[#2a2a30] hover:bg-[#151518]"
              aria-label="Profile"
              title="Profile menu"
            >
              {profilePic ? (
                <img src={`http://localhost:5000/${profilePic}`} alt="Profile" className="w-5 h-5 rounded-full object-cover" />
              ) : (
                <UserCircle2 className="w-5 h-5 text-yellow-400" />
              )}
              {user?.fullname && (
                <span className="text-sm text-gray-300 max-w-[120px] truncate">
                  {user.fullname}
                </span>
              )}
            </button>

            {profileMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-[#0e0e10] border border-[#2a2a30] rounded-lg shadow-lg z-50">
                <div className="flex items-center gap-3 px-3 py-3 border-b border-[#2a2a30]">
                  <div className="w-10 h-10 rounded-full bg-[#151518] border border-[#2a2a30] flex items-center justify-center overflow-hidden">
                    {profilePic ? (
                      <img src={`http://localhost:5000/${profilePic}`} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <UserCircle2 className="w-6 h-6 text-yellow-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-200 truncate">{user?.fullname || "Guest"}</p>
                    <p className="text-xs text-gray-500 truncate">{user?.email || "No email"}</p>
                  </div>
                </div>

                <div className="py-2">
                  <button
                    onClick={() => {
                      setProfileMenuOpen(false);
                      navigate("/profile?tab=view");
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-[#151518]"
                  >
                    <FileText className="w-4 h-4 text-yellow-400" />
                    View Profile
                  </button>

                  <button
                    onClick={() => {
                      setProfileMenuOpen(false);
                      navigate("/profile?tab=update");
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-[#151518]"
                  >
                    <UserPen className="w-4 h-4 text-yellow-400" />
                    Update Profile Info
                  </button>

                  <button
                    onClick={() => {
                      setProfileMenuOpen(false);
                      navigate("/profile?tab=otp");
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-[#151518]"
                  >
                    <ShieldCheck className="w-4 h-4 text-yellow-400" />
                    Verify Credentials
                  </button>

                  <button
                    onClick={() => {
                      setProfileMenuOpen(false);
                      navigate("/profile?tab=photo");
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-[#151518]"
                  >
                    <ImagePlus className="w-4 h-4 text-yellow-400" />
                    Change Profile Photo
                  </button>
                </div>

                <div className="border-t border-[#2a2a30] py-2">
                  <button
                    onClick={() => {
                      setProfileMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-[#151518]"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => setNotifOpen((o) => !o)}
              className="relative p-2 rounded-lg bg-[#0e0e10] border border-[#2a2a30] hover:bg-[#151518]"
              aria-label="Notifications"
              title="Notifications"
            >
              <BellRing className="w-5 h-5 text-yellow-400" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1.5">
                  {unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-2 w-96 max-h-96 overflow-auto bg-[#0e0e10] border border-[#2a2a30] rounded-lg shadow-lg z-50">
                <div className="flex items-center justify-between px-3 py-2 border-b border-[#2a2a30]">
                  <span className="text-sm text-gray-300">Notifications</span>
                  <div className="space-x-2">
                    <button onClick={markAllNotifRead} className="text-xs text-blue-400 hover:underline">
                      Mark all read
                    </button>
                  </div>
                </div>
                <div className="divide-y divide-[#2a2a30]">
                  {(notifications || []).length === 0 ? (
                    <div className="p-3 text-sm text-gray-400">No notifications</div>
                  ) : (
                    notifications.map((n, idx) => (
                      <div key={idx} className="p-3 flex items-start gap-3">
                        <div className={`w-2 h-2 rounded-full mt-2 ${n.read ? "bg-gray-600" : "bg-yellow-400"}`} />
                        <div className="flex-1">
                          <div className="text-sm text-gray-200">{n.message}</div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {new Date(n.at).toLocaleString()}
                          </div>
                        </div>
                        {!n.read && (
                          <button
                            onClick={() => markNotifRead(idx)}
                            className="text-xs text-blue-400 hover:underline"
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
        </div>

        {activeTab === "Explore" && (
          <div className="space-y-6">
            {filteredEvents.length === 0 ? (
              <div className="text-gray-400">No events found.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEvents.map((e) => (
                  <div key={e._id} className="rounded-xl p-5 border border-[#2a2a30] bg-gradient-to-br from-[#121214] to-[#0e0e10] hover:border-yellow-500/40 transition-all shadow-[0_0_20px_rgba(0,0,0,0.25)]">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="text-lg font-semibold line-clamp-2 text-white">{e.title}</h3>
                      <button onClick={() => toggleBookmark(e)} className="text-yellow-400 hover:text-yellow-300">
                        {isBookmarked(e._id) ? <BookmarkCheck className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
                      </button>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                      <Calendar className="w-4 h-4 text-yellow-400" />
                      <span>{new Date(e.date).toLocaleString()}</span>
                      {e.isCompleted && <span className="ml-auto flex items-center gap-1 text-green-400"><CheckCircle className="w-3 h-3" /> Completed</span>}
                    </div>
                    <p className="text-gray-300 text-sm mb-3 line-clamp-2">{e.shortDescription || e.description}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
                      <MapPin className="w-4 h-4 text-yellow-400" />
                      <span>{e.isOnline ? "Online" : e.location || "TBA"}</span>
                      {e.category && <span className="px-2 py-0.5 rounded bg-[#151518] border border-[#2a2a30] ml-auto text-gray-300">{e.category}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleViewMore(e)}
                        className="flex-1 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                      >
                        View More
                      </button>
                      <button
                        onClick={() => subscribeHost(e)}
                        className="px-3 py-2 rounded-lg bg-[#151518] hover:bg-[#1b1b20] border border-[#2a2a30] text-gray-300"
                        title="Subscribe to host updates"
                      >
                        <Building2 className="w-5 h-5 text-yellow-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "MyRegs" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white">My Registered Events</h2>
            {myEvents.length === 0 ? (
              <div className="text-gray-400">No registrations yet.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myEvents.map((e) => (
                  <div key={e._id} className="rounded-xl p-5 border border-[#2a2a30] bg-[#0e0e10]">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="text-lg font-semibold line-clamp-2 text-white">{e.title}</h3>
                      {e.isCompleted && <span className="text-green-400 text-xs border border-green-700 px-2 py-0.5 rounded">Completed</span>}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                      <Calendar className="w-4 h-4 text-yellow-400" />
                      <span>{new Date(e.date).toLocaleString()}</span>
                    </div>
                    <div className="space-y-2">
                      <button 
                        onClick={() => downloadCertificate(e)} 
                        disabled={!e.isCompleted}
                        className={`w-full px-3 py-2 rounded-lg ${e.isCompleted ? "bg-yellow-500 text-black hover:bg-yellow-400" : "bg-gray-700/50 cursor-not-allowed opacity-60"}`}
                      >
                        Download Certificate
                      </button>
                      {e.isCompleted && (
                        <button 
                          onClick={() => navigateToReview(e._id)} 
                          className="w-full px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center space-x-2"
                        >
                          <MessageSquare className="w-4 h-4" />
                          <span>Write Review</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "Bookmarks" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white">Bookmarked Events</h2>
            {bookmarked.length === 0 ? (
              <div className="text-gray-400">No bookmarks yet.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {bookmarked.map((e) => (
                  <div key={e._id} className="rounded-xl p-5 border border-[#2a2a30] bg-[#0e0e10]">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="text-lg font-semibold line-clamp-2 text-white">{e.title}</h3>
                      <button onClick={() => toggleBookmark(e)} className="text-yellow-400">
                        <BookmarkCheck className="w-5 h-5" />
          </button>
                    </div>
                    <p className="text-gray-300 text-sm mb-3 line-clamp-2">{e.shortDescription || e.description}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                      <Calendar className="w-4 h-4 text-yellow-400" />
                      <span>{new Date(e.date).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleViewMore(e)} className="flex-1 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors">View More</button>
                      <button onClick={() => setActiveTab("Explore")} className="px-3 py-2 rounded-lg bg-[#151518] hover:bg-[#1b1b20] border border-[#2a2a30]">Explore</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "SubscribedHosts" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white">Subscribed Hosts</h2>
            {(!subscribedHosts || subscribedHosts.length === 0) ? (
              <div className="text-gray-400">You haven't subscribed to any hosts yet.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {subscribedHosts.map((h) => (
                  <div key={h._id} className="rounded-xl p-5 border border-[#2a2a30] bg-[#0e0e10]">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{h.fullname || h.username}</h3>
                        <p className="text-xs text-gray-400">{h.email}</p>
                      </div>
                      <Building2 className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div className="text-sm text-gray-300 mb-4">
                      {(h.institute || h.city) ? (
                        <span>{[h.institute, h.city].filter(Boolean).join(" • ")}</span>
                      ) : (
                        <span>Host</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSubscriptions((prev) => prev.filter((id) => id !== h._id));
                          setNotifications((prev) => [{ type: "unsubscribe", message: `Unsubscribed from ${h.fullname || h.username}`, at: Date.now(), hostId: h._id }, ...prev]);
                          toast("Unsubscribed");
                        }}
                        className="flex-1 px-3 py-2 rounded-lg bg-[#151518] hover:bg-[#1b1b20] border border-[#2a2a30] text-gray-300"
                      >
                        Unsubscribe
                      </button>
                      <button
                        onClick={() => setActiveTab("Explore")}
                        className="px-3 py-2 rounded-lg bg-yellow-500 text-black hover:bg-yellow-400"
                      >
                        View Events
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "Notifications" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white">Notifications & Reminders</h2>
            {notifications.length === 0 ? (
              <div className="text-gray-400">No notifications yet.</div>
            ) : (
              <div className="space-y-3">
                {notifications.slice(0, 50).map((n, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-[#0e0e10] border border-[#2a2a30] rounded-lg p-3">
                    <BellRing className="w-4 h-4 text-yellow-400" />
                    <div className="flex-1">
                      <p className="text-sm text-white">{n.message}</p>
                      <p className="text-xs text-gray-400">{new Date(n.at).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
        </div>
      )}
          </div>
        )}

        {/* Payment Modal */}
        <PaymentModal
          isOpen={paymentModalOpen}
          onClose={handlePaymentCancel}
          event={selectedEvent}
          user={user}
          onSuccess={handlePaymentSuccess}
          onError={handlePaymentError}
          onCancel={handlePaymentCancel}
        />

        {/* Event Detail Modal */}
        <EventDetailModal
          event={selectedEventForDetail}
          isOpen={eventDetailModalOpen}
          onClose={handleEventDetailClose}
          user={user}
          onRegister={handleRegisterFromDetail}
          onBookmark={toggleBookmark}
          onSubscribe={subscribeHost}
          onNavigateToReview={navigateToReview}
          onDownloadCertificate={downloadCertificate}
          isRegistered={(id) => registrations.some((r) => r.eventId === id)}
          isBookmarked={isBookmarked}
        />
      </main>
    </div>
  );
}
