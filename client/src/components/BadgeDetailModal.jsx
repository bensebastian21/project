import React, { useState } from 'react';
import { X, Award, CheckCircle, Lock, TrendingUp, Star } from 'lucide-react';

const BadgeDetailModal = ({ badge, isOpen, onClose, earned, progress = {} }) => {
  if (!isOpen || !badge) return null;

  const getRarityColor = (rarity) => {
    switch (rarity) {
      case 'common':
        return 'text-slate-600 bg-slate-100 border-slate-300';
      case 'uncommon':
        return 'text-green-600 bg-green-100 border-green-300';
      case 'rare':
        return 'text-blue-600 bg-blue-100 border-blue-300';
      case 'epic':
        return 'text-purple-600 bg-purple-100 border-purple-300';
      case 'legendary':
        return 'text-amber-600 bg-amber-100 border-amber-300';
      default:
        return 'text-slate-600 bg-slate-100 border-slate-300';
    }
  };

  const getRarityLabel = (rarity) => {
    return rarity ? rarity.charAt(0).toUpperCase() + rarity.slice(1) : 'Common';
  };

  // Calculate overall progress
  const totalRequired = badge.criteria?.reduce((sum, c) => sum + c.required, 0) || 1;
  const totalCurrent =
    badge.criteria?.reduce((sum, c) => {
      const current = progress[c.id] || c.current || 0;
      return sum + Math.min(current, c.required);
    }, 0) || 0;
  const overallProgress = Math.round((totalCurrent / totalRequired) * 100);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`relative p-6 ${earned ? 'bg-gradient-to-br from-blue-500 to-blue-600' : 'bg-gradient-to-br from-slate-200 to-slate-300'}`}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Badge Icon */}
          <div className="flex flex-col items-center">
            <div
              className={`relative w-24 h-24 rounded-full flex items-center justify-center text-5xl mb-4 ${
                earned ? 'bg-white shadow-lg ring-4 ring-white/50' : 'bg-slate-100 opacity-60'
              }`}
            >
              {badge.icon}
              {!earned && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/40 rounded-full backdrop-blur-sm">
                  <Lock className="w-8 h-8 text-white" />
                </div>
              )}
            </div>

            <h2 className="text-2xl font-bold text-white mb-1">{badge.name}</h2>
            <p className="text-white/90 text-sm mb-3">{badge.description}</p>

            {/* Rarity Badge */}
            <div
              className={`px-3 py-1 rounded-full text-xs font-bold border ${getRarityColor(badge.rarity)}`}
            >
              {getRarityLabel(badge.rarity)}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Points Reward */}
          <div className="flex items-center justify-between mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500" />
              <span className="font-semibold text-slate-900">Reward</span>
            </div>
            <span className="text-xl font-bold text-amber-600">+{badge.points} XP</span>
          </div>

          {/* Progress */}
          {!earned && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-700">Overall Progress</span>
                <span className="text-sm font-bold text-blue-600">{overallProgress}%</span>
              </div>
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Criteria */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              {earned ? 'Completion Criteria' : 'Requirements'}
            </h3>
            <div className="space-y-3">
              {badge.criteria?.map((criterion) => {
                const current = progress[criterion.id] || criterion.current || 0;
                const isComplete = current >= criterion.required;
                const criterionProgress = Math.min(100, (current / criterion.required) * 100);

                return (
                  <div key={criterion.id} className="space-y-2">
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                          isComplete ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-400'
                        }`}
                      >
                        {isComplete ? (
                          <CheckCircle className="w-3.5 h-3.5" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-slate-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium ${isComplete ? 'text-slate-900' : 'text-slate-600'}`}
                        >
                          {criterion.label}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                isComplete ? 'bg-green-500' : 'bg-blue-500'
                              }`}
                              style={{ width: `${criterionProgress}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
                            {current}/{criterion.required}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Earned Status */}
          {earned && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-bold text-green-900">Badge Unlocked!</p>
                <p className="text-xs text-green-700">You've earned this achievement</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BadgeDetailModal;
