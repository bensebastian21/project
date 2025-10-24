import React, { useEffect, useState } from 'react';
import api from '../../utils/api';

export default function FriendRequests() {
  const [loading, setLoading] = useState(true);
  const [inbound, setInbound] = useState([]);
  const [outbound, setOutbound] = useState([]);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const { data } = await api.get('/api/friends/requests');
      setInbound(Array.isArray(data?.inbound) ? data.inbound : []);
      setOutbound(Array.isArray(data?.outbound) ? data.outbound : []);
    } catch (e) {
      setError('Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const accept = async (id) => { try { await api.put(`/api/friends/requests/${id}/accept`); await load(); } catch {} };
  const decline = async (id) => { try { await api.put(`/api/friends/requests/${id}/decline`); await load(); } catch {} };
  const cancel = async (id) => { try { await api.delete(`/api/friends/requests/${id}`); await load(); } catch {} };

  if (loading) return <div className="text-sm text-slate-500">Loading requests...</div>;
  if (error) return <div className="text-sm text-red-600">{error}</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h4 className="font-semibold text-slate-900 mb-3">Incoming</h4>
        {inbound.length === 0 ? (
          <div className="text-sm text-slate-500">No incoming requests</div>
        ) : inbound.map(r => (
          <div key={r._id} className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <img src={r.from?.profilePic || ''} alt="" className="w-8 h-8 rounded-full object-cover bg-slate-100" onError={(e)=>{ e.currentTarget.style.visibility='hidden'; }} />
              <div>
                <div className="text-slate-900 text-sm">{r.from?.fullname}</div>
                <div className="text-xs text-slate-500">@{r.from?.username}</div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={()=> accept(r._id)} className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs">Accept</button>
              <button onClick={()=> decline(r._id)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs">Decline</button>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h4 className="font-semibold text-slate-900 mb-3">Outgoing</h4>
        {outbound.length === 0 ? (
          <div className="text-sm text-slate-500">No outgoing requests</div>
        ) : outbound.map(r => (
          <div key={r._id} className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <img src={r.to?.profilePic || ''} alt="" className="w-8 h-8 rounded-full object-cover bg-slate-100" onError={(e)=>{ e.currentTarget.style.visibility='hidden'; }} />
              <div>
                <div className="text-slate-900 text-sm">{r.to?.fullname}</div>
                <div className="text-xs text-slate-500">@{r.to?.username}</div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={()=> cancel(r._id)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs">Cancel</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
