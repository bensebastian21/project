// src/pages/AllFriends.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import config from "../config";
import { Search, Filter, ArrowLeft, Users as UsersIcon, UserCircle2 } from "lucide-react";
import UserProfileModal from "../components/friends/UserProfileModal";

export default function AllFriends() {
  const [friends, setFriends] = useState([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all"); // all | sameInstitute | sharedInterests
  const [me, setMe] = useState(null);
  const [selected, setSelected] = useState(null);
  const [relation, setRelation] = useState("friends");
  const [requestId, setRequestId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [myAttendanceIds, setMyAttendanceIds] = useState(new Set());
  const [mutualCounts, setMutualCounts] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return navigate("/login");
        const [{ data: meRes }, { data: fr } ] = await Promise.all([
          api.get("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } }),
          api.get("/api/friends", { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        setMe(meRes);
        setFriends(Array.isArray(fr) ? fr : []);
        // Load my attendance once for intersections
        const id = meRes?.id || meRes?._id || meRes?.data?.id || meRes?.data?._id;
        if (id) {
          try {
            const { data: att } = await api.get(`/api/users/${id}/attendance`, { headers: { Authorization: `Bearer ${token}` } });
            const ids = new Set((Array.isArray(att) ? att : []).map(e => String(e.eventId)));
            setMyAttendanceIds(ids);
          } catch (_) { /* ignore */ }
        }
      } catch (_) { /* ignore */ }
      finally { setLoading(false); }
    };
    load();
  }, [navigate]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let base = friends || [];
    if (q) {
      base = base.filter(u => [u.fullname, u.username, u.email].filter(Boolean).some(s => String(s).toLowerCase().includes(q)));
    }
    if (filter === "sameInstitute" && me?.institute) {
      base = base.filter(u => u.institute && u.institute === me.institute);
    }
    if (filter === "sharedInterests") {
      const myInterests = new Set((me?.interests || []).map(x => String(x).toLowerCase()));
      base = base.filter(u => (u.interests||[]).some(it => myInterests.has(String(it).toLowerCase())));
    }
    return base;
  }, [friends, query, filter, me]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  // Fetch mutual counts for current page via server batch endpoint
  useEffect(() => {
    const run = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token || currentPageItems.length === 0 || !me?.id) { setMutualCounts({}); return; }
        const ids = currentPageItems.map(u => String(u._id)).join(',');
        const { data } = await api.get(`/api/users/${me.id}/mutual-events`, { params: { ids }, headers: { Authorization: `Bearer ${token}` } });
        setMutualCounts(data || {});
      } catch(_) { /* ignore */ }
    };
    run();
  }, [currentPageItems, me]);

  const sharedInterestsCount = (u) => {
    const myInterests = new Set((me?.interests || []).map(x => String(x).toLowerCase()));
    return (u.interests||[]).reduce((acc, it) => acc + (myInterests.has(String(it).toLowerCase()) ? 1 : 0), 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0b0c] text-white flex items-center justify-center">
        <div className="text-gray-300">Loading friends...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0b0c] text-white p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate("/profile")} className="p-2 rounded-lg bg-[#0e0e10] border border-[#2a2a30] hover:bg-[#151518]" aria-label="Back">
            <ArrowLeft className="w-5 h-5 text-gray-200" />
          </button>
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
            <UsersIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">All Friends</h1>
            <p className="text-sm text-gray-400">Browse your accepted connections</p>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-[#0e0e10] border border-[#2a2a30] rounded-xl p-4 mb-6 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="col-span-2 flex items-center gap-2">
            <div className="relative flex-1">
              <input
                value={query}
                onChange={e=>setQuery(e.target.value)}
                placeholder="Search by name or username"
                className="w-full px-3 py-2 pl-9 rounded-lg bg-[#141418] border border-[#2a2a30] text-gray-200 placeholder-gray-500 focus:ring-2 focus:ring-yellow-500"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select value={filter} onChange={e=>setFilter(e.target.value)} className="flex-1 px-3 py-2 rounded-lg bg-[#141418] border border-[#2a2a30] text-gray-200">
                <option value="all">All</option>
                <option value="sameInstitute">Same Institute</option>
                <option value="sharedInterests">Shared Interests</option>
              </select>
            </div>
          </div>
        </div>

        {/* Friends grid */}
        {filtered.length === 0 ? (
          <div className="text-sm text-gray-400">No friends found.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {currentPageItems.map(u => {
              const sameInstitute = me?.institute && u.institute && me.institute === u.institute;
              const shared = sharedInterestsCount(u);
              const mutualEvents = mutualCounts[String(u._id)] || 0;
              return (
                <div key={u._id} className="p-4 rounded-xl bg-[#0e0e10] border border-[#2a2a30] hover:border-[#3a3a44] transition">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-[#2a2a30] bg-[#141418] flex items-center justify-center">
                      {u.profilePic ? (
                        <img src={`${u.profilePic.startsWith('http') ? u.profilePic : `${config.apiBaseUrl}/${u.profilePic}`}`} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <UserCircle2 className="w-5 h-5 text-yellow-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-100 truncate">{u.fullname || u.username}</div>
                      <div className="text-xs text-gray-400 truncate">@{u.username}</div>
                    </div>
                  </div>
                  {/* badges */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {sameInstitute && <span className="text-[11px] px-2 py-0.5 rounded bg-blue-900/30 text-blue-200">Same Institute</span>}
                    {shared > 0 && <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-900/30 text-emerald-200">{shared} shared interests</span>}
                    {mutualEvents > 0 && <span className="text-[11px] px-2 py-0.5 rounded bg-purple-900/30 text-purple-200">{mutualEvents} mutual events</span>}
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button onClick={()=>{ setSelected(u); setRelation('friends'); setRequestId(null); }} className="text-xs px-3 py-1.5 rounded bg-yellow-500 text-black hover:bg-yellow-400">View</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pageCount > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="px-3 py-1.5 rounded bg-[#0e0e10] border border-[#2a2a30] disabled:opacity-50">Prev</button>
            <div className="text-xs text-gray-400">Page {page} of {pageCount}</div>
            <button disabled={page>=pageCount} onClick={()=>setPage(p=>Math.min(pageCount,p+1))} className="px-3 py-1.5 rounded bg-[#0e0e10] border border-[#2a2a30] disabled:opacity-50">Next</button>
          </div>
        )}
      </div>

      {selected && (
        <UserProfileModal
          open={!!selected}
          onClose={()=>setSelected(null)}
          user={selected}
          me={me}
          relation={relation}
          setRelation={setRelation}
          requestId={requestId}
          setRequestId={setRequestId}
        />
      )}
    </div>
  );
}

