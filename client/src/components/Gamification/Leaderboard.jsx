import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import { Trophy, Medal, Award } from 'lucide-react';

const Leaderboard = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await api.get('/api/gamification/leaderboard');
        setUsers(res.data);
      } catch (err) {
        setError('Failed to load leaderboard');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  if (loading)
    return (
      <div className="text-center py-4 bg-white rounded-xl shadow-sm border border-slate-100">
        Loading leaderboard...
      </div>
    );
  if (error)
    return (
      <div className="text-center py-4 text-red-500 bg-white rounded-xl shadow-sm border border-slate-100">
        {error}
      </div>
    );

  const getRankIcon = (index) => {
    switch (index) {
      case 0:
        return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 1:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 2:
        return <Award className="w-5 h-5 text-orange-500" />;
      default:
        return <span className="font-bold text-slate-400 w-5 text-center">{index + 1}</span>;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex items-center gap-2">
        <Trophy className="w-5 h-5 text-indigo-600" />
        <h3 className="font-semibold text-slate-800">Top Students</h3>
      </div>
      <div className="divide-y divide-slate-50">
        {users.map((user, index) => (
          <div
            key={user._id}
            className="p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors"
          >
            <div className="flex-shrink-0">{getRankIcon(index)}</div>
            <img
              src={user.profilePic || `https://ui-avatars.com/api/?name=${user.fullname}`}
              alt={user.fullname}
              className="w-8 h-8 rounded-full object-cover"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{user.fullname}</p>
              <p className="text-xs text-slate-500 truncate">
                Level {user.level || 1} • {user.institute}
              </p>
            </div>
            <div className="text-sm font-bold text-indigo-600">{user.points || 0} pts</div>
          </div>
        ))}
        {users.length === 0 && (
          <div className="p-8 text-center text-slate-500 text-sm">No active students yet.</div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
