import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import { UserPlus, Eye, Sparkles } from 'lucide-react';

export default function FriendsSuggestions({ onViewProfile }) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [sentIds, setSentIds] = useState(new Set());

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
      setSentIds((prev) => new Set([...prev, to]));
      setItems((prev) => prev.filter((x) => x._id !== to));
    } catch (e) {
      // ignore
    }
  };

  if (loading)
    return (
      <div className="flex items-center gap-3 py-6 text-black font-bold uppercase tracking-widest text-xs">
        <div className="w-4 h-4 border-2 border-black border-t-transparent animate-spin" />
        Loading suggestions...
      </div>
    );

  if (error)
    return (
      <div className="p-3 border-2 border-black bg-red-100 text-black font-bold uppercase tracking-widest text-xs">
        {error}
      </div>
    );

  if (!items.length)
    return (
      <div className="text-center py-8 border-2 border-dashed border-black">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
          No suggestions right now.
        </p>
      </div>
    );

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {items.map((u) => (
        <div
          key={u._id}
          className="bg-amber-50 border-2 border-black p-3 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all duration-200"
        >
          <div className="flex flex-col items-center text-center">
            {/* Avatar */}
            <div className="w-12 h-12 border-2 border-black overflow-hidden bg-slate-100 mb-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
              <img
                src={u.profilePic || ''}
                alt={u.fullname}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>

            <h4 className="text-[13px] font-black text-black uppercase tracking-tight mb-0.5 line-clamp-1">
              {u.fullname}
            </h4>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">
              @{u.username}
            </p>

            {/* Tags */}
            <div className="flex flex-wrap justify-center gap-1.5 mb-4 min-h-[22px]">
              {u.sameInstitute && (
                <span className="px-2 py-0.5 bg-white border-2 border-black text-black text-[10px] font-black uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  Same Institute
                </span>
              )}
              {!!u.mutuals && (
                <span className="px-2 py-0.5 bg-black text-white text-[10px] font-black uppercase tracking-wider">
                  {u.mutuals} Mutual{u.mutuals !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            <div className="flex gap-1.5 w-full">
              <button
                onClick={() => sendRequest(u._id)}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-black text-white border-2 border-black font-black uppercase tracking-widest text-[9px] hover:bg-neutral-800 transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)]"
              >
                <UserPlus className="w-3 h-3" /> Add
              </button>
              <button
                onClick={() => onViewProfile && onViewProfile(u)}
                className="px-2 py-1.5 bg-white border-2 border-black text-black font-black uppercase tracking-widest text-[9px] hover:bg-slate-50 hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all"
              >
                <Eye className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
