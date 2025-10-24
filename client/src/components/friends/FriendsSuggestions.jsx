import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import { UserPlus } from 'lucide-react';

export default function FriendsSuggestions({ onViewProfile }) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const run = async () => {
      try {
        const { data } = await api.get('/api/friends/suggestions');
        setItems(Array.isArray(data) ? data : []);
      } catch (e) {
        setError('Failed to load suggestions');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const sendRequest = async (to) => {
    try {
      await api.post('/api/friends/requests', { to });
      setItems(prev => prev.filter(x => x._id !== to));
    } catch (e) {
      // ignore
    }
  };

  if (loading) return <div className="text-sm text-slate-500">Loading suggestions...</div>;
  if (error) return <div className="text-sm text-red-600">{error}</div>;
  if (!items.length) return <div className="text-sm text-slate-500">No suggestions right now.</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map(u => (
        <div key={u._id} className="p-4 bg-white rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <img src={u.profilePic || ''} alt={u.fullname} className="w-10 h-10 rounded-full object-cover bg-slate-100" onError={(e)=>{ e.currentTarget.style.visibility='hidden'; }} />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-slate-900 truncate">{u.fullname}</div>
              <div className="text-xs text-slate-500 truncate">@{u.username}</div>
              <div className="text-xs text-slate-600 mt-1">
                {u.sameInstitute && <span className="mr-2">Same institute</span>}
                {!!u.mutuals && <span className="mr-2">{u.mutuals} mutual</span>}
                {!!u.sharedInterests && <span>{u.sharedInterests} shared interests</span>}
              </div>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={()=> sendRequest(u._id)} className="flex-1 inline-flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm">
              <UserPlus className="w-4 h-4" /> Add Friend
            </button>
            <button onClick={()=> onViewProfile && onViewProfile(u)} className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm">View</button>
          </div>
        </div>
      ))}
    </div>
  );
}
