import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { Sparkles, Zap, Flame } from 'lucide-react';
import { GamifiedEventCard } from './GamifiedComponents';

const RecommendedEvents = ({ onRegister, onBookmark, onViewMore, userStats }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecs = async () => {
      try {
        const { data } = await api.get('/api/recommendations/events');
        setRecommendations(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error('Failed to load recommendations', e);
      } finally {
        setLoading(false);
      }
    };
    fetchRecs();
  }, []);

  if (loading) return null; // Or a skeleton
  if (recommendations.length === 0) return null;

  return (
    <div className="mb-12 animate-fadeIn">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-gradient-to-br from-fuchsia-500 to-purple-600 rounded-xl shadow-lg shadow-purple-500/20">
          <Sparkles className="w-6 h-6 text-white animate-pulse" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-600 to-purple-600 font-gamer tracking-wide">
            QUESTS FOR YOU
          </h2>
          <p className="text-slate-500 font-medium">AI-curated based on your skills & interests</p>
        </div>
      </div>

      <div className="relative">
        <div className="flex gap-6 overflow-x-auto pb-8 pt-2 px-2 snap-x scrollbar-hide -mx-4 px-4 mask-gradient-r">
          {recommendations.map((rec, index) => (
            <div
              key={rec._id}
              className="min-w-[350px] max-w-[350px] snap-center transform transition-transform hover:scale-[1.02] duration-300"
            >
              <div className="relative">
                {/* Match Reason Badge */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 px-3 py-1 bg-slate-900/90 backdrop-blur border border-purple-500/50 rounded-full flex items-center gap-1.5 shadow-xl">
                  <Zap className="w-3 h-3 text-yellow-400" />
                  <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                    {rec.matchReason || 'Recommended'}
                  </span>
                </div>

                <GamifiedEventCard
                  event={rec}
                  onRegister={() => onRegister(rec)}
                  onBookmark={() => onBookmark(rec)}
                  onViewMore={() => onViewMore(rec)}
                  isRegistered={false} // Recommendations are typically not registered
                  isBookmarked={false} // Filter this from parent if possible, or pass accurately
                  userStats={userStats}
                  awardPoints={() => {}} // Optional
                />
              </div>
            </div>
          ))}
        </div>

        {/* Gradient fade on edges indicates scrollability */}
        <div className="absolute top-0 right-0 bottom-8 w-24 bg-gradient-to-l from-slate-50 to-transparent pointer-events-none" />
      </div>
    </div>
  );
};

export default RecommendedEvents;
