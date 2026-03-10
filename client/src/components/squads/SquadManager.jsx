import React, { useState, useEffect } from 'react';
import {
    Users, Crown, UserPlus, X, Check, Search,
    ShieldAlert, Settings, AlertTriangle, ShieldCheck, Clock
} from 'lucide-react';
import api from '../../utils/api';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';

export default function SquadManager({ currentUser }) {
    const [squads, setSquads] = useState([]);
    const [loading, setLoading] = useState(true);

    // Create state
    const [isCreating, setIsCreating] = useState(false);
    const [newSquadName, setNewSquadName] = useState('');
    const [newSquadDesc, setNewSquadDesc] = useState('');

    // Selected squad state
    const [activeSquad, setActiveSquad] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [squadEvents, setSquadEvents] = useState([]);
    const [loadingEvents, setLoadingEvents] = useState(false);

    const fetchSquadEvents = async (squadId) => {
        try {
            setLoadingEvents(true);
            const res = await api.get(`/api/squads/${squadId}/events`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setSquadEvents(res.data || []);
        } catch (e) {
            console.error('Failed to fetch squad events', e);
            setSquadEvents([]);
        } finally {
            setLoadingEvents(false);
        }
    };

    const fetchSquads = async () => {
        try {
            setLoading(true);
            const res = await api.get('/api/squads/mine', {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setSquads(res.data || []);
            if (activeSquad) {
                const updated = res.data.find(s => s._id === activeSquad._id);
                setActiveSquad(updated || null);
            }
        } catch (e) {
            toast.error(e?.response?.data?.error || 'Failed to fetch squads');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSquads();
    }, []);

    const handleCreateSquad = async (e) => {
        e.preventDefault();
        if (!newSquadName.trim()) return toast.error('Squad name is required');
        try {
            await api.post('/api/squads', { name: newSquadName, description: newSquadDesc }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            toast.success('Squad created successfully');
            setIsCreating(false);
            setNewSquadName('');
            setNewSquadDesc('');
            fetchSquads();
        } catch (e) {
            toast.error(e?.response?.data?.error || 'Failed to create squad');
        }
    };

    const handleInvite = async (userId) => {
        if (!activeSquad) return;
        try {
            await api.post(`/api/squads/${activeSquad._id}/invite`, { userId }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            toast.success('Invitation sent');
            fetchSquads();
            setSearchQuery('');
            setSearchResults([]);
        } catch (e) {
            toast.error(e?.response?.data?.error || 'Failed to send invite');
        }
    };

    const handleRespondInvite = async (squadId, action) => {
        try {
            await api.post(`/api/squads/${squadId}/respond`, { action }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            toast.success(`Invitation ${action}ed`);
            fetchSquads();
        } catch (e) {
            toast.error(e?.response?.data?.error || 'Failed to respond to invite');
        }
    };

    const handleLeaveSquad = async (squadId) => {
        if (!window.confirm("Are you sure you want to leave this squad?")) return;
        try {
            await api.post(`/api/squads/${squadId}/leave`, {}, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            toast.success('Left squad successfully');
            setActiveSquad(null);
            fetchSquads();
        } catch (e) {
            toast.error(e?.response?.data?.error || 'Failed to leave squad');
        }
    };

    const handleDeleteSquad = async (squadId) => {
        if (!window.confirm("Are you sure you want to permanently delete this squad? This action cannot be undone.")) return;
        try {
            await api.delete(`/api/squads/${squadId}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            toast.success('Squad deleted successfully');
            if (activeSquad && activeSquad._id === squadId) {
                setActiveSquad(null);
            }
            fetchSquads();
        } catch (e) {
            toast.error(e?.response?.data?.error || 'Failed to delete squad');
        }
    };

    // Debounced search for users to invite
    useEffect(() => {
        const delay = setTimeout(async () => {
            if (searchQuery.trim().length > 2 && activeSquad) {
                try {
                    // Hit the friends search endpoint so leaders can only invite friends
                    const res = await api.get(`/api/friends/search?query=${searchQuery}`, {
                        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                    });
                    // Filter out people already in squad
                    const existIds = new Set([
                        activeSquad.leaderId._id || activeSquad.leaderId,
                        ...activeSquad.members.map(m => m._id || m),
                        ...activeSquad.pendingMembers.map(m => m._id || m)
                    ]);
                    setSearchResults(res.data.filter(u => !existIds.has(u._id) && u._id !== currentUser.id));
                } catch (e) {
                    console.error('Search error', e);
                }
            } else {
                setSearchResults([]);
            }
        }, 500);
        return () => clearTimeout(delay);
    }, [searchQuery, activeSquad, currentUser.id]);

    // Fetch squad events when activeSquad changes
    useEffect(() => {
        if (activeSquad?._id) {
            fetchSquadEvents(activeSquad._id);
        } else {
            setSquadEvents([]);
        }
    }, [activeSquad?._id]);


    // Split into led vs member vs pending
    const ledSquads = squads.filter(s => s.leaderId._id === currentUser.id || s.leaderId === currentUser.id);
    const memberSquads = squads.filter(s =>
        s.members.some(m => (m._id || m) === currentUser.id) &&
        (s.leaderId._id !== currentUser.id && s.leaderId !== currentUser.id)
    );
    const pendingSquads = squads.filter(s => s.pendingMembers.some(m => (m._id || m) === currentUser.id));

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between border-b-4 border-black pb-4">
                <div>
                    <h2 className="text-3xl font-black uppercase tracking-tight">My Squads</h2>
                    <p className="text-sm font-bold text-neutral-500 uppercase tracking-widest mt-1">
                        Team up with friends for events
                    </p>
                </div>
                <button
                    onClick={() => setIsCreating(!isCreating)}
                    className="px-4 py-2 bg-black text-white font-bold uppercase tracking-widest text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                >
                    {isCreating ? 'Cancel' : 'Create Squad'}
                </button>
            </div>

            <AnimatePresence>
                {isCreating && (
                    <motion.form
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        onSubmit={handleCreateSquad}
                        className="bg-white border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-4 overflow-hidden"
                    >
                        <h3 className="text-lg font-black uppercase flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5" /> New Squad Setup
                        </h3>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-neutral-500 mb-2">Squad Name</label>
                            <input
                                autoFocus
                                type="text"
                                value={newSquadName}
                                onChange={e => setNewSquadName(e.target.value)}
                                placeholder="E.g. Code Ninja Team"
                                className="w-full border-2 border-black p-3 font-bold uppercase outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-neutral-500 mb-2">Description (Optional)</label>
                            <input
                                type="text"
                                value={newSquadDesc}
                                onChange={e => setNewSquadDesc(e.target.value)}
                                placeholder="What is this squad for?"
                                className="w-full border-2 border-black p-3 font-medium outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                            />
                        </div>

                        <button type="submit" className="self-start mt-2 px-6 py-3 bg-indigo-500 border-2 border-black text-white font-black uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all">
                            Initialize Squad
                        </button>
                    </motion.form>
                )}
            </AnimatePresence>

            {/* Pending Invites */}
            {pendingSquads.length > 0 && (
                <div className="bg-amber-100 border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <h3 className="text-lg font-black uppercase mb-4 flex items-center gap-2">
                        <ShieldAlert className="w-5 h-5 text-amber-600" /> Pending Invitations
                    </h3>
                    <div className="space-y-3">
                        {pendingSquads.map(sq => (
                            <div key={sq._id} className="flex flex-col sm:flex-row items-center justify-between border-2 border-black bg-white p-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                <div>
                                    <h4 className="font-bold uppercase">{sq.name}</h4>
                                    <p className="text-xs font-mono text-neutral-500">
                                        Leader: {sq.leaderId?.fullname || sq.leaderId?.username || 'Unknown'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 mt-3 sm:mt-0 w-full sm:w-auto">
                                    <button onClick={() => handleRespondInvite(sq._id, 'accept')} className="flex-1 sm:flex-none px-3 py-1.5 bg-green-500 text-black border-2 border-black font-bold uppercase text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[1px] hover:shadow-none transition-all text-center">
                                        Accept
                                    </button>
                                    <button onClick={() => handleRespondInvite(sq._id, 'decline')} className="flex-1 sm:flex-none px-3 py-1.5 bg-neutral-100 border-2 border-black font-bold uppercase text-xs hover:bg-neutral-200 transition-colors text-center">
                                        Decline
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {loading ? (
                <div className="p-8 text-center font-bold uppercase tracking-widest text-neutral-400">Loading Squad Base...</div>
            ) : squads.length === 0 && !isCreating ? (
                <div className="p-12 text-center border-2 border-black border-dashed bg-neutral-50">
                    <Users className="w-12 h-12 mx-auto text-neutral-300 mb-4" />
                    <h3 className="text-xl font-black uppercase text-neutral-700">No Squads Yet</h3>
                    <p className="text-sm font-bold text-neutral-500 uppercase mt-2">Create a squad or wait for an invite to register for team events.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Squad List */}
                    <div className="lg:col-span-1 space-y-4">
                        <h3 className="font-black uppercase tracking-widest text-neutral-500 text-xs border-b-2 border-black pb-2">Active Squads</h3>

                        {ledSquads.map(sq => (
                            <div
                                key={sq._id}
                                onClick={() => setActiveSquad(sq)}
                                className={`p-4 border-2 border-black cursor-pointer transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${activeSquad?._id === sq._id ? 'bg-indigo-100 translate-x-[2px] translate-y-[2px] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-white hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]'}`}
                            >
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h4 className="font-black uppercase truncate pr-4">{sq.name}</h4>
                                        <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mt-1">
                                            {sq.members.length} Members
                                        </div>
                                    </div>
                                    <Crown className="w-5 h-5 text-amber-500 shrink-0" />
                                </div>
                            </div>
                        ))}

                        {memberSquads.map(sq => (
                            <div
                                key={sq._id}
                                onClick={() => setActiveSquad(sq)}
                                className={`p-4 border-2 border-black cursor-pointer transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${activeSquad?._id === sq._id ? 'bg-neutral-200 translate-x-[2px] translate-y-[2px] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-white hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]'}`}
                            >
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h4 className="font-black uppercase truncate pr-4">{sq.name}</h4>
                                        <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mt-1 truncate">
                                            Leader: {sq.leaderId?.fullname || 'Unknown'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Active Squad Details */}
                    <div className="lg:col-span-2">
                        {activeSquad ? (
                            <div className="bg-white border-2 border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                                <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-4">
                                    <div>
                                        <h3 className="text-2xl font-black uppercase flex items-center gap-3">
                                            {activeSquad.name}
                                            {(activeSquad.leaderId._id === currentUser.id || activeSquad.leaderId === currentUser.id) && (
                                                <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-1 border-2 border-black tracking-widest">
                                                    LEADER
                                                </span>
                                            )}
                                        </h3>
                                        {activeSquad.description && (
                                            <p className="text-sm font-medium text-neutral-600 mt-2">{activeSquad.description}</p>
                                        )}
                                    </div>
                                    {(activeSquad.leaderId._id === currentUser.id || activeSquad.leaderId === currentUser.id) && (
                                        <button
                                            onClick={() => handleDeleteSquad(activeSquad._id)}
                                            className="text-xs font-bold uppercase text-red-600 hover:underline"
                                        >
                                            Delete Squad
                                        </button>
                                    )}
                                    {(activeSquad.leaderId._id !== currentUser.id && activeSquad.leaderId !== currentUser.id) && (
                                        <button
                                            onClick={() => handleLeaveSquad(activeSquad._id)}
                                            className="text-xs font-bold uppercase text-red-600 hover:underline"
                                        >
                                            Leave Squad
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-6">
                                    {/* Members */}
                                    <div>
                                        <h4 className="text-xs font-black uppercase tracking-widest text-neutral-500 mb-3 border-b border-neutral-200 pb-2">
                                            Roster ({activeSquad.members.length})
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {activeSquad.members.map(m => {
                                                const isLeader = m._id === (activeSquad.leaderId._id || activeSquad.leaderId);
                                                return (
                                                    <div key={m._id} className="flex items-center gap-3 p-3 border-2 border-black bg-neutral-50">
                                                        <div className="w-10 h-10 bg-neutral-200 border-2 border-black overflow-hidden shrink-0">
                                                            {m.profilePic ? (
                                                                <img src={m.profilePic} alt={m.fullname} className="w-full h-full object-cover grayscale" />
                                                            ) : (
                                                                <Users className="w-full h-full p-2 text-neutral-400" />
                                                            )}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="font-bold uppercase truncate text-sm flex items-center gap-1">
                                                                {m.fullname || m.username}
                                                                {isLeader && <Crown className="w-3 h-3 text-amber-500" />}
                                                            </div>
                                                            <div className="text-[10px] uppercase font-mono text-neutral-500 truncate">{m.email}</div>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                            {activeSquad.pendingMembers.map(m => (
                                                <div key={m._id} className="flex items-center gap-3 p-3 border-2 border-dashed border-black bg-neutral-50 opacity-60">
                                                    <div className="w-10 h-10 bg-neutral-200 border-2 border-black shrink-0 flex items-center justify-center">
                                                        <Clock className="w-4 h-4 text-neutral-400" />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="font-bold uppercase truncate text-sm text-neutral-600">{m.fullname || m.username}</div>
                                                        <div className="text-[10px] uppercase font-mono tracking-widest text-amber-600">Invited</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Invite Area (Lead Only) */}
                                    {(activeSquad.leaderId._id === currentUser.id || activeSquad.leaderId === currentUser.id) && (
                                        <div className="pt-4 border-t-2 border-black border-dashed">
                                            <h4 className="text-xs font-black uppercase tracking-widest text-neutral-500 mb-3">
                                                Recruit Members
                                            </h4>
                                            <div className="relative">
                                                <Search className="absolute left-3 top-3.5 w-5 h-5 text-neutral-400" />
                                                <input
                                                    type="text"
                                                    placeholder="Search friends by name or username..."
                                                    value={searchQuery}
                                                    onChange={e => setSearchQuery(e.target.value)}
                                                    className="w-full p-3 pl-10 border-2 border-black font-bold outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                                                />

                                                {searchQuery.length > 2 && (
                                                    <div className="absolute top-full left-0 right-0 max-h-48 overflow-y-auto bg-white border-2 border-black border-t-0 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-10">
                                                        {searchResults.length === 0 ? (
                                                            <div className="p-4 text-center text-xs font-bold text-neutral-500 uppercase">No users found</div>
                                                        ) : (
                                                            searchResults.map(u => (
                                                                <div key={u._id} className="flex items-center justify-between p-3 border-b border-black hover:bg-neutral-50">
                                                                    <div className="flex items-center gap-2 min-w-0">
                                                                        <div className="font-bold uppercase text-sm truncate">{u.fullname}</div>
                                                                        <div className="text-[10px] text-neutral-400 truncate">@{u.username}</div>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => handleInvite(u._id)}
                                                                        className="px-3 py-1 bg-black text-white font-bold uppercase text-[10px] tracking-widest hover:bg-neutral-800"
                                                                    >
                                                                        Invite
                                                                    </button>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Registered Events Section */}
                                    <div className="pt-4 border-t-2 border-black border-dashed">
                                        <h4 className="text-xs font-black uppercase tracking-widest text-neutral-500 mb-3 flex items-center gap-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                            Registered Events
                                        </h4>
                                        {loadingEvents ? (
                                            <div className="text-xs font-bold text-neutral-400 uppercase tracking-widest py-2">Loading...</div>
                                        ) : squadEvents.length === 0 ? (
                                            <div className="text-xs font-bold text-neutral-400 uppercase tracking-widest py-2">No events registered yet.</div>
                                        ) : (
                                            <div className="space-y-2">
                                                {squadEvents.map(ev => (
                                                    <div key={ev._id} className="flex items-center gap-3 p-3 border-2 border-black bg-neutral-50">
                                                        <div className="w-2 h-2 bg-black shrink-0" />
                                                        <div className="min-w-0 flex-1">
                                                            <div className="font-bold uppercase truncate text-sm">{ev.title}</div>
                                                            <div className="text-[10px] text-neutral-500 font-mono tracking-widest">
                                                                {ev.date ? new Date(ev.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Date TBA'}
                                                                {ev.isOnline ? ' · Online' : ev.location ? ` · ${ev.location}` : ''}
                                                            </div>
                                                        </div>
                                                        {ev.price > 0 ? (
                                                            <span className="text-[10px] font-black shrink-0 border border-black px-1">₹{ev.price}</span>
                                                        ) : (
                                                            <span className="text-[10px] font-black shrink-0 border border-green-600 text-green-700 px-1">FREE</span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full border-2 border-black border-dashed flex flex-col items-center justify-center p-12 bg-neutral-50 text-neutral-400">
                                <Users className="w-16 h-16 mb-4 opacity-50" />
                                <span className="font-black uppercase tracking-widest">Select a squad to view details</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
