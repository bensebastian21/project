import React from 'react';
import { X, CheckCircle, Lock, TrendingUp, Star, Zap, Shield } from 'lucide-react';

const TIER_STYLES = {
  bronze: { label: 'Bronze', bg: 'bg-orange-100', text: 'text-orange-900', border: 'border-orange-900' },
  silver: { label: 'Silver', bg: 'bg-slate-100', text: 'text-slate-900', border: 'border-slate-900' },
  gold:   { label: 'Gold',   bg: 'bg-yellow-100', text: 'text-yellow-900', border: 'border-yellow-900' },
  platinum: { label: 'Platinum', bg: 'bg-cyan-100', text: 'text-cyan-900', border: 'border-cyan-900' },
  default: { label: 'Common', bg: 'bg-neutral-100', text: 'text-neutral-900', border: 'border-black' },
};

const BadgeDetailModal = ({ badge, isOpen, onClose, earned, progress = {} }) => {
  if (!isOpen || !badge) return null;

  const tier = TIER_STYLES[(badge.tier || '').toLowerCase()] || TIER_STYLES.default;

  const totalRequired = badge.criteria?.reduce((sum, c) => sum + c.required, 0) || 1;
  const totalCurrent = badge.criteria?.reduce((sum, c) => {
    const current = progress[c.id] ?? c.current ?? 0;
    return sum + Math.min(current, c.required);
  }, 0) || 0;
  const overallProgress = Math.round((totalCurrent / totalRequired) * 100);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-white border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-md w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`relative p-6 border-b-2 border-black ${earned ? 'bg-black' : 'bg-neutral-100'}`}>
          <button
            onClick={onClose}
            className={`absolute top-4 right-4 p-1.5 border-2 border-black ${earned ? 'bg-white text-black hover:bg-neutral-200' : 'bg-black text-white hover:bg-neutral-800'} transition-colors`}
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex flex-col items-center">
            {/* Badge Icon */}
            <div className={`relative w-20 h-20 flex items-center justify-center text-4xl border-2 border-black mb-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${earned ? tier.bg : 'bg-neutral-200'}`}>
              <span className={earned ? '' : 'opacity-30'}>{badge.icon}</span>
              {!earned && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <Lock className="w-7 h-7 text-white" />
                </div>
              )}
              {earned && (
                <div className="absolute -bottom-2 -right-2 bg-green-500 border-2 border-black p-0.5">
                  <CheckCircle className="w-3 h-3 text-white" />
                </div>
              )}
            </div>

            <h2 className={`text-xl font-black uppercase tracking-tight mb-1 ${earned ? 'text-white' : 'text-black'}`}>
              {badge.name}
            </h2>
            <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${earned ? 'text-neutral-300' : 'text-neutral-500'}`}>
              {badge.description}
            </p>

            {/* Tier pill */}
            <div className={`px-3 py-0.5 border-2 text-[10px] font-black uppercase tracking-widest ${tier.bg} ${tier.text} ${tier.border}`}>
              {tier.label}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* XP Reward */}
          <div className="flex items-center justify-between p-4 border-2 border-black bg-neutral-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center gap-2">
              <div className="p-1.5 border-2 border-black bg-yellow-100">
                <Zap className="w-4 h-4 text-yellow-900" />
              </div>
              <span className="text-xs font-black uppercase tracking-widest">Reward</span>
            </div>
            <span className="text-xl font-black text-black">+{badge.points} XP</span>
          </div>

          {/* Overall Progress */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                {earned ? 'Completed' : 'Progress'}
              </span>
              <span className="text-[10px] font-black text-black">{overallProgress}%</span>
            </div>
            <div className="h-3 bg-neutral-100 border-2 border-black">
              <div
                className={`h-full transition-all duration-500 ${earned ? 'bg-green-500' : 'bg-black'}`}
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>

          {/* Criteria */}
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-3 flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5" />
              Completion Criteria
            </h3>
            <div className="space-y-3">
              {badge.criteria?.map((criterion) => {
                const current = progress[criterion.id] ?? criterion.current ?? 0;
                const isComplete = current >= criterion.required;
                const pct = Math.min(100, (current / criterion.required) * 100);

                return (
                  <div key={criterion.id} className="border-2 border-black p-3 bg-neutral-50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 border-2 border-black flex items-center justify-center ${isComplete ? 'bg-green-500' : 'bg-white'}`}>
                          {isComplete && <CheckCircle className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <span className="text-xs font-bold uppercase tracking-tight">{criterion.label}</span>
                      </div>
                      <span className="text-[10px] font-black text-neutral-500">{current}/{criterion.required}</span>
                    </div>
                    <div className="h-1.5 bg-neutral-200 border border-black">
                      <div
                        className={`h-full transition-all duration-300 ${isComplete ? 'bg-green-500' : 'bg-black'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Earned status */}
          {earned && (
            <div className="flex items-center gap-3 p-4 border-2 border-green-900 bg-green-100">
              <div className="w-8 h-8 bg-green-500 border-2 border-black flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-green-900">Badge Unlocked</p>
                <p className="text-[10px] font-bold text-green-700">You've earned this achievement</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BadgeDetailModal;
