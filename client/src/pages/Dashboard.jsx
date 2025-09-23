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
} from "lucide-react";

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

  const [registrations, setRegistrations] = useState(() => loadLS(STORAGE.registrations, []));
  const [bookmarks, setBookmarks] = useState(() => loadLS(STORAGE.bookmarks, []));
  const [subscriptions, setSubscriptions] = useState(() => loadLS(STORAGE.subscriptions, []));
  const [subsMeta, setSubsMeta] = useState(() => loadLS(STORAGE.subscriptionsMeta, {}));
  const [notifications, setNotifications] = useState(() => loadLS(STORAGE.notifications, []));
  const [feedbacks, setFeedbacks] = useState(() => loadLS(STORAGE.feedbacks, []));
  const [notifOpen, setNotifOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  // Normalize notifications to include read flag on first load
  useEffect(() => {
    setNotifications((prev) =>
      (prev || []).map((n) => (typeof n.read === "boolean" ? n : { ...n, read: false }))
    );
  }, []);

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

  // Persist local states
  useEffect(() => saveLS(STORAGE.registrations, registrations), [registrations]);
  useEffect(() => saveLS(STORAGE.bookmarks, bookmarks), [bookmarks]);
  useEffect(() => saveLS(STORAGE.subscriptions, subscriptions), [subscriptions]);
  useEffect(() => saveLS(STORAGE.subscriptionsMeta, subsMeta), [subsMeta]);
  useEffect(() => saveLS(STORAGE.notifications, notifications), [notifications]);
  useEffect(() => saveLS(STORAGE.feedbacks, feedbacks), [feedbacks]);

  // Load subscribed host details when subscriptions change
  useEffect(() => {
    const loadHosts = async () => {
      try {
        if (!subscriptions || subscriptions.length === 0) {
          setSubscribedHosts([]);
          return;
        }
        const uniqueIds = Array.from(new Set(subscriptions)).join(",");
        const res = await api.get(`/api/auth/hosts/by-ids?ids=${encodeURIComponent(uniqueIds)}`);
        setSubscribedHosts(Array.isArray(res.data) ? res.data : []);
      } catch (e) {
        console.error(e);
        toast.error("Failed to load subscribed hosts");
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
  const registerEvent = (event) => {
    if (!user) return toast.error("Please login to register");
    if (registrations.find((r) => r.eventId === event._id)) return toast.info("Already registered");
    (async () => {
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
    })();
  };

  const toggleBookmark = (event) => {
    setBookmarks((prev) => {
      if (prev.includes(event._id)) {
        toast("Removed bookmark");
        return prev.filter((id) => id !== event._id);
      }
      toast.success("Bookmarked");
      return [event._id, ...prev];
    });
  };

  const subscribeHost = (event) => {
    const hostId = event.hostId || "unknown";
    if (subscriptions.includes(hostId)) return toast.info("Already subscribed to this host");
    setSubscriptions((prev) => [hostId, ...prev]);
    // Initialize last-seen to now so old events don't trigger notifications
    setSubsMeta((prev) => ({ ...prev, [hostId]: Date.now() }));
    setNotifications((prev) => [{ type: "subscribe", message: `Subscribed for updates from this host`, at: Date.now(), hostId, read: false }, ...prev]);
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

        <div className="mt-6 p-4 rounded-lg bg-[#151518] border border-[#27272b]">
          <div className="flex items-center gap-3">
            <UserCircle2 className="w-8 h-8 text-yellow-400" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.fullname || user?.username || "Guest"}</p>
              <p className="text-xs text-gray-400 truncate">{user?.email || "Not logged in"}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="mt-4 w-full px-3 py-2 rounded-lg bg-[#1f1f22] hover:bg-[#25252a] text-red-400 flex items-center gap-2 justify-center">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
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

          {/* Notifications bell */}
          <div className="flex justify-end mb-4 relative">
            <button
              onClick={() => setNotifOpen((o) => !o)}
              className="relative p-2 rounded-lg bg-[#0e0e10] border border-[#2a2a30] hover:bg-[#151518]"
              aria-label="Notifications"
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
                        onClick={() => registerEvent(e)}
                        className={`flex-1 px-3 py-2 rounded-lg ${isRegistered(e._id) ? "bg-green-600 hover:bg-green-700" : "bg-yellow-500 text-black hover:bg-yellow-400"}`}
                      >
                        {isRegistered(e._id) ? "Registered" : "Register"}
                      </button>
                      <button
                        onClick={() => subscribeHost(e)}
                        className="px-3 py-2 rounded-lg bg-[#151518] hover:bg-[#1b1b20] border border-[#2a2a30] text-gray-300"
                        title="Subscribe to host updates"
                      >
                        <Building2 className="w-5 h-5 text-yellow-400" />
                      </button>
                      {e.isCompleted && (
                        <button
                          onClick={() => navigateToReview(e._id)}
                          className="px-3 py-2 rounded-lg bg-[#151518] hover:bg-[#1b1b20] border border-[#2a2a30]"
                          title="Write a detailed review"
                        >
                          <MessageSquare className="w-5 h-5 text-blue-400" />
                        </button>
                      )}
                      <button
                        onClick={() => downloadCertificate(e)}
                        className="px-3 py-2 rounded-lg bg-[#151518] hover:bg-[#1b1b20] border border-[#2a2a30]"
                        title="Download certificate"
                      >
                        <Trophy className="w-5 h-5 text-yellow-400" />
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
                      <button onClick={() => downloadCertificate(e)} className="w-full px-3 py-2 rounded-lg bg-yellow-500 text-black hover:bg-yellow-400">Download Certificate</button>
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
                      <button onClick={() => registerEvent(e)} className="flex-1 px-3 py-2 rounded-lg bg-yellow-500 text-black hover:bg-yellow-400">{isRegistered(e._id) ? "Registered" : "Register"}</button>
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
      </main>
    </div>
  );
}
