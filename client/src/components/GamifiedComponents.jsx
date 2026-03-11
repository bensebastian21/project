import React from 'react';
import config from '../config';
import {
  Star,
  Trophy,
  Award,
  Flame,
  Crown,
  Sparkles,
  Zap,
  Target,
  TrendingUp,
  Users,
  Clock,
  Gift,
  Medal,
  Rocket,
  Heart,
  Brain,
  Calendar,
  MapPin,
  Bookmark,
  CheckCircle,
  MessageSquare,
  Shield,
  Swords,
  Ticket,
  ArrowRight,
  MoreHorizontal,
} from 'lucide-react';
import TicketModal from './TicketModal';

// Professional Event Card Component
// Professional Event Card Component - Refactored to match Landing Page Design
export const GamifiedEventCard = ({
  event,
  onRegister,
  onBookmark,
  onViewMore,
  isRegistered,
  isBookmarked,
  userStats,
  awardPoints,
  disabledActions = false,
}) => {
  const toAbsoluteUrl = (u) => {
    const s = String(u || '');
    if (!s) return s;
    if (/^https?:\/\//i.test(s)) return s;
    return `${config.apiBaseUrl.replace(/\/$/, '')}${s.startsWith('/') ? '' : '/'}${s}`;
  };

  const [showTicket, setShowTicket] = React.useState(false);
  const isCompleted = event.isCompleted;
  const isOnline = event.isOnline;
  const regDeadline = event?.registrationDeadline ? new Date(event.registrationDeadline) : null;
  const regClosed =
    regDeadline && !isNaN(regDeadline.getTime()) && Date.now() > regDeadline.getTime();

  // Animations from Landing Page
  const { motion } = require('framer-motion'); // Inline require for motion to avoid top-level import issues if not already there, but usually it is. Assuming framer-motion is available as it was in LandingPage.

  return (
    <div
      className="group h-full w-full flex flex-col bg-white border-2 border-black overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-4px] hover:translate-y-[-4px] transition-all duration-300 cursor-pointer"
      onClick={() => onViewMore(event)}
    >
      {/* Image Container - Square */}
      <div className="w-full aspect-square relative overflow-hidden bg-neutral-900">
        <div className="w-full h-full transform transition-transform duration-700 ease-out group-hover:scale-110">
          {(event.ai?.posterUrl || event.imageUrl) ? (
            <img
              src={event.ai?.posterUrl || toAbsoluteUrl(event.imageUrl)}
              alt={event.title}
              className="object-cover w-full h-full grayscale-0 group-hover:grayscale transition-all duration-700"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://via.placeholder.com/400x400/000000/FFFFFF?text=EVENT';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-neutral-100 opacity-20">
              <Calendar className="w-16 h-16 text-black" />
            </div>
          )}
        </div>

        {/* GenLoop AI Badge */}
        {event.ai?.engagementScore > 0 && (
          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-2 py-1 bg-black/80 backdrop-blur-sm">
            <div className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-blue-400 animate-pulse" />
              <span className="text-[8px] font-black uppercase tracking-widest text-blue-300">GenLoop AI</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[9px] font-black text-white">{event.ai.engagementScore}</span>
              <span className="text-[8px] text-blue-300 uppercase font-bold">viral score</span>
            </div>
          </div>
        )}

        {/* Status Tags Overlay */}
        <div className="absolute top-0 left-0 flex flex-col gap-1 p-2 z-10">
          {event.isTeamEvent && (
            <span className="bg-purple-600 text-white px-2 py-1 text-[9px] font-bold uppercase tracking-widest flex items-center gap-1">
              <Users className="w-3 h-3" /> Team ({event.minTeamSize}-{event.maxTeamSize})
            </span>
          )}
          {isCompleted && (
            <span className="bg-black text-white px-2 py-1 text-[9px] font-bold uppercase tracking-widest">
              Completed
            </span>
          )}
          {isRegistered && !isCompleted && (
            <span className="bg-blue-600 text-white px-2 py-1 text-[9px] font-bold uppercase tracking-widest">
              Registered
            </span>
          )}
          {regClosed && !isCompleted && !isRegistered && (
            <span className="bg-red-600 text-white px-2 py-1 text-[9px] font-bold uppercase tracking-widest">
              Closed
            </span>
          )}
          {isOnline && (
            <span className="bg-green-600 text-white px-2 py-1 text-[9px] font-bold uppercase tracking-widest">
              Online
            </span>
          )}
        </div>

        {/* Price Tag */}
        <div className="absolute top-0 right-0 bg-white text-black px-3 py-1 text-[9px] font-bold uppercase tracking-widest z-10 border-b-2 border-l-2 border-black">
          {event.price > 0 ? `₹${event.price}` : 'Free'}
        </div>
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-2 flex-1 justify-between bg-white relative">
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[8px] font-bold uppercase tracking-widest text-neutral-400">
              {event.category || 'Event'}
            </span>
            <span className="text-[8px] font-bold uppercase tracking-widest text-neutral-400">
              {new Date(event.date).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>
          <h3 className="text-[13px] font-bold uppercase tracking-tight text-neutral-900 leading-tight group-hover:text-neutral-500 transition-colors line-clamp-2">
            {event.title}
          </h3>
          <span className="text-[8px] font-bold uppercase tracking-widest text-neutral-400 truncate block">
            {isOnline ? 'Online' : event.location || 'Campus'}
          </span>
          {/* GenLoop rewards tags */}
          {event.gamificationRewards && event.gamificationRewards.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {event.gamificationRewards.slice(0, 2).map((r, i) => (
                <span key={i} className="text-[7px] font-bold uppercase tracking-widest bg-blue-100 text-blue-800 border border-blue-300 px-1.5 py-0.5 flex items-center gap-1">
                  <Trophy className="w-2.5 h-2.5" /> {r}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Actions (Buttons) */}
        <div className="flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300">
          {isRegistered && !isCompleted && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowTicket(true);
              }}
              className="flex-1 py-1 bg-black text-white text-[8px] font-bold uppercase tracking-widest hover:bg-neutral-800 transition-colors border border-black"
            >
              Ticket
            </button>
          )}
          {!isRegistered && !isCompleted && !regClosed && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (event.isTeamEvent) {
                  onViewMore();
                } else {
                  onRegister();
                }
              }}
              className={`flex-1 py-1 border border-black text-black text-[8px] font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors ${disabledActions ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={disabledActions}
            >
              {event.isTeamEvent ? 'Register Squad' : 'Register'}
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onBookmark();
            }}
            className={`p-1 border ${isBookmarked ? 'bg-black text-white border-black' : 'border-black text-black hover:bg-black hover:text-white'} transition-colors`}
          >
            <Bookmark className="w-3 h-3" />
          </button>
        </div>
      </div>
      <TicketModal isOpen={showTicket} onClose={() => setShowTicket(false)} eventId={event._id} />
    </div>
  );
};

// Enhanced Badge Card Component
export const BadgeCard = ({ badge, earned = false, progress = {}, onClick }) => {
  const getRarityColor = (rarity) => {
    const r = (rarity || 'common').toLowerCase();
    switch (r) {
      case 'bronze':
        return 'bg-orange-100 text-orange-800';
      case 'silver':
        return 'bg-slate-100 text-slate-800';
      case 'gold':
        return 'bg-yellow-100 text-yellow-800';
      case 'platinum':
        return 'bg-cyan-100 text-cyan-800';
      case 'common':
        return 'bg-slate-50 text-slate-600';
      case 'uncommon':
        return 'bg-green-100 text-green-800';
      case 'rare':
        return 'bg-blue-100 text-blue-800';
      case 'epic':
        return 'bg-purple-100 text-purple-800';
      case 'legendary':
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-slate-50 text-slate-600';
    }
  };

  const getRarityBorder = (rarity) => {
    return 'border-black';
  };

  const totalRequired = badge.criteria?.reduce((sum, c) => sum + c.required, 0) || 1;
  const totalCurrent =
    badge.criteria?.reduce((sum, c) => {
      const current = progress[c.id] || c.current || 0;
      return sum + Math.min(current, c.required);
    }, 0) || 0;
  const overallProgress = Math.round((totalCurrent / totalRequired) * 100);

  const rarityClass = getRarityColor(badge.tier || badge.rarity);

  return (
    <div
      onClick={onClick}
      className={`group relative bg-white border-2 border-black p-4 transition-all duration-300 cursor-pointer hover:translate-y-[-4px] hover:translate-x-[-4px] ${earned
        ? `shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]`
        : 'opacity-70 hover:opacity-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
        }`}
    >
      {earned && (
        <div
          className={`absolute top-0 left-0 px-2 py-0.5 border-r-2 border-b-2 border-black text-[9px] font-bold uppercase tracking-widest ${rarityClass}`}
        >
          {badge.tier || badge.rarity || 'Common'}
        </div>
      )}

      <div className="flex flex-col items-center mb-3 mt-2">
        <div
          className={`relative w-16 h-16 flex items-center justify-center text-3xl mb-3 border-2 border-black transition-all duration-300 ${earned
            ? `${rarityClass} shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`
            : 'bg-slate-100 grayscale'
            }`}
        >
          <div className={earned ? 'filter-none' : 'opacity-40'}>{badge.icon}</div>

          {!earned && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Shield className="w-6 h-6 text-black opacity-30" />
            </div>
          )}

          {earned && (
            <div className="absolute -bottom-2 -right-2 bg-green-500 text-white p-1 border-2 border-black">
              <CheckCircle className="w-3 h-3" />
            </div>
          )}
        </div>

        <h4
          className={`text-sm font-black uppercase tracking-tight text-center leading-tight ${earned ? 'text-black' : 'text-neutral-500'}`}
        >
          {badge.name}
        </h4>

        <div className="flex items-center gap-1 mt-1 border border-black px-2 py-0.5 bg-neutral-100">
          <Zap className={`w-3 h-3 text-black`} />
          <span className={`text-[10px] font-bold text-black`}>+{badge.points} XP</span>
        </div>
      </div>

      {!earned && overallProgress > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">
              Progress
            </span>
            <span className="text-[9px] font-bold text-black">{overallProgress}%</span>
          </div>
          <div className="h-2 bg-neutral-200 border border-black">
            <div
              className="h-full bg-black transition-all duration-500"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Achievement Badge Component (Original - kept for backward compatibility)
export const AchievementBadge = ({ badge, earned = false, size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8 p-1.5',
    md: 'w-12 h-12 p-2.5',
    lg: 'w-20 h-20 p-4',
  };

  return (
    <div className="flex flex-col items-center group">
      <div
        className={`relative rounded-full flex items-center justify-center transition-all duration-300 ${sizeClasses[size]} ${earned
          ? 'bg-blue-100 text-blue-600 ring-2 ring-blue-500 ring-offset-2'
          : 'bg-slate-100 text-slate-400'
          }`}
      >
        {badge.icon}

        {earned && (
          <div className="absolute -bottom-1 -right-1 bg-green-500 text-white rounded-full p-0.5 border-2 border-white">
            <CheckCircle className="w-3 h-3" />
          </div>
        )}
      </div>
      <div className="mt-2 text-center opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full mb-2 bg-slate-900 text-white text-xs py-1 px-2 rounded-md whitespace-nowrap z-10 pointer-events-none">
        {badge.name}
      </div>
    </div>
  );
};

// Level & Tier Progress Component (PUBG-Style)
export const LevelProgress = ({ currentLevel, nextLevel, progress, points, seasonPoints = 0, tier = "Bronze" }) => {
  const tiers = {
    Bronze: { icon: '🥉', color: 'bg-orange-100 text-orange-800' },
    Silver: { icon: '🥈', color: 'bg-slate-100 text-slate-800' },
    Gold: { icon: '🥇', color: 'bg-yellow-100 text-yellow-800' },
    Platinum: { icon: '💎', color: 'bg-cyan-100 text-cyan-800' },
    Diamond: { icon: '💠', color: 'bg-blue-100 text-blue-800' },
    Crown: { icon: '👑', color: 'bg-purple-100 text-purple-800' },
    Ace: { icon: '🌟', color: 'bg-red-100 text-red-800' },
    Conqueror: { icon: '🏆', color: 'bg-amber-100 text-amber-800' },
  };

  const currentTier = tiers[tier] || tiers.Bronze;

  return (
    <div className="bg-white border-2 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
      <div className="flex justify-between items-end mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 flex items-center justify-center border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-3xl ${currentTier.color}`}>
            {currentTier.icon}
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-1">
              Current Rank
            </div>
            <h3 className="text-2xl font-black text-black uppercase tracking-tighter">
              {tier}
            </h3>
            <div className="space-x-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-blue-700 bg-blue-100 px-2 py-0.5 inline-block border border-blue-900 border-dashed">
                Level {currentLevel.level}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-wide text-green-700 bg-green-100 px-2 py-0.5 inline-block border border-green-900 border-dashed">
                {currentLevel.name}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-4 sm:gap-8 ml-auto">
          <div className="text-right">
            <div className="text-2xl font-black text-black tracking-tighter">
              {seasonPoints.toLocaleString()}
            </div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
              Season Pts
            </div>
          </div>
          <div className="text-right border-l-2 border-black pl-4 sm:pl-8">
            <div className="text-2xl font-black text-black tracking-tighter">
              {points.toLocaleString()}
            </div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
              Lifetime XP
            </div>
          </div>
        </div>
      </div>

      {nextLevel && (
        <div className="space-y-3">
          <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-black">
            <span>Next Level: {currentLevel.level + 1}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-4 bg-neutral-100 border-2 border-black w-full relative">
            <div
              className="h-full bg-black transition-all duration-1000"
              style={{ width: `${progress}%` }}
            />
            <div className="absolute inset-0 bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAIklEQVQIW2NkQAKrVq36zwjjgzhhYWGMYAEYB8RmROaABADeOQ8CXl/xfgAAAABJRU5ErkJggg==')] opacity-20 pointer-events-none mix-blend-overlay"></div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-400">Monthly season resets in 12 days</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
              {nextLevel.minPoints - points} XP needed
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// Skill Leagues Component
export const SkillLeagues = ({ skillXP = {} }) => {
  const categories = [
    { key: 'technical', name: 'Technical', icon: Brain, color: 'blue' },
    { key: 'creative', name: 'Creative', icon: Sparkles, color: 'purple' },
    { key: 'management', name: 'Management', icon: Target, color: 'orange' },
    { key: 'social', name: 'Social', icon: Users, color: 'green' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {categories.map((cat) => {
        const Icon = cat.icon;
        const xp = skillXP[cat.key] || 0;
        const level = Math.floor(Math.sqrt(xp / 10)) || 1;
        const currentMin = level === 1 ? 0 : Math.pow(level, 2) * 10;
        const nextMin = Math.pow(level + 1, 2) * 10;
        const progress = Math.max(0, Math.min(100, ((xp - currentMin) / (nextMin - currentMin)) * 100));

        const colors = {
          blue: 'bg-blue-50 border-blue-200 text-blue-700',
          purple: 'bg-purple-50 border-purple-200 text-purple-700',
          orange: 'bg-orange-50 border-orange-200 text-orange-700',
          green: 'bg-green-50 border-green-200 text-green-700',
        };

        return (
          <div key={cat.key} className="bg-white border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${colors[cat.color]}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-tight">{cat.name} League</h4>
                <p className="text-[9px] font-bold text-neutral-500 uppercase">Level {level}</p>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[8px] font-bold uppercase">
                <span>XP: {xp}</span>
                <span>Tier 1</span>
              </div>
              <div className="h-1.5 bg-neutral-100 border border-black overflow-hidden">
                <div className="h-full bg-black" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Stats Card Component
export const StatsCard = ({ title, value, icon: Icon, color, trend = null }) => {
  const colors = {
    blue: 'text-blue-900 bg-blue-100 border-blue-900',
    purple: 'text-purple-900 bg-purple-100 border-purple-900',
    pink: 'text-pink-900 bg-pink-100 border-pink-900',
    green: 'text-emerald-900 bg-emerald-100 border-emerald-900',
    orange: 'text-orange-900 bg-orange-100 border-orange-900',
  };

  const theme = colors[color] || colors.blue;

  return (
    <div
      className={`bg-white border-2 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-4px] hover:translate-y-[-4px] transition-all duration-300 ${color === 'blue' ? 'bg-blue-50' : color === 'purple' ? 'bg-purple-50' : color === 'pink' ? 'bg-pink-50' : color === 'green' ? 'bg-emerald-50' : 'bg-orange-50'}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 border-2 ${theme} shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]`}>
          <Icon className="w-6 h-6" />
        </div>
        {trend !== null && (
          <div
            className={`flex items-center text-xs font-bold uppercase border-2 px-1.5 py-0.5 ${trend > 0 ? 'bg-green-100 text-green-900 border-green-900' : 'bg-red-100 text-red-900 border-red-900'}`}
          >
            <TrendingUp className={`w-3 h-3 mr-1 ${trend < 0 ? 'rotate-180' : ''}`} />
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div>
        <h4 className="text-3xl font-black text-black tracking-tighter mb-1">{value}</h4>
        <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">{title}</p>
      </div>
    </div>
  );
};

// Leaderboard Component
// Leaderboard Component
export const Leaderboard = ({ users = [], currentUserId = null, category = 'global', skill = null, onCategoryChange, onSkillChange }) => {
  const tiers = {
    Bronze: { icon: '🥉', color: 'bg-orange-100 text-orange-800' },
    Silver: { icon: '🥈', color: 'bg-slate-100 text-slate-800' },
    Gold: { icon: '🥇', color: 'bg-yellow-100 text-yellow-800' },
    Platinum: { icon: '💎', color: 'bg-cyan-100 text-cyan-800' },
    Diamond: { icon: '💠', color: 'bg-blue-100 text-blue-800' },
    Crown: { icon: '👑', color: 'bg-purple-100 text-purple-800' },
    Ace: { icon: '🌟', color: 'bg-red-100 text-red-800' },
    Conqueror: { icon: '🏆', color: 'bg-amber-100 text-amber-800' },
  };

  const categories = [
    { id: 'global', label: 'Global', icon: Trophy },
    { id: 'friends', label: 'Friends', icon: Users },
    { id: 'seasonal', label: 'Season', icon: Flame },
  ];

  const skillCategories = [
    { id: null, label: 'All', icon: Target },
    { id: 'technical', label: 'Techie', icon: Brain },
    { id: 'creative', label: 'Creative', icon: Sparkles },
    { id: 'management', label: 'Manager', icon: Target },
    { id: 'social', label: 'Social', icon: Users },
  ];

  return (
    <div className="bg-white border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
      {/* Leaderboard Header & Filters */}
      <div className="p-6 border-b-2 border-black bg-neutral-50 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-black text-black flex items-center gap-3 uppercase tracking-wide">
            <Trophy className="w-8 h-8 text-black" />
            Hall of Fame
          </h3>
          <div className="flex bg-neutral-200 p-1 border-2 border-black">
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => onCategoryChange?.(cat.id)}
                  className={`px-4 py-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-all ${category === cat.id ? 'bg-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]' : 'text-neutral-500 hover:text-black'}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Skill Category Filters */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-black/10">
          {skillCategories.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id || 'all'}
                onClick={() => onSkillChange?.(cat.id)}
                className={`flex-1 min-w-[80px] px-3 py-2 flex items-center justify-center gap-2 border-2 border-black text-[10px] font-black uppercase tracking-tight transition-all hover:bg-neutral-100 ${skill === cat.id ? 'bg-emerald-100 text-emerald-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-white text-neutral-500'}`}
              >
                <Icon className="w-3 h-3" />
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="divide-y-2 divide-black">
        {users.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-neutral-400 font-bold uppercase tracking-widest italic">No legends found in this bracket...</p>
          </div>
        ) : (
          users.slice(0, 20).map((user, index) => {
            const isMe = user.isMe || (currentUserId && String(currentUserId) === String(user._id || user.id || user.sid));
            const rank = index + 1;
            const tierData = tiers[user.tier || 'Bronze'] || tiers.Bronze;

            // Determine what XP to show
            let xpValue = user.points || 0;
            let xpLabel = 'Total XP';

            if (skill && ['technical', 'creative', 'management', 'social'].includes(skill)) {
              xpValue = (user.skillXP && user.skillXP[skill]) || 0;
              xpLabel = `${skill.charAt(0).toUpperCase() + skill.slice(1)} XP`;
            } else if (category === 'seasonal') {
              xpValue = user.seasonPoints || 0;
              xpLabel = 'Season XP';
            } else if (!skill && ['technical', 'creative', 'management', 'social'].includes(category)) {
              // Backward compatibility / shortcut
              xpValue = (user.skillXP && user.skillXP[category]) || 0;
              xpLabel = `${category.charAt(0).toUpperCase() + category.slice(1)} XP`;
            }

            return (
              <div
                key={user._id || user.id || user.sid || index}
                className={`flex items-center p-4 hover:bg-neutral-100 transition-colors relative group ${isMe ? 'bg-blue-50' : ''}`}
              >
                {/* Rank Number */}
                <div className="w-12 flex flex-col items-center justify-center">
                  <div className={`text-2xl font-black italic ${rank === 1 ? 'text-yellow-500' : rank === 2 ? 'text-neutral-400' : rank === 3 ? 'text-orange-500' : 'text-neutral-300'}`}>
                    {rank}
                  </div>
                  <div className="text-[8px] font-bold text-neutral-400 uppercase">Rank</div>
                </div>

                {/* User Info */}
                <div className="flex-1 flex items-center gap-4 ml-2">
                  <div className="relative">
                    <div
                      className={`w-14 h-14 border-2 border-black flex items-center justify-center text-lg font-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-transform group-hover:scale-105 ${rank === 1 ? 'bg-yellow-400' : 'bg-white'}`}
                    >
                      {user.profilePic ? (
                        <img src={user.profilePic} alt={user.fullname || user.username || 'User'} className="w-full h-full object-cover" />
                      ) : (
                        (user.fullname || user.username || 'U').charAt(0).toUpperCase()
                      )}
                    </div>
                    {/* Small Tier Icon Floating */}
                    <div className={`absolute -bottom-1 -right-1 w-6 h-6 border border-black rounded-sm flex items-center justify-center text-xs shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] ${tierData.color}`}>
                      {tierData.icon}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="text-sm font-black text-black flex items-center gap-2 uppercase tracking-tight truncate">
                      {user.fullname || user.username}
                      {isMe && (
                        <span className="text-[9px] bg-blue-600 text-white border border-black px-1.5 py-0.5 font-bold uppercase tracking-widest">
                          YOU
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-bold text-neutral-500 uppercase">Lv.{user.level || 1}</span>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-black/10 ${tierData.color}`}>
                        {user.tier || 'Bronze'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* XP Stats */}
                <div className="text-right">
                  <div className="text-lg font-black text-black leading-none">
                    {xpValue.toLocaleString()}
                  </div>
                  <div className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest mt-1">{xpLabel}</div>

                  {/* Skill Badges if applicable */}
                  {category === 'global' && user.skillXP && (
                    <div className="flex gap-1 mt-1 justify-end">
                      {Object.entries(user.skillXP)
                        .filter(([_, xp]) => xp > 500)
                        .map(([skill, _]) => {
                          const skillData = skillCategories.find(s => s.id === skill);
                          if (!skillData) return null;
                          const SvgIcon = skillData.icon;
                          return (
                            <div key={skill} className="w-4 h-4 bg-black text-white p-0.5" title={`${skillData.label} Legend`}>
                              <SvgIcon className="w-full h-full" />
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>

                {/* Top Rank Accents */}
                {rank <= 3 && (
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${rank === 1 ? 'bg-yellow-400' : rank === 2 ? 'bg-neutral-300' : 'bg-orange-400'}`} />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Leaderboard Footer */}
      <div className="p-3 bg-neutral-900 text-white text-[9px] font-bold uppercase tracking-[0.2em] flex justify-between items-center">
        <span>Resets Monthly</span>
        <div className="flex gap-4">
          <span className="text-emerald-400">Next Reset: 22 Days</span>
          <span className="text-neutral-500">Live Updates</span>
        </div>
      </div>
    </div>
  );
};
