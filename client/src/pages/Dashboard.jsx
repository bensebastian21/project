// src/pages/Dashboard.jsx - Evenite Student Dashboard
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import config from "../config";
import { toast } from "react-toastify";
import api from "../utils/api";
import EventDetailModal from "../components/EventDetailModal";
import { payForEvent } from "../utils/openRazorpay";
import {
  Search, Calendar, MapPin, Bookmark, BellRing, Trophy,
  LogOut, UserCircle2, CheckCircle, MessageSquare, FileText,
  UserPen, ShieldCheck, Award, Crown, Users, Gamepad2,
  ChevronLeft, ChevronRight, Menu, X, Home, Play, Settings,
  MoreVertical, Filter, Grid3X3, List
} from "lucide-react";
import { 
  GamifiedEventCard, AchievementBadge, LevelProgress, StatsCard, Leaderboard
} from "../components/GamifiedComponents";
import FriendsSuggestions from "../components/friends/FriendsSuggestions";
import SupportChatbot from "../components/SupportChatbot";
import FriendRequests from "../components/friends/FriendRequests";
import FriendsList from "../components/friends/FriendsList";
import UserSearch from "../components/friends/UserSearch";
import UserProfileModal from "../components/friends/UserProfileModal";
import InterestsEditor from "../components/friends/InterestsEditor";

const GAMIFICATION = {
  points: { register: 50, bookmark: 10, subscribe: 20, feedback: 30, review: 40, certificate: 100, streak: 25, firstEvent: 200, social: 15 },
  levels: [
    { level: 1, name: "Rookie", minPoints: 0, color: "#6B7280", icon: "🌱" },
    { level: 2, name: "Explorer", minPoints: 200, color: "#3B82F6", icon: "🚀" },
    { level: 3, name: "Enthusiast", minPoints: 500, color: "#8B5CF6", icon: "⭐" },
    { level: 4, name: "Expert", minPoints: 1000, color: "#F59E0B", icon: "🏆" },
    { level: 5, name: "Master", minPoints: 2000, color: "#EF4444", icon: "👑" },
    { level: 6, name: "Legend", minPoints: 5000, color: "#10B981", icon: "🌟" }
  ],
  badges: [
    { id: "first_event", name: "First Steps", description: "Attended your first event", icon: "🎯", points: 200 },
    { id: "bookmarker", name: "Curator", description: "Bookmarked 10 events", icon: "📚", points: 100 },
    { id: "social_butterfly", name: "Social Butterfly", description: "Subscribed to 5 hosts", icon: "🦋", points: 150 },
    { id: "reviewer", name: "Critic", description: "Wrote 5 reviews", icon: "✍️", points: 200 },
    { id: "streak_7", name: "Consistent", description: "7-day activity streak", icon: "🔥", points: 300 },
    { id: "certificate_collector", name: "Achiever", description: "Earned 3 certificates", icon: "🏅", points: 400 },
    { id: "early_bird", name: "Early Bird", description: "Registered for 5 events early", icon: "🐦", points: 250 },
    { id: "networker", name: "Networker", description: "Connected with 10 people", icon: "🤝", points: 300 }
  ]
};

const STORAGE = {
  registrations: "student.registrations",
  bookmarks: "student.bookmarks",
  subscriptions: "student.subscriptions",
  subscriptionsMeta: "student.subscriptions.meta",
  notifications: "student.notifications",
  feedbacks: "student.feedbacks",
  gamification: "student.gamification"
};

const loadLS = (key, fallback) => {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch (_) { return fallback; }
};
const saveLS = (key, value) => localStorage.setItem(key, JSON.stringify(value));

export default function Dashboard() {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [activeTab, setActiveTab] = useState("Explore");
  const [subscribedHosts, setSubscribedHosts] = useState([]);
  const [userStats, setUserStats] = useState({ points: 0, level: 1, badges: [], streak: 0, achievements: [], totalEvents: 0, totalBookmarks: 0, totalSubscriptions: 0, totalReviews: 0 });
  const [registrations, setRegistrations] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [isVerified, setIsVerified] = useState(false);
  const [leaderboardUsers, setLeaderboardUsers] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [navOverlayOpen, setNavOverlayOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [hostFilterId, setHostFilterId] = useState("");
  const [certIds, setCertIds] = useState({}); // eventId -> certificateId
  const [notifOpen, setNotifOpen] = useState(false);
  const navigate = useNavigate();
  const [profilePreview, setProfilePreview] = useState(null); // friend profile modal
  const [calendarDate, setCalendarDate] = useState(new Date()); // month anchor for Calendar tab
  const [calendarView, setCalendarView] = useState('month'); // 'month' | 'week'
  const [dayModal, setDayModal] = useState({ open: false, key: null, date: null, upcoming: [], attended: [] });
  const [calendarOverlayOpen, setCalendarOverlayOpen] = useState(false); // dropdown-like large overlay
  const calendarBtnRef = useRef(null);
  const [overlayPos, setOverlayPos] = useState({ top: 0, left: 0, width: 0 });

  const computeOverlayPosition = () => {
    try {
      const btn = calendarBtnRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const panelWidth = Math.min(window.innerWidth * 0.95, 1100);
      const margin = 8;
      // Align panel's right edge with button's right edge, clamped to viewport
      const left = Math.max(16, Math.min(rect.right - panelWidth, window.innerWidth - panelWidth - 16));
      const top = rect.bottom + window.scrollY + margin; // drop under header/button
      setOverlayPos({ top, left, width: panelWidth });
    } catch {}
  };
  const [userSettings, setUserSettings] = useState({
    ui: { sidebarCollapsedDefault: false },
    recommendations: { showTrendingFirst: true, personalizeUsingOnboarding: true }
  });

  const currentLevel = useMemo(() => GAMIFICATION.levels.slice().reverse().find(level => userStats.points >= level.minPoints) || GAMIFICATION.levels[0], [userStats.points]);
  const nextLevel = useMemo(() => { const i = GAMIFICATION.levels.findIndex(l => l.level === currentLevel.level); return GAMIFICATION.levels[i+1] || null; }, [currentLevel]);
  const levelProgress = useMemo(() => { if (!nextLevel) return 100; const cur = userStats.points - currentLevel.minPoints; const need = nextLevel.minPoints - currentLevel.minPoints; return Math.min(100, (cur/need)*100); }, [userStats.points, currentLevel, nextLevel]);

  const userKey = (base) => { const email = user?.email || null; return email ? `${base}:${email}` : base; };

  // Derived metrics
  const streakDays = useMemo(() => {
    const unique = Array.from(new Set((registrations || []).map(r => new Date(r.at || Date.now()).toDateString()))).sort((a,b)=> new Date(b)-new Date(a));
    if (!unique.length) return 0; let s=1; for (let i=0;i<unique.length-1;i++){ const d1=new Date(unique[i]); const d2=new Date(unique[i+1]); if(((d1-d2)/(1000*60*60*24))===1) s++; else break; } return s;
  }, [registrations]);
  const attendanceHistory = useMemo(() => (registrations||[]).map(r=>{ const ev=(events||[]).find(e=>e._id===r.eventId)||{}; return {eventId:r.eventId,title:ev.title||"Event",date:ev.date||r.at,type:ev.category||(ev.isOnline?"Online":(ev.location?"Offline":"Event"))}; }).slice(0,10), [registrations, events]);
  const recommendationFeedback = useMemo(() => (feedbacks||[]).slice(0,10).map(f=>({eventId:f.eventId,rating:f.rating||0,liked:(f.rating||0)>=4,comment:f.comment,at:f.at})), [feedbacks]);
  const skillProgress = useMemo(()=>{ const base={Communication:60,Coding:70,Marketing:50,Design:40}; const boost=Math.min(30,(registrations||[]).length*2); return Object.fromEntries(Object.entries(base).map(([k,v])=>[k,Math.min(100,v+boost)])); },[registrations]);
  const careerReadiness = useMemo(()=>{ const ps=Math.min(100,(userStats.points/1000)*100); const es=Math.min(100,(userStats.totalEvents/10)*100); const ss=Math.min(100,(streakDays/7)*100); const bs=Math.min(100,((userStats.badges?.length||0)/6)*100); return Math.round(ps*0.35+es*0.25+ss*0.2+bs*0.2); },[userStats.points,userStats.totalEvents,userStats.badges,streakDays]);

  // Sync tab from query param on mount and when URL changes (top-level hook)
  useEffect(() => {
    const qs = new URLSearchParams(location.search);
    const tab = qs.get('tab');
    if (tab && ["Explore","MyRegs","Calendar","Bookmarks","SubscribedHosts","Friends","Leaderboard","Achievements","Notifications"].includes(tab)) {
      setActiveTab(tab);
    }
  }, [location.search]);

  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let base = events || [];
    // Exclude completed/past events in Explore/Home
    const now = new Date();
    base = base.filter(e => {
      const start = e?.date ? new Date(e.date) : null;
      const end = e?.endDate ? new Date(e.endDate) : null;
      if (e?.isCompleted) return false;
      return end ? end > now : (start ? start > now : true);
    });
    if (hostFilterId) {
      base = base.filter(e => String(e.hostId?._id || e.hostId) === String(hostFilterId));
    }
    if (!q) return base;
    return base.filter(e => {
      const haystack = [
        e.title,
        e.location,
        e.category,
        ...(Array.isArray(e.tags) ? e.tags : [])
      ]
        .filter(Boolean)
        .map(x => String(x).toLowerCase());
      return haystack.some(txt => txt.includes(q));
    });
  }, [events, searchQuery, hostFilterId]);

  // Explore sections heuristics
  const trendingEvents = useMemo(() => {
    const base = (filteredEvents || []).slice();
    // score by bookmarks + registrations length, fallback to date recency
    const scored = base.map(e => ({
      e,
      score: (Array.isArray(e.bookmarks) ? e.bookmarks.length : 0) + (Array.isArray(e.registrations) ? e.registrations.length : 0),
    }));
    scored.sort((a,b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.e.date) - new Date(a.e.date);
    });
    return scored.map(x=>x.e).slice(0, 6);
  }, [filteredEvents]);

  const upcomingWeekEvents = useMemo(() => {
    const now = new Date();
    const weekAhead = new Date(now.getTime() + 7*24*60*60*1000);
    return (filteredEvents || [])
      .filter(e => {
        const d = new Date(e.date);
        return d > now && d <= weekAhead;
      })
      .sort((a,b) => new Date(a.date) - new Date(b.date))
      .slice(0, 6);
  }, [filteredEvents]);

  const recommendedEvents = useMemo(() => {
    // derive preferred categories from past registrations or feedbacks
    if (userSettings.recommendations?.personalizeUsingOnboarding === false) {
      return (filteredEvents || []).slice(0,6);
    }
    const registeredIds = new Set((registrations||[]).map(r=>r.eventId));
    const pastCats = new Set((registrations||[])
      .map(r => (events||[]).find(e=>e._id===r.eventId))
      .filter(Boolean)
      .map(ev => ev.category)
      .filter(Boolean));
    if (pastCats.size === 0) return (filteredEvents || []).slice(0,6);
    const recs = (filteredEvents || [])
      .filter(ev => ev.category && pastCats.has(ev.category) && !registeredIds.has(ev._id))
      .sort((a,b)=> new Date(b.date) - new Date(a.date))
      .slice(0, 6);
    return recs.length ? recs : (filteredEvents || []).slice(0,6);
  }, [filteredEvents, registrations, events, userSettings.recommendations?.personalizeUsingOnboarding]);

  // ===== Calendar helpers (month view) =====
  const calendarYear = calendarDate.getFullYear();
  const calendarMonth = calendarDate.getMonth(); // 0-based
  const startOfMonth = useMemo(() => new Date(calendarYear, calendarMonth, 1), [calendarYear, calendarMonth]);
  const endOfMonth = useMemo(() => new Date(calendarYear, calendarMonth + 1, 0), [calendarYear, calendarMonth]);
  const monthDays = useMemo(() => {
    const days = [];
    const firstWeekday = (startOfMonth.getDay() + 6) % 7; // make Monday=0
    for (let i = 0; i < firstWeekday; i++) days.push(null);
    for (let d = 1; d <= endOfMonth.getDate(); d++) days.push(new Date(calendarYear, calendarMonth, d));
    // pad trailing blanks to complete rows
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [startOfMonth, endOfMonth, calendarYear, calendarMonth]);
  const dayKey = (dt) => `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
  const weekStart = useMemo(() => {
    const d = new Date(calendarDate);
    const day = (d.getDay() + 6) % 7; // Monday=0
    d.setDate(d.getDate() - day);
    d.setHours(0,0,0,0);
    return d;
  }, [calendarDate]);
  const weekDays = useMemo(() => {
    const arr = [];
    for (let i=0;i<7;i++) arr.push(new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate()+i));
    return arr;
  }, [weekStart]);
  const eventsByDay = useMemo(() => {
    const map = new Map();
    const add = (dt, ev, type) => {
      if (!dt) return;
      const key = dayKey(dt);
      if (!map.has(key)) map.set(key, { upcoming: [], attended: [] });
      const bucket = map.get(key)[type];
      if (!bucket.some(x => x?._id === ev?._id)) bucket.push(ev);
    };
    const now = new Date();
    // Only place events on their start date within the current month/year
    (events || []).forEach(ev => {
      const start = ev?.date ? new Date(ev.date) : null;
      const end = ev?.endDate ? new Date(ev.endDate) : null;
      if (!start) return;
      if (start.getMonth() !== calendarMonth || start.getFullYear() !== calendarYear) return;
      const isPast = ev?.isCompleted || (end ? end <= now : start <= now);
      add(start, ev, isPast ? 'attended' : 'upcoming');
    });
    // Also mark attended for any registered events whose start is in this month (helps when isCompleted is missing)
    (registrations || []).forEach(r => {
      const ev = (events || []).find(e => e._id === r.eventId);
      if (!ev) return;
      const start = ev?.date ? new Date(ev.date) : null;
      if (start && start.getMonth() === calendarMonth && start.getFullYear() === calendarYear) {
        // Only add as attended if event is truly past; upcoming registrations will be indicated via chip styling
        const end = ev?.endDate ? new Date(ev.endDate) : null;
        const isPast = ev?.isCompleted || (end ? end <= now : start <= now);
        if (isPast) {
          const key = dayKey(start);
          if (!map.has(key)) map.set(key, { upcoming: [], attended: [] });
          const already = map.get(key).attended.some(x => x?._id === ev?._id);
          if (!already) add(start, ev, 'attended');
        }
      }
    });
    return map;
  }, [events, registrations, calendarMonth, calendarYear]);

  // Today upcoming badge helper
  const hasTodayUpcoming = useMemo(() => {
    const now = new Date();
    const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    return (events || []).some(ev => {
      const start = ev?.date ? new Date(ev.date) : null;
      const end = ev?.endDate ? new Date(ev.endDate) : null;
      if (!start) return false;
      if (!sameDay(start, now)) return false;
      if (ev?.isCompleted) return false;
      // if event has end, ensure still ongoing or later today; else ensure not in the past
      return end ? end > now : start >= now;
    });
  }, [events]);

  // Keyboard shortcut: press 'C' to open Calendar overlay (ignore when typing in inputs)
  useEffect(() => {
    const onKey = (e) => {
      if ((e.key === 'c' || e.key === 'C') && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const tag = (document.activeElement && document.activeElement.tagName) || '';
        if (["INPUT","TEXTAREA","SELECT"].includes(String(tag).toUpperCase())) return;
        computeOverlayPosition();
        setCalendarOverlayOpen(true);
        e.preventDefault();
      }
      if (e.key === 'Escape') {
        setCalendarOverlayOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Lock background scroll and focus overlay when open
  useEffect(() => {
    const prev = document.body.style.overflow;
    if (calendarOverlayOpen) {
      document.body.style.overflow = 'hidden';
      // focus the panel for accessibility
      const t = setTimeout(() => {
        const el = document.getElementById('calendar-overlay-panel');
        if (el) el.focus();
      }, 0);
      const onResize = () => computeOverlayPosition();
      window.addEventListener('resize', onResize);
      return () => { clearTimeout(t); document.body.style.overflow = prev; };
    }
    document.body.style.overflow = prev;
  }, [calendarOverlayOpen]);

  const continueBrowsingEvents = useMemo(() => {
    // show recently registered as continue browsing
    const recent = (registrations||[]) 
      .slice(0, 6)
      .map(r => (events||[]).find(e=>e._id===r.eventId))
      .filter(Boolean);
    return recent;
  }, [registrations, events]);

  const awardPoints = (action, amount=null) => {
    const pts = amount || GAMIFICATION.points[action] || 0; if (pts<=0) return;
    setUserStats(prev=>{ const next={...prev, points: prev.points+pts}; const newLevel = GAMIFICATION.levels.slice().reverse().find(l=>next.points>=l.minPoints)||GAMIFICATION.levels[0]; if(newLevel.level>prev.level){ toast.success(`🎉 Level Up! You're now a ${newLevel.name}!`,{autoClose:5000,style:{background:newLevel.color,color:'white'}}); next.level=newLevel.level; } return next; });
    toast.success(`+${pts} points!`,{autoClose:2000,style:{background:'#10B981',color:'white'}});
  };

  const isSubscribedToHost = (hostId) => {
    if (!hostId) return false;
    return (subscribedHosts || []).some(h => String(h._id || h) === String(hostId));
  };

  const handleSubscribeHost = async (event) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) { toast.error("Please login to follow hosts"); navigate("/login"); return; }
      const hostId = event?.hostId && (event.hostId._id || event.hostId); // support populated or raw
      if (!hostId) { toast.error("Host not found"); return; }
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      if (isSubscribedToHost(hostId)) {
        await api.delete(`/api/subscriptions/${hostId}`, headers);
        setSubscribedHosts(prev => prev.filter(h => String((h._id||h)) !== String(hostId)));
        toast.success("Unfollowed host");
      } else {
        const { data } = await api.post(`/api/subscriptions`, { hostId }, headers);
        const list = Array.isArray(data?.subscribedHosts) ? data.subscribedHosts : null;
        if (list) setSubscribedHosts(list);
        else setSubscribedHosts(prev => [...prev, { _id: hostId }]);
        toast.success("Following host");
      }
    } catch (e) {
      toast.error(e?.response?.data?.error || "Failed to update follow");
    }
  };

  const handleNavigateToReview = (eventId) => {
    closeEventDetails();
    navigate(`/review/${eventId}`);
  };

  const handleDownloadCertificate = async (event) => {
    if (!event?.isCompleted) {
      toast.info("Certificate will be available after event completion");
      return;
    }
    try {
      const token = localStorage.getItem('token');
      if (!token) { toast.error('Please login'); navigate('/login'); return; }
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      const { data } = await api.post(`/api/certificates/events/${event._id}`, {}, headers);
      const url = data?.url ? `${config.apiBaseUrl.replace(/\/$/, '')}${data.url}` : null;
      const certificateId = data?.certificateId;
      if (certificateId) {
        setCertIds(prev => ({ ...prev, [event._id]: certificateId }));
      }
      if (!url) { toast.error('Failed to generate certificate'); return; }
      const a = document.createElement('a');
      a.href = url;
      a.download = '';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success('Certificate ready');
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to generate certificate');
    }
  };

  const openEventDetails = (event) => {
    setSelectedEvent(event);
    setDetailOpen(true);
  };
  const closeEventDetails = () => {
    setDetailOpen(false);
    setSelectedEvent(null);
  };

  const registerFromDetails = async (event) => {
    // If paid, open Razorpay, then register; if free, direct register
    try {
      if (!event) return;
      if ((event.price || 0) > 0) {
        await payForEvent({ event, user });
        // payForEvent already registers on success; refresh local state
        setRegistrations(prev => prev.some(r=>r.eventId===event._id) ? prev : [{ eventId: event._id, at: Date.now() }, ...prev]);
        toast.success("Payment successful and registered");
      } else {
        await registerForEvent(event);
      }
      return true;
    } catch (e) {
      toast.error(e?.response?.data?.error || e.message || "Registration failed");
      return false;
    }
  };

  const registerForEvent = async (event) => {
    try {
      // Block registration for past/completed events
      const start = event?.date ? new Date(event.date) : null;
      const end = event?.endDate ? new Date(event.endDate) : null;
      const deadline = event?.registrationDeadline ? new Date(event.registrationDeadline) : null;
      const now = new Date();
      if (deadline && !isNaN(deadline.getTime()) && now > deadline) {
        toast.error("Registration closed (deadline passed)");
        return false;
      }
      const isPast = (event?.isCompleted) || (end ? end <= now : (start ? start <= now : false));
      if (isPast) {
        toast.error("Registration closed for past events");
        return false;
      }
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Please login to register for events");
        navigate("/login");
        return false;
      }
      const ok = await ensureVerified();
      if (!ok) return false;
      // Skip if already registered in local state
      if (registrations.some(r => r.eventId === event._id)) {
        toast.info("Already registered");
        return true;
      }
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      const res = await api.post(`/api/host/public/events/${event._id}/register`, {}, headers);
      // Update local registrations store
      setRegistrations(prev => [{ eventId: event._id, at: Date.now() }, ...prev]);
      toast.success(res?.data?.message || "Registered successfully");
      return true;
    } catch (error) {
      toast.error(error?.response?.data?.error || "Failed to register");
      return false;
    }
  };

  const checkBadges = () => {
    const newBadges=[]; GAMIFICATION.badges.forEach(b=>{ if(userStats.badges.includes(b.id)) return; let earned=false; switch(b.id){ case 'first_event': earned=userStats.totalEvents>=1; break; case 'bookmarker': earned=userStats.totalBookmarks>=10; break; case 'social_butterfly': earned=userStats.totalSubscriptions>=5; break; case 'reviewer': earned=userStats.totalReviews>=5; break; case 'certificate_collector': earned=registrations.filter(r=>events.find(e=>e._id===r.eventId)?.isCompleted).length>=3; break; default: break;} if(earned){ newBadges.push(b); toast.success(`🏆 Badge Earned: ${b.name}!`,{autoClose:4000,style:{background:b.points>200?'#F59E0B':'#3B82F6',color:'white'}}); }}); if(newBadges.length){ setUserStats(prev=>({...prev,badges:[...prev.badges,...newBadges.map(b=>b.id)]})); }
  };

  useEffect(()=>{ const saved=loadLS(userKey(STORAGE.gamification),{points:0,level:1,badges:[],streak:0,achievements:[],totalEvents:0,totalBookmarks:0,totalSubscriptions:0,totalReviews:0}); setUserStats(saved); },[user]);
  // Fetch verification status for disabling actions
  useEffect(()=>{ (async()=>{ try{ const token=localStorage.getItem('token'); if(!token){ setIsVerified(false); return; } const { data } = await api.get('/api/auth/me', { headers:{ Authorization:`Bearer ${token}` } }); setIsVerified(!!(data?.emailVerified && data?.phoneVerified)); } catch(_){ setIsVerified(false); } })(); },[user]);
  useEffect(()=>{ setUserStats(prev=>({...prev,totalEvents:registrations.length,totalBookmarks:bookmarks.length,totalSubscriptions:subscriptions.length,totalReviews:feedbacks.length})); },[registrations,bookmarks,subscriptions,feedbacks]);
  // Derive points from current totals to ensure Achievements points add up correctly
  useEffect(()=>{
    const p = (userStats.totalEvents||0)*(GAMIFICATION.points.register||0)
            + (userStats.totalBookmarks||0)*(GAMIFICATION.points.bookmark||0)
            + (userStats.totalSubscriptions||0)*(GAMIFICATION.points.subscribe||0)
            + (userStats.totalReviews||0)*(GAMIFICATION.points.review||0)
            + (streakDays||0)*(GAMIFICATION.points.streak||0);
    setUserStats(prev => ({ ...prev, points: p }));
  }, [userStats.totalEvents, userStats.totalBookmarks, userStats.totalSubscriptions, userStats.totalReviews, streakDays]);
  useEffect(()=>{ checkBadges(); },[userStats.totalEvents,userStats.totalBookmarks,userStats.totalSubscriptions,userStats.totalReviews]);
  useEffect(()=>{ saveLS(userKey(STORAGE.gamification), userStats); },[userStats,user]);

  const ensureVerified = async () => { try { const token=localStorage.getItem("token"); if(!token) return false; const { data } = await api.get("/api/auth/me",{headers:{Authorization:`Bearer ${token}`}}); if(!data?.emailVerified || !data?.phoneVerified){ toast.info("Please verify your email and phone to continue"); navigate("/profile?tab=otp"); return false; } return true; } catch(_){ return false; } };

  useEffect(()=>{ const u=localStorage.getItem("user"); setUser(u?JSON.parse(u):null); },[]);
  useEffect(()=>{ const fetchEvents=async()=>{ try{ const res=await api.get("/api/host/public/events"); setEvents(res.data||[]);}catch(e){ console.error("Failed to load events:",e);}finally{ setLoading(false);} }; fetchEvents(); },[]);
  // Load user settings to apply UI/recommendations preferences
  useEffect(()=>{ (async()=>{
    try {
      const token = localStorage.getItem('token');
      if (!token) return; // only for logged-in users
      const { data } = await api.get('/api/auth/settings');
      const s = data?.settings || {};
      const next = {
        ui: { sidebarCollapsedDefault: !!s?.ui?.sidebarCollapsedDefault },
        recommendations: {
          showTrendingFirst: s?.recommendations?.showTrendingFirst !== false,
          personalizeUsingOnboarding: s?.recommendations?.personalizeUsingOnboarding !== false
        }
      };
      setUserSettings(next);
      // Apply sidebar collapsed default only once on load
      setNavCollapsed(c => c || !!next.ui.sidebarCollapsedDefault);
    } catch(_) { /* ignore */ }
  })(); },[]);
  useEffect(()=>{ if(!user) return; const regs=loadLS(userKey(STORAGE.registrations),[]); const bms=loadLS(userKey(STORAGE.bookmarks),[]); const subs=loadLS(userKey(STORAGE.subscriptions),[]); const notifs=loadLS(userKey(STORAGE.notifications),[]); const fbs=loadLS(userKey(STORAGE.feedbacks),[]); setRegistrations(Array.isArray(regs)?regs:[]); setBookmarks(Array.isArray(bms)?bms:[]); setSubscriptions(Array.isArray(subs)?subs:[]); setNotifications(Array.isArray(notifs)?notifs:[]); setFeedbacks(Array.isArray(fbs)?fbs:[]); },[user]);
  // Fetch subscribed hosts from server
  useEffect(()=>{
    const loadSubs = async () => {
      try {
        const token = localStorage.getItem("token");
        if(!user || !token) return;
        const { data } = await api.get('/api/subscriptions', { headers: { Authorization: `Bearer ${token}` } });
        setSubscribedHosts(Array.isArray(data) ? data : []);
      } catch(e) {
        // ignore
      }
    };
    loadSubs();
  },[user]);
  // Fetch authoritative registrations from server when user is present
  useEffect(()=>{
    const loadServerRegistrations = async ()=>{
      try{
        const token = localStorage.getItem("token");
        if(!user || !token) return;
        const { data } = await api.get('/api/host/public/my-registrations', { headers: { Authorization: `Bearer ${token}` } });
        if(Array.isArray(data)){
          const mapped = data.map(r=>({ eventId: r.eventId, attended: !!r.attended, isCompleted: !!r.isCompleted, at: Date.now() }));
          setRegistrations(mapped);
        }
      }catch(_){ /* ignore */ }
    };
    loadServerRegistrations();
  },[user]);
  useEffect(()=>saveLS(userKey(STORAGE.registrations),registrations),[registrations,user]);
  useEffect(()=>saveLS(userKey(STORAGE.bookmarks),bookmarks),[bookmarks,user]);
  useEffect(()=>saveLS(userKey(STORAGE.subscriptions),subscriptions),[subscriptions,user]);
  useEffect(()=>saveLS(userKey(STORAGE.notifications),notifications),[notifications,user]);
  useEffect(()=>saveLS(userKey(STORAGE.feedbacks),feedbacks),[feedbacks,user]);

  // Load friends leaderboard when tab is active (robust parsing of /api/friends)
  useEffect(() => {
    const run = async () => {
      if (activeTab !== 'Leaderboard') return;
      try {
        setLeaderboardLoading(true);
        const token = localStorage.getItem('token');
        if (!token) { setLeaderboardUsers([]); return; }
        const headers = { headers: { Authorization: `Bearer ${token}` } };

        const resp = await api.get('/api/friends', headers);
        const raw = resp?.data;
        const arr = Array.isArray(raw) ? raw : (Array.isArray(raw?.friends) ? raw.friends : []);
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.log('Leaderboard /api/friends raw:', raw);
        }

        const normalized = arr.map((item) => {
          const u = item?.friend || item?.user || item?.to || item?.from || item;
          if (!u) return null;
          const sid = u?._id || u?.id || item?._id || item?.id;
          if (!sid) return null;
          return { sid: String(sid), name: u.fullname || u.username || 'Friend' };
        }).filter(Boolean);

        if (normalized.length === 0) { setLeaderboardUsers([]); return; }

        const statsArr = await Promise.all(normalized.map(async ({ sid, name }) => {
          try {
            const { data: st } = await api.get(`/api/users/${sid}/stats`, headers);
            const totals = st || {};
            const basePts = (totals.totalEvents||0)*(GAMIFICATION.points.register||0)
                          + (totals.totalBookmarks||0)*(GAMIFICATION.points.bookmark||0)
                          + (totals.totalSubscriptions||0)*(GAMIFICATION.points.subscribe||0)
                          + (totals.totalReviews||0)*(GAMIFICATION.points.review||0)
                          + (totals.streak||0)*(GAMIFICATION.points.streak||0);
            const badgePointsMap = Object.fromEntries(GAMIFICATION.badges.map(b => [b.id, b.points || 0]));
            const badgesSum = Array.isArray(totals.badges) ? totals.badges.reduce((s, id) => s + (badgePointsMap[id] || 0), 0) : 0;
            const pts = basePts + badgesSum;
            const level = GAMIFICATION.levels.slice().reverse().find(l => pts >= l.minPoints) || GAMIFICATION.levels[0];
            return { id: sid, name, level: level.level, points: pts };
          } catch {
            return null;
          }
        }));

        // Include current user in leaderboard as well
        let selfEntry = null;
        try {
          const meId = user?._id || user?.id;
          if (meId) {
            const { data: stMe } = await api.get(`/api/users/${meId}/stats`, headers);
            const totalsMe = stMe || {};
            const basePtsMe = (totalsMe.totalEvents||0)*(GAMIFICATION.points.register||0)
                            + (totalsMe.totalBookmarks||0)*(GAMIFICATION.points.bookmark||0)
                            + (totalsMe.totalSubscriptions||0)*(GAMIFICATION.points.subscribe||0)
                            + (totalsMe.totalReviews||0)*(GAMIFICATION.points.review||0)
                            + (totalsMe.streak||0)*(GAMIFICATION.points.streak||0);
            const badgeMap = Object.fromEntries(GAMIFICATION.badges.map(b => [b.id, b.points || 0]));
            const badgesSumMe = Array.isArray(totalsMe.badges) ? totalsMe.badges.reduce((s, id) => s + (badgeMap[id] || 0), 0) : 0;
            const ptsMe = basePtsMe + badgesSumMe;
            const levelMe = GAMIFICATION.levels.slice().reverse().find(l => ptsMe >= l.minPoints) || GAMIFICATION.levels[0];
            selfEntry = { id: String(meId), name: user?.fullname || user?.username || 'You', level: levelMe.level, points: ptsMe, isMe: true };
          }
        } catch { /* ignore self fetch errors */ }

        // Merge, dedupe by id (favor self entry), sort
        const merged = [...statsArr.filter(Boolean), selfEntry].filter(Boolean);
        const byId = new Map();
        for (const it of merged) { byId.set(String(it.id), it); }
        const finalList = Array.from(byId.values()).sort((a,b) => b.points - a.points);
        setLeaderboardUsers(finalList);
      } catch (_) {
        setLeaderboardUsers([]);
      } finally {
        setLeaderboardLoading(false);
      }
    };
    run();
  }, [activeTab, user]);

  const handleLogout=()=>{ ["student.registrations","student.bookmarks","student.subscriptions","student.subscriptions.meta","student.notifications","student.feedbacks","student.gamification"].forEach(k=>localStorage.removeItem(k)); localStorage.removeItem("user"); localStorage.removeItem("token"); navigate("/"); };
  useEffect(()=>{ const onClick=(e)=>{ if(profileMenuOpen && !e.target.closest('.profile-menu')) setProfileMenuOpen(false); }; document.addEventListener('mousedown',onClick); return ()=>document.removeEventListener('mousedown',onClick); },[profileMenuOpen]);

  const toggleBookmark = async (event) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Please login to manage bookmarks");
        navigate("/login");
        return false;
      }
      const ok = await ensureVerified();
      if (!ok) return false;
      const already = bookmarks.includes(event._id);
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      if (already) {
        await api.delete(`/api/bookmarks/${event._id}`, headers);
        setBookmarks((prev) => prev.filter((id) => id !== event._id));
        toast.success("Removed from bookmarks");
        return true;
      } else {
        await api.post("/api/bookmarks", { eventId: event._id }, headers);
        setBookmarks((prev) => [event._id, ...prev]);
        toast.success("Bookmarked");
        return true;
      }
    } catch (error) {
      toast.error(error?.response?.data?.error || "Failed to update bookmark");
      return false;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-300 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-700 text-xl">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

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
                <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Evenite
                </h1>
              </div>
            </div>

            {/* Calendar Overlay (dropdown-like, large) */}
            {calendarOverlayOpen && (
              <div className="fixed inset-0 z-[70]" aria-modal="true" role="dialog">
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={()=> setCalendarOverlayOpen(false)} />
                <div
                  id="calendar-overlay-panel"
                  tabIndex={-1}
                  className="absolute bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col transform transition-all duration-300 ease-out animate-fadeIn translate-y-4"
                  style={{ top: overlayPos.top, left: overlayPos.left, width: overlayPos.width, height: '82vh' }}
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <button onClick={()=> setCalendarDate(new Date(calendarYear, calendarMonth-1, 1))} className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm">Prev</button>
                      <button onClick={()=> setCalendarDate(new Date())} className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm">Today</button>
                      <button onClick={()=> setCalendarDate(new Date(calendarYear, calendarMonth+1, 1))} className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm">Next</button>
                    </div>
                    <div className="text-lg font-semibold text-slate-900">
                      {calendarView==='month' ? calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' }) : `Week of ${weekStart.toLocaleDateString()}`}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="hidden md:flex items-center gap-3 text-xs text-slate-600">
                        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-300 inline-block" /> Upcoming</span>
                        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-300 inline-block" /> Completed</span>
                        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-300 inline-block" /> Registered</span>
                        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-300 inline-block" /> Registered Completed</span>
                      </div>
                      <span className="inline-flex rounded-lg overflow-hidden border border-slate-200">
                        <button onClick={()=> setCalendarView('month')} className={`px-2 py-1 text-[11px] ${calendarView==='month'?'bg-slate-100 text-slate-900':'text-slate-600 hover:bg-slate-50'}`}>Month</button>
                        <button onClick={()=> setCalendarView('week')} className={`px-2 py-1 text-[11px] ${calendarView==='week'?'bg-slate-100 text-slate-900':'text-slate-600 hover:bg-slate-50'}`}>Week</button>
                      </span>
                      <button onClick={()=> setCalendarOverlayOpen(false)} className="ml-2 p-2 rounded-lg hover:bg-slate-100" aria-label="Close">
                        <X className="w-5 h-5 text-slate-700" />
                      </button>
                    </div>
                  </div>
                  <div className="p-4 overflow-auto">
                    <div className="grid grid-cols-7 gap-2 text-xs font-medium text-slate-500 mb-2">
                      {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (<div key={d} className="text-center">{d}</div>))}
                    </div>
                    <div className="grid grid-cols-7 gap-2">
                      {(calendarView==='month' ? monthDays : weekDays).map((dt, idx) => {
                        if (!dt) return <div key={`pad-ov-${idx}`} className="h-28 rounded-xl border border-slate-200 bg-slate-50" />;
                        const key = dayKey(dt);
                        const dayData = eventsByDay.get(key) || { upcoming: [], attended: [] };
                        const isToday = (()=>{ const t=new Date(); return t.getFullYear()===dt.getFullYear() && t.getMonth()===dt.getMonth() && t.getDate()===dt.getDate(); })();
                        return (
                          <div key={key} className={`relative h-28 rounded-xl border border-slate-200 bg-white p-2 transition-all duration-200 hover:shadow-md ${isToday? 'ring-2 ring-blue-500':''}`}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="text-xs text-slate-500">{dt.toLocaleDateString(undefined,{ day:'numeric' })}</div>
                            </div>
                            <div className="absolute top-1 right-1 flex items-center gap-1">
                              {!!dayData.upcoming.length && <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px]" title="Upcoming">{dayData.upcoming.length}</span>}
                              {!!dayData.attended.length && <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px]" title="Attended">{dayData.attended.length}</span>}
                            </div>
                            <div className="space-y-1 overflow-y-auto max-h-20 pr-1">
                              {Array.from(new Map(dayData.upcoming.map(e=>[e._id,e])).values())
                                .slice()
                                .sort((a,b)=>{
                                  const ra = (registrations||[]).some(r=> r.eventId === a._id) ? 0 : 1;
                                  const rb = (registrations||[]).some(r=> r.eventId === b._id) ? 0 : 1;
                                  return ra - rb;
                                })
                                .slice(0,2)
                                .map(ev => {
                                  const isReg = (registrations||[]).some(r=> r.eventId === ev._id);
                                  const chipCls = isReg ? 'bg-orange-50 text-orange-700' : 'bg-blue-50 text-blue-700';
                                  return (
                                    <div key={ev._id} className={`text-[11px] truncate px-2 py-1 rounded animate-fadeIn cursor-pointer flex items-center justify-between gap-2 ${chipCls}`} title={isReg ? `${ev.title} (Registered)` : ev.title} onClick={()=> openEventDetails(ev)}>
                                      <span className="truncate">{ev.title}</span>
                                      {isReg && <CheckCircle className="w-3 h-3 text-emerald-600 shrink-0" />}
                                    </div>
                                  );
                                })}
                              {dayData.upcoming.length > 2 && (
                                <button className="w-full text-left text-[11px] px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200" onClick={()=> setDayModal({ open: true, key, date: dt, upcoming: dayData.upcoming, attended: dayData.attended })}>+{dayData.upcoming.length - 2} more</button>
                              )}
                              {Array.from(new Map(dayData.attended.map(e=>[e._id,e])).values())
                                .slice()
                                .sort((a,b)=>{
                                  const ra = (registrations||[]).some(r=> r.eventId === a._id) ? 0 : 1;
                                  const rb = (registrations||[]).some(r=> r.eventId === b._id) ? 0 : 1;
                                  return ra - rb;
                                })
                                .slice(0,2)
                                .map(ev => {
                                  const isReg = (registrations||[]).some(r=> r.eventId === ev._id);
                                  const chipCls = isReg ? 'bg-yellow-50 text-yellow-700' : 'bg-emerald-50 text-emerald-700';
                                  return (
                                    <div key={ev._id} className={`text-[11px] truncate px-2 py-1 rounded animate-fadeIn cursor-pointer flex items-center justify-between gap-2 ${chipCls}`} title={isReg ? `${ev.title} (Registered Completed)` : `${ev.title} (Completed)`} onClick={()=> openEventDetails(ev)}>
                                      <span className="truncate">{ev.title}</span>
                                      {isReg && <CheckCircle className="w-3 h-3 text-emerald-600 shrink-0" />}
                                    </div>
                                  );
                                })}
                              {dayData.attended.length > 2 && (
                                <button className="w-full text-left text-[11px] px-2 py-1 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200" onClick={()=> setDayModal({ open: true, key, date: dt, upcoming: dayData.upcoming, attended: dayData.attended })}>+{dayData.attended.length - 2} more</button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

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
              {hostFilterId && (
                <div className="mt-2">
                  <button
                    onClick={()=> setHostFilterId("")}
                    className="inline-flex items-center px-3 py-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full hover:bg-blue-100"
                  >
                    Clear host filter
                  </button>
                </div>
              )}

            {activeTab === "Calendar" && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <button onClick={()=> setCalendarDate(new Date(calendarYear, calendarMonth-1, 1))} className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm">Prev</button>
                      <button onClick={()=> setCalendarDate(new Date())} className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm">Today</button>
                      <button onClick={()=> setCalendarDate(new Date(calendarYear, calendarMonth+1, 1))} className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm">Next</button>
                    </div>
                    <div className="text-lg font-semibold text-slate-900">
                      {calendarView==='month' ? calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' }) : `Week of ${weekStart.toLocaleDateString()}`}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-600">
                      <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-300 inline-block" /> Upcoming</span>
                      <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-300 inline-block" /> Completed</span>
                      <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-300 inline-block" /> Registered</span>
                      <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-300 inline-block" /> Registered Completed</span>
                      <span className="ml-3 inline-flex rounded-lg overflow-hidden border border-slate-200">
                        <button onClick={()=> setCalendarView('month')} className={`px-2 py-1 text-[11px] ${calendarView==='month'?'bg-slate-100 text-slate-900':'text-slate-600 hover:bg-slate-50'}`}>Month</button>
                        <button onClick={()=> setCalendarView('week')} className={`px-2 py-1 text-[11px] ${calendarView==='week'?'bg-slate-100 text-slate-900':'text-slate-600 hover:bg-slate-50'}`}>Week</button>
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-7 gap-2 text-xs font-medium text-slate-500 mb-2">
                    {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (<div key={d} className="text-center">{d}</div>))}
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {(calendarView==='month' ? monthDays : weekDays).map((dt, idx) => {
                      if (!dt) return <div key={`pad-${idx}`} className="h-28 rounded-xl border border-slate-200 bg-slate-50" />;
                      const key = dayKey(dt);
                      const dayData = eventsByDay.get(key) || { upcoming: [], attended: [] };
                      const isToday = (()=>{ const t=new Date(); return t.getFullYear()===dt.getFullYear() && t.getMonth()===dt.getMonth() && t.getDate()===dt.getDate(); })();
                      return (
                        <div key={key} className={`relative h-28 rounded-xl border border-slate-200 bg-white p-2 transition-all duration-200 hover:shadow-md ${isToday? 'ring-2 ring-blue-500':''}`}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="text-xs text-slate-500">{dt.toLocaleDateString(undefined,{ day:'numeric' })}</div>
                          </div>
                          <div className="absolute top-1 right-1 flex items-center gap-1">
                            {!!dayData.upcoming.length && <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px]" title="Upcoming">{dayData.upcoming.length}</span>}
                            {!!dayData.attended.length && <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px]" title="Attended">{dayData.attended.length}</span>}
                          </div>
                          <div className="space-y-1 overflow-y-auto max-h-20 pr-1">
                            {Array.from(new Map(dayData.upcoming.map(e=>[e._id,e])).values())
                              .slice()
                              .sort((a,b)=>{
                                const ra = (registrations||[]).some(r=> r.eventId === a._id) ? 0 : 1;
                                const rb = (registrations||[]).some(r=> r.eventId === b._id) ? 0 : 1;
                                return ra - rb;
                              })
                              .slice(0,2)
                              .map(ev => {
                              const isReg = (registrations||[]).some(r=> r.eventId === ev._id);
                              const chipCls = isReg ? 'bg-orange-50 text-orange-700' : 'bg-blue-50 text-blue-700';
                              return (
                                <div key={ev._id} className={`text-[11px] truncate px-2 py-1 rounded animate-fadeIn cursor-pointer flex items-center justify-between gap-2 ${chipCls}`} title={isReg ? `${ev.title} (Registered)` : ev.title} onClick={()=> openEventDetails(ev)}>
                                  <span className="truncate">{ev.title}</span>
                                  {isReg && <CheckCircle className="w-3 h-3 text-emerald-600 shrink-0" />}
                                </div>
                              );
                            })}
                            {dayData.upcoming.length > 2 && (
                              <button className="w-full text-left text-[11px] px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200" onClick={()=> setDayModal({ open: true, key, date: dt, upcoming: dayData.upcoming, attended: dayData.attended })}>+{dayData.upcoming.length - 2} more</button>
                            )}
                            {Array.from(new Map(dayData.attended.map(e=>[e._id,e])).values())
                              .slice()
                              .sort((a,b)=>{
                                const ra = (registrations||[]).some(r=> r.eventId === a._id) ? 0 : 1;
                                const rb = (registrations||[]).some(r=> r.eventId === b._id) ? 0 : 1;
                                return ra - rb;
                              })
                              .slice(0,2)
                              .map(ev => {
                              const isReg = (registrations||[]).some(r=> r.eventId === ev._id);
                              const chipCls = isReg ? 'bg-yellow-50 text-yellow-700' : 'bg-emerald-50 text-emerald-700';
                              return (
                                <div key={ev._id} className={`text-[11px] truncate px-2 py-1 rounded animate-fadeIn cursor-pointer flex items-center justify-between gap-2 ${chipCls}`} title={isReg ? `${ev.title} (Registered Completed)` : `${ev.title} (Completed)`} onClick={()=> openEventDetails(ev)}>
                                  <span className="truncate">{ev.title}</span>
                                  {isReg && <CheckCircle className="w-3 h-3 text-emerald-600 shrink-0" />}
                                </div>
                              );
                            })}
                            {dayData.attended.length > 2 && (
                              <button className="w-full text-left text-[11px] px-2 py-1 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200" onClick={()=> setDayModal({ open: true, key, date: dt, upcoming: dayData.upcoming, attended: dayData.attended })}>+{dayData.attended.length - 2} more</button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
            {dayModal.open && (
              <div className="fixed inset-0 z-[60] bg-black/30 flex items-center justify-center p-4" onClick={()=> setDayModal({ open:false, key:null, date:null, upcoming:[], attended:[] })}>
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-slate-200" onClick={(e)=> e.stopPropagation()}>
                  <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                    <div className="text-slate-900 font-semibold">{dayModal.date ? dayModal.date.toLocaleDateString(undefined, { weekday:'long', month:'long', day:'numeric', year:'numeric' }) : 'Day'}</div>
                    <button className="px-2 py-1 text-sm rounded hover:bg-slate-100" onClick={()=> setDayModal({ open:false, key:null, date:null, upcoming:[], attended:[] })}>Close</button>
                  </div>
                  <div className="p-4 max-h-[60vh] overflow-y-auto">
                    <div className="mb-3">
                      <div className="text-xs font-medium text-slate-500 mb-1">Upcoming</div>
                      {dayModal.upcoming.length === 0 ? (
                        <div className="text-sm text-slate-500">No upcoming events</div>
                      ) : (
                        <div className="space-y-2">
                          {dayModal.upcoming.map(ev => (
                            <div key={ev._id} className="p-2 rounded border border-blue-200 bg-blue-50 text-blue-700 flex items-center justify-between">
                              <div className="text-sm truncate pr-2">{ev.title}</div>
                              <button className="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700" onClick={()=> { openEventDetails(ev); setDayModal({ open:false, key:null, date:null, upcoming:[], attended:[] }); }}>View</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-medium text-slate-500 mb-1">Attended</div>
                      {dayModal.attended.length === 0 ? (
                        <div className="text-sm text-slate-500">No attended events</div>
                      ) : (
                        <div className="space-y-2">
                          {dayModal.attended.map(ev => (
                            <div key={ev._id} className="p-2 rounded border border-emerald-200 bg-emerald-50 text-emerald-700 flex items-center justify-between">
                              <div className="text-sm truncate pr-2">{ev.title}</div>
                              <button className="text-xs px-2 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700" onClick={()=> { openEventDetails(ev); setDayModal({ open:false, key:null, date:null, upcoming:[], attended:[] }); }}>View</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            </div>

            {/* Right Section - Actions & Profile */}
            <div className="flex items-center space-x-3">
              {/* Calendar quick access */}
              <button
                ref={calendarBtnRef}
                onClick={() => { computeOverlayPosition(); setCalendarOverlayOpen(true); }}
                className={`relative p-2 rounded-full transition-colors duration-200 ${activeTab==='Calendar' ? 'bg-blue-100 text-blue-700' : 'hover:bg-slate-100 text-slate-700'}`}
                title="Calendar"
                aria-label="Open Calendar"
              >
                <Calendar className="w-6 h-6" />
                {hasTodayUpcoming && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-blue-600"></span>}
              </button>
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
                        onClick={()=>{
                          setNotifications(prev => (prev||[]).map(n=>({...n, read:true})));
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
                          <div key={idx} className="p-3 flex items-start gap-3">
                            <div className={`w-2 h-2 rounded-full mt-2 ${n.read? 'bg-slate-300':'bg-blue-500'}`}></div>
                            <div className="flex-1">
                              <div className="text-sm text-slate-800">{n.message || 'Notification'}</div>
                              <div className="text-xs text-slate-500 mt-0.5">{n.at ? new Date(n.at).toLocaleString(): ''}</div>
                            </div>
                            {!n.read && (
                              <button
                                onClick={()=>{
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
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center">
                    <UserCircle2 className="w-5 h-5 text-white" />
                  </div>
                </button>
                {profileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl border border-slate-200 shadow-xl z-50 animate-in slide-in-from-top-2 duration-200">
                    <div className="p-4">
                      <div className="flex items-center space-x-3 mb-4 pb-4 border-b border-slate-100">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center">
                          <Crown className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{user?.fullname || user?.username}</div>
                          <div className="text-sm text-slate-600">{user?.email}</div>
                          <div className="text-xs text-blue-600 font-medium">{currentLevel.name} • {userStats.points} pts</div>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <button onClick={() => { setProfileMenuOpen(false); navigate("/profile"); }} className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">
                          <UserPen className="w-4 h-4" />
                          <span>Profile</span>
                        </button>
                        <button onClick={() => { setProfileMenuOpen(false); navigate("/settings"); }} className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">
                          <Settings className="w-4 h-4" />
                          <span>Settings</span>
                        </button>
                        <button onClick={() => { setProfileMenuOpen(false); navigate("/profile?tab=otp"); }} className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-blue-700 hover:bg-blue-50 rounded-lg transition-colors">
                          <ShieldCheck className="w-4 h-4" />
                          <span>Verify Credentials</span>
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
                  { id: "Explore", label: "Home", icon: Home },
                  { id: "MyRegs", label: "My Events", icon: Calendar },
                  { id: "Bookmarks", label: "Bookmarks", icon: Bookmark },
                  { id: "SubscribedHosts", label: "Following", icon: Users },
                  ...(user?.role === 'student' ? [{ id: "Friends", label: "Friends", icon: Users }] : []),
                  { id: "Leaderboard", label: "Leaderboard", icon: Crown },
                  { id: "Achievements", label: "Achievements", icon: Trophy },
                  { id: "Notifications", label: "Notifications", icon: BellRing }
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
                    <Icon className={`${navCollapsed ? 'w-7 h-7' : 'w-5 h-5'} ${activeTab === id ? 'text-blue-600' : 'text-slate-600 group-hover:text-slate-800'}`} />
                    {!navCollapsed && (
                      <span className={`ml-3 font-medium ${activeTab === id ? 'text-blue-700' : 'text-slate-700'}`}>
                        {label}
                      </span>
                    )}
                  </button>
                ))}
              </nav>

            {/* User Stats Section */}
            {!navCollapsed && (
              <div className="mt-8 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center">
                    <Crown className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-1">{currentLevel.name}</h3>
                  <p className="text-sm text-slate-600 mb-3">{userStats.points.toLocaleString()} points</p>
                  
                  {/* Level Progress */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-slate-600">
                      <span>Level {currentLevel.level}</span>
                      {nextLevel && <span>Level {nextLevel.level}</span>}
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${levelProgress}%` }}
                      />
                    </div>
                    {nextLevel && (
                      <p className="text-xs text-slate-500">
                        {nextLevel.minPoints - userStats.points} to next level
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            

            {/* Recent Badges */}
            {!navCollapsed && userStats.badges.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center">
                  <Award className="w-4 h-4 mr-2 text-amber-600" />
                  Recent Badges
                </h3>
                <div className="space-y-2">
                  {userStats.badges.slice(-3).map((badgeId, idx) => {
                    const badge = GAMIFICATION.badges.find(b => b.id === badgeId);
                    return badge ? (
                      <div key={idx} className="flex items-center space-x-3 p-2 bg-slate-50 rounded-lg">
                        <div className="text-lg">{badge.icon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-900 truncate">{badge.name}</div>
                          <div className="text-xs text-slate-600 truncate">{badge.description}</div>
                        </div>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            {/* Content Header */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                {activeTab === "Explore" && "Discover Amazing Events"}
                {activeTab === "MyRegs" && "Your Events"}
                {activeTab === "Calendar" && "Calendar"}
                {activeTab === "Bookmarks" && "Saved Events"}
                {activeTab === "SubscribedHosts" && "Following"}
                {activeTab === "Friends" && "Friends"}
                {activeTab === "Achievements" && "Your Achievements"}
                {activeTab === "Notifications" && "Notifications"}
              </h2>
              <p className="text-slate-600">
                {activeTab === "Explore" && "Find and register for exciting events happening around you"}
                {activeTab === "MyRegs" && "Manage your registered events and track your progress"}
                {activeTab === "Calendar" && "View upcoming and attended events in a monthly calendar"}
                {activeTab === "Bookmarks" && "Events you've saved for later"}
                {activeTab === "SubscribedHosts" && "Hosts you're following for event updates"}
                {activeTab === "Friends" && "Manage connections, requests and search users"}
                {activeTab === "Achievements" && "Track your progress and unlock new achievements"}
                {activeTab === "Notifications" && "Stay updated with the latest news and updates"}
              </p>
            </div>

            {!isVerified && (
              <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-center justify-between">
                <div className="text-amber-800 text-sm">
                  Verify your email and phone to register for and bookmark events.
                </div>
                <button
                  onClick={() => navigate('/profile?tab=otp')}
                  className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm"
                >
                  Verify now
                </button>
              </div>
            )}

            {/* Content Sections */}
            {activeTab === "Explore" && (
              <div className="space-y-10">
                {hostFilterId && (
                  <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-2">
                    <div className="text-sm text-blue-700">Filtering events by followed host</div>
                    <button onClick={()=> setHostFilterId("")} className="text-xs text-blue-700 hover:underline">Clear</button>
                  </div>
                )}

                {filteredEvents.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 text-slate-900">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                      <Calendar className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">No Events Found</h3>
                    <section className="mt-8">
                      <h3 className="text-xl font-semibold text-slate-900 mb-4">Continue Browsing</h3>
                      {continueBrowsingEvents.length === 0 ? (
                        <div className="text-sm text-slate-500">No recent activity yet.</div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-slate-900">
                          {continueBrowsingEvents.map(event => (
                            <GamifiedEventCard key={event._id} event={event} onRegister={() => registerForEvent(event)} onBookmark={() => { toggleBookmark(event); }} onViewMore={() => openEventDetails(event)} isRegistered={registrations.some(r => r.eventId === event._id)} isBookmarked={bookmarks.includes(event._id)} userStats={userStats} awardPoints={awardPoints} />
                          ))}
                        </div>
                      )}
                    </section>
                  </div>
                ) : (
                  <>
                    {userSettings.recommendations?.showTrendingFirst !== false ? (
                      <>
                        <section>
                          <h3 className="text-xl font-semibold text-slate-900 mb-4">Trending</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {trendingEvents.map(event => (
                              <GamifiedEventCard key={event._id} event={event} onRegister={() => registerForEvent(event)} onBookmark={() => { toggleBookmark(event); }} onViewMore={() => openEventDetails(event)} isRegistered={registrations.some(r => r.eventId === event._id)} isBookmarked={bookmarks.includes(event._id)} userStats={userStats} awardPoints={awardPoints} disabledActions={!isVerified} />
                            ))}
                          </div>
                        </section>

                        <section>
                          <h3 className="text-xl font-semibold text-slate-900 mb-4">Upcoming This Week</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {upcomingWeekEvents.map(event => (
                              <GamifiedEventCard key={event._id} event={event} onRegister={() => registerForEvent(event)} onBookmark={() => { toggleBookmark(event); }} onViewMore={() => openEventDetails(event)} isRegistered={registrations.some(r => r.eventId === event._id)} isBookmarked={bookmarks.includes(event._id)} userStats={userStats} awardPoints={awardPoints} disabledActions={!isVerified} />
                            ))}
                          </div>
                        </section>

                        <section>
                          <h3 className="text-xl font-semibold text-slate-900 mb-4">Recommended For You</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {recommendedEvents.map(event => (
                              <GamifiedEventCard key={event._id} event={event} onRegister={() => registerForEvent(event)} onBookmark={() => { toggleBookmark(event); }} onViewMore={() => openEventDetails(event)} isRegistered={registrations.some(r => r.eventId === event._id)} isBookmarked={bookmarks.includes(event._id)} userStats={userStats} awardPoints={awardPoints} disabledActions={!isVerified} />
                            ))}
                          </div>
                        </section>
                      </>
                    ) : (
                      <>
                        <section>
                          <h3 className="text-xl font-semibold text-slate-900 mb-4">Recommended For You</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {recommendedEvents.map(event => (
                              <GamifiedEventCard key={event._id} event={event} onRegister={() => registerForEvent(event)} onBookmark={() => { toggleBookmark(event); }} onViewMore={() => openEventDetails(event)} isRegistered={registrations.some(r => r.eventId === event._id)} isBookmarked={bookmarks.includes(event._id)} userStats={userStats} awardPoints={awardPoints} disabledActions={!isVerified} />
                            ))}
                          </div>
                        </section>

                        <section>
                          <h3 className="text-xl font-semibold text-slate-900 mb-4">Upcoming This Week</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {upcomingWeekEvents.map(event => (
                              <GamifiedEventCard key={event._id} event={event} onRegister={() => registerForEvent(event)} onBookmark={() => { toggleBookmark(event); }} onViewMore={() => openEventDetails(event)} isRegistered={registrations.some(r => r.eventId === event._id)} isBookmarked={bookmarks.includes(event._id)} userStats={userStats} awardPoints={awardPoints} disabledActions={!isVerified} />
                            ))}
                          </div>
                        </section>

                        <section>
                          <h3 className="text-xl font-semibold text-slate-900 mb-4">Trending</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {trendingEvents.map(event => (
                              <GamifiedEventCard key={event._id} event={event} onRegister={() => registerForEvent(event)} onBookmark={() => { toggleBookmark(event); }} onViewMore={() => openEventDetails(event)} isRegistered={registrations.some(r => r.eventId === event._id)} isBookmarked={bookmarks.includes(event._id)} userStats={userStats} awardPoints={awardPoints} disabledActions={!isVerified} />
                            ))}
                          </div>
                        </section>
                      </>
                    )}
                  </>
                )}
              </div>
            )}

            {activeTab === "Friends" && user?.role === 'student' && (
              <div className="space-y-8">
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm text-slate-900">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Search Users</h3>
                  <UserSearch onViewProfile={(u)=> setProfilePreview(u)} />
                </div>

                <InterestsEditor />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm text-slate-900">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Suggestions</h3>
                    <FriendsSuggestions onViewProfile={(u)=> setProfilePreview(u)} />
                  </div>
                  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm text-slate-900">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Requests</h3>
                    <FriendRequests />
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm text-slate-900">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-900">Friends</h3>
                  </div>
                  <FriendsList onViewProfile={(u)=> setProfilePreview(u)} />
                </div>
              </div>
            )}

            {activeTab === "MyRegs" && (
              <div className="space-y-6">
                {registrations.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 text-slate-900">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                      <Calendar className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">No Registered Events</h3>
                    <p className="text-slate-500">Start exploring events to build your schedule!</p>
                  </div>
                ) : (
                  <>
                    {(()=>{
                      const now = new Date();
                      const regEvents = registrations
                        .map((reg) => events.find(e => e._id === reg.eventId))
                        .filter(Boolean);
                      const upcoming = regEvents.filter(event => {
                        const start = event?.date ? new Date(event.date) : null;
                        const end = event?.endDate ? new Date(event.endDate) : null;
                        if (event?.isCompleted) return false;
                        return end ? end > now : (start ? start > now : true);
                      });
                      const completed = regEvents.filter(event => {
                        const start = event?.date ? new Date(event.date) : null;
                        const end = event?.endDate ? new Date(event.endDate) : null;
                        return (event?.isCompleted) || (end ? end <= now : (start ? start <= now : false));
                      });
                      return (
                        <>
                          <section>
                            <h3 className="text-lg font-semibold text-slate-900 mb-3">Upcoming</h3>
                            {upcoming.length === 0 ? (
                              <div className="text-sm text-slate-500">No upcoming registered events.</div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {upcoming.map(event => (
                                  <GamifiedEventCard
                                    key={event._id}
                                    event={event}
                                    onRegister={() => {}}
                                    onBookmark={() => {}}
                                    onViewMore={() => openEventDetails(event)}
                                    isRegistered={true}
                                    isBookmarked={bookmarks.includes(event._id)}
                                    userStats={userStats}
                                    awardPoints={awardPoints}
                                    disabledActions={true}
                                  />
                                ))}
                              </div>
                            )}
                          </section>
                          <section className="pt-4">
                            <h3 className="text-lg font-semibold text-slate-900 mb-3">Completed</h3>
                            {completed.length === 0 ? (
                              <div className="text-sm text-slate-500">No completed events yet.</div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {completed.map(event => {
                                  const reg = registrations.find(r => r.eventId === event._id) || {};
                                  const attended = !!reg.attended;
                                  return (
                                    <div key={event._id} className="space-y-2">
                                      <GamifiedEventCard
                                        event={event}
                                        onRegister={() => {}}
                                        onBookmark={() => {}}
                                        onViewMore={() => openEventDetails(event)}
                                        isRegistered={true}
                                        isBookmarked={bookmarks.includes(event._id)}
                                        userStats={userStats}
                                        awardPoints={awardPoints}
                                        disabledActions={true}
                                      />
                                      <div className="flex items-center justify-between text-sm">
                                        {attended ? (
                                          <div className="flex items-center gap-2">
                                            <button
                                              onClick={() => handleDownloadCertificate(event)}
                                              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200"
                                            >
                                              Download Certificate
                                            </button>
                                            <button
                                              onClick={() => handleNavigateToReview(event._id)}
                                              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                                            >
                                              Write Review
                                            </button>
                                          </div>
                                        ) : (
                                          <span className="px-3 py-1.5 rounded-lg bg-red-50 text-red-700 border border-red-200">Did not attend</span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </section>
                        </>
                      );
                    })()}
                  </>
                )}
              </div>
            )}

            {activeTab === "Bookmarks" && (
              <div className="space-y-6">
                {bookmarks.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 text-slate-900">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                      <Bookmark className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">No Bookmarks Yet</h3>
                    <p className="text-slate-500">Save events you're interested in!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {bookmarks.map((bookmarkId) => { 
                      const event = events.find(e => e._id === bookmarkId); 
                      return event ? (
                        <GamifiedEventCard 
                          key={event._id} 
                          event={event} 
                          onRegister={() => registerForEvent(event)} 
                          onBookmark={() => { toggleBookmark(event); }} 
                          onViewMore={() => {}} 
                          isRegistered={registrations.some(r => r.eventId === event._id)} 
                          isBookmarked={true} 
                          userStats={userStats} 
                          awardPoints={awardPoints} 
                        />
                      ) : null; 
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === "SubscribedHosts" && (
              <div className="space-y-6">
                {subscribedHosts.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                      <Users className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">Not Following Anyone Yet</h3>
                    <p className="text-slate-500">Follow hosts to get updates on their events!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {subscribedHosts.map((h) => (
                      <div key={h._id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200 text-slate-900">
                        <div className="flex items-center space-x-4 mb-4">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center">
                            <Users className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-slate-900">{h.fullname || h.username}</h3>
                            <p className="text-sm text-slate-600">{h.email}</p>
                          </div>
                        </div>
                        <div className="flex space-x-3">
                          <button
                            onClick={()=>{ navigate(`/host/${h._id}`, { state: { fromSection: activeTab } }); }}
                            className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all duration-200"
                          >
                            View Host
                          </button>
                          <button
                            onClick={async ()=>{
                              const token = localStorage.getItem("token");
                              if(!token) { toast.error("Please login"); navigate('/login'); return; }
                              try {
                                await api.delete(`/api/subscriptions/${h._id}`, { headers: { Authorization: `Bearer ${token}` } });
                                setSubscribedHosts(prev => prev.filter(x => x._id !== h._id));
                                toast.success('Unfollowed');
                              } catch(e) {
                                toast.error(e?.response?.data?.error || 'Failed to unfollow');
                              }
                            }}
                            className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl transition-all duration-200"
                          >
                            Unfollow
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "Leaderboard" && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm text-slate-900">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Friends Leaderboard</h3>
                  {leaderboardLoading ? (
                    <div className="text-sm text-slate-600">Loading leaderboard...</div>
                  ) : leaderboardUsers.length === 0 ? (
                    <div className="text-sm text-slate-600">
                      No friends to rank yet. Add friends to see the leaderboard.
                      <button onClick={() => setActiveTab('Friends')} className="ml-2 text-blue-600 hover:underline">Go to Friends</button>
                    </div>
                  ) : (
                    <Leaderboard users={leaderboardUsers} currentUserId={user?._id || user?.id} />
                  )}
                </div>
              </div>
            )}

            {activeTab === "Achievements" && (
              <div className="space-y-8">
                <LevelProgress currentLevel={currentLevel} nextLevel={nextLevel} progress={levelProgress} points={userStats.points} />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatsCard title="Events Attended" value={userStats.totalEvents} icon={Calendar} color="blue" />
                  <StatsCard title="Bookmarks" value={userStats.totalBookmarks} icon={Bookmark} color="purple" />
                  <StatsCard title="Following" value={userStats.totalSubscriptions} icon={Users} color="pink" />
                  <StatsCard title="Reviews" value={userStats.totalReviews} icon={MessageSquare} color="green" />
                </div>
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm text-slate-900">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Career Readiness</h3>
                  <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${careerReadiness}%` }} />
                  </div>
                  <div className="mt-2 text-sm text-slate-700">{careerReadiness}% based on points, events, streaks, and badges</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm text-slate-900">
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Streaks</h3>
                    <p className="text-sm text-slate-700">Current activity streak</p>
                    <div className="mt-3 text-3xl font-bold text-blue-600">{streakDays} days</div>
                  </div>
                  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm text-slate-900">
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Level / Rank</h3>
                    <p className="text-sm text-slate-700">{currentLevel.name} • Level {currentLevel.level}</p>
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm text-slate-900">
                  <h3 className="text-xl font-semibold mb-6 flex items-center">
                    <Award className="w-6 h-6 mr-2 text-amber-600" />
                    Badge Collection
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                    {GAMIFICATION.badges.map((badge) => (
                      <div key={badge.id} className="text-center">
                        <AchievementBadge badge={badge} earned={userStats.badges.includes(badge.id)} size="lg" />
                        <div className="mt-3">
                          <div className="text-sm font-medium text-slate-900">{badge.name}</div>
                          <div className="text-xs text-slate-600">{badge.description}</div>
                          <div className="text-xs text-amber-600 mt-1">+{badge.points} pts</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm text-slate-900">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Skill Progress</h3>
                  <div className="space-y-4">
                    {Object.entries(skillProgress).map(([skill, score]) => (
                      <div key={skill}>
                        <div className="flex justify-between text-sm mb-1 text-slate-700">
                          <span>{skill}</span>
                          <span>{score}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                          <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${score}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm text-slate-900">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Event Attendance History</h3>
                  {attendanceHistory.length === 0 ? (
                    <p className="text-sm text-slate-600">No events yet.</p>
                  ) : (
                    <div className="divide-y divide-slate-200">
                      {attendanceHistory.map((h, idx) => (
                        <div key={idx} className="py-3 flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-slate-900">{h.title}</div>
                            <div className="text-xs text-slate-600">{new Date(h.date).toLocaleString()} • {h.type}</div>
                          </div>
                          <button onClick={() => navigate(`/review/${h.eventId}`)} className="text-sm text-blue-600 hover:underline">
                            Review
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Recommendation Feedback</h3>
                  {recommendationFeedback.length === 0 ? (
                    <p className="text-sm text-slate-600">No feedback yet.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {recommendationFeedback.map((f, i) => (
                        <div key={i} className="p-4 border border-slate-200 rounded-xl bg-slate-50">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-slate-900">Rating: {f.rating}/5</span>
                            <span className={`text-xs ${f.liked ? 'text-green-600' : 'text-red-600'}`}>
                              {f.liked ? 'Liked' : 'Disliked'}
                            </span>
                          </div>
                          {f.comment && <div className="text-sm text-slate-700 line-clamp-2">{f.comment}</div>}
                          <div className="text-xs text-slate-500 mt-1">{new Date(f.at).toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "Notifications" && (
              <div className="space-y-4">
                {notifications.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 text-slate-900">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                      <BellRing className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">No Notifications</h3>
                    <p className="text-slate-500">You're all caught up!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notifications.slice(0, 20).map((n, idx) => (
                      <div key={idx} className="bg-white rounded-xl p-4 border border-slate-200 hover:shadow-sm transition-all duration-300">
                        <div className="flex items-start space-x-4">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center">
                            <BellRing className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="text-slate-900 font-medium">{n.message}</p>
                            <p className="text-sm text-slate-500 mt-1">{new Date(n.at).toLocaleString()}</p>
                          </div>
                          {!n.read && <div className="w-3 h-3 bg-blue-500 rounded-full"></div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
      {detailOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <EventDetailModal
            event={selectedEvent}
            isOpen={detailOpen}
            onClose={closeEventDetails}
            user={user}
            onRegister={registerFromDetails}
            onBookmark={(ev)=> toggleBookmark(ev)}
            onSubscribe={(ev)=> handleSubscribeHost(ev)}
            onNavigateToReview={handleNavigateToReview}
            onDownloadCertificate={handleDownloadCertificate}
            isRegistered={(id)=> registrations.some(r => r.eventId === id)}
            isBookmarked={(id)=> bookmarks.includes(id)}
            isSubscribed={(selectedEvent?.hostId && isSubscribedToHost(selectedEvent.hostId._id || selectedEvent.hostId))}
            onOpenHost={(hid)=> navigate(`/host/${hid}`, { state: { fromSection: activeTab } })}
            certificateId={selectedEvent ? certIds[selectedEvent._id] : undefined}
            disabledActions={!isVerified}
          />
        </div>
      )}

      {profilePreview && (
        <UserProfileModal user={profilePreview} onClose={()=> setProfilePreview(null)} />
      )}
    </div>
  );
}