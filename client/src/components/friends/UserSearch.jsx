import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import { Search, UserPlus, Eye, X } from 'lucide-react';

export default function UserSearch({ onViewProfile, fallback }) {
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);

  const debounced = useDebounce(q, 300);

  useEffect(() => {
    const run = async () => {
      if (!debounced.trim()) {
        setItems([]);
        return;
      }
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

  const showFallback = !q.trim();

  return (
    <div>
      {/* Search Input */}
      <div className="relative mb-6">
        <div className="flex items-center border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus-within:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] focus-within:translate-x-[-1px] focus-within:translate-y-[-1px] transition-all">
          <Search className="w-5 h-5 text-black ml-4 flex-shrink-0" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="SEARCH BY NAME, USERNAME, OR EMAIL..."
            className="w-full px-4 py-3 bg-transparent outline-none text-black font-bold uppercase tracking-wide placeholder:text-slate-400 placeholder:text-xs"
          />
          {loading && (
            <div className="mr-4 w-4 h-4 border-2 border-black border-t-transparent animate-spin flex-shrink-0" />
          )}
          {q && !loading && (
            <button
              onClick={() => setQ('')}
              className="mr-3 p-1 hover:bg-slate-100 border border-transparent hover:border-black transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {showFallback && fallback ? (
        <div className="animate-fadeIn">{fallback}</div>
      ) : (
        <>
          {!loading && items.length === 0 && debounced && (
            <div className="text-center py-12 border-2 border-dashed border-black">
              <p className="font-bold uppercase tracking-widest text-sm text-slate-500">
                No users found for "{debounced}"
              </p>
              <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-medium">
                Try a different name or username
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((u) => (
              <div
                key={u._id}
                className="bg-indigo-50 border-2 border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all duration-200"
              >
                <div className="flex flex-col items-center text-center">
                  {/* Avatar */}
                  <div className="relative mb-4">
                    <div className="w-20 h-20 border-2 border-black overflow-hidden bg-slate-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                      <img
                        src={u.profilePic || ''}
                        alt={u.fullname}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                    <div className="absolute -top-2 -left-2 bg-black text-white text-[10px] font-black px-2 py-0.5 uppercase tracking-wider">
                      Lv.{u.level || 1}
                    </div>
                  </div>

                  <h4 className="text-base font-black text-black uppercase tracking-tight mb-0.5 line-clamp-1">
                    {u.fullname}
                  </h4>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1">
                    @{u.username}
                  </p>
                  {u.institute && (
                    <p className="text-xs text-slate-400 font-medium mb-4 line-clamp-1">
                      {u.institute}
                    </p>
                  )}
                  {!u.institute && <div className="mb-4" />}

                  <button
                    onClick={() => onViewProfile && onViewProfile(u)}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-black text-white border-2 border-black font-bold uppercase tracking-widest text-xs shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)] hover:bg-neutral-800 transition-all"
                  >
                    <Eye className="w-3.5 h-3.5" /> View Profile
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
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
