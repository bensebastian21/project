import React, { useEffect, useMemo, useState } from 'react';
import api from '../../utils/api';

// Local UI helpers
const StatCard = ({ label, value }) => (
  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
    <div className="text-xs text-slate-500">{label}</div>
    <div className="text-lg font-semibold text-slate-900">{value}</div>
  </div>
);

const Chip = ({ text, color = 'blue' }) => {
  const palette = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-700' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-700' },
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700' },
    green: { bg: 'bg-green-50', text: 'text-green-700' },
    slate: { bg: 'bg-slate-100', text: 'text-slate-700' },
  };
  const c = palette[color] || palette.blue;
  return <span className={`px-2 py-1 rounded ${c.bg} ${c.text} text-xs`}>{text}</span>;
};

const AvatarName = ({ img, name, username }) => (
  <div className="flex items-center gap-3">
    <img src={img} alt="" className="w-7 h-7 rounded-full object-cover bg-slate-200" onError={(e)=>{ e.currentTarget.style.visibility='hidden'; }} />
    <div className="min-w-0">
      <div className="text-sm font-medium text-slate-900 truncate">{name}</div>
      <div className="text-xs text-slate-500 truncate">@{username}</div>
    </div>
  </div>
);

export default function UserProfileModal({ user, onClose }) {
  const userId = user?._id || user?.id;
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [mutuals, setMutuals] = useState([]);
  const [error, setError] = useState('');
  const [relation, setRelation] = useState('none'); // none | outbound | inbound | friends | self
  const [requestId, setRequestId] = useState(null);
  const [activeTab, setActiveTab] = useState('About'); // About | Progress | Attendance
  const [stats, setStats] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [myAttendance, setMyAttendance] = useState([]);
  const me = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
  }, []);
  const apiBase = api.defaults?.baseURL || '';
  const toAbs = (p) => (p ? (p.startsWith('http') ? p : `${apiBase}/${p}`) : '');

  useEffect(() => {
    const run = async () => {
      if (!userId) { setError('Invalid user'); setLoading(false); return; }
      try {
        const token = localStorage.getItem('token');
        const auth = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
        const [p, m] = await Promise.all([
          api.get(`/api/users/${userId}/profile`, auth),
          api.get(`/api/users/${userId}/mutuals`, auth),
        ]);
        setProfile(p.data || {});
        setMutuals(Array.isArray(m.data) ? m.data : []);

        // determine relationship
        if (me && (me.id === userId || me._id === userId)) {
          setRelation('self');
        } else {
          const token = localStorage.getItem('token');
          if (token) {
            // friends list and requests
            const [friendsRes, reqsRes] = await Promise.all([
              api.get('/api/friends', { headers: { Authorization: `Bearer ${token}` } }),
              api.get('/api/friends/requests', { headers: { Authorization: `Bearer ${token}` } }),
            ]);
            const friends = Array.isArray(friendsRes.data) ? friendsRes.data : [];
            if (friends.some(f => String(f._id) === String(userId))) {
              setRelation('friends');
            } else {
              const inbound = (reqsRes.data?.inbound || []).find(r => String(r.from?._id || r.from) === String(userId));
              if (inbound) {
                setRelation('inbound');
                setRequestId(inbound._id);
              } else {
                const outbound = (reqsRes.data?.outbound || []).find(r => String(r.to?._id || r.to) === String(userId));
                if (outbound) { setRelation('outbound'); setRequestId(outbound._id); }
                else setRelation('none');
              }
            }
          }
        }
      } catch (e) {
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [userId, me]);

  // Load friend-visible data when relation allows
  useEffect(() => {
    const loadExtra = async () => {
      if (!userId) return;
      const allowed = relation === 'friends' || relation === 'self';
      if (!allowed) { setStats(null); setAttendance([]); return; }
      try {
        const meId = me?.id || me?._id;
        const [st, att, myAtt] = await Promise.all([
          api.get(`/api/users/${userId}/stats`),
          api.get(`/api/users/${userId}/attendance`),
          meId ? api.get(`/api/users/${meId}/attendance`) : Promise.resolve({ data: [] }),
        ]);
        setStats(st.data || null);
        setAttendance(Array.isArray(att.data) ? att.data : []);
        setMyAttendance(Array.isArray(myAtt.data) ? myAtt.data : []);
      } catch (_) { /* ignore */ }
    };
    loadExtra();
  }, [userId, relation]);

  const myInterests = useMemo(() => new Set((me?.interests || []).map(s => String(s).toLowerCase())), [me]);
  const sharedInterests = useMemo(() => {
    const other = (profile?.interests || []).map(s => String(s).toLowerCase());
    return other.filter(i => myInterests.has(i));
  }, [profile, myInterests]);

  const addFriend = async () => {
    try {
      await api.post('/api/friends/requests', { to: userId });
      setRelation('outbound');
    } catch (e) { /* ignore */ }
  };

  const cancelRequest = async () => {
    try {
      if (!requestId) return;
      const token = localStorage.getItem('token');
      await api.delete(`/api/friends/requests/${requestId}`, { headers: { Authorization: `Bearer ${token}` } });
      setRelation('none');
      setRequestId(null);
    } catch (e) { /* ignore */ }
  };

  const unfriend = async () => {
    try {
      const token = localStorage.getItem('token');
      await api.delete(`/api/friends/${userId}`, { headers: { Authorization: `Bearer ${token}` } });
      setRelation('none');
    } catch (e) { /* ignore */ }
  };

  const acceptInbound = async () => {
    try {
      if (!requestId) return;
      const token = localStorage.getItem('token');
      await api.put(`/api/friends/requests/${requestId}/accept`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setRelation('friends');
    } catch (_) { /* ignore */ }
  };

  const declineInbound = async () => {
    try {
      if (!requestId) return;
      const token = localStorage.getItem('token');
      await api.put(`/api/friends/requests/${requestId}/decline`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setRelation('none');
      setRequestId(null);
    } catch (_) { /* ignore */ }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-3xl shadow-xl border border-slate-200 max-h-[85vh] overflow-y-auto">
        {loading ? (
          <div className="p-6 text-slate-600">Loading profile...</div>
        ) : error ? (
          <div className="p-6 text-red-600 text-sm">{error}</div>
        ) : (
          <>
            {/* Header */}
            <div
              className="h-32 bg-gradient-to-r from-blue-500 to-indigo-600"
              style={profile?.bannerUrl ? { backgroundImage: `url(${toAbs(profile.bannerUrl)})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
            />
            <div className="p-6 pt-0">
              <div className="flex items-end -mt-10 gap-4">
                <img src={toAbs(profile?.profilePic || '')} alt="" className="w-20 h-20 rounded-full object-cover ring-4 ring-white bg-slate-100" onError={(e)=>{ e.currentTarget.style.visibility='hidden'; }} />
                <div className="flex-1 min-w-0">
                  <div className="text-xl font-semibold text-slate-900 truncate">{profile?.fullname}</div>
                  <div className="text-sm text-slate-600 truncate">@{profile?.username}</div>
                  {profile?.institute && <div className="text-sm text-slate-600 truncate">{profile?.institute}</div>}
                </div>
                <div className="flex gap-2">
                  {relation === 'none' && (
                    <button onClick={addFriend} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">Add Friend</button>
                  )}
                  {relation === 'outbound' && (
                    <button onClick={cancelRequest} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg">Cancel Request</button>
                  )}
                  {relation === 'inbound' && (
                    <>
                      <button onClick={acceptInbound} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg">Accept</button>
                      <button onClick={declineInbound} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg">Decline</button>
                    </>
                  )}
                  {relation === 'friends' && (
                    <button onClick={unfriend} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg">Unfriend</button>
                  )}
                  <button onClick={onClose} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg">Close</button>
                </div>
              </div>

              {/* Tabs */}
              <div className="mt-6 border-b border-slate-200 flex gap-6 text-sm">
                {['About','Progress','Attendance'].map(t => (
                  <button key={t} onClick={()=>setActiveTab(t)} className={`pb-3 -mb-px ${activeTab===t?'text-blue-600 border-b-2 border-blue-600 font-semibold':'text-slate-600 hover:text-slate-800'}`}>{t}</button>
                ))}
              </div>

              {/* Tab content */}
              <div className="mt-6 space-y-6">
                {activeTab === 'About' && (
                  <div className="space-y-6">
                    {/* Tab header with avatar */}
                    <AvatarName img={toAbs(profile?.profilePic||'')} name={profile?.fullname} username={profile?.username} />
                    {/* Bio */}
                    <div>
                      <div className="text-sm font-medium text-slate-900 mb-1">Bio</div>
                      <div className="text-sm text-slate-700">{(profile?.bio || '').trim() || 'No bio yet.'}</div>
                    </div>

                    {/* Academics & Details */}
                    <div>
                      <div className="text-sm font-medium text-slate-900 mb-2">Academics & Details</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200"><span className="text-slate-500">Institute</span><div className="font-medium text-slate-900">{profile?.institute || '-'}</div></div>
                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200"><span className="text-slate-500">Course</span><div className="font-medium text-slate-900">{profile?.course || '-'}</div></div>
                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200"><span className="text-slate-500">City</span><div className="font-medium text-slate-900">{profile?.city || '-'}</div></div>
                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200"><span className="text-slate-500">Pincode</span><div className="font-medium text-slate-900">{profile?.pincode || '-'}</div></div>
                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200"><span className="text-slate-500">Age</span><div className="font-medium text-slate-900">{profile?.age ?? '-'}</div></div>
                      </div>
                    </div>

                    {/* Display Badges */}
                    <div>
                      <div className="text-sm font-medium text-slate-900 mb-2">Display Badges</div>
                      <div className="flex flex-wrap gap-2">
                        {(Array.isArray(profile?.displayBadges) ? profile.displayBadges : []).length === 0 ? (
                          <div className="text-sm text-slate-600">No badges selected.</div>
                        ) : (
                          (profile.displayBadges || []).map((b, idx) => <Chip key={idx} text={b} />)
                        )}
                      </div>
                    </div>

                    {/* Mutuals & Shared Interests */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <div className="text-sm font-medium text-slate-900 mb-1">Mutual Friends</div>
                        {mutuals.length === 0 ? (
                          <div className="text-sm text-slate-600">No mutual friends</div>
                        ) : (
                          <div className="flex flex-wrap gap-3">
                            {mutuals.map(m => (
                              <div key={m._id} className="flex items-center gap-2 px-2 py-1 bg-slate-50 rounded-lg border border-slate-200">
                                <img src={toAbs(m.profilePic||'')} alt="" className="w-5 h-5 rounded-full object-cover bg-slate-200" onError={(e)=>{ e.currentTarget.style.visibility='hidden'; }} />
                                <span className="text-xs text-slate-700">{m.fullname}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-900 mb-1">Shared Interests</div>
                        {sharedInterests.length === 0 ? (
                          <div className="text-sm text-slate-600">No shared interests</div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {sharedInterests.map((i, idx) => (
                              <div key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs">{i}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'Progress' && (
                  <div className="space-y-4">
                    {/* Tab header with avatar */}
                    <AvatarName img={toAbs(profile?.profilePic||'')} name={profile?.fullname} username={profile?.username} />
                    {!(relation==='friends'||relation==='self') ? (
                      <div className="text-sm text-slate-600">Add as friend to view progress.</div>
                    ) : !stats ? (
                      <div className="text-sm text-slate-600">Loading stats...</div>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <StatCard label="Events" value={stats.totalEvents} />
                          <StatCard label="Completed" value={stats.completedEvents} />
                          <StatCard label="Streak" value={`${stats.streak}d`} />
                          <StatCard label="Interests" value={(stats.interests||[]).length} />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-900 mb-2">By Category</div>
                          <div className="space-y-2">
                            {Object.entries(stats.byCategory||{}).map(([cat, n]) => (
                              <div key={cat} className="flex items-center gap-3">
                                <div className="w-32 text-xs text-slate-600 truncate">{cat}</div>
                                <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                                  <div className="h-2 bg-blue-500" style={{ width: `${Math.min(100, (n / (stats.totalEvents||1)) * 100)}%` }} />
                                </div>
                                <div className="w-8 text-xs text-slate-600 text-right">{n}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                        {/* Badges & Certificates */}
                        <div>
                          <div className="text-sm font-medium text-slate-900 mb-2">Badges & Certificates</div>
                          <div className="flex flex-wrap gap-2">
                            {stats.totalEvents >= 1 && <Chip text="First Steps" color="blue" />}
                            {stats.completedEvents >= 3 && <Chip text="Achiever" color="amber" />}
                            {Object.keys(stats.byCategory||{}).length >= 3 && <Chip text="Explorer" color="indigo" />}
                            {stats.streak >= 3 && <Chip text={`Streak ${stats.streak}d`} color="green" />}
                          </div>
                          <div className="text-xs text-slate-500 mt-2">Certificates earned typically equal completed events.</div>
                        </div>
                        {/* Mutual events */}
                        <div>
                          <div className="text-sm font-medium text-slate-900 mb-2">Mutual Events</div>
                          {(() => {
                            const mySet = new Set((myAttendance||[]).map(e=>String(e.eventId)));
                            const common = (attendance||[]).filter(e=> mySet.has(String(e.eventId)));
                            if (common.length === 0) return <div className="text-sm text-slate-600">No mutual events yet.</div>;
                            return (
                              <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
                                {common.slice(0,10).map(e => (
                                  <li key={e.eventId} className="truncate">{e.title} • {new Date(e.date).toLocaleDateString()}</li>
                                ))}
                              </ul>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'Attendance' && (
                  <div className="space-y-4">
                    {/* Tab header with avatar */}
                    <AvatarName img={toAbs(profile?.profilePic||'')} name={profile?.fullname} username={profile?.username} />
                    {!(relation==='friends'||relation==='self') ? (
                      <div className="text-sm text-slate-600">Add as friend to view attendance.</div>
                    ) : attendance.length === 0 ? (
                      <div className="text-sm text-slate-600">No events yet.</div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {attendance.slice(0, 20).map((ev) => (
                          <div key={ev.eventId} className="py-3 flex items-center justify-between">
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-slate-900 truncate">{ev.title}</div>
                              <div className="text-xs text-slate-600">{new Date(ev.date).toLocaleString()} • {ev.category || 'Event'}</div>
                            </div>
                            <div className={`text-xs ${ev.isCompleted ? 'text-green-600' : 'text-slate-500'}`}>{ev.isCompleted ? 'Completed' : 'Upcoming'}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
