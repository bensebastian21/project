import React, { useState, useEffect } from 'react';
import { MessageSquare, Clock, AlertCircle, CheckCircle2, ChevronRight, User, Mail, MessageCircle, X } from 'lucide-react';
import api from '../../utils/api';
import { getProfilePictureUrl } from '../../utils/imageUtils';

export default function SupportEscalationHub() {
    const [escalations, setEscalations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);
    const [resolving, setResolving] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);

    const fetchEscalations = async () => {
        try {
            const { data } = await api.get('/api/chat/admin/list/escalated');
            setEscalations(data);
        } catch (e) {
            console.error('Failed to fetch escalations:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEscalations();
        const interval = setInterval(fetchEscalations, 30000); // Polling every 30s
        return () => clearInterval(interval);
    }, []);

    const resolveThread = async (id) => {
        if (!window.confirm('Mark this request as resolved?')) return;
        setResolving(true);
        try {
            await api.post(`/api/chat/${id}/resolve`);
            setEscalations(prev => prev.filter(e => e._id !== id));
            setSelected(null);
        } catch (e) {
            alert('Failed to resolve thread');
        } finally {
            setResolving(false);
        }
    };

    const getFrustrationColor = (level) => {
        switch (level?.toLowerCase()) {
            case 'high': return 'text-red-400 bg-red-400/10 border-red-400/20';
            case 'medium': return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
            default: return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-400">Loading escalations...</div>;

    return (
        <div className="flex h-[calc(100vh-120px)] overflow-hidden bg-slate-950 rounded-xl border border-slate-800">
            {/* Sidebar List */}
            <div className="w-1/3 border-r border-slate-800 flex flex-col">
                <div className="p-4 border-b border-slate-800 bg-slate-900/50">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <MessageCircle className="w-5 h-5 text-blue-400" /> Active Escalations
                        <span className="ml-auto text-xs font-mono bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                            {escalations.length}
                        </span>
                    </h2>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {escalations.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 italic text-sm">No active escalations</div>
                    ) : (
                        escalations.map(e => (
                            <button
                                key={e._id}
                                onClick={() => setSelected(e)}
                                className={`w-full p-4 border-b border-slate-800 text-left transition-colors hover:bg-slate-900/50 ${selected?._id === e._id ? 'bg-slate-900 border-l-4 border-l-blue-500' : ''}`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-bold text-slate-200 text-sm truncate max-w-[150px]">
                                        {e.ownerId?.fullname || 'Anonymous User'}
                                    </span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getFrustrationColor(e.frustrationLevel)} uppercase font-bold`}>
                                        {e.frustrationLevel}
                                    </span>
                                </div>
                                <div className="text-xs text-slate-400 line-clamp-2 mb-2 leading-relaxed">
                                    {e.escalationSummary || 'Manual Escalation'}
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                    <Clock className="w-3 h-3" />
                                    {new Date(e.escalatedAt).toLocaleString()}
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Main Content / Chat Viewer */}
            <div className="flex-1 flex flex-col bg-slate-900/30">
                {selected ? (
                    <>
                        {/* Thread Header */}
                        <div className="p-6 border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                        {selected.ownerId?.fullname}
                                        <span className="text-xs font-normal text-slate-400 font-mono">#{selected._id.slice(-6)}</span>
                                    </h3>
                                    <div className="flex gap-4 mt-2 text-sm">
                                        <div className="flex items-center gap-1.5 text-slate-400">
                                            <Mail className="w-4 h-4" /> {selected.ownerId?.email}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-slate-400 capitalize">
                                            <User className="w-4 h-4" /> {selected.ownerType}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => resolveThread(selected._id)}
                                    disabled={resolving}
                                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-green-900/20 disabled:opacity-50"
                                >
                                    <CheckCircle2 className="w-4 h-4" /> Resolve Support
                                </button>
                            </div>

                            {/* AI Summary Card */}
                            <div className="mt-6 p-4 rounded-xl bg-slate-950 border border-slate-800 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-2 bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase tracking-widest rounded-bl-xl border-l border-b border-slate-800">
                                    AI Context Summary
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className={`p-2 rounded-lg border ${getFrustrationColor(selected.frustrationLevel)}`}>
                                        <AlertCircle className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-slate-300 mb-1">Issue Overview:</div>
                                        <p className="text-slate-400 text-sm leading-relaxed italic line-clamp-3">
                                            "{selected.escalationSummary}"
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Message History */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-950/20">
                            {selected.messages.map((m, idx) => (
                                <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[70%] p-3 rounded-2xl text-sm ${m.role === 'user'
                                        ? 'bg-blue-600 text-white rounded-tr-none'
                                        : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none'
                                        }`}>
                                        <div className="text-[10px] opacity-50 mb-1 font-bold uppercase tracking-wider">
                                            {m.role === 'assistant' ? 'AI Bot' : 'User'}
                                        </div>
                                        <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Bottom Actions */}
                        <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex items-center justify-between">
                            <span className="text-xs text-slate-500 font-mono">
                                Click "Resolve" when the issue is fixed. Full multi-agent live chat coming soon.
                            </span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowProfileModal(true)}
                                    className="px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-white transition-colors"
                                >
                                    View Profile
                                </button>
                                <button
                                    onClick={() => window.location.href = `mailto:${selected.ownerId?.email}`}
                                    className="px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-white transition-colors"
                                >
                                    Email User
                                </button>
                            </div>
                        </div>

                        {/* Profile Details Modal */}
                        {showProfileModal && (
                            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                                <div className="w-full max-w-md bg-slate-900 border-2 border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                                    <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
                                        <h4 className="font-bold text-white uppercase tracking-wider text-sm flex items-center gap-2">
                                            <User className="w-4 h-4 text-blue-400" /> User Profile
                                        </h4>
                                        <button onClick={() => setShowProfileModal(false)} className="text-slate-400 hover:text-white">
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                    <div className="p-6">
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center">
                                                {selected.ownerId?.profilePic ? (
                                                    <img src={getProfilePictureUrl(selected.ownerId.profilePic)} className="w-full h-full object-cover" />
                                                ) : (
                                                    <User className="w-8 h-8 text-slate-600" />
                                                )}
                                            </div>
                                            <div>
                                                <div className="text-xl font-bold text-white">{selected.ownerId?.fullname}</div>
                                                <div className="text-xs text-blue-400 font-mono uppercase tracking-widest">{selected.ownerType}</div>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800">
                                                <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Email Address</div>
                                                <div className="text-sm text-slate-200 font-medium">{selected.ownerId?.email}</div>
                                            </div>
                                            {selected.ownerId?.phone && (
                                                <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800">
                                                    <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Phone Number</div>
                                                    <div className="text-sm text-slate-200 font-medium">{selected.ownerId.phone}</div>
                                                </div>
                                            )}
                                            {selected.ownerId?.institute && (
                                                <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800">
                                                    <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Institution / Department</div>
                                                    <div className="text-sm text-slate-200 font-medium">{selected.ownerId.institute}</div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="p-4 bg-slate-800/30 border-t border-slate-800 flex justify-end">
                                        <button onClick={() => setShowProfileModal(false)} className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-bold transition-colors">
                                            Close Details
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-4 opacity-50">
                        <MessageSquare className="w-16 h-16 stroke-[1]" />
                        <p className="text-lg">Select an escalation from the list to view context and chat history</p>
                    </div>
                )}
            </div>
        </div>
    );
}
