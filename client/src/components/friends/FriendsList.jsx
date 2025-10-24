import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import { UserCircle2 } from 'lucide-react';

export default function FriendsList({ onViewProfile }) {
  const [loading, setLoading] = useState(true);
  const [friends, setFriends] = useState([]);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const { data } = await api.get('/api/friends');
      setFriends(Array.isArray(data) ? data : []);
    } catch (e) {
      setError('Failed to load friends');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="text-sm text-slate-500">Loading friends...</div>;
  if (error) return <div className="text-sm text-red-600">{error}</div>;
  if (!friends.length) return <div className="text-sm text-slate-500">No friends yet.</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {friends.map(u => {
        const hasPic = !!u.profilePic;
        const src = hasPic ? (u.profilePic.startsWith('http') ? u.profilePic : `http://localhost:5000/${u.profilePic}`) : '';
        return (
          <div key={u._id} className="p-4 bg-white rounded-xl border border-slate-200">
            <div className="flex items-center gap-3">
              {hasPic ? (
                <img src={src} alt={u.fullname || ''} className="w-8 h-8 rounded-full object-cover bg-slate-100" onError={(e)=>{ e.currentTarget.style.display='none'; }} />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                  <UserCircle2 className="w-5 h-5 text-slate-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-900 truncate">{u.fullname || u.username}</div>
                <div className="text-xs text-slate-500 truncate">@{u.username}</div>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={()=> onViewProfile && onViewProfile(u)} className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm">View</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
