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
  UserPen, ShieldCheck, Shield, Award, Crown, Users, UsersRound, Gamepad2, UserPlus,
  ChevronLeft, ChevronRight, Menu, X, Home, Play, Settings,
  MoreVertical, Filter, Grid3X3, List, Flame, Brain, Trash2,
  Heart, Share2, Flag, Star, Target, Zap, History, TrendingUp, ArrowLeft, Sparkles, Wallet
} from "lucide-react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { logEvent } from "../utils/analytics";

// --- Notification Detail Modal ---
const NotificationDetailModal = ({ isOpen, onClose, notification }) => {
  if (!isOpen || !notification) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-white w-full max-w-lg border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 flex flex-col gap-4"
      >
        <div className="flex items-center justify-between border-b-2 border-black pb-4">
          <h3 className="text-xl font-black uppercase tracking-wide flex items-center gap-2">
            <BellRing className="w-6 h-6" />
            Notification
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-neutral-100 border-2 border-transparent hover:border-black transition-all">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-neutral-500">
            <span>{new Date(notification.at).toLocaleString()}</span>
            <span className="w-1 h-1 bg-black rounded-full" />
            <span>{notification.type || "General"}</span>
          </div>

          <h4 className="text-lg font-bold">{notification.title || "Notification"}</h4>

          <div className="text-sm font-medium leading-relaxed bg-neutral-50 p-4 border-2 border-dashed border-neutral-300">
            {notification.fullContent || notification.message}
          </div>

          {notification.actionLabel && (
            <button
              onClick={() => { notification.onAction?.(); onClose(); }}
              className="w-full py-3 bg-black text-white font-bold uppercase tracking-widest hover:bg-neutral-800 transition-colors border-2 border-transparent"
            >
              {notification.actionLabel}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// --- Animated Background Component ---
const DashboardBackground = () => (
  <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none bg-white">
    <motion.div
      className="absolute inset-0 opacity-30 blur-3xl"
      animate={{
        background: [
          "radial-gradient(at 0% 0%, #ffdee9 0%, transparent 50%), radial-gradient(at 100% 0%, #c1fcd3 0%, transparent 50%)",
          "radial-gradient(at 100% 100%, #ffdee9 0%, transparent 50%), radial-gradient(at 0% 0%, #c1fcd3 0%, transparent 50%)"
        ]
      }}
      transition={{ duration: 20, repeat: Infinity, repeatType: "reverse" }}
    />
    <div className="absolute inset-0 z-0 opacity-20"
      style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)', backgroundSize: '40px 40px', color: '#000' }}>
    </div>
  </div>
);
import {
  GamifiedEventCard, AchievementBadge, BadgeCard, LevelProgress, StatsCard, Leaderboard, SkillLeagues
} from "../components/GamifiedComponents";
import BadgeDetailModal from "../components/BadgeDetailModal";
import FriendsSuggestions from "../components/friends/FriendsSuggestions";
import SupportChatbot from "../components/SupportChatbot";
import FriendRequests from "../components/friends/FriendRequests";
import FriendsList from "../components/friends/FriendsList";
import UserSearch from "../components/friends/UserSearch";
import UserProfileModal from "../components/friends/UserProfileModal";
import InterestsEditor from "../components/friends/InterestsEditor";
import EventsNearMe from "../components/EventsNearMe";
import SquadManager from "../components/squads/SquadManager";
import TicketWallet from "../components/TicketWallet";
import EventMap from "../components/EventMap";
import LiveSentimentFeed from "../components/dashboard/LiveSentimentFeed";
import BucketListGoals from "../components/dashboard/BucketListGoals";
import DashboardChat from "../components/chat/DashboardChat";

const GAMIFICATION = {
  points: { register: 50, bookmark: 5, subscribe: 20, feedback: 30, review: 15, certificate: 100, streak: 5, firstEvent: 100, social: 10 },
  levels: [
    // Dynamic levels up to 500
    // Formula: Points = 10 * Level^2
    // We only define major milestones here for the UI "Next Level" target, 
    // but the progress bar should calculate based on current level + 1.
    { level: 1, name: "Rookie", minPoints: 0, color: "#9ca3af", icon: "🌱" },
    { level: 10, name: "Explorer", minPoints: 1000, color: "#60a5fa", icon: "🚀" },
    { level: 50, name: "Enthusiast", minPoints: 25000, color: "#a78bfa", icon: "⭐" },
    { level: 100, name: "Expert", minPoints: 100000, color: "#facc15", icon: "🏆" },
    { level: 500, name: "Legend", minPoints: 2500000, color: "#34d399", icon: "🌟" }
  ],
  badges: [
    // Socialite
    { id: "socialite_bronze", tier: "bronze", name: "Friendly Face", description: "Connected with 1 friend", icon: "👋", points: 50, criteria: [{ id: 'friendsConnected', required: 1, label: 'Friends Connected' }] },
    { id: "socialite_silver", tier: "silver", name: "Popular Pal", description: "Connected with 10 friends", icon: "🤝", points: 150, criteria: [{ id: 'friendsConnected', required: 10, label: 'Friends Connected' }] },
    { id: "socialite_gold", tier: "gold", name: "Community Pillar", description: "Connected with 50 friends", icon: "👑", points: 500, criteria: [{ id: 'friendsConnected', required: 50, label: 'Friends Connected' }] },
    // Curator
    { id: "curator_bronze", tier: "bronze", name: "Collector", description: "Bookmarked 5 events", icon: "📌", points: 30, criteria: [{ id: 'bookmark_events', required: 5, label: 'Events Bookmarked' }] },
    { id: "curator_silver", tier: "silver", name: "Librarian", description: "Bookmarked 20 events", icon: "📚", points: 100, criteria: [{ id: 'bookmark_events', required: 20, label: 'Events Bookmarked' }] },
    { id: "curator_gold", tier: "gold", name: "Museum Keeper", description: "Bookmarked 100 events", icon: "🏛️", points: 300, criteria: [{ id: 'bookmark_events', required: 100, label: 'Events Bookmarked' }] },
    // Explorer
    { id: "explorer_bronze", tier: "bronze", name: "First Steps", description: "Attended 1 event", icon: "🌱", points: 50, criteria: [{ id: 'attend_event', required: 1, label: 'Events Attended' }] },
    { id: "explorer_silver", tier: "silver", name: "Adventurer", description: "Attended 5 events", icon: "🧭", points: 200, criteria: [{ id: 'attend_event', required: 5, label: 'Events Attended' }] },
    { id: "explorer_gold", tier: "gold", name: "Globe Trotter", description: "Attended 20 events", icon: "🌎", points: 800, criteria: [{ id: 'attend_event', required: 20, label: 'Events Attended' }] },
    // Critic
    { id: "critic_bronze", tier: "bronze", name: "Voice", description: "Wrote 1 review", icon: "🗣️", points: 20, criteria: [{ id: 'write_reviews', required: 1, label: 'Reviews Written' }] },
    { id: "critic_silver", tier: "silver", name: "Reviewer", description: "Wrote 10 reviews", icon: "✍️", points: 100, criteria: [{ id: 'write_reviews', required: 10, label: 'Reviews Written' }] },
    { id: "critic_gold", tier: "gold", name: "Tastemaker", description: "Wrote 25 reviews", icon: "🎭", points: 400, criteria: [{ id: 'write_reviews', required: 25, label: 'Reviews Written' }] },
    // Dedicated
    { id: "dedicated_bronze", tier: "bronze", name: "Regular", description: "3-day login streak", icon: "📅", points: 30, criteria: [{ id: 'maintain_streak', required: 3, label: 'Day Streak' }] },
    { id: "dedicated_silver", tier: "silver", name: "Committed", description: "7-day login streak", icon: "🔥", points: 100, criteria: [{ id: 'maintain_streak', required: 7, label: 'Day Streak' }] },
    { id: "dedicated_gold", tier: "gold", name: "Unstoppable", description: "30-day login streak", icon: "🚀", points: 500, criteria: [{ id: 'maintain_streak', required: 30, label: 'Day Streak' }] },
    // Verified
    { id: "email_verified", tier: "gold", name: "Verified Member", description: "Verified your email address (+150 XP)", icon: "✅", points: 150, criteria: [{ id: 'emailVerified', required: 1, label: 'Email Verified' }] }
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
  try { const raw = localStorage.getItem(key); return raw ? { ...fallback, ...JSON.parse(raw) } : fallback; } catch (_) { return fallback; }
};
const saveLS = (key, value) => localStorage.setItem(key, JSON.stringify(value));

export default function Dashboard() {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [activeTab, setActiveTab] = useState("Explore");
  const [subscribedHosts, setSubscribedHosts] = useState([]);
  const [userStats, setUserStats] = useState({ points: 0, level: 1, tier: 'Bronze', seasonPoints: 0, skillXP: {}, badges: [], streak: 0, achievements: [], totalEvents: 0, totalBookmarks: 0, totalSubscriptions: 0, totalReviews: 0 });
  const [registrations, setRegistrations] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [isVerified, setIsVerified] = useState(true);
  const [leaderboardUsers, setLeaderboardUsers] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardCategory, setLeaderboardCategory] = useState('global');
  const [leaderboardSkill, setLeaderboardSkill] = useState(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [navCollapsed, setNavCollapsed] = useState(true);
  const [navOverlayOpen, setNavOverlayOpen] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [badgeModalOpen, setBadgeModalOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const [aiEvents, setAiEvents] = useState(null);
  const [isSearchingAI, setIsSearchingAI] = useState(false);
  const [parsedSearchParams, setParsedSearchParams] = useState(null);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [exploreSubTab, setExploreSubTab] = useState('All'); // 'All' | 'For You' | 'Trending' | 'Completed'
  const [aiRecs, setAiRecs] = useState([]);
  const [aiRecsLoading, setAiRecsLoading] = useState(false);
  const [liveSubTab, setLiveSubTab] = useState('Vibes'); // 'Vibes' | 'Chat'

  const getSearchKey = () => user?.email ? `student.recentSearches:${user.email}` : "student.recentSearches";

  // Load recent searches on mount or when user changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(getSearchKey());
      if (saved) setRecentSearches(JSON.parse(saved));
      else setRecentSearches([]);
    } catch (e) { }
  }, [user?.email]);

  const handleSearchSubmit = (query) => {
    if (!query.trim()) return;
    setSearchQuery(query);
    setSearchFocused(true);

    // Manage history per-user or global if guest
    setRecentSearches(prev => {
      const newHistory = [query.trim(), ...prev.filter(item => item.toLowerCase() !== query.trim().toLowerCase())].slice(0, 5);
      localStorage.setItem(getSearchKey(), JSON.stringify(newHistory));
      return newHistory;
    });
  };
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [hostFilterId, setHostFilterId] = useState("");
  const [certIds, setCertIds] = useState({}); // eventId -> certificateId
  const [myCircles, setMyCircles] = useState([]); // New state for circles
  const [friendsSubTab, setFriendsSubTab] = useState("Friends"); // Sub-tab for Social hub
  const [notifOpen, setNotifOpen] = useState(false);
  const navigate = useNavigate();
  const [profilePreview, setProfilePreview] = useState(null); // friend profile modal
  const [calendarDate, setCalendarDate] = useState(new Date()); // month anchor for Calendar tab
  const [calendarView, setCalendarView] = useState('month'); // 'month' | 'week'
  const [dayModal, setDayModal] = useState({ open: false, key: null, date: null, upcoming: [], attended: [] });
  const [calendarOverlayOpen, setCalendarOverlayOpen] = useState(false); // dropdown-like large overlay
  const calendarBtnRef = useRef(null);
  const [overlayPos, setOverlayPos] = useState({ top: 0, left: 0, width: 0 });

  // Notification Logic
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [notifModalOpen, setNotifModalOpen] = useState(false);
  const prevReqCount = useRef(0);

  // Fetch Notifications from Server
  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      const { data } = await api.get('/api/notifications', headers);
      setNotifications(data || []);

      const shRes = await api.get('/api/subscriptions', headers);
      setSubscribedHosts(shRes.data?.subscribedHosts || []);
      
      const circlesRes = await api.get('/api/circles/joined', headers);
      setMyCircles(circlesRes.data || []);
    } catch (e) {
      console.error("Failed to fetch notifications", e);
    }
  };

  // Initial Fetch & Polling
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Sync every 30s
    return () => clearInterval(interval);
  }, []);


  const addNotification = async (notif) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      await api.post('/api/notifications', notif, { headers: { Authorization: `Bearer ${token}` } });
      fetchNotifications(); // Refresh list

      // Toast Notification
      toast(notif.message, {
        className: "brutalist-toast",
        bodyClassName: "brutalist-toast-body",
        progressClassName: "brutalist-toast-progress",
        icon: notif.type === 'Achievement' ? '🏆' : (notif.type === 'Friend Request' ? '👋' : '📢')
      });
    } catch (e) {
      console.error("Failed to create notification", e);
    }
  };

  const markNotificationRead = async (id) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      await api.put(`/api/notifications/${id}/read`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    } catch (e) {
      console.error("Failed to mark read", e);
    }
  };

  const deleteNotification = async (e, id) => {
    e.stopPropagation();
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      await api.delete(`/api/notifications/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setNotifications(prev => prev.filter(n => n._id !== id));
      if (selectedNotification?._id === id) setNotifModalOpen(false);
      toast.success("Notification deleted");
    } catch (e) {
      toast.error("Failed to delete");
    }
  };
  const viewNotification = (n) => {
    if (!n.read) markNotificationRead(n._id);
    setSelectedNotification(n);
    setNotifModalOpen(true);
  };

  const handleFriendRequest = async (e, n, action) => {
    e.stopPropagation();
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      await api.put(`/api/friends/requests/${n.data.requestId}/${action}`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(`Friend request ${action === 'accept' ? 'accepted' : 'declined'}`);
      
      // Update notification status to processed instead of deleting
      await api.patch(`/api/notifications/${n._id}/status`, { status: 'processed' }, { headers: { Authorization: `Bearer ${token}` } });
      setNotifications(prev => prev.map(x => x._id === n._id ? { ...x, status: 'processed', read: true } : x));
    } catch (err) {
      toast.error(err?.response?.data?.error || `Failed to ${action} request`);
    }
  };

  const handleSquadNotification = async (e, n, action) => {
    e.stopPropagation();
    try {
      const token = localStorage.getItem('token');
      await api.post(`/api/squads/${n.data.squadId}/respond`, { action }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(`Squad invite ${action}ed`);
      
      // Update notification status to processed instead of deleting
      await api.patch(`/api/notifications/${n._id}/status`, { status: 'processed' }, { headers: { Authorization: `Bearer ${token}` } });
      setNotifications(prev => prev.map(x => x._id === n._id ? { ...x, status: 'processed', read: true } : x));
      
      if (action === 'accept') {
        setActiveTab("Squads");
        setNotifOpen(false);
      }
    } catch (err) {
      toast.error(err?.response?.data?.error || `Failed to ${action} invite`);
    }
  };

  const handleCircleNotification = async (e, n, action) => {
    e.stopPropagation();
    try {
      const token = localStorage.getItem('token');
      await api.post(`/api/circles/${n.data.circleId}/respond-invite`, { action }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(`Circle invite ${action === 'accept' ? 'accepted' : 'declined'}`);
      
      // Update notification status to processed instead of deleting
      await api.patch(`/api/notifications/${n._id}/status`, { status: 'processed' }, { headers: { Authorization: `Bearer ${token}` } });
      setNotifications(prev => prev.map(x => x._id === n._id ? { ...x, status: 'processed', read: true } : x));
      
      if (action === 'accept') {
        setActiveTab("Friends");
        setFriendsSubTab("Circles");
        setNotifOpen(false);
      }
    } catch (err) {
      toast.error(err?.response?.data?.error || `Failed to ${action} invite`);
    }
  };


  // Scroll Effect
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const computeOverlayPosition = () => {
    try {
      const btn = calendarBtnRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const panelWidth = Math.min(window.innerWidth * 0.95, 1100);
      const margin = 8;
      // Align panel's right edge with button's right edge, clamped to viewport
      const left = Math.max(16, Math.min(rect.right - panelWidth, window.innerWidth - panelWidth - 16));
      // Since the overlay's constraint is fixed to screen, don't add scrollY
      const top = rect.bottom + margin;
      setOverlayPos({ top, left, width: panelWidth });
    } catch { }
  };
  const [userSettings, setUserSettings] = useState({
    ui: { sidebarCollapsedDefault: false },
    recommendations: { showTrendingFirst: true, personalizeUsingOnboarding: true }
  });

  const currentLevel = useMemo(() => {
    // Trust server data if available, otherwise fallback to basic calculation
    // Server now uses 100 XP per level
    const lvl = userStats.level || 1;

    return {
      level: lvl,
      name: userStats.tier || 'Bronze',
      points: userStats.points || 0,
      minPoints: lvl === 1 ? 0 : Math.pow(lvl, 2) * 10
    };
  }, [userStats.points, userStats.level, userStats.tier]);

  const nextLevel = useMemo(() => {
    const nextLvl = currentLevel.level + 1;
    return {
      level: nextLvl,
      minPoints: Math.pow(nextLvl, 2) * 10
    };
  }, [currentLevel]);

  const levelProgress = useMemo(() => {
    const currentLvlMin = currentLevel.minPoints;
    const nextLvlMin = nextLevel.minPoints;
    const range = nextLvlMin - currentLvlMin;
    const progress = userStats.points - currentLvlMin;
    return Math.max(0, Math.min(100, (progress / range) * 100));
  }, [userStats.points, currentLevel, nextLevel]);

  const userKey = (base) => { const email = user?.email || null; return email ? `${base}:${email}` : base; };

  // Derived metrics
  const attendanceHistory = useMemo(() => (registrations || []).map(r => { const ev = (events || []).find(e => e._id === r.eventId) || {}; return { eventId: r.eventId, title: ev.title || "Event", date: ev.date || r.at, type: ev.category || (ev.isOnline ? "Online" : (ev.location ? "Offline" : "Event")) }; }).slice(0, 10), [registrations, events]);
  const recommendationFeedback = useMemo(() => (feedbacks || []).slice(0, 10).map(f => {
    const eId = f.eventId?._id || f.eventId;
    const rating = f.rating || f.overallRating || 0;
    const at = f.at || f.createdAt || Date.now();
    return { eventId: eId, rating, liked: rating >= 4, comment: f.comment, at };
  }), [feedbacks]);
  const skillProgress = useMemo(() => {
    // 1. Initialize Base Skills
    const skills = {
      Communication: 10,
      Coding: 10,
      Marketing: 10,
      Design: 10,
      Technical: 10,
      Management: 10,
      Wellness: 10,
      Analysis: 10,
      Creativity: 10,
      Teamwork: 10
    };

    // 2. Onboarding Data Boost (+10 points)
    const onboarding = userSettings.onboardingData || {};
    const factors = [
      ...(onboarding.preferredCareerSectors || []),
      ...(onboarding.skillsToDevelop || []),
      ...(onboarding.hobbies || [])
    ].map(s => String(s).toLowerCase());

    const boostSkill = (skillName, keywords) => {
      if (factors.some(f => keywords.some(k => f.includes(k)))) {
        skills[skillName] = Math.min(100, skills[skillName] + 10);
      }
    };

    boostSkill('Coding', ['tech', 'software', 'developer', 'coding', 'python', 'java', 'web']);
    boostSkill('Technical', ['tech', 'engineering', 'data', 'cloud', 'security']);
    boostSkill('Marketing', ['marketing', 'business', 'sales', 'growth', 'social']);
    boostSkill('Management', ['management', 'leader', 'business', 'finance', 'startup']);
    boostSkill('Design', ['design', 'creative', 'art', 'ui', 'ux']);
    boostSkill('Creativity', ['creative', 'art', 'media', 'writer', 'content']);
    boostSkill('Communication', ['communication', 'public speaking', 'teaching', 'education']);
    boostSkill('Wellness', ['health', 'finance', 'yoga', 'mental']);
    boostSkill('Analysis', ['analyst', 'data', 'research', 'science']);
    boostSkill('Teamwork', ['team', 'sport', 'group', 'community']);


    // 3. Event Attendance Boost (+15 points per event)
    const attendedEvents = (registrations || [])
      .map(r => (events || []).find(e => e._id === r.eventId))
      .filter(Boolean);

    attendedEvents.forEach(ev => {
      const cat = String(ev.category || "General").toLowerCase();
      // Logic from Plan
      if (cat.includes('tech')) {
        skills.Coding = Math.min(100, skills.Coding + 15);
        skills.Technical = Math.min(100, skills.Technical + 15);
      }
      if (cat.includes('business')) {
        skills.Marketing = Math.min(100, skills.Marketing + 15);
        skills.Management = Math.min(100, skills.Management + 15);
      }
      if (cat.includes('education')) {
        skills.Communication = Math.min(100, skills.Communication + 15);
        skills.Teamwork = Math.min(100, skills.Teamwork + 5);
      }
      if (cat.includes('health')) {
        skills.Wellness = Math.min(100, skills.Wellness + 15);
        skills.Analysis = Math.min(100, skills.Analysis + 5);
      }
      if (cat.includes('entertainment') || cat.includes('design')) {
        skills.Design = Math.min(100, skills.Design + 15);
        skills.Creativity = Math.min(100, skills.Creativity + 15);
      }
      if (cat.includes('sports')) {
        skills.Teamwork = Math.min(100, skills.Teamwork + 15);
        skills.Wellness = Math.min(100, skills.Wellness + 10);
      }
      if (cat.includes('other') || cat.includes('general')) {
        skills.Communication = Math.min(100, skills.Communication + 5);
      }
    });

    // Filter out skills that are still at base 10 (optional, or keep them)
    // For a nice UI, let's return all but sort or pick top ones in the UI
    return skills;
  }, [registrations, events, userSettings.onboardingData]);
  const careerReadiness = useMemo(() => { const ps = Math.min(100, (userStats.points / 1000) * 100); const es = Math.min(100, (userStats.totalEvents / 10) * 100); const ss = Math.min(100, (userStats.streak / 7) * 100); const bs = Math.min(100, ((userStats.badges?.length || 0) / 6) * 100); return Math.round(ps * 0.35 + es * 0.25 + ss * 0.2 + bs * 0.2); }, [userStats.points, userStats.totalEvents, userStats.badges, userStats.streak]);

  // Sync tab from query param on mount and when URL changes (top-level hook)
  useEffect(() => {
    const qs = new URLSearchParams(location.search);
    const tab = qs.get('tab');
    if (tab && ["Explore", "MyRegs", "Calendar", "Bookmarks", "SubscribedHosts", "Friends", "Leaderboard", "Achievements", "Notifications"].includes(tab)) {
      setActiveTab(tab);
      
      // Also handle sub-tabs for specific tabs like Friends
      if (tab === "Friends") {
        const sub = qs.get('subTab');
        if (sub && ["Friends", "Squads", "Circles"].includes(sub)) {
          setFriendsSubTab(sub);
        }
      }
    }
  }, [location.search]);

  // Smart Search (NLP) Debounce Effect
  useEffect(() => {
    const query = searchQuery.trim();
    if (!query) {
      setAiEvents(null);
      setIsSearchingAI(false);
      return;
    }

    // Only trigger AI search if the query is not empty
    if (!query) {
      setAiEvents(null);
      setIsSearchingAI(false);
      return;
    }

    setIsSearchingAI(true);
    const timeoutId = setTimeout(async () => {
      try {
        const { data } = await api.post('/api/host/public/smart-search', { query });
        if (data && data.events) {
          // If the API says fallback is true, it means AI failed entirely and returned standard local search results from backend.
          setAiEvents(data.events);
          setParsedSearchParams(data.parsedQuery || null);
        } else {
          setAiEvents(null); // Fallback to frontend local filtering
          setParsedSearchParams(null);
        }
      } catch (e) {
        console.error("Smart search failed:", e);
        setAiEvents(null); // Safely sets aiEvents to null so the `filteredEvents` useMemo naturally takes over with local filtering
        setParsedSearchParams(null);
      } finally {
        setIsSearchingAI(false);
      }
    }, 800);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const filteredEvents = useMemo(() => {
    let base = events || [];

    // Exclude completed/past events in Explore/Home
    // ... existing logic ...
    const now = new Date();

    base = base.filter(e => {
      // Filter out completed events
      if (e?.isCompleted) return false;

      const start = e?.date ? new Date(e.date) : null;
      const end = e?.endDate ? new Date(e.endDate) : null;

      // If event has an end date, check if it has passed
      if (end) {
        return end > now;
      }

      // If no end date, check if start date has passed
      if (start) {
        return start > now;
      }

      // If no dates, exclude by default (invalid event)
      return false;
    });

    if (hostFilterId) {
      base = base.filter(e => String(e.hostId?._id || e.hostId) === String(hostFilterId));
    }
    
    return base;
  }, [events, hostFilterId]);

  // Explore sections heuristics
  const trendingEvents = useMemo(() => {
    const base = (filteredEvents || []).slice();
    // score by bookmarks + registrations length, fallback to date recency
    const scored = base.map(e => ({
      e,
      score: (Array.isArray(e.bookmarks) ? e.bookmarks.length : 0) + (Array.isArray(e.registrations) ? e.registrations.length : 0),
    }));
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.e.date) - new Date(a.e.date);
    });
    return scored.map(x => x.e).slice(0, 6);
  }, [filteredEvents]);

  const upcomingWeekEvents = useMemo(() => {
    const now = new Date();
    const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return (filteredEvents || [])
      .filter(e => {
        const d = new Date(e.date);
        return d > now && d <= weekAhead;
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 6);
  }, [filteredEvents]);

  const completedEvents = useMemo(() => {
    const now = new Date();
    return (events || [])
      .filter(e => {
        if (e.isCompleted) return true;
        const d = e.endDate ? new Date(e.endDate) : (e.date ? new Date(e.date) : null);
        return d && d < now;
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [events]);


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
  const dayKey = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  const weekStart = useMemo(() => {
    const d = new Date(calendarDate);
    const day = (d.getDay() + 6) % 7; // Monday=0
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [calendarDate]);
  const weekDays = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 7; i++) arr.push(new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i));
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
        if (["INPUT", "TEXTAREA", "SELECT"].includes(String(tag).toUpperCase())) return;
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
    const recent = (registrations || [])
      .slice(0, 6)
      .map(r => (events || []).find(e => e._id === r.eventId))
      .filter(Boolean);
    return recent;
  }, [registrations, events]);

  const awardPoints = async (action, amount = null) => {
    const pts = amount || GAMIFICATION.points[action] || 0; if (pts <= 0) return;

    // Optimistic UI update
    setUserStats(prev => {
      const next = { ...prev, points: prev.points + pts };
      const newLevel = GAMIFICATION.levels.slice().reverse().find(l => next.points >= l.minPoints) || GAMIFICATION.levels[0];
      if (newLevel.level > prev.level) {
        toast.success(`🎉 Level Up! You're now a ${newLevel.name}!`, { autoClose: 5000, style: { background: newLevel.color, color: 'white' } });
        next.level = newLevel.level;
      }
      return next;
    });
    toast.success(`+${pts} points!`, { autoClose: 2000, style: { background: '#10B981', color: 'white' } });

    // Persist to backend
    try {
      if (localStorage.getItem('token')) {
        await api.post('/api/gamification/points', { action });
      }
    } catch (e) {
      console.error("Failed to persist points:", e);
    }
  };

  const isSubscribedToHost = (hostId) => {
    if (!hostId) return false;
    return (subscribedHosts || []).some(h => String(h._id || h) === String(hostId));
  };

  const handleBookmarkToggle = async (event) => {
    try {
      if (!event?._id) return;
      const token = localStorage.getItem("token");
      if (!token) { toast.error("Please login to bookmark"); navigate("/login"); return; }

      const isBookmarked = bookmarks.includes(event._id);
      const headers = { headers: { Authorization: `Bearer ${token}` } };

      // Optimistic update
      if (isBookmarked) {
        setBookmarks(prev => prev.filter(id => id !== event._id));
        toast.success("Bookmark removed");
        try {
          await api.delete(`/api/bookmarks/${event._id}`, headers);
        } catch (err) {
          // Revert on failure
          setBookmarks(prev => [...prev, event._id]);
          throw err;
        }
      } else {
        setBookmarks(prev => [...prev, event._id]);
        awardPoints('bookmark');
        toast.success("Event bookmarked!");
        try {
          await api.post('/api/bookmarks', { eventId: event._id }, headers);
        } catch (err) {
          // Revert on failure
          setBookmarks(prev => prev.filter(id => id !== event._id));
          throw err;
        }
      }
    } catch (e) {
      console.error("Bookmark toggle error", e);
      const msg = e?.response?.data?.error || "Failed to update bookmark";
      toast.error(msg);
    }
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
        setSubscribedHosts(prev => prev.filter(h => String((h._id || h)) !== String(hostId)));
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

    // Track click analytics
    if (event?._id) {
      logEvent({ eventId: event._id, type: 'click', source: 'dashboard' });
    }
  };
  const closeEventDetails = () => {
    setDetailOpen(false);
    setSelectedEvent(null);
  };

  const registerFromDetails = async (event, squadId) => {
    // If paid, open Razorpay, then register; if free, direct register
    try {
      if (!event) return;
      if ((event.price || 0) > 0) {
        await payForEvent({ event, user, squadId });
        // payForEvent already registers on success; refresh local state
        setRegistrations(prev => prev.some(r => r.eventId === event._id) ? prev : [{ eventId: event._id, status: 'registered', at: Date.now() }, ...prev]);
        logEvent({ eventId: event._id, type: 'registration', source: 'paid_registration' });
        toast.success("Payment successful and registered");
      } else {
        await registerForEvent(event, squadId);
      }
      return true;
    } catch (e) {
      toast.error(e?.response?.data?.error || e.message || "Registration failed");
      return false;
    }
  };

  const registerForEvent = async (event, squadId) => {
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
      const res = await api.post(`/api/host/public/events/${event._id}/register`, { squadId }, headers);
      // Update local registrations store
      setRegistrations(prev => [{ eventId: event._id, status: 'registered', at: Date.now() }, ...prev]);
      logEvent({ eventId: event._id, type: 'registration', source: 'dashboard' });
      toast.success(res?.data?.message || "Registered successfully");
      return true;
    } catch (error) {
      toast.error(error?.response?.data?.error || "Failed to register");
      return false;
    }
  };

  const checkBadges = () => {
    // Retroactive badge unlock: Check if stats meet criteria but badge is missing
    // This fixes the "100% but locked" issue if backend hasn't synced yet
    if (!userStats.badges) return;

    const newBadges = [];
    const earnedBadgeIds = new Set(userStats.badges.map(b => (typeof b === 'string' ? b : b.id)));

    // Helper to get stat value
    const getStat = (id) => {
      switch (id) {
        case 'subscribe_hosts': return userStats.totalSubscriptions || 0;
        case 'friendsConnected': return userStats.totalFriends || 0;
        case 'bookmark_events': return userStats.totalBookmarks || 0;
        case 'attend_event': return userStats.totalEvents || 0;
        case 'write_reviews': return userStats.totalReviews || 0;
        case 'maintain_streak': return userStats.streak || 0;
        case 'emailVerified': return (userStats.emailVerified || user?.emailVerified) ? 1 : 0;
        default: return 0;
      }
    };

    GAMIFICATION.badges.forEach(badge => {
      if (earnedBadgeIds.has(badge.id)) return;

      // Check all criteria for this badge
      const isEligible = badge.criteria?.every(c => {
        const val = getStat(c.id);
        return val >= c.required;
      });

      if (isEligible) {
        // It's earned! Unlock it remotely or locally
        newBadges.push({ ...badge, earnedAt: new Date() });
      }
    });

    if (newBadges.length > 0) {
      // Optimistically update local state — add badges and award XP
      const xpGained = newBadges.reduce((sum, b) => sum + (b.points || 0), 0);
      setUserStats(prev => ({
        ...prev,
        badges: [...prev.badges, ...newBadges],
        points: prev.points + xpGained,
      }));

      // Sync to backend permanently
      const token = localStorage.getItem("token");
      if (token) {
        api.post('/api/gamification/badges/sync', { badges: newBadges }, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(e => console.error("Failed to sync retroactive badges:", e));

        // Award XP on backend too
        if (xpGained > 0) {
          api.post('/api/gamification/points', { action: 'BADGE_EARNED', amount: xpGained }, {
            headers: { Authorization: `Bearer ${token}` }
          }).catch(() => {});
        }
      }

      // Notify user of new badges
      newBadges.forEach(b => {
        addNotification({
          type: 'achievement',
          title: `🏅 Badge Unlocked: ${b.name}`,
          message: `${b.description} (+${b.points || 0} XP)`,
          actionLabel: 'View Badges',
          onAction: () => setActiveTab("Achievements")
        });
      });
    }
  };

  // Run checkBadges whenever any stat changes
  useEffect(() => { const saved = loadLS(userKey(STORAGE.gamification), { points: 0, level: 1, badges: [], streak: 0, achievements: [], totalEvents: 0, totalBookmarks: 0, totalSubscriptions: 0, totalFriends: 0, totalReviews: 0 }); setUserStats(saved); }, [user]);
  // Fetch verification status for disabling actions
  useEffect(() => {
    // Initial Load & Auth Check
    const init = async () => {
      const u = localStorage.getItem("user");
      setUser(u ? JSON.parse(u) : null);

      const token = localStorage.getItem("token");
      if (token) {
        // Fetch latest gamification stats
        try {
          const [statsRes, friendsRes] = await Promise.all([
            api.get('/api/gamification/my-rank'),
            api.get('/api/friends')
          ]);
          const data = statsRes.data;
          const friendsList = Array.isArray(friendsRes.data) ? friendsRes.data : [];
          // Log for debugging
          console.log('[Dashboard] Friends Response:', friendsList);

          const newStats = {
            points: data.points || 0,
            level: data.level || 1,
            tier: data.tier || 'Bronze',
            seasonPoints: data.seasonPoints || 0,
            skillXP: data.skillXP || {},
            badges: data.badges || [],
            achievements: data.achievements || [],
            rank: data.rank,
            totalEvents: data.stats?.eventsAttended || 0,
            totalBookmarks: data.stats?.eventsBookmarked || 0,
            totalReviews: data.stats?.reviewsWritten || 0,
            totalSubscriptions: data.stats?.hostSubscriptions || 0,
            totalFriends: friendsList.length || 0,
            streak: data.stats?.loginStreak || 0
          };

          console.log('[Dashboard] New Stats:', newStats);

          setUserStats(prev => ({ ...prev, ...newStats }));
          // Use the newStats values ensuring we don't save stale closure state
          saveLS(userKey(STORAGE.gamification), { ...newStats, badges: data.badges || [] });
        } catch (e) {
          console.error("Failed to fetch stats", e);
        }

        // Check verification & Refresh User Data
        try {
          const { data } = await api.get('/api/auth/me');

          // Update local state and storage with fresh user data
          setUser(prev => ({ ...prev, ...data }));
          // Also push emailVerified into userStats so checkBadges can read it reliably
          if (typeof data.emailVerified === 'boolean') {
            setUserStats(prev => ({ ...prev, emailVerified: data.emailVerified }));
          }
          const currentUserLS = JSON.parse(localStorage.getItem("user") || "{}");
          localStorage.setItem("user", JSON.stringify({ ...currentUserLS, ...data }));

          setIsVerified(true);
        } catch (err) {
          // Silent failure is okay here, just means verification check failed
          setIsVerified(false);
        }
      } else {
        setIsVerified(false);
      }
    };

    // Run init if token exists, to ensure we fetch fresh data even if local user is stale/empty
    const token = localStorage.getItem("token");
    if (token) init();
  }, []); // Run once on mount (and let init handle the fetching)



  useEffect(() => { checkBadges(); }, [userStats.points, userStats.totalEvents, userStats.totalBookmarks, userStats.totalReviews, userStats.totalSubscriptions, userStats.totalFriends, userStats.streak, userStats.emailVerified, user?.emailVerified]);
  useEffect(() => { saveLS(userKey(STORAGE.gamification), userStats); }, [userStats, user]);

  const ensureVerified = async () => { return true; };

  useEffect(() => { const u = localStorage.getItem("user"); setUser(u ? JSON.parse(u) : null); }, []);
  useEffect(() => { const fetchEvents = async () => { try { const res = await api.get("/api/host/public/events"); setEvents(res.data || []); } catch (e) { console.error("Failed to load events:", e); } finally { setLoading(false); } }; fetchEvents(); }, []);
  // Load user settings to apply UI/recommendations preferences
  useEffect(() => {
    (async () => {
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
          },
          onboardingData: data.onboardingData || {}
        };
        setUserSettings(next);
        // Enforcing compact mode
        setNavCollapsed(true);
      } catch (_) { /* ignore */ }
    })();
  }, []);
  useEffect(() => { if (!user) return; const regs = loadLS(userKey(STORAGE.registrations), []); const bms = loadLS(userKey(STORAGE.bookmarks), []); const subs = loadLS(userKey(STORAGE.subscriptions), []); const notifs = loadLS(userKey(STORAGE.notifications), []); const fbs = loadLS(userKey(STORAGE.feedbacks), []); setRegistrations(Array.isArray(regs) ? regs : []); setBookmarks(Array.isArray(bms) ? bms : []); setSubscriptions(Array.isArray(subs) ? subs : []); setNotifications(Array.isArray(notifs) ? notifs : []); setFeedbacks(Array.isArray(fbs) ? fbs : []); }, [user]);
  // Fetch subscribed hosts from server
  useEffect(() => {
    const loadSubs = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!user || !token) return;
        const { data } = await api.get('/api/subscriptions', { headers: { Authorization: `Bearer ${token}` } });
        setSubscribedHosts(Array.isArray(data) ? data : []);
      } catch (e) {
        // ignore
      }
    };
    loadSubs();
  }, [user]);
  // Fetch authoritative registrations from server when user is present
  useEffect(() => {
    const loadServerData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!user || !token) return;

        const headers = { headers: { Authorization: `Bearer ${token}` } };

        // Parallel fetch for efficiency
        const [regsRes, booksRes, subsRes, revsRes, rankRes, friendsRes] = await Promise.all([
          api.get('/api/host/public/my-registrations', headers).catch(() => ({ data: [] })),
          api.get('/api/bookmarks', headers).catch(() => ({ data: [] })),
          api.get('/api/subscriptions', headers).catch(() => ({ data: [] })),
          api.get('/api/reviews/my', headers).catch(() => ({ data: [] })),
          api.get('/api/gamification/my-rank', headers).catch(() => ({ data: null })),
          api.get('/api/friends', headers).catch(() => ({ data: [] }))
        ]);

        if (rankRes?.data) {
          const s = rankRes.data;
          const friendsList = Array.isArray(friendsRes.data) ? friendsRes.data : [];
          setUserStats(prev => ({
            ...prev,
            points: s.points || 0,
            level: s.level || 1,
            tier: s.tier || 'Bronze',
            seasonPoints: s.seasonPoints || 0,
            skillXP: s.skillXP || {},
            streak: s.stats?.loginStreak || 0,
            achievements: s.achievements || [],
            badges: s.badges || [],
            totalEvents: s.stats?.eventsAttended || 0,
            totalBookmarks: s.stats?.eventsBookmarked || 0,
            totalSubscriptions: s.stats?.hostSubscriptions || 0,
            totalReviews: s.stats?.reviewsWritten || 0,
            totalFriends: friendsList.length || prev.totalFriends || 0,
          }));
        }

        if (Array.isArray(regsRes.data)) {
          const mapped = regsRes.data.map(r => ({
            eventId: r.eventId,
            status: r.status, // 'registered' | 'waitlisted'
            attended: !!r.attended,
            isCompleted: !!r.isCompleted,
            at: r.at || r.date || Date.now()
          }));
          setRegistrations(mapped);
        }

        if (Array.isArray(booksRes.data)) {
          const serverBookmarks = booksRes.data.map(e => e._id);
          setBookmarks(serverBookmarks);

          // Merge bookmarked events into main events list if missing
          setEvents(prev => {
            const existingIds = new Set(prev.map(e => e._id));
            const newEvents = booksRes.data.filter(e => !existingIds.has(e._id));
            return newEvents.length > 0 ? [...prev, ...newEvents] : prev;
          });
        }

        if (Array.isArray(subsRes.data)) {
          setSubscribedHosts(subsRes.data);
          setSubscriptions(subsRes.data.map(h => (typeof h === 'string' ? h : (h._id || h))));
        }

        if (Array.isArray(revsRes.data)) {
          setFeedbacks(revsRes.data);
        }
      } catch (e) { console.error("Data sync error:", e); }
    };
    loadServerData();
  }, [user]);

  // Fetch AI Recommendations
  useEffect(() => {
    const fetchAiRecs = async () => {
      try {
        setAiRecsLoading(true);
        const { data } = await api.get('/api/recommendations/events');
        setAiRecs(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Failed to load recommendations", e);
      } finally {
        setAiRecsLoading(false);
      }
    };
    if (user) fetchAiRecs();
  }, [user]);
  useEffect(() => saveLS(userKey(STORAGE.registrations), registrations), [registrations, user]);
  useEffect(() => saveLS(userKey(STORAGE.bookmarks), bookmarks), [bookmarks, user]);
  useEffect(() => saveLS(userKey(STORAGE.subscriptions), subscriptions), [subscriptions, user]);
  useEffect(() => saveLS(userKey(STORAGE.notifications), notifications), [notifications, user]);
  useEffect(() => saveLS(userKey(STORAGE.feedbacks), feedbacks), [feedbacks, user]);

  // Fetch leaderboard based on category and optional skill
  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (activeTab !== 'Leaderboard') return;
      try {
        setLeaderboardLoading(true);
        const token = localStorage.getItem('token');
        if (!token) { setLeaderboardUsers([]); return; }

        const { data } = await api.get('/api/gamification/leaderboard', {
          params: {
            category: leaderboardCategory,
            skill: leaderboardSkill,
            limit: 20
          },
          headers: { Authorization: `Bearer ${token}` }
        });

        setLeaderboardUsers(data || []);
      } catch (e) {
        console.error("Failed to load leaderboard:", e);
        setLeaderboardUsers([]);
      } finally {
        setLeaderboardLoading(false);
      }
    };
    fetchLeaderboard();
  }, [activeTab, leaderboardCategory, leaderboardSkill, user]);
  const handleLogout = () => { ["student.registrations", "student.bookmarks", "student.subscriptions", "student.subscriptions.meta", "student.notifications", "student.feedbacks", "student.gamification"].forEach(k => localStorage.removeItem(k)); localStorage.removeItem("user"); localStorage.removeItem("token"); navigate("/"); };
  useEffect(() => { const onClick = (e) => { if (profileMenuOpen && !e.target.closest('.profile-menu')) setProfileMenuOpen(false); }; document.addEventListener('mousedown', onClick); return () => document.removeEventListener('mousedown', onClick); }, [profileMenuOpen]);

  const handleJoinWaitingList = async (event) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) { toast.error("Please login to join the waiting list"); navigate("/login"); return; }

      const res = await api.post(`/api/host/public/events/${event._id}/waiting-list`, {});

      toast.success(res.data.message || "Added to waiting list");

      // Update local registrations to include waitlisted
      setRegistrations(prev => [
        ...prev.filter(r => r.eventId !== event._id),
        { eventId: event._id, status: 'waitlisted', attended: false, isCompleted: false, at: Date.now() }
      ]);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to join waiting list");
    }
  };

  const handleCancelRegistration = async (event) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await api.post(`/api/host/public/events/${event._id}/cancel`, {});

      toast.success(res.data.message || "Cancelled successfully");

      // Refresh registrations to get updated status and potentially auto-promoted others (not seeing them here but good for consistency)
      setRegistrations(prev => prev.filter(r => r.eventId !== event._id));

      // Re-fetch server data to be safe and see if we got promoted in other events (though this cancel is for one event)
      // loadServerData(); // assuming it's available or just rely on local filter
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to cancel");
    }
  };

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
    <LayoutGroup>
      <div className="min-h-screen text-slate-800 relative selection:bg-black selection:text-white">
        <DashboardBackground />

        {/* Professional Header - Matches Landing Page Navbar Style */}
        <motion.header
          className={`sticky top-0 z-40 w-full transition-all duration-500 border-b ${scrolled ? 'bg-white/90 backdrop-blur-md border-black py-2' : 'bg-transparent border-transparent py-4'}`}
        >
          <div className="px-6 h-full flex items-center justify-between max-w-[1920px] mx-auto">
            <div className="flex items-center space-x-6">
              {isSearchActive ? (
                <button onClick={() => { setIsSearchActive(false); setSearchText(''); setSearchQuery(''); }} className="p-2 -ml-2 text-slate-900 hover:bg-black/5 rounded-full flex items-center gap-2 transition-colors">
                  <ArrowLeft className="w-6 h-6" />
                  <span className="font-bold uppercase tracking-widest text-sm hidden sm:block">Back</span>
                </button>
              ) : (
                <>
                  <button onClick={() => setNavCollapsed(!navCollapsed)} className="p-2 -ml-2 text-slate-900 hover:bg-black/5 rounded-full transition-colors">
                    <Menu className="w-6 h-6" />
                  </button>
                  <div className="flex items-center gap-2 group cursor-pointer" onClick={() => navigate('/')}>
                    <div className="w-8 h-8 bg-black flex items-center justify-center transition-transform duration-500 group-hover:rotate-180">
                      <Crown className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-lg font-bold tracking-tight text-black">Evenite.</span>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center space-x-6 flex-1 justify-end max-w-2xl">
              {/* Search Bar - Advanced Interface */}
              <div
                className="relative hidden md:flex items-center w-full max-w-md group border-b border-slate-300 focus-within:border-black hover:border-slate-400 transition-all z-50"
              >
                <Search className="w-4 h-4 text-slate-400 group-focus-within:text-black transition-colors ml-2 flex-shrink-0" />
                <div className="relative flex-1 flex items-center">
                  <input
                    type="text"
                    value={searchText}
                    onFocus={() => setSearchFocused(true)}
                    onChange={(e) => setSearchText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit(searchText)}
                    placeholder="SEARCH EVENTS..."
                    className="w-full pl-3 pr-10 py-2 bg-transparent text-sm font-medium uppercase tracking-wider focus:outline-none placeholder:text-slate-400"
                  />
                  {isSearchingAI ? (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-1.5" title="AI is finding the best matches...">
                      <div className="flex gap-0.5 items-end h-3">
                        <motion.div className="w-1 bg-gradient-to-t from-blue-500 to-purple-500 rounded-full" animate={{ height: ["4px", "12px", "4px"] }} transition={{ duration: 1, repeat: Infinity, delay: 0 }} />
                        <motion.div className="w-1 bg-gradient-to-t from-purple-500 to-pink-500 rounded-full" animate={{ height: ["4px", "12px", "4px"] }} transition={{ duration: 1, repeat: Infinity, delay: 0.2 }} />
                        <motion.div className="w-1 bg-gradient-to-t from-pink-500 to-orange-500 rounded-full" animate={{ height: ["4px", "12px", "4px"] }} transition={{ duration: 1, repeat: Infinity, delay: 0.4 }} />
                      </div>
                    </div>
                  ) : (
                    searchText && (
                      <button
                        onClick={() => { setSearchText(''); setSearchQuery(''); setSearchFocused(false); setIsSearchActive(false); }}
                        className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 hover:text-black transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )
                  )}
                </div>

                {/* Advanced Search Overlay */}
                <AnimatePresence>
                  {searchFocused && (
                    <>
                      {/* Invisible backdrop to detect outside clicks and close the overlay */}
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setSearchFocused(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-[calc(100%+0.5rem)] left-0 w-full min-w-[300px] max-h-[70vh] bg-white border border-slate-200 shadow-xl rounded-xl overflow-y-auto z-50 flex flex-col"
                      >
                        {searchText.trim().length > 0 ? (
                          <div className="p-2 flex flex-col gap-1">
                            {isSearchingAI ? (
                              <div className="p-8 flex justify-center items-center flex-col gap-3">
                                <div className="flex gap-1 items-end h-4">
                                  <motion.div className="w-1.5 bg-gradient-to-t from-blue-500 to-purple-500 rounded-full" animate={{ height: ["4px", "16px", "4px"] }} transition={{ duration: 1, repeat: Infinity, delay: 0 }} />
                                  <motion.div className="w-1.5 bg-gradient-to-t from-purple-500 to-pink-500 rounded-full" animate={{ height: ["4px", "16px", "4px"] }} transition={{ duration: 1, repeat: Infinity, delay: 0.2 }} />
                                  <motion.div className="w-1.5 bg-gradient-to-t from-pink-500 to-orange-500 rounded-full" animate={{ height: ["4px", "16px", "4px"] }} transition={{ duration: 1, repeat: Infinity, delay: 0.4 }} />
                                </div>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Analyzing semantics...</span>
                              </div>
                            ) : (
                              (aiEvents || []).length === 0 ? (
                                <div className="p-8 text-center text-slate-500 font-bold uppercase tracking-widest text-sm">
                                  No events found
                                </div>
                              ) : (
                                <div className="flex flex-col gap-1">
                                  {parsedSearchParams && !parsedSearchParams.fallback && (
                                    <div className="px-2 py-1 flex flex-wrap gap-1 border-b border-slate-100 mb-2">
                                      <span className="text-[9px] font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">AI Match</span>
                                      {parsedSearchParams.keywords?.map((kw, i) => (
                                        <span key={i} className="text-[9px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded uppercase">#{kw}</span>
                                      ))}
                                    </div>
                                  )}
                                  {(aiEvents || []).map(event => (
                                    <div 
                                      key={event._id} 
                                      onClick={() => { setSearchFocused(false); openEventDetails(event); }} 
                                      className="flex gap-3 items-center p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors group border border-transparent hover:border-slate-200"
                                    >
                                      <img src={event.imageUrl || event.images?.[0] || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150' viewBox='0 0 150 150'%3E%3Crect width='150' height='150' fill='%23e5e7eb'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='12' fill='%236b7280'%3ENo Image%3C/text%3E%3C/svg%3E"} alt={event.title} className="w-14 h-14 object-cover rounded shadow-sm border border-slate-200 shrink-0" />
                                      <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start gap-2">
                                          <h4 className="text-sm font-bold text-slate-900 truncate uppercase tracking-tight group-hover:text-blue-600 transition-colors">{event.title}</h4>
                                          {event.similarity_score && (
                                            <span className="text-[9px] font-bold text-blue-700 bg-blue-100 border border-blue-200 px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap shrink-0 mt-0.5">
                                              {Math.round(event.similarity_score * 100)}% Match
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-wider font-semibold truncate">
                                          {new Date(event.date).toLocaleDateString()} • {event.location || event.city || 'Online'}
                                        </p>
                                        <div className="flex gap-1 mt-1 overflow-hidden truncate">
                                          {(event.tags || []).slice(0, 3).map((tag, i) => (
                                            <span key={i} className="text-[8px] font-bold text-slate-400 bg-slate-100 px-1 py-0.5 rounded uppercase tracking-wider shrink-0">
                                              {tag}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )
                            )}
                          </div>
                        ) : (
                          <>
                            {recentSearches.length > 0 && (
                              <div className="p-3 border-b border-slate-100 bg-slate-50">
                                <h4 className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest pl-2 mb-2">
                                  <History className="w-4 h-4" /> Recent Searches
                                </h4>
                                <div className="flex flex-col gap-1">
                                  {recentSearches.map((term, i) => (
                                    <div
                                      key={i}
                                      className="flex items-center w-full hover:bg-slate-200/50 rounded-lg group/historyitem transition-colors"
                                    >
                                      <button
                                        onClick={() => {
                                          setSearchText(term);
                                          handleSearchSubmit(term);
                                        }}
                                        className="text-left flex-1 px-2 py-1.5 text-sm font-medium text-slate-700 flex justify-between items-center"
                                      >
                                        <span>{term}</span>
                                        <span className="text-slate-400 opacity-0 group-hover/historyitem:opacity-100 transition-opacity mr-2">
                                          <Search className="w-3 h-3" />
                                        </span>
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setRecentSearches(prev => {
                                            const newHistory = prev.filter(t => t !== term);
                                            localStorage.setItem(getSearchKey(), JSON.stringify(newHistory));
                                            return newHistory;
                                          });
                                        }}
                                        className="p-1.5 text-slate-400 hover:text-red-500 opacity-0 group-hover/historyitem:opacity-100 transition-opacity rounded-md mr-1"
                                        title="Remove from history"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            <div className="p-4 bg-white">
                              <h4 className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest pl-1 mb-3">
                                <TrendingUp className="w-4 h-4" /> Popular Searches
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {["Tech Workshops", "Music Festivals", "Free Bootcamps", "Startup Pitches in Bangalore"].map((tag, i) => (
                                  <button
                                    key={i}
                                    onClick={() => {
                                      setSearchText(tag);
                                      handleSearchSubmit(tag);
                                    }}
                                    className="px-3 py-1.5 bg-slate-100 hover:bg-black hover:text-white rounded-full text-xs font-medium transition-colors border border-slate-200"
                                  >
                                    {tag}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </>
                        )}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {/* Right Actions - Bold & Clean */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setActiveTab("Wallet")}
                  className={`p-2 transition-all relative group ${activeTab === "Wallet" ? "bg-black text-white" : "text-slate-900"}`}
                  title="Digital Wallet"
                >
                  <Wallet className={`w-5 h-5 group-hover:scale-110 transition-transform ${activeTab === "Wallet" ? "text-white" : "text-slate-900"}`} />
                </button>

                <button
                  ref={calendarBtnRef}
                  onClick={() => { computeOverlayPosition(); setCalendarOverlayOpen(true); }}
                  className={`p-2 transition-colors relative group`}
                  title="Calendar"
                >
                  <Calendar className="w-5 h-5 text-slate-900 group-hover:scale-110 transition-transform" />
                  {hasTodayUpcoming && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white"></span>}
                </button>

                <div className="relative">
                  <button
                    onClick={() => setNotifOpen(o => !o)}
                    className="p-2 transition-colors relative group"
                  >
                    <BellRing className="w-5 h-5 text-slate-900 group-hover:rotate-12 transition-transform" />
                    {(notifications || []).some(n => !n.read) && (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                    )}
                  </button>
                  {notifOpen && (
                    <div className="absolute right-0 mt-4 w-96 bg-white border-2 border-black p-0 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-[100]">
                      <div className="flex items-center justify-between px-6 py-4 border-b-2 border-black bg-neutral-50">
                        <span className="text-sm font-bold uppercase tracking-widest text-black">Notifications</span>
                        <button
                          onClick={() => { setNotifications(prev => (prev || []).map(n => ({ ...n, read: true }))); }}
                          className="text-xs text-blue-600 font-bold uppercase tracking-wider hover:underline"
                        >
                          Mark read
                        </button>
                      </div>
                      <div className="max-h-80 overflow-y-auto divide-y divide-black/10">
                        {(notifications || []).length === 0 ? (
                          <div className="p-8 text-center text-slate-500 text-sm uppercase tracking-wide">No new updates</div>
                        ) : (
                          (notifications || []).map((n, idx) => (
                            <div key={idx} className={`p-4 hover:bg-neutral-50 transition-colors ${!n.read ? 'bg-blue-50/50' : ''}`}>
                              <div className="flex gap-3">
                                <div className={`mt-1.5 w-2 h-2 shrink-0 ${n.read ? 'bg-slate-300' : 'bg-black'}`}></div>
                                <div className="flex-1 space-y-1">
                                  <p className={`text-sm ${!n.read ? 'font-bold text-black' : 'text-slate-600'}`}>{n.message}</p>
                                  <p className="text-[10px] text-slate-400 font-mono">{n.at ? new Date(n.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</p>

                                  {n.type === 'Squad' && n.data?.action === 'squad_invite' && (
                                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-200">
                                      <button
                                        onClick={(e) => handleSquadNotification(e, n, 'accept')}
                                        className="px-3 py-1 bg-green-500 text-white font-bold uppercase text-[10px] tracking-widest hover:bg-green-600 transition-colors"
                                      >
                                        Accept
                                      </button>
                                      <button
                                        onClick={(e) => handleSquadNotification(e, n, 'decline')}
                                        className="px-3 py-1 bg-red-500 text-white font-bold uppercase text-[10px] tracking-widest hover:bg-red-600 transition-colors"
                                      >
                                        Decline
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="relative ml-2 profile-menu">
                  <button
                    onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                    className="flex items-center gap-2 group"
                  >
                    <div className="w-9 h-9 bg-black text-white flex items-center justify-center font-bold border-2 border-transparent group-hover:border-slate-300 transition-all">
                      {(user?.fullname?.[0] || user?.username?.[0] || "U").toUpperCase()}
                    </div>
                  </button>

                  {profileMenuOpen && (
                    <div className="absolute right-0 mt-4 w-72 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-[100] p-0">
                      <div className="p-6 border-b-2 border-black bg-neutral-50">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-black text-white flex items-center justify-center font-bold text-xl">
                            {(user?.fullname?.[0] || "U").toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-black truncate uppercase tracking-tight">{user?.fullname || user?.username}</div>
                            <div className="text-xs text-slate-500 truncate font-mono">{user?.email}</div>
                          </div>
                        </div>
                      </div>
                      <div className="p-2 space-y-1">
                        <button onClick={() => { setProfileMenuOpen(false); navigate("/profile"); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold uppercase tracking-wider text-black hover:bg-black hover:text-white transition-colors">
                          <UserPen className="w-4 h-4" />
                          <span>Profile</span>
                        </button>
                        <button onClick={() => { setProfileMenuOpen(false); navigate("/settings"); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold uppercase tracking-wider text-black hover:bg-black hover:text-white transition-colors">
                          <Settings className="w-4 h-4" />
                          <span>Settings</span>
                        </button>
                        <div className="h-0.5 bg-black/10 my-1" />
                        <button onClick={() => { setProfileMenuOpen(false); handleLogout(); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold uppercase tracking-wider text-red-600 hover:bg-red-600 hover:text-white transition-colors">
                          <LogOut className="w-4 h-4" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.header>

        {/* Search Results Overlay Removed */}

        {/* Main Content Layout */}
        <div className="flex max-w-[1920px] mx-auto relative">
          {/* Sidebar - Sharp & Minimal */}
          <aside className={`border-r border-black/10 transition-all duration-300 ease-in-out ${navCollapsed ? 'w-20' : 'w-64'} sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto bg-white/50 backdrop-blur-sm z-30`}>
            <div className="p-6 flex flex-col h-full">
              {/* Navigation Menu */}
              <nav className="space-y-2 flex-1">
                {[
                  { id: "Explore", label: "Home", icon: Home },
                  { id: "Live", label: "Live Vibes", icon: Zap },
                  { id: "NearMe", label: "Near Me", icon: MapPin },
                  { id: "Goals", label: "Bucket List", icon: Target },
                  { id: "MyRegs", label: "My Events", icon: Calendar },
                  { id: "Bookmarks", label: "Saved", icon: Bookmark },
                  { id: "SubscribedHosts", label: "Following", icon: ShieldCheck },
                  ...(user?.role === 'student' ? [
                    { id: "Friends", label: "Friends", icon: UserPlus }
                  ] : []),
                  { id: "Leaderboard", label: "Leaderboard", icon: Crown },
                  { id: "Achievements", label: "Achievements", icon: Trophy },
                  { id: "Notifications", label: "Updates", icon: BellRing }
                ].map(({ id, label, icon: Icon, isLink, path }) => (
                  <button
                    key={id}
                    onClick={() => { if (isLink) navigate(path); else setActiveTab(id); }}
                    className={`w-full flex items-center ${navCollapsed ? 'justify-center px-0' : 'justify-start px-4'} py-3 transition-all duration-200 group relative overflow-hidden outline-none ${activeTab === id ? 'text-white' : 'text-slate-500 hover:text-black'}`}
                    title={navCollapsed ? label : undefined}
                  >
                    {/* Active Background - Sharp Black Block */}
                    {activeTab === id && (
                      <motion.div
                        layoutId="sidebar-active"
                        className="absolute inset-0 bg-black z-0"
                        initial={false}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    )}

                    <div className="relative z-10 flex items-center w-full">
                      <Icon className={`${navCollapsed ? 'w-6 h-6' : 'w-5 h-5'} transition-colors`} />
                      {!navCollapsed && (
                        <span className="ml-4 font-bold uppercase tracking-widest text-xs">
                          {label}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </nav>

              {/* Sidebar bottom spacing or other elements can go here */}
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 p-8 lg:p-12 overflow-x-hidden">
            <div className="max-w-7xl mx-auto">
              {/* Content Header - Bold Typography */}
              {activeTab !== "Explore" && activeTab !== "NearMe" && (
                <div className="mb-8 pb-4">
                  <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={activeTab} // Animate on tab change
                    className="text-xl md:text-2xl font-bold tracking-tighter uppercase leading-[0.9] mb-2 text-black"
                  >
                    {activeTab === "MyRegs" && "My Events"}
                    {activeTab === "Calendar" && "Schedule"}
                    {activeTab === "Bookmarks" && "Saved"}
                    {activeTab === "SubscribedHosts" && "Following"}
                    {activeTab === "Friends" && "Social Hub"}
                    {activeTab === "Achievements" && "Trophies"}
                    {activeTab === "Notifications" && "Updates"}
                  </motion.h2>
                  <p className="text-sm font-medium text-slate-500 max-w-2xl">
                    {activeTab === "Goals" && "Challenge yourself with semester targets."}
                    {activeTab === "MyRegs" && "Track your journey and attendance."}
                    {activeTab === "Live" && "Real-time vibes from active events."}
                    {activeTab === "Calendar" && "Plan efficiently with your monthly overview."}
                    {activeTab === "Bookmarks" && "Curate your personal wishlist."}
                    {activeTab === "SubscribedHosts" && "Stay connected with your favorite organizers."}
                    {activeTab === "Friends" && "Connect with peers, squads, and interest circles."}
                    {activeTab === "Achievements" && "Showcase your milestones."}
                    {activeTab === "Notifications" && "Never miss a beat."}
                  </p>
                </div>
              )}

              {/* Content Sections */}
              {activeTab === "Explore" && (
                <div className="relative">
                  {/* Floating Category Navigation - YouTube Style */}
                  <div className="fixed right-8 top-1/2 -translate-y-1/2 z-40 hidden xl:flex flex-col gap-4">
                    {[
                      { id: 'All', icon: Home, label: 'All Events' },
                      { id: 'For You', icon: Sparkles, label: 'For You' },
                      { id: 'Trending', icon: TrendingUp, label: 'Trending' },
                      { id: 'Completed', icon: CheckCircle, label: 'Completed' },
                      { id: 'Map', icon: MapPin, label: 'Map View' }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setExploreSubTab(tab.id);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className={`p-4 rounded-full border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all group relative ${exploreSubTab === tab.id ? 'bg-black text-white' : 'bg-white text-black'}`}
                        title={tab.label}
                      >
                        <tab.icon className="w-5 h-5" />
                        <motion.span
                          initial={{ opacity: 0, x: 10 }}
                          whileHover={{ opacity: 1, x: 0 }}
                          className="absolute right-full mr-4 px-3 py-1.5 bg-black text-white text-[10px] font-bold uppercase tracking-widest pointer-events-none whitespace-nowrap shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]"
                        >
                          {tab.label}
                        </motion.span>
                      </button>
                    ))}
                  </div>

                  {/* Horizontal Scroll Bar for Mobile/Tablet category selection */}
                  <div className="flex xl:hidden overflow-x-auto gap-3 pb-6 mb-8 scrollbar-hide">
                    {['All', 'For You', 'Trending', 'Completed', 'Map'].map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setExploreSubTab(tab)}
                        className={`px-6 py-2 rounded-full border-2 border-black text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-colors ${exploreSubTab === tab ? 'bg-black text-white' : 'bg-white text-black'}`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  {/* LiveSentimentFeed removed from Explore tab */}

                  <div className="space-y-16">
                    {hostFilterId && (
                      <div className="flex items-center justify-between bg-blue-50 border border-blue-200 px-6 py-4">
                        <div className="text-sm font-bold text-blue-900 uppercase">Filtered by Host</div>
                        <button onClick={() => setHostFilterId("")} className="text-xs font-bold text-blue-700 hover:underline uppercase">Clear Filter</button>
                      </div>
                    )}

                    {/* Single Grid, No Titles - YouTube Style */}
                    {(() => {
                      let displayEvents = [];
                      if (exploreSubTab === 'All') displayEvents = filteredEvents;
                      else if (exploreSubTab === 'For You') displayEvents = aiRecs;
                      else if (exploreSubTab === 'Trending') displayEvents = trendingEvents;
                      else if (exploreSubTab === 'Completed') displayEvents = completedEvents;

                      if (exploreSubTab === 'Map') {
                        return <EventMap events={filteredEvents} onEventClick={openEventDetails} />;
                      }

                      if (aiRecsLoading && exploreSubTab === 'For You') {
                        return (
                          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 animate-pulse">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                              <div key={i} className="aspect-square bg-slate-200 border-2 border-black"></div>
                            ))}
                          </div>
                        );
                      }

                      if (displayEvents.length === 0) {
                        return (
                          <div className="text-center py-20 border-2 border-dashed border-slate-300">
                            <Calendar className="w-16 h-16 mx-auto mb-6 text-slate-300" />
                            <h3 className="text-3xl font-bold text-slate-900 mb-2 uppercase tracking-tight">No Events Found</h3>
                            <button
                              onClick={() => setExploreSubTab('Trending')}
                              className="mt-4 px-6 py-2 bg-black text-white font-bold uppercase tracking-widest text-xs"
                            >
                              Browse Trending
                            </button>
                          </div>
                        );
                      }

                      return (
                        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                          {displayEvents.map((event, idx) => (
                            <div key={event._id} className="relative">
                              {exploreSubTab === 'For You' && (
                                <div className="absolute -top-3 left-1/2 -translate-y-0 -translate-x-1/2 z-20 px-3 py-1 bg-black/90 backdrop-blur border border-purple-500 rounded-full flex items-center gap-1.5 shadow-xl">
                                  <Sparkles className="w-3 h-3 text-purple-400" />
                                  <span className="text-[10px] font-bold text-white uppercase tracking-wider whitespace-nowrap">
                                    {event.matchReason || 'AI Recommended'}
                                  </span>
                                </div>
                              )}
                              <GamifiedEventCard
                                event={event}
                                onRegister={() => registerForEvent(event)}
                                onBookmark={() => { handleBookmarkToggle(event); }}
                                onViewMore={() => openEventDetails(event)}
                                isRegistered={registrations.some(r => r.eventId === event._id)}
                                isBookmarked={bookmarks.includes(event._id)}
                                userStats={userStats}
                                awardPoints={awardPoints}
                                disabledActions={false}
                              />
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {activeTab === "Live" && (
                <div className="space-y-8">
                  {/* Sub-navigation for Live Tab */}
                  <div className="flex border-b-2 border-black gap-2 overflow-x-auto no-scrollbar pb-1">
                    {[
                      { id: "Vibes", label: "Live Vibes", icon: Zap },
                      { id: "Chat", label: "Messages", icon: MessageSquare }
                    ].map(sub => (
                      <button
                        key={sub.id}
                        onClick={() => setLiveSubTab(sub.id)}
                        className={`px-6 py-3 font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${liveSubTab === sub.id ? 'bg-black text-white' : 'hover:bg-neutral-100'}`}
                      >
                        <sub.icon className="w-4 h-4" />
                        {sub.label}
                      </button>
                    ))}
                  </div>

                  {liveSubTab === 'Vibes' ? (
                    <div className="space-y-8">
                      <LiveSentimentFeed onEventClick={(eventId) => {
                        const found = events.find(e => e._id === eventId);
                        if (found) openEventDetails(found);
                      }} />

                      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                        {events.filter(e => {
                          const now = new Date();
                          const start = new Date(e.date);
                          const end = e.endDate ? new Date(e.endDate) : new Date(start.getTime() + 3 * 60 * 60 * 1000);
                          return now >= start && (e.endDate ? now <= end : (now.getTime() - start.getTime() < 3 * 3600000)) && !e.isCompleted;
                        }).map(event => (
                          <GamifiedEventCard
                            key={event._id}
                            event={event}
                            onRegister={() => registerForEvent(event)}
                            onBookmark={() => handleBookmarkToggle(event)}
                            onViewMore={() => openEventDetails(event)}
                            isRegistered={registrations.some(r => r.eventId === event._id)}
                            isBookmarked={bookmarks.includes(event._id)}
                            userStats={userStats}
                            awardPoints={awardPoints}
                            disabledActions={false}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <DashboardChat currentUser={user} />
                  )}
                </div>
              )}

              {activeTab === "Goals" && (
                <div className="max-w-xl mx-auto">
                  <BucketListGoals />
                </div>
              )}

              {activeTab === "NearMe" && (
                <EventsNearMe
                  onRegister={(e) => registerForEvent(e)}
                  onBookmark={(e) => handleBookmarkToggle(e)}
                  onViewMore={(e) => openEventDetails(e)}
                  userStats={userStats}
                />
              )}



              {activeTab === "Calendar" && (
                <div className="space-y-6">
                  <div className="bg-emerald-50 p-6 border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setCalendarDate(new Date(calendarYear, calendarMonth - 1, 1))} className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm">Prev</button>
                        <button onClick={() => setCalendarDate(new Date())} className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm">Today</button>
                        <button onClick={() => setCalendarDate(new Date(calendarYear, calendarMonth + 1, 1))} className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm">Next</button>
                      </div>
                      <div className="text-lg font-semibold text-slate-900">
                        {calendarView === 'month' ? calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' }) : `Week of ${weekStart.toLocaleDateString()}`}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-600">
                        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-300 inline-block" /> Upcoming</span>
                        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-300 inline-block" /> Completed</span>
                        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-300 inline-block" /> Registered</span>
                        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-300 inline-block" /> Registered Completed</span>
                        <span className="ml-3 inline-flex rounded-lg overflow-hidden border border-slate-200">
                          <button onClick={() => setCalendarView('month')} className={`px-2 py-1 text-[11px] ${calendarView === 'month' ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'}`}>Month</button>
                          <button onClick={() => setCalendarView('week')} className={`px-2 py-1 text-[11px] ${calendarView === 'week' ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'}`}>Week</button>
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-7 gap-2 text-xs font-medium text-slate-500 mb-2">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (<div key={d} className="text-center">{d}</div>))}
                    </div>
                    <div className="grid grid-cols-7 gap-2">
                      {(calendarView === 'month' ? monthDays : weekDays).map((dt, idx) => {
                        if (!dt) return <div key={`pad-${idx}`} className="h-28 rounded-xl border border-slate-200 bg-slate-50" />;
                        const key = dayKey(dt);
                        const dayData = eventsByDay.get(key) || { upcoming: [], attended: [] };
                        const isToday = (() => { const t = new Date(); return t.getFullYear() === dt.getFullYear() && t.getMonth() === dt.getMonth() && t.getDate() === dt.getDate(); })();
                        return (
                          <div key={key} className={`relative h-28 border-2 border-black bg-white p-2 transition-all duration-200 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] ${isToday ? 'ring-2 ring-blue-500' : ''}`}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="text-xs text-slate-500">{dt.toLocaleDateString(undefined, { day: 'numeric' })}</div>
                            </div>
                            <div className="absolute top-1 right-1 flex items-center gap-1">
                              {!!dayData.upcoming.length && <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px]" title="Upcoming">{dayData.upcoming.length}</span>}
                              {!!dayData.attended.length && <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px]" title="Attended">{dayData.attended.length}</span>}
                            </div>
                            <div className="space-y-1 overflow-y-auto max-h-20 pr-1">
                              {Array.from(new Map(dayData.upcoming.map(e => [e._id, e])).values())
                                .slice()
                                .sort((a, b) => {
                                  const ra = (registrations || []).some(r => r.eventId === a._id) ? 0 : 1;
                                  const rb = (registrations || []).some(r => r.eventId === b._id) ? 0 : 1;
                                  return ra - rb;
                                })
                                .slice(0, 2)
                                .map(ev => {
                                  const isReg = (registrations || []).some(r => r.eventId === ev._id);
                                  const chipCls = isReg ? 'bg-orange-50 text-orange-700' : 'bg-blue-50 text-blue-700';
                                  return (
                                    <div key={ev._id} className={`text-[11px] truncate px-2 py-1 rounded animate-fadeIn cursor-pointer flex items-center justify-between gap-2 ${chipCls}`} title={isReg ? `${ev.title} (Registered)` : ev.title} onClick={() => openEventDetails(ev)}>
                                      <span className="truncate">{ev.title}</span>
                                      {isReg && <CheckCircle className="w-3 h-3 text-emerald-600 shrink-0" />}
                                    </div>
                                  );
                                })}
                              {dayData.upcoming.length > 2 && (
                                <button className="w-full text-left text-[11px] px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200" onClick={() => setDayModal({ open: true, key, date: dt, upcoming: dayData.upcoming, attended: dayData.attended })}>+{dayData.upcoming.length - 2} more</button>
                              )}
                              {Array.from(new Map(dayData.attended.map(e => [e._id, e])).values())
                                .slice()
                                .sort((a, b) => {
                                  const ra = (registrations || []).some(r => r.eventId === a._id) ? 0 : 1;
                                  const rb = (registrations || []).some(r => r.eventId === b._id) ? 0 : 1;
                                  return ra - rb;
                                })
                                .slice(0, 2)
                                .map(ev => {
                                  const isReg = (registrations || []).some(r => r.eventId === ev._id);
                                  const chipCls = isReg ? 'bg-yellow-50 text-yellow-700' : 'bg-emerald-50 text-emerald-700';
                                  return (
                                    <div key={ev._id} className={`text-[11px] truncate px-2 py-1 rounded animate-fadeIn cursor-pointer flex items-center justify-between gap-2 ${chipCls}`} title={isReg ? `${ev.title} (Registered Completed)` : `${ev.title} (Completed)`} onClick={() => openEventDetails(ev)}>
                                      <span className="truncate">{ev.title}</span>
                                      {isReg && <CheckCircle className="w-3 h-3 text-emerald-600 shrink-0" />}
                                    </div>
                                  );
                                })}
                              {dayData.attended.length > 2 && (
                                <button className="w-full text-left text-[11px] px-2 py-1 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200" onClick={() => setDayModal({ open: true, key, date: dt, upcoming: dayData.upcoming, attended: dayData.attended })}>+{dayData.attended.length - 2} more</button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "MyRegs" && (
                <div className="space-y-6">
                  {registrations.length === 0 ? (
                    <div className="text-center py-16 bg-white border-2 border-dashed border-black text-black">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                        <Calendar className="w-8 h-8 text-slate-400" />
                      </div>
                      <h3 className="text-xl font-semibold text-slate-900 mb-2">No Registered Events</h3>
                      <p className="text-slate-500">Start exploring events to build your schedule!</p>
                    </div>
                  ) : (
                    <>
                      {(() => {
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
                                <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                                  {upcoming.map(event => (
                                    <GamifiedEventCard
                                      key={event._id}
                                      event={event}
                                      onRegister={() => { }}
                                      onBookmark={() => { }}
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
                                <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                                  {completed.map(event => {
                                    const reg = registrations.find(r => r.eventId === event._id) || {};
                                    const attended = !!reg.attended;
                                    return (
                                      <div key={event._id} className="space-y-2">
                                        <GamifiedEventCard
                                          event={event}
                                          onRegister={() => { }}
                                          onBookmark={() => { }}
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
                    <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                      {bookmarks.map((bookmarkId) => {
                        const event = events.find(e => e._id === bookmarkId);
                        return event ? (
                          <GamifiedEventCard
                            key={event._id}
                            event={event}
                            onRegister={() => registerForEvent(event)}
                            onBookmark={() => { handleBookmarkToggle(event); }}
                            onViewMore={() => { }}
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
                    <div className="text-center py-16 bg-white border-2 border-dashed border-black">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                        <Users className="w-8 h-8 text-slate-400" />
                      </div>
                      <h3 className="text-xl font-semibold text-slate-900 mb-2">Not Following Anyone Yet</h3>
                      <p className="text-slate-500">Follow hosts to get updates on their events!</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {subscribedHosts.map((h) => (
                        <div key={h._id} className="bg-purple-50 p-6 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all duration-200 text-black group">
                          <div className="flex items-center space-x-4 mb-4">
                            <div className="w-14 h-14 rounded-full border-2 border-slate-100 overflow-hidden bg-slate-50 flex items-center justify-center shrink-0">
                              {h.profilePic ? (
                                <img
                                  src={h.profilePic.startsWith('http') ? h.profilePic : `${config.apiBaseUrl}${h.profilePic}`}
                                  alt={h.fullname || h.username}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                  }}
                                />
                              ) : null}
                              <div className="hidden w-full h-full items-center justify-center bg-slate-200 text-slate-500 font-bold text-xl" style={{ display: h.profilePic ? 'none' : 'flex' }}>
                                {(h.fullname || h.username || "H").charAt(0).toUpperCase()}
                              </div>
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-lg font-bold text-slate-900 truncate">{h.fullname || h.username}</h3>
                              <p className="text-sm text-slate-500 truncate">{h.institute || h.email}</p>
                            </div>
                          </div>
                          <div className="flex space-x-3">
                            <button
                              onClick={() => { navigate(`/host/${h._id}`, { state: { fromSection: activeTab } }); }}
                              className="flex-1 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg transition-colors text-sm"
                            >
                              View Profile
                            </button>
                            <button
                              onClick={async () => {
                                const token = localStorage.getItem("token");
                                if (!token) { toast.error("Please login"); navigate('/login'); return; }
                                try {
                                  await api.delete(`/api/subscriptions/${h._id}`, { headers: { Authorization: `Bearer ${token}` } });
                                  setSubscribedHosts(prev => prev.filter(x => x._id !== h._id));
                                  toast.success('Unfollowed');
                                } catch (e) {
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

              {activeTab === "Friends" && (
                <div className="space-y-8">
                  {/* Sub-navigation for Friends Tab */}
                  <div className="flex border-b-2 border-black gap-2 overflow-x-auto no-scrollbar pb-1">
                    {[
                      { id: "Friends", label: "Friends", icon: UserPlus },
                      { id: "Squads", label: "Squads", icon: Shield },
                      { id: "Circles", label: "Circles", icon: UsersRound }
                    ].map(sub => (
                      <button
                        key={sub.id}
                        onClick={() => setFriendsSubTab(sub.id)}
                        className={`px-6 py-3 font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${friendsSubTab === sub.id ? 'bg-black text-white' : 'hover:bg-neutral-100'}`}
                      >
                        <sub.icon className="w-4 h-4" />
                        {sub.label}
                      </button>
                    ))}
                  </div>

                  <AnimatePresence mode="wait">
                    {friendsSubTab === "Friends" && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-6"
                      >
                        <div className="bg-pink-50 p-6 border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                          <h3 className="text-lg font-bold text-slate-900 mb-4 uppercase tracking-tighter flex items-center gap-2">
                             <UserPlus className="w-5 h-5" /> Your Friends
                          </h3>
                          <FriendsList onViewProfile={(u) => setProfilePreview(u)} />
                        </div>

                        <FriendRequests />

                        <div className="bg-indigo-50 p-6 border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                          <h3 className="text-lg font-bold text-slate-900 mb-4 uppercase tracking-tighter flex items-center gap-2">
                             <Search className="w-5 h-5" /> Find People
                          </h3>
                          <UserSearch
                            onViewProfile={(u) => setProfilePreview(u)}
                            fallback={
                              <div>
                                <h4 className="text-sm font-bold text-slate-500 mb-4 uppercase tracking-wide">Suggested for You</h4>
                                <FriendsSuggestions onViewProfile={(u) => setProfilePreview(u)} />
                              </div>
                            }
                          />
                        </div>
                      </motion.div>
                    )}

                    {friendsSubTab === "Squads" && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="max-w-6xl mx-auto"
                      >
                        <SquadManager currentUser={user} />
                      </motion.div>
                    )}

                    {friendsSubTab === "Circles" && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-8"
                      >
                        <div className="flex items-center justify-between border-b-2 border-black pb-4">
                          <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                             <UsersRound className="w-5 h-5" /> Your Circles
                          </h3>
                          <button 
                            onClick={() => navigate('/circles')}
                            className="px-4 py-2 bg-black text-white text-xs font-black uppercase tracking-widest hover:bg-neutral-800 transition-all border-2 border-black"
                          >
                            Explore More Circles
                          </button>
                        </div>
                        
                        {myCircles.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {myCircles.map(circle => (
                              <div 
                                key={circle._id} 
                                onClick={() => navigate(`/circles/${circle._id}`)}
                                className="group bg-white border-2 border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all cursor-pointer flex items-center gap-4"
                              >
                                <div className="w-12 h-12 border-2 border-black shrink-0 flex items-center justify-center overflow-hidden" style={{ backgroundColor: circle.iconColor + '20' }}>
                                  {circle.bannerUrl ? (
                                    <img src={circle.bannerUrl} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <UsersRound className="w-6 h-6" style={{ color: circle.iconColor }} />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h4 className="font-black uppercase text-sm truncate">{circle.name}</h4>
                                  <p className="text-[10px] font-bold text-neutral-400 uppercase">{circle.members?.length || 0} Members</p>
                                </div>
                                <ChevronRight className="w-5 h-5 opacity-20 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="py-20 text-center border-4 border-dashed border-neutral-200 uppercase font-black text-neutral-300">
                            You haven't joined any circles yet.
                            <br />
                            <button 
                              onClick={() => navigate('/circles')}
                              className="mt-4 px-6 py-2 border-2 border-black text-black bg-white hover:bg-black hover:text-white transition-all text-xs"
                            >
                              Join Your First Circle
                            </button>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {activeTab === "Wallet" && (
                <div className="-mt-8 -ml-8">
                  <TicketWallet user={user} />
                </div>
              )}


              {
                activeTab === "Leaderboard" && (
                  <div className="space-y-6">
                    {leaderboardLoading ? (
                      <div className="text-center py-10">
                        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
                        <p className="text-slate-500 font-bold">Summoning Leaderboard...</p>
                      </div>
                    ) : leaderboardUsers.length === 0 ? (
                      <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 text-slate-900 shadow-sm">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                          <Users className="w-8 h-8 text-slate-400" />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 mb-2">No Rivals Found</h3>
                        <p className="text-slate-500 mb-4">Add friends to compete for glory!</p>
                        <button onClick={() => setActiveTab('Friends')} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all">
                          Find Friends
                        </button>
                      </div>
                    ) : (
                      <Leaderboard
                        users={leaderboardUsers}
                        currentUserId={user?._id || user?.id}
                        category={leaderboardCategory}
                        skill={leaderboardSkill}
                        onCategoryChange={setLeaderboardCategory}
                        onSkillChange={setLeaderboardSkill}
                      />
                    )}
                  </div>
                )
              }

              {
                activeTab === "Achievements" && (
                  <div className="space-y-8">
                    <LevelProgress
                      currentLevel={currentLevel}
                      nextLevel={nextLevel}
                      progress={levelProgress}
                      points={userStats.points}
                      seasonPoints={userStats.seasonPoints}
                      tier={userStats.tier}
                    />

                    <SkillLeagues skillXP={userStats.skillXP} />

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <StatsCard title="Events Attended" value={userStats.totalEvents} icon={Calendar} color="blue" />
                      <StatsCard title="Bookmarks" value={userStats.totalBookmarks} icon={Bookmark} color="purple" />
                      <StatsCard title="Following" value={userStats.totalSubscriptions} icon={Users} color="pink" />
                      <StatsCard title="Reviews" value={userStats.totalReviews} icon={MessageSquare} color="green" />
                    </div>

                    <div className="bg-yellow-50 border-2 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-black relative overflow-hidden">
                      <h3 className="text-lg font-black text-black mb-4 uppercase tracking-wide border-b-2 border-black pb-2 inline-block">Career Readiness</h3>
                      <div className="w-full bg-neutral-100 border-2 border-black h-5 relative">
                        <div className="h-full bg-blue-600 border-r-2 border-black" style={{ width: `${careerReadiness}%` }} />
                        <div className="absolute inset-0 bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAIklEQVQIW2NkQAKrVq36zwjjgzhhYWGMYAEYB8RmROaABADeOQ8CXl/xfgAAAABJRU5ErkJggg==')] opacity-20 pointer-events-none mix-blend-overlay"></div>
                      </div>
                      <div className="mt-3 text-xs font-bold uppercase tracking-widest text-neutral-600 flex justify-between">
                        <span>Based on your activity & achievements</span>
                        <span className="text-black">{careerReadiness}% Ready</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-orange-50 border-2 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-black group hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-4px] hover:translate-y-[-4px] transition-all">
                        <h3 className="text-lg font-black text-black mb-2 flex items-center uppercase tracking-wide">
                          <Flame className="w-6 h-6 mr-3 text-black" />
                          STREAK
                        </h3>
                        <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Current Activity Streak</p>
                        <div className="mt-3 text-5xl font-black text-black">
                          {userStats.streak} <span className="text-xl text-neutral-400 font-bold">DAYS</span>
                        </div>
                      </div>
                      <div className="bg-white border-2 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-black group hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-4px] hover:translate-y-[-4px] transition-all">
                        <h3 className="text-lg font-black text-black mb-2 flex items-center uppercase tracking-wide">
                          <Crown className="w-6 h-6 mr-3 text-black" />
                          CURRENT RANK
                        </h3>
                        <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Global Status</p>
                        <div className="mt-3">
                          <span className="text-4xl font-black text-black uppercase tracking-tighter">{currentLevel.name}</span>
                          <span className="ml-3 text-xl text-blue-700 bg-blue-100 px-2 py-0.5 border border-black font-bold">Lv.{currentLevel.level}</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white border-2 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-black relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-400 to-amber-600 border-b-2 border-black"></div>
                      <h3 className="text-2xl font-black mb-2 flex items-center text-black uppercase tracking-tighter">
                        <Award className="w-8 h-8 mr-3 text-black" />
                        BADGE COLLECTION
                      </h3>
                      <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-8">Click on any badge to view details & criteria</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {GAMIFICATION.badges.map((badge) => {
                          const earned = userStats.badges.some(b => (typeof b === 'string' ? b === badge.id : b.id === badge.id));
                          // Calculate progress for each badge
                          const badgeProgress = {};
                          badge.criteria?.forEach(criterion => {
                            switch (criterion.id) {
                              case 'attend_event':
                                badgeProgress[criterion.id] = userStats.totalEvents;
                                break;
                              case 'bookmark_events':
                                badgeProgress[criterion.id] = userStats.totalBookmarks;
                                break;
                              case 'subscribe_hosts':
                                badgeProgress[criterion.id] = userStats.totalSubscriptions;
                                break;
                              case 'write_reviews':
                                badgeProgress[criterion.id] = userStats.totalReviews;
                                break;
                              case 'maintain_streak':
                                badgeProgress[criterion.id] = userStats.streak;
                                break;
                              case 'emailVerified':
                                badgeProgress[criterion.id] = (userStats.emailVerified || user?.emailVerified) ? 1 : 0;
                                break;
                              case 'earn_certificates':
                                badgeProgress[criterion.id] = registrations.filter(r => events.find(e => e._id === r.eventId)?.isCompleted).length;
                                break;
                              case 'early_registration':
                                badgeProgress[criterion.id] = 0; // TODO: Track early registrations
                                break;
                              case 'make_connections':
                                badgeProgress[criterion.id] = 0; // TODO: Track connections
                                break;
                              case 'friendsConnected':
                                // console.log('Render FriendsConnected:', userStats.totalFriends);
                                badgeProgress[criterion.id] = userStats.totalFriends || 0;
                                break;
                              default:
                                badgeProgress[criterion.id] = 0;
                            }
                          });

                          return (
                            <BadgeCard
                              key={badge.id}
                              badge={badge}
                              earned={earned}
                              progress={badgeProgress}
                              onClick={() => {
                                setSelectedBadge({ ...badge, progress: badgeProgress, earned });
                                setBadgeModalOpen(true);
                              }}
                            />
                          );
                        })}
                      </div>
                    </div>
                    <div className="bg-white border-2 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-black">
                      <h3 className="text-xl font-black text-black mb-6 flex items-center uppercase tracking-wide">
                        <Brain className="w-6 h-6 mr-3 text-black" />
                        SKILL TREE PROGRESS
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {Object.entries(skillProgress)
                          .sort(([, a], [, b]) => b - a)
                          .map(([skill, score]) => (
                            <div key={skill}>
                              <div className="flex justify-between text-xs font-bold mb-2 text-black uppercase tracking-widest">
                                <span>{skill}</span>
                                <span className="text-blue-600">{score}%</span>
                              </div>
                              <div className="w-full bg-neutral-100 border-2 border-black h-4 relative">
                                <div
                                  className="h-full bg-blue-600 border-r-2 border-black"
                                  style={{ width: `${score}%` }}
                                />
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                    <div className="bg-white border-2 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-black">
                      <h3 className="text-xl font-black text-black mb-6 flex items-center uppercase tracking-wide">
                        <Calendar className="w-6 h-6 mr-3 text-black" />
                        QUEST LOG
                      </h3>
                      {attendanceHistory.length === 0 ? (
                        <p className="text-sm text-neutral-500 italic font-bold">No quests completed yet.</p>
                      ) : (
                        <div className="space-y-4">
                          {attendanceHistory.map((h, idx) => (
                            <div key={idx} className="p-4 bg-white border-2 border-dashed border-neutral-300 hover:border-black hover:bg-neutral-50 transition-all flex items-center justify-between group">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 border-2 border-black bg-blue-100 flex items-center justify-center text-2xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">📜</div>
                                <div>
                                  <div className="text-sm font-black text-black uppercase tracking-wide group-hover:text-blue-700 transition-colors">{h.title}</div>
                                  <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">{new Date(h.date).toLocaleDateString()} • {h.type}</div>
                                </div>
                              </div>
                              <button onClick={() => navigate(`/review/${h.eventId}`)} className="px-4 py-2 text-[10px] font-bold text-white bg-black border-2 border-black hover:bg-neutral-800 uppercase tracking-widest transition-all opacity-0 group-hover:opacity-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-none">
                                REVIEW
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="bg-white border-2 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-black">
                      <h3 className="text-xl font-black text-black mb-6 flex items-center uppercase tracking-wide">
                        <MessageSquare className="w-6 h-6 mr-3 text-black" />
                        FEEDBACK HISTORY
                      </h3>
                      {recommendationFeedback.length === 0 ? (
                        <p className="text-sm text-neutral-500 italic font-bold">No feedback recorded.</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {recommendationFeedback.map((f, i) => (
                            <div key={i} className={`p-4 border-2 ${f.liked ? 'bg-green-50 border-green-900' : 'bg-red-50 border-red-900'} relative overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`}>
                              <div className="flex items-center justify-between mb-2 relative z-10">
                                <span className="text-xs font-bold text-black uppercase tracking-widest">Rated: {f.rating}/5</span>
                                <span className={`text-[10px] font-black px-2 py-0.5 border-2 border-black uppercase tracking-widest ${f.liked ? 'bg-green-300 text-black' : 'bg-red-300 text-black'}`}>
                                  {f.liked ? 'LIKED' : 'DISLIKED'}
                                </span>
                              </div>
                              {f.comment && <div className="text-sm text-black font-medium italic relative z-10 mb-2">"{f.comment}"</div>}
                              <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest relative z-10">{new Date(f.at).toLocaleDateString()}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              }

              {
                activeTab === "Notifications" && (
                  <div className="space-y-4">
                    {notifications.length === 0 ? (
                      <div className="text-center py-16 bg-white border-2 border-black border-dashed text-black">
                        <div className="w-16 h-16 mx-auto mb-4 bg-neutral-100 border-2 border-black flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                          <BellRing className="w-8 h-8 text-black" />
                        </div>
                        <h3 className="text-xl font-black text-black mb-2 uppercase tracking-wide">No Notifications</h3>
                        <p className="text-sm font-bold text-neutral-500 uppercase tracking-widest">You're all caught up!</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {notifications.map((n, idx) => (
                          <div
                            key={n._id || idx}
                            onClick={() => viewNotification(n)}
                            className={`bg-white border-2 p-4 transition-all duration-200 cursor-pointer group relative overflow-hidden ${n.read
                              ? "border-slate-200 hover:border-black"
                              : "border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5"
                              }`}
                          >
                            {!n.read && (
                              <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 border-l-2 border-b-2 border-black" />
                            )}

                            <div className="flex items-start gap-4">
                              <div className={`w-12 h-12 flex-shrink-0 flex items-center justify-center border-2 border-black text-xl font-bold ${n.type === 'Friend Request' ? 'bg-blue-100' :
                                n.type === 'Achievement' ? 'bg-amber-100' :
                                  n.type === 'System' ? 'bg-neutral-100' : 'bg-white'
                                }`}>
                                {n.type === 'Friend Request' ? '👋' : n.type === 'Achievement' ? '🏆' : '📢'}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                                    {n.type || "Notification"}
                                  </span>
                                  <span className="text-[10px] font-bold font-mono text-neutral-400">
                                    {new Date(n.createdAt || n.at || Date.now()).toLocaleDateString()}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <h4 className={`text-sm font-black uppercase tracking-tight ${!n.read ? 'text-black' : 'text-neutral-500'}`}>
                                    {n.title || n.message}
                                  </h4>
                                  {n.status === 'processed' && (
                                    <span className="text-[8px] font-black px-1.5 py-0.5 bg-neutral-200 text-neutral-600 border border-neutral-300 uppercase tracking-widest">
                                      HANDLED
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-neutral-500 line-clamp-2">
                                  {n.message}
                                </p>
                                {n.type === 'Friend Request' && n.status !== 'processed' && (
                                  <div className="flex gap-2 mt-3">
                                    <button onClick={(e) => handleFriendRequest(e, n, 'accept')} className="px-4 py-2 bg-black text-white text-[10px] font-black uppercase tracking-widest hover:bg-neutral-800 transition-all border-2 border-black">ACCEPT</button>
                                    <button onClick={(e) => handleFriendRequest(e, n, 'decline')} className="px-4 py-2 bg-white text-black text-[10px] font-black uppercase tracking-widest hover:bg-neutral-100 transition-all border-2 border-black">DECLINE</button>
                                  </div>
                                )}
                                {n.type === 'Squad' && n.status !== 'processed' && (
                                  <div className="flex gap-2 mt-3">
                                    <button onClick={(e) => handleSquadNotification(e, n, 'accept')} className="px-4 py-2 bg-black text-white text-[10px] font-black uppercase tracking-widest hover:bg-neutral-800 transition-all border-2 border-black">ACCEPT</button>
                                    <button onClick={(e) => handleSquadNotification(e, n, 'decline')} className="px-4 py-2 bg-white text-black text-[10px] font-black uppercase tracking-widest hover:bg-neutral-100 transition-all border-2 border-black">DECLINE</button>
                                  </div>
                                )}
                                {n.type === 'Circle Invite' && n.status !== 'processed' && (
                                  <div className="flex gap-2 mt-3 text-black">
                                    <button 
                                      onClick={(e) => handleCircleNotification(e, n, 'accept')} 
                                      className="px-4 py-2 bg-yellow-400 text-black text-[10px] font-black uppercase tracking-widest hover:bg-yellow-500 transition-all border-2 border-black"
                                    >
                                      JOIN CIRCLE
                                    </button>
                                    <button 
                                      onClick={(e) => handleCircleNotification(e, n, 'decline')} 
                                      className="px-4 py-2 bg-white text-black text-[10px] font-black uppercase tracking-widest hover:bg-neutral-100 transition-all border-2 border-black"
                                    >
                                      DECLINE
                                    </button>
                                  </div>
                                )}
                              </div>

                              <div className="flex flex-col items-center justify-center self-center gap-2">
                                <button
                                  onClick={(e) => deleteNotification(e, n._id)}
                                  className="p-1.5 hover:bg-red-50 text-neutral-400 hover:text-red-500 rounded transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                                <ChevronRight className="w-5 h-5 text-black opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              }
            </div>
          </main>

          <AnimatePresence>
            {notifModalOpen && (
              <NotificationDetailModal
                isOpen={notifModalOpen}
                onClose={() => setNotifModalOpen(false)}
                notification={selectedNotification}
              />
            )}
          </AnimatePresence>
        </div >

        {
          detailOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <EventDetailModal
                event={selectedEvent}
                isOpen={detailOpen}
                onClose={closeEventDetails}
                user={user}
                onRegister={registerFromDetails}
                onBookmark={(ev) => toggleBookmark(ev)}
                onSubscribe={(ev) => handleSubscribeHost(ev)}
                onNavigateToReview={handleNavigateToReview}
                onDownloadCertificate={handleDownloadCertificate}
                isRegistered={(id) => registrations.some(r => r.eventId === id && r.status === 'registered')}
                isWaitlisted={(id) => registrations.some(r => r.eventId === id && r.status === 'waitlisted')}
                isAttended={(id) => registrations.some(r => r.eventId === id && r.attended)}
                isBookmarked={(id) => bookmarks.includes(id)}
                isSubscribed={(selectedEvent?.hostId && isSubscribedToHost(selectedEvent.hostId._id || selectedEvent.hostId))}
                onOpenHost={(hid) => navigate(`/host/${hid}`, { state: { fromSection: activeTab } })}
                onJoinWaitingList={handleJoinWaitingList}
                onCancel={handleCancelRegistration}
                certificateId={selectedEvent ? certIds[selectedEvent._id] : undefined}
                disabledActions={false}
              />
            </div>
          )
        }

        {
          profilePreview && (
            <UserProfileModal
              user={profilePreview}
              onClose={() => setProfilePreview(null)}
            />
          )
        }
        {/* Calendar Overlay (dropdown-like, large) */}
        {
          calendarOverlayOpen && (
            <div className="fixed inset-0 z-[70]" aria-modal="true" role="dialog">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCalendarOverlayOpen(false)} />
              <div
                id="calendar-overlay-panel"
                tabIndex={-1}
                className="absolute bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] border-2 border-black overflow-hidden flex flex-col transform transition-all duration-300 ease-out animate-fadeIn translate-y-4"
                style={{ top: overlayPos.top, left: overlayPos.left, width: overlayPos.width, height: '82vh' }}
              >
                <div className="flex items-center justify-between px-6 py-4 border-b-2 border-black bg-white">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setCalendarDate(new Date(calendarYear, calendarMonth - 1, 1))} className="px-4 py-2 bg-white hover:bg-neutral-100 text-black border-2 border-black font-bold uppercase text-xs tracking-wider transition-colors">Prev</button>
                    <button onClick={() => setCalendarDate(new Date())} className="px-4 py-2 bg-black text-white hover:bg-neutral-800 border-2 border-black font-bold uppercase text-xs tracking-wider transition-colors">Today</button>
                    <button onClick={() => setCalendarDate(new Date(calendarYear, calendarMonth + 1, 1))} className="px-4 py-2 bg-white hover:bg-neutral-100 text-black border-2 border-black font-bold uppercase text-xs tracking-wider transition-colors">Next</button>
                  </div>
                  <div className="text-xl font-black text-black uppercase tracking-tighter">
                    {calendarView === 'month' ? calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' }) : `Week of ${weekStart.toLocaleDateString()}`}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="hidden md:flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-black">
                      <span className="inline-flex items-center gap-1"><span className="w-3 h-3 border border-black bg-blue-400 inline-block shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" /> Upcoming</span>
                      <span className="inline-flex items-center gap-1"><span className="w-3 h-3 border border-black bg-emerald-400 inline-block shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" /> Completed</span>
                      <span className="inline-flex items-center gap-1"><span className="w-3 h-3 border border-black bg-orange-400 inline-block shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" /> Registered</span>
                    </div>
                    <span className="inline-flex border-2 border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                      <button onClick={() => setCalendarView('month')} className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${calendarView === 'month' ? 'bg-black text-white' : 'text-black hover:bg-neutral-100'}`}>Month</button>
                      <button onClick={() => setCalendarView('week')} className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest border-l-2 border-black ${calendarView === 'week' ? 'bg-black text-white' : 'text-black hover:bg-neutral-100'}`}>Week</button>
                    </span>
                    <button onClick={() => setCalendarOverlayOpen(false)} className="ml-2 p-2 hover:bg-black hover:text-white border-2 border-transparent hover:border-black transition-all" aria-label="Close">
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>
                <div className="p-6 overflow-auto bg-neutral-50 h-full">
                  <div className="grid grid-cols-7 gap-3 text-xs font-black text-black uppercase tracking-widest mb-3">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (<div key={d} className="text-center">{d}</div>))}
                  </div>
                  <div className="grid grid-cols-7 gap-3">
                    {(calendarView === 'month' ? monthDays : weekDays).map((dt, idx) => {
                      if (!dt) return <div key={`pad-ov-${idx}`} className="h-32 border-2 border-dashed border-neutral-300 bg-transparent opacity-50" />;
                      const key = dayKey(dt);
                      const dayData = eventsByDay.get(key) || { upcoming: [], attended: [] };
                      const isToday = (() => { const t = new Date(); return t.getFullYear() === dt.getFullYear() && t.getMonth() === dt.getMonth() && t.getDate() === dt.getDate(); })();
                      return (
                        <div key={key} className={`relative h-32 border-2 border-black bg-white p-2 transition-all duration-100 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 ${isToday ? 'bg-blue-50 ring-inset ring-4 ring-blue-500/20' : ''}`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className={`text-sm font-bold ${isToday ? 'text-blue-700' : 'text-black'}`}>{dt.toLocaleDateString(undefined, { day: 'numeric' })}</div>
                          </div>

                          <div className="space-y-1.5 overflow-y-auto max-h-24 pr-1 scrollbar-hide">
                            {Array.from(new Map(dayData.upcoming.map(e => [e._id, e])).values())
                              .slice()
                              .sort((a, b) => {
                                const ra = (registrations || []).some(r => r.eventId === a._id) ? 0 : 1;
                                const rb = (registrations || []).some(r => r.eventId === b._id) ? 0 : 1;
                                return ra - rb;
                              })
                              .slice(0, 2)
                              .map(ev => {
                                const isReg = (registrations || []).some(r => r.eventId === ev._id);
                                const chipCls = isReg
                                  ? 'bg-orange-100 text-orange-900 border-orange-900'
                                  : 'bg-blue-100 text-blue-900 border-blue-900';
                                return (
                                  <div key={ev._id} className={`text-[10px] font-bold uppercase truncate px-1.5 py-1 border hover:bg-black hover:text-white hover:border-black transition-colors cursor-pointer flex items-center justify-between gap-1 ${chipCls}`} title={isReg ? `${ev.title} (Registered)` : ev.title} onClick={() => openEventDetails(ev)}>
                                    <span className="truncate">{ev.title}</span>
                                    {isReg && <CheckCircle className="w-3 h-3 shrink-0" />}
                                  </div>
                                );
                              })}

                            {/* More button */}
                            {dayData.upcoming.length > 2 && (
                              <button className="w-full text-left text-[9px] font-bold uppercase px-1.5 py-0.5 border border-black bg-neutral-100 hover:bg-black hover:text-white transition-colors" onClick={() => setDayModal({ open: true, key, date: dt, upcoming: dayData.upcoming, attended: dayData.attended })}>+{dayData.upcoming.length - 2} more</button>
                            )}

                            {Array.from(new Map(dayData.attended.map(e => [e._id, e])).values())
                              .slice()
                              .sort((a, b) => {
                                const ra = (registrations || []).some(r => r.eventId === a._id) ? 0 : 1;
                                const rb = (registrations || []).some(r => r.eventId === b._id) ? 0 : 1;
                                return ra - rb;
                              })
                              .slice(0, 2)
                              .map(ev => {
                                const isReg = (registrations || []).some(r => r.eventId === ev._id);
                                const chipCls = isReg
                                  ? 'bg-yellow-100 text-yellow-900 border-yellow-900'
                                  : 'bg-emerald-100 text-emerald-900 border-emerald-900';
                                return (
                                  <div key={ev._id} className={`text-[10px] font-bold uppercase truncate px-1.5 py-1 border hover:bg-black hover:text-white hover:border-black transition-colors cursor-pointer flex items-center justify-between gap-1 ${chipCls}`} title={isReg ? `${ev.title} (Registered Completed)` : `${ev.title} (Completed)`} onClick={() => openEventDetails(ev)}>
                                    <span className="truncate">{ev.title}</span>
                                    {isReg && <CheckCircle className="w-3 h-3 shrink-0" />}
                                  </div>
                                );
                              })}

                            {dayData.attended.length > 2 && (
                              <button className="w-full text-left text-[9px] font-bold uppercase px-1.5 py-0.5 border border-black bg-neutral-100 hover:bg-black hover:text-white transition-colors" onClick={() => setDayModal({ open: true, key, date: dt, upcoming: dayData.upcoming, attended: dayData.attended })}>+{dayData.attended.length - 2} more</button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )
        }

        {
          dayModal.open && (
            <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDayModal({ open: false, key: null, date: null, upcoming: [], attended: [] })}>
              <div className="bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] border-2 border-black w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="p-4 border-b-2 border-black flex items-center justify-between bg-white">
                  <div className="text-xl font-black text-black uppercase tracking-tight">{dayModal.date ? dayModal.date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : 'Day'}</div>
                  <button className="px-3 py-1.5 text-xs font-bold uppercase tracking-widest bg-black text-white hover:bg-neutral-800 transition-colors" onClick={() => setDayModal({ open: false, key: null, date: null, upcoming: [], attended: [] })}>Close</button>
                </div>
                <div className="p-6 max-h-[60vh] overflow-y-auto bg-neutral-50">
                  <div className="mb-6">
                    <div className="text-xs font-bold text-black uppercase tracking-widest mb-3 border-b-2 border-dashed border-black pb-1">Upcoming</div>
                    {dayModal.upcoming.length === 0 ? (
                      <div className="text-sm text-neutral-500 italic">No upcoming events</div>
                    ) : (
                      <div className="space-y-3">
                        {dayModal.upcoming.map(ev => (
                          <div key={ev._id} className="p-3 border-2 border-blue-900 bg-blue-50 text-blue-900 flex items-center justify-between shadow-[2px_2px_0px_0px_#1e3a8a]">
                            <div className="text-sm font-bold truncate pr-3">{ev.title}</div>
                            <button className="text-[10px] uppercase font-bold px-3 py-1.5 bg-blue-900 text-white hover:bg-black transition-colors" onClick={() => { openEventDetails(ev); setDayModal({ open: false, key: null, date: null, upcoming: [], attended: [] }); }}>View</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-black uppercase tracking-widest mb-3 border-b-2 border-dashed border-black pb-1">Attended</div>
                    {dayModal.attended.length === 0 ? (
                      <div className="text-sm text-neutral-500 italic">No attended events</div>
                    ) : (
                      <div className="space-y-3">
                        {dayModal.attended.map(ev => (
                          <div key={ev._id} className="p-3 border-2 border-emerald-900 bg-emerald-50 text-emerald-900 flex items-center justify-between shadow-[2px_2px_0px_0px_#064e3b]">
                            <div className="text-sm font-bold truncate pr-3">{ev.title}</div>
                            <button className="text-[10px] uppercase font-bold px-3 py-1.5 bg-emerald-900 text-white hover:bg-black transition-colors" onClick={() => { openEventDetails(ev); setDayModal({ open: false, key: null, date: null, upcoming: [], attended: [] }); }}>View</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        }

        {/* Badge Detail Modal */}
        <BadgeDetailModal
          badge={selectedBadge}
          isOpen={badgeModalOpen}
          onClose={() => {
            setBadgeModalOpen(false);
            setSelectedBadge(null);
          }}
          earned={selectedBadge?.earned || false}
          progress={selectedBadge?.progress || {}}
        />
      </div >
    </LayoutGroup >
  );
}