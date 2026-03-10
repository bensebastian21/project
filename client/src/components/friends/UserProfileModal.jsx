import React, { useEffect, useMemo, useState } from 'react';
import api from '../../utils/api';
import { X, Users, TrendingUp, Calendar, Award, MapPin, GraduationCap, Mail } from 'lucide-react';

// Local UI helpers
const StatCard = ({ label, value, icon: Icon }) => (
  <div className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-white border border-slate-200 hover:shadow-md transition-all duration-200">
    <div className="flex items-center justify-between mb-2">
      <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</div>
      {Icon && <Icon className="w-4 h-4 text-slate-400" />}
    </div>
    <div className="text-2xl font-bold text-slate-900">{value}</div>
  </div>
);

const Chip = ({ text, color = 'blue' }) => {
  const palette = {
    blue: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
    amber: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
    indigo: { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200' },
    green: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
    slate: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' },
  };
  const c = palette[color] || palette.blue;
  return (
    <span
      className={`px-3 py-1.5 rounded-full ${c.bg} ${c.text} border ${c.border} text-xs font-medium`}
    >
      {text}
    </span>
  );
};

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
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  }, []);
  const apiBase = api.defaults?.baseURL || '';
  const toAbs = (p) => (p ? (p.startsWith('http') ? p : `${apiBase}/${p}`) : '');

  useEffect(() => {
    const run = async () => {
      if (!userId) {
        setError('Invalid user');
        setLoading(false);
        return;
      }
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
            const [friendsRes, reqsRes] = await Promise.all([
              api.get('/api/friends', { headers: { Authorization: `Bearer ${token}` } }),
              api.get('/api/friends/requests', { headers: { Authorization: `Bearer ${token}` } }),
            ]);
            const friends = Array.isArray(friendsRes.data) ? friendsRes.data : [];
            if (friends.some((f) => String(f._id) === String(userId))) {
              setRelation('friends');
            } else {
              const inbound = (reqsRes.data?.inbound || []).find(
                (r) => String(r.from?._id || r.from) === String(userId)
              );
              if (inbound) {
                setRelation('inbound');
                setRequestId(inbound._id);
              } else {
                const outbound = (reqsRes.data?.outbound || []).find(
                  (r) => String(r.to?._id || r.to) === String(userId)
                );
                if (outbound) {
                  setRelation('outbound');
                  setRequestId(outbound._id);
                } else setRelation('none');
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

  useEffect(() => {
    const loadExtra = async () => {
      if (!userId) return;
      const allowed = relation === 'friends' || relation === 'self';
      if (!allowed) {
        setStats(null);
        setAttendance([]);
        return;
      }
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
      } catch (_) {
        /* ignore */
      }
    };
    loadExtra();
  }, [userId, relation]);

  const myInterests = useMemo(
    () => new Set((me?.interests || []).map((s) => String(s).toLowerCase())),
    [me]
  );
  const sharedInterests = useMemo(() => {
    const other = (profile?.interests || []).map((s) => String(s).toLowerCase());
    return other.filter((i) => myInterests.has(i));
  }, [profile, myInterests]);

  const addFriend = async () => {
    try {
      await api.post('/api/friends/requests', { to: userId });
      setRelation('outbound');
    } catch (e) {
      /* ignore */
    }
  };

  const cancelRequest = async () => {
    try {
      if (!requestId) return;
      const token = localStorage.getItem('token');
      await api.delete(`/api/friends/requests/${requestId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRelation('none');
      setRequestId(null);
    } catch (e) {
      /* ignore */
    }
  };

  const unfriend = async () => {
    try {
      const token = localStorage.getItem('token');
      await api.delete(`/api/friends/${userId}`, { headers: { Authorization: `Bearer ${token}` } });
      setRelation('none');
    } catch (e) {
      /* ignore */
    }
  };

  const acceptInbound = async () => {
    try {
      if (!requestId) return;
      const token = localStorage.getItem('token');
      await api.put(
        `/api/friends/requests/${requestId}/accept`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRelation('friends');
    } catch (_) {
      /* ignore */
    }
  };

  const declineInbound = async () => {
    try {
      if (!requestId) return;
      const token = localStorage.getItem('token');
      await api.put(
        `/api/friends/requests/${requestId}/decline`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRelation('none');
      setRequestId(null);
    } catch (_) {
      /* ignore */
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-3xl shadow-xl border border-slate-200 max-h-[88vh] overflow-hidden flex flex-col">
        {loading ? (
          <div className="p-8 text-center text-slate-600">
            <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            Loading profile...
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <div className="text-red-600 text-sm">{error}</div>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            {/* Header with Banner */}
            <div className="relative">
              <div
                className="h-32 bg-blue-600"
                style={
                  profile?.bannerUrl
                    ? {
                        backgroundImage: `url(${toAbs(profile.bannerUrl)})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }
                    : undefined
                }
              />
              <button
                onClick={onClose}
                className="absolute top-3 right-3 p-1.5 bg-white hover:bg-slate-50 rounded-full shadow-md transition-colors"
              >
                <X className="w-4 h-4 text-slate-700" />
              </button>

              {/* Profile Info */}
              <div className="absolute -bottom-12 left-6 right-6">
                <div className="flex items-end gap-4">
                  <div className="relative">
                    <img
                      src={toAbs(profile?.profilePic || '')}
                      alt=""
                      className="w-24 h-24 rounded-xl object-cover ring-4 ring-white bg-slate-100 shadow-md"
                      onError={(e) => {
                        e.currentTarget.style.visibility = 'hidden';
                      }}
                    />
                    {relation === 'friends' && (
                      <div className="absolute -bottom-1 -right-1 bg-green-500 text-white p-1.5 rounded-full shadow-md">
                        <Users className="w-3 h-3" />
                      </div>
                    )}
                    <div className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full border-2 border-white shadow-md">
                      Lv.{profile?.level || 1}
                    </div>
                  </div>
                  <div className="flex-1 pb-3">
                    <h2 className="text-2xl font-bold text-slate-900">{profile?.fullname}</h2>
                    <p className="text-slate-600 text-sm">@{profile?.username}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-16 px-6 pb-4 bg-slate-50 border-b border-slate-200">
              <div className="flex gap-2 justify-end">
                {relation === 'none' && (
                  <button
                    onClick={addFriend}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm transition-colors text-sm"
                  >
                    Add Friend
                  </button>
                )}
                {relation === 'outbound' && (
                  <button
                    onClick={cancelRequest}
                    className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium shadow-sm transition-colors text-sm"
                  >
                    Cancel Request
                  </button>
                )}
                {relation === 'inbound' && (
                  <>
                    <button
                      onClick={acceptInbound}
                      className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium shadow-sm transition-colors text-sm"
                    >
                      Accept
                    </button>
                    <button
                      onClick={declineInbound}
                      className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition-colors text-sm"
                    >
                      Decline
                    </button>
                  </>
                )}
                {relation === 'friends' && (
                  <button
                    onClick={unfriend}
                    className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium shadow-sm transition-colors text-sm"
                  >
                    Unfriend
                  </button>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="px-6 bg-white border-b border-slate-200">
              <div className="flex gap-6">
                {['About', 'Progress', 'Attendance'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setActiveTab(t)}
                    className={`pb-3 pt-3 font-bold transition-colors text-sm ${
                      activeTab === t
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content - Scrollable */}
            <div className="flex-1 overflow-y-auto px-6 py-6 bg-slate-50">
              {activeTab === 'About' && (
                <div className="space-y-6">
                  {/* Bio */}
                  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 mb-3">Bio</h3>
                    <p className="text-slate-700 leading-relaxed">
                      {(profile?.bio || '').trim() || 'No bio yet.'}
                    </p>
                  </div>

                  {/* Quick Info */}
                  {(profile?.institute || profile?.city) && (
                    <div className="grid grid-cols-2 gap-4">
                      {profile?.institute && (
                        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 rounded-lg">
                              <GraduationCap className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <div className="text-xs text-slate-500 font-medium">Institute</div>
                              <div className="font-semibold text-slate-900 text-sm">
                                {profile.institute}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      {profile?.city && (
                        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-50 rounded-lg">
                              <MapPin className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                              <div className="text-xs text-slate-500 font-medium">Location</div>
                              <div className="font-semibold text-slate-900 text-sm">
                                {profile.city}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Additional Details */}
                  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 mb-4">Details</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <div className="text-xs text-slate-500 font-medium mb-1">Course</div>
                        <div className="font-semibold text-slate-900">{profile?.course || '-'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 font-medium mb-1">Pincode</div>
                        <div className="font-semibold text-slate-900">
                          {profile?.pincode || '-'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 font-medium mb-1">Age</div>
                        <div className="font-semibold text-slate-900">{profile?.age ?? '-'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Badges */}
                  {Array.isArray(profile?.displayBadges) && profile.displayBadges.length > 0 && (
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                      <h3 className="text-lg font-bold text-slate-900 mb-4">Badges</h3>
                      <div className="flex flex-wrap gap-2">
                        {profile.displayBadges.map((b, idx) => (
                          <Chip key={idx} text={b} color="indigo" />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Mutuals & Shared Interests */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                      <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-600" />
                        Mutual Friends
                      </h3>
                      {mutuals.length === 0 ? (
                        <p className="text-sm text-slate-500">No mutual friends</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {mutuals.slice(0, 6).map((m) => (
                            <div
                              key={m._id}
                              className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200"
                            >
                              <img
                                src={toAbs(m.profilePic || '')}
                                alt=""
                                className="w-6 h-6 rounded-full object-cover bg-slate-200"
                                onError={(e) => {
                                  e.currentTarget.style.visibility = 'hidden';
                                }}
                              />
                              <span className="text-xs font-medium text-slate-700">
                                {m.fullname}
                              </span>
                            </div>
                          ))}
                          {mutuals.length > 6 && (
                            <div className="px-3 py-2 bg-slate-100 rounded-lg text-xs text-slate-600">
                              +{mutuals.length - 6} more
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                      <h3 className="text-lg font-bold text-slate-900 mb-4">Shared Interests</h3>
                      {sharedInterests.length === 0 ? (
                        <p className="text-sm text-slate-500">No shared interests</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {sharedInterests.map((i, idx) => (
                            <Chip key={idx} text={i} color="green" />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'Progress' && (
                <div className="space-y-6">
                  {!(relation === 'friends' || relation === 'self') ? (
                    <div className="bg-white rounded-2xl p-12 border border-slate-200 shadow-sm text-center">
                      <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-600">Add as friend to view progress</p>
                    </div>
                  ) : !stats ? (
                    <div className="text-center py-8 text-slate-600">Loading stats...</div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard label="Events" value={stats.totalEvents} icon={Calendar} />
                        <StatCard label="Completed" value={stats.completedEvents} icon={Award} />
                        <StatCard label="Streak" value={`${stats.streak}d`} icon={TrendingUp} />
                        <StatCard label="Interests" value={(stats.interests || []).length} />
                      </div>

                      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-900 mb-4">
                          Events by Category
                        </h3>
                        <div className="space-y-3">
                          {Object.entries(stats.byCategory || {}).map(([cat, n]) => (
                            <div key={cat} className="flex items-center gap-4">
                              <div className="w-32 text-sm text-slate-700 font-medium truncate">
                                {cat}
                              </div>
                              <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-2.5 bg-blue-600 rounded-full transition-all duration-500"
                                  style={{
                                    width: `${Math.min(100, (n / (stats.totalEvents || 1)) * 100)}%`,
                                  }}
                                />
                              </div>
                              <div className="w-12 text-sm text-slate-600 font-medium text-right">
                                {n}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-900 mb-4">Achievements</h3>
                        <div className="flex flex-wrap gap-2">
                          {stats.totalEvents >= 1 && <Chip text="🎯 First Steps" color="blue" />}
                          {stats.completedEvents >= 3 && <Chip text="🏅 Achiever" color="amber" />}
                          {Object.keys(stats.byCategory || {}).length >= 3 && (
                            <Chip text="🚀 Explorer" color="indigo" />
                          )}
                          {stats.streak >= 3 && (
                            <Chip text={`🔥 Streak ${stats.streak}d`} color="green" />
                          )}
                        </div>
                      </div>

                      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-900 mb-4">Mutual Events</h3>
                        {(() => {
                          const mySet = new Set((myAttendance || []).map((e) => String(e.eventId)));
                          const common = (attendance || []).filter((e) =>
                            mySet.has(String(e.eventId))
                          );
                          if (common.length === 0)
                            return <p className="text-sm text-slate-500">No mutual events yet</p>;
                          return (
                            <div className="space-y-2">
                              {common.slice(0, 8).map((e) => (
                                <div
                                  key={e.eventId}
                                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-slate-900 truncate">
                                      {e.title}
                                    </div>
                                    <div className="text-xs text-slate-500">
                                      {new Date(e.date).toLocaleDateString()}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    </>
                  )}
                </div>
              )}

              {activeTab === 'Attendance' && (
                <div className="space-y-6">
                  {!(relation === 'friends' || relation === 'self') ? (
                    <div className="bg-white rounded-2xl p-12 border border-slate-200 shadow-sm text-center">
                      <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-600">Add as friend to view attendance</p>
                    </div>
                  ) : attendance.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 border border-slate-200 shadow-sm text-center">
                      <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-600">No events yet</p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100">
                      {attendance.slice(0, 20).map((ev) => (
                        <div key={ev.eventId} className="p-4 hover:bg-slate-50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-slate-900 truncate">
                                {ev.title}
                              </div>
                              <div className="text-xs text-slate-500 mt-1">
                                {new Date(ev.date).toLocaleString()} • {ev.category || 'Event'}
                              </div>
                            </div>
                            <div
                              className={`ml-4 px-3 py-1 rounded-full text-xs font-medium ${
                                ev.isCompleted
                                  ? 'bg-green-50 text-green-700'
                                  : 'bg-blue-50 text-blue-700'
                              }`}
                            >
                              {ev.isCompleted ? 'Completed' : 'Upcoming'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
