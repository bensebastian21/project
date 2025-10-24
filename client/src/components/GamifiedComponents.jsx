import React from "react";
import config from "../config";
import { 
  Star, Trophy, Award, Flame, Crown, Sparkles, Zap, Target, 
  TrendingUp, Users, Clock, Gift, Medal, Rocket, Heart, Brain,
  Calendar, MapPin, Bookmark, CheckCircle, MessageSquare
} from "lucide-react";

// Gamified Event Card Component
export const GamifiedEventCard = ({ event, onRegister, onBookmark, onViewMore, isRegistered, isBookmarked, userStats, awardPoints, disabledActions = false }) => {
  const toAbsoluteUrl = (u) => {
    const s = String(u || "");
    if (!s) return s;
    if (/^https?:\/\//i.test(s)) return s;
    return `${config.apiBaseUrl.replace(/\/$/, "")}${s.startsWith("/") ? "" : "/"}${s}`;
  };
  const getEventRarity = (event) => {
    const daysUntilEvent = Math.ceil((new Date(event.date) - new Date()) / (1000 * 60 * 60 * 24));
    if (daysUntilEvent < 1) return { name: "Last Chance", color: "red", icon: "⚡" };
    if (daysUntilEvent < 7) return { name: "Urgent", color: "orange", icon: "🔥" };
    if (daysUntilEvent < 30) return { name: "Popular", color: "blue", icon: "⭐" };
    return { name: "Upcoming", color: "green", icon: "📅" };
  };

  const rarity = getEventRarity(event);
  const isCompleted = event.isCompleted;
  const isOnline = event.isOnline;
  const regDeadline = event?.registrationDeadline ? new Date(event.registrationDeadline) : null;
  const regClosed = regDeadline && !isNaN(regDeadline.getTime()) && Date.now() > regDeadline.getTime();

  return (
    <div className="group relative bg-white rounded-2xl border border-slate-200 hover:border-slate-300 transition-all duration-300 hover:shadow-xl overflow-hidden">
      {/* Cover Image */}
      {event.imageUrl && (
        <div className="w-full h-40 bg-slate-100 overflow-hidden">
          <img src={toAbsoluteUrl(event.imageUrl)} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        </div>
      )}
      {/* Rarity Badge */}
      <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold ${
        rarity.color === 'red' ? 'bg-red-50 text-red-600 border border-red-200' :
        rarity.color === 'orange' ? 'bg-orange-50 text-orange-600 border border-orange-200' :
        rarity.color === 'blue' ? 'bg-blue-50 text-blue-600 border border-blue-200' :
        'bg-green-50 text-green-600 border border-green-200'
      }`}>
        {rarity.icon} {rarity.name}
      </div>

      {/* Registration Closed Badge */}
      {regClosed && (
        <div className="absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-600 border border-red-200">
          🚫 Registration Closed
        </div>
      )}

      {/* Completion Badge */}
      {isCompleted && (
        <div className="absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-bold bg-green-50 text-green-600 border border-green-200">
          ✅ Completed
        </div>
      )}

      {/* Online Badge */}
      {isOnline && (
        <div className="absolute top-16 left-4 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-600 border border-blue-200">
          🌐 Online
        </div>
      )}

      <div className="p-6">
        {/* Event Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-slate-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
              {event.title}
            </h3>
            <div className="flex items-center space-x-4 text-sm text-slate-600">
              <div className="flex items-center space-x-1">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>{new Date(event.date).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center space-x-1">
                <MapPin className="w-4 h-4 text-green-600" />
                <span>{isOnline ? "Online" : event.location || "TBA"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Event Description */}
        <p className="text-slate-700 text-sm mb-4 line-clamp-3">
          {event.shortDescription || event.description}
        </p>

        {/* Category & Price */}
        <div className="flex items-center justify-between mb-6">
          {event.category && (
            <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-sm font-medium border border-indigo-200">
              {event.category}
            </span>
          )}
          <div className="text-right">
            {event.price > 0 ? (
              <div className="text-lg font-bold text-amber-600">₹{event.price}</div>
            ) : (
              <div className="text-lg font-bold text-green-600">FREE</div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={() => onViewMore(event)}
            className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-all duration-200 hover:shadow-md transform hover:-translate-y-0.5"
          >
            View Details
          </button>
          
          <button
            onClick={() => {
              if (disabledActions) return;
              onBookmark(event);
            }}
            disabled={disabledActions}
            title={disabledActions ? 'Verify email and phone to use this action' : undefined}
            className={`px-4 py-3 rounded-xl transition-all duration-200 ${
              disabledActions ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'hover:shadow-md transform hover:-translate-y-0.5'
            } ${
              isBookmarked && !disabledActions
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600' 
                : (!isBookmarked && !disabledActions ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200' : '')
            }`}
          >
            <Bookmark className="w-5 h-5" />
          </button>
        </div>

        {/* Registration Status */}
        {isRegistered && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-xl">
            <div className="flex items-center space-x-2 text-green-700">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Registered</span>
            </div>
          </div>
        )}
      </div>

      {/* Hover Effects */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-400/0 to-indigo-400/0 group-hover:from-blue-400/5 group-hover:to-indigo-400/5 transition-all duration-300 pointer-events-none"></div>
    </div>
  );
};

// Achievement Badge Component
export const AchievementBadge = ({ badge, earned = false, size = "md" }) => {
  const sizeClasses = {
    sm: "w-8 h-8 text-lg",
    md: "w-12 h-12 text-2xl",
    lg: "w-16 h-16 text-3xl"
  };

  return (
    <div className={`relative ${sizeClasses[size]} rounded-full flex items-center justify-center transition-all duration-300 ${
      earned 
        ? 'bg-gradient-to-r from-yellow-400 to-orange-500 shadow-lg animate-pulse' 
        : 'bg-gray-600/50'
    }`}>
      <span className={earned ? 'text-white' : 'text-gray-400'}>
        {badge.icon}
      </span>
      {earned && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
          <span className="text-xs text-white">✓</span>
        </div>
      )}
    </div>
  );
};

// Level Progress Component
export const LevelProgress = ({ currentLevel, nextLevel, progress, points }) => {
  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center">
            <Crown className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">{currentLevel.name}</h3>
            <p className="text-sm text-slate-600">Level {currentLevel.level}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-600">{points.toLocaleString()}</div>
          <div className="text-sm text-slate-600">points</div>
        </div>
      </div>

      {nextLevel && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Progress to {nextLevel.name}</span>
            <span className="text-slate-600">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-xs text-slate-500">
            {nextLevel.minPoints - points} points to next level
          </p>
        </div>
      )}
    </div>
  );
};

// Stats Card Component
export const StatsCard = ({ title, value, icon: Icon, color, trend = null }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    pink: 'bg-pink-50 text-pink-600 border-pink-200',
    green: 'bg-green-50 text-green-600 border-green-200'
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl ${colorClasses[color]} flex items-center justify-center border`}>
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <div className={`flex items-center space-x-1 text-sm ${
            trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-slate-600'
          }`}>
            <TrendingUp className="w-4 h-4" />
            <span>{trend > 0 ? '+' : ''}{trend}%</span>
          </div>
        )}
      </div>
      <div>
        <div className="text-3xl font-bold text-slate-900 mb-1">{value}</div>
        <div className="text-sm text-slate-600">{title}</div>
      </div>
    </div>
  );
};

// Leaderboard Component
export const Leaderboard = ({ users = [], currentUserId = null }) => {
  const getRankIcon = (rank) => {
    switch (rank) {
      case 1: return "🥇";
      case 2: return "🥈";
      case 3: return "🥉";
      default: return `#${rank}`;
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <Trophy className="w-5 h-5 mr-2 text-amber-600" />
        Leaderboard
      </h3>
      <div className="space-y-3">
        {users.slice(0, 10).map((user, index) => {
          const isMe = user.isMe || (currentUserId && String(currentUserId) === String(user.id));
          return (
          <div key={user.id} className={`flex items-center space-x-4 p-3 rounded-xl border ${isMe ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
            <div className="text-2xl">{getRankIcon(index + 1)}</div>
            <div className="flex-1">
              <div className="font-medium text-slate-900 flex items-center gap-2">
                {user.name}
                {isMe && <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200">You</span>}
              </div>
              <div className="text-sm text-slate-600">{user.level} • {user.points} points</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-blue-600">{user.points}</div>
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
};

// Daily Challenge Component
export const DailyChallenge = ({ challenge, progress, onComplete }) => {
  const isCompleted = progress >= challenge.target;
  
  return (
    <div className={`bg-white rounded-2xl p-6 border border-slate-200 shadow-sm transition-all duration-300 ${
      isCompleted ? 'border-green-200 bg-green-50' : ''
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            isCompleted ? 'bg-green-100' : 'bg-blue-100'
          }`}>
            <span className="text-2xl">{challenge.icon}</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{challenge.title}</h3>
            <p className="text-sm text-slate-600">{challenge.description}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-600">+{challenge.reward}</div>
          <div className="text-sm text-slate-600">points</div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Progress</span>
          <span className="text-slate-600">{progress}/{challenge.target}</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${
              isCompleted ? 'bg-green-500' : 'bg-blue-500'
            }`}
            style={{ width: `${Math.min(100, (progress / challenge.target) * 100)}%` }}
          ></div>
        </div>
      </div>

      {isCompleted && (
        <button
          onClick={onComplete}
          className="w-full mt-4 px-4 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition-all duration-200 hover:shadow-lg transform hover:-translate-y-0.5"
        >
          🎉 Claim Reward!
        </button>
      )}
    </div>
  );
};
