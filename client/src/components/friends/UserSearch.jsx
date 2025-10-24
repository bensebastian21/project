import React, { useEffect, useMemo, useState } from 'react';
import api from '../../utils/api';

export default function UserSearch({ onViewProfile }) {
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);

  const debounced = useDebounce(q, 300);

  useEffect(() => {
    const run = async () => {
      if (!debounced.trim()) { setItems([]); return; }
      setLoading(true);
      try {
        const { data } = await api.get(`/api/users/search?q=${encodeURIComponent(debounced)}`);
        setItems(Array.isArray(data) ? data : []);
      } catch (e) {
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [debounced]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <input
          value={q}
          onChange={(e)=> setQ(e.target.value)}
          placeholder="Search users by name, username, or email"
          className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg"
        />
      </div>
      {loading && <div className="text-sm text-slate-500">Searching...</div>}
      {!loading && items.length === 0 && debounced && (
        <div className="text-sm text-slate-500">No users found</div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(u => (
          <div key={u._id} className="p-4 bg-white rounded-xl border border-slate-200">
            <div className="flex items-center gap-3">
              <img src={u.profilePic || ''} alt={u.fullname} className="w-10 h-10 rounded-full object-cover bg-slate-100" onError={(e)=>{ e.currentTarget.style.visibility='hidden'; }} />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-900 truncate">{u.fullname}</div>
                <div className="text-xs text-slate-500 truncate">@{u.username}</div>
                <div className="text-xs text-slate-500 truncate">{u.institute}</div>
              </div>
            </div>
            <div className="mt-3">
              <button onClick={()=> onViewProfile && onViewProfile(u)} className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm">View</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function useDebounce(value, delay) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}
