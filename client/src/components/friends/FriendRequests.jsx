import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import { UserCheck, UserX, Clock, X } from 'lucide-react';

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

  useEffect(() => {
    load();
  }, []);

  const accept = async (id) => {
    try {
      await api.put(`/api/friends/requests/${id}/accept`);
      await load();
    } catch { }
  };
  const decline = async (id) => {
    try {
      await api.put(`/api/friends/requests/${id}/decline`);
      await load();
    } catch { }
  };
  const cancel = async (id) => {
    try {
      await api.delete(`/api/friends/requests/${id}`);
      await load();
    } catch { }
  };

  if (loading)
    return (
      <div className="flex items-center gap-3 py-6 text-black font-bold uppercase tracking-widest text-sm">
        <div className="w-4 h-4 border-2 border-black border-t-transparent animate-spin" />
        Loading requests...
      </div>
    );

  if (error)
    return (
      <div className="p-4 border-2 border-black bg-red-100 text-black font-bold uppercase tracking-widest text-sm">
        {error}
      </div>
    );

  if (inbound.length === 0 && outbound.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Incoming Requests */}
      <div className="bg-green-50 border-2 border-black p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <h4 className="font-black text-black uppercase tracking-widest text-sm mb-4 flex items-center gap-2 border-b-2 border-black pb-3">
          <UserCheck className="w-4 h-4" />
          Incoming
          <span className="ml-auto bg-black text-white text-[10px] font-black px-2 py-0.5 uppercase">
            {inbound.length}
          </span>
        </h4>

        {inbound.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-black">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
              No incoming requests
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {inbound.map((r) => (
              <div
                key={r._id}
                className="flex items-center justify-between p-2 bg-white border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 border-2 border-black overflow-hidden bg-slate-100 flex-shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <img
                      src={r.from?.profilePic || ''}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.visibility = 'hidden';
                      }}
                    />
                  </div>
                  <div>
                    <div className="text-black font-black text-xs uppercase tracking-tight">
                      {r.from?.fullname}
                    </div>
                    <div className="text-xs text-slate-500 font-bold">@{r.from?.username}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => accept(r._id)}
                    className="p-1.5 bg-green-500 border-2 border-black text-black hover:bg-green-600 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                    title="Accept"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => decline(r._id)}
                    className="p-1.5 bg-white border-2 border-black text-black hover:bg-red-100 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                    title="Decline"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Outgoing Requests */}
      <div className="bg-yellow-50 border-2 border-black p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <h4 className="font-black text-black uppercase tracking-widest text-sm mb-4 flex items-center gap-2 border-b-2 border-black pb-3">
          <Clock className="w-4 h-4" />
          Sent
          <span className="ml-auto bg-black text-white text-[10px] font-black px-2 py-0.5 uppercase">
            {outbound.length}
          </span>
        </h4>

        {outbound.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-black">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
              No outgoing requests
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {outbound.map((r) => (
              <div
                key={r._id}
                className="flex items-center justify-between p-2 bg-white border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 border-2 border-black overflow-hidden bg-slate-100 flex-shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <img
                      src={r.to?.profilePic || ''}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.visibility = 'hidden';
                      }}
                    />
                  </div>
                  <div>
                    <div className="text-black font-black text-xs uppercase tracking-tight">
                      {r.to?.fullname}
                    </div>
                    <div className="text-xs text-slate-500 font-bold">@{r.to?.username}</div>
                  </div>
                </div>
                <button
                  onClick={() => cancel(r._id)}
                  className="p-1.5 bg-white border-2 border-black text-black hover:bg-red-100 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                  title="Cancel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
