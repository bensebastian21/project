import React, { useState, useEffect, useCallback } from 'react';
import { Search, X, MessageSquare, Bell, UserPlus, Check, Send, Sparkles } from 'lucide-react';
import api from '../../utils/api';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import config from '../../config';

const InviteFriendsModal = ({ circle, isOpen, onClose, currentUser }) => {
    const [activeTab, setActiveTab] = useState('notifications'); // 'notifications' | 'chat'
    const [friends, setFriends] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [invitingIds, setInvitingIds] = useState(new Set());
    const [invitedIds, setInvitedIds] = useState(new Set());
    const [socket, setSocket] = useState(null);

    // 1. Initialize Socket for Chat Invites
    useEffect(() => {
        if (!isOpen) return;
        const token = localStorage.getItem('token');
        if (!token) return;

        const socketUrl = config.apiBaseUrl.replace('/api', '');
        const newSocket = io(socketUrl, {
            auth: { token },
            transports: ['websocket', 'polling'],
        });
        setSocket(newSocket);

        return () => newSocket.disconnect();
    }, [isOpen]);

    // 2. Fetch Friends
    useEffect(() => {
        if (!isOpen) return;
        const fetchFriends = async () => {
            try {
                setLoading(true);
                const { data } = await api.get('/api/friends');
                // Filter out friends already in circle
                const memberIds = circle.members?.map(m => (m._id || m).toString()) || [];
                const filtered = data.filter(f => !memberIds.includes(f._id.toString()));
                setFriends(filtered);
            } catch (err) {
                console.error('Fetch friends error:', err);
                toast.error('Failed to load friends');
            } finally {
                setLoading(false);
            }
        };
        fetchFriends();
    }, [isOpen, circle.members]);

    // 3. Handle Invite via Notification
    const handleInviteNotification = async (friendId) => {
        try {
            setInvitingIds(prev => new Set(prev).add(friendId));
            await api.post(`/api/circles/${circle._id}/invite`, { userIds: [friendId] });
            setInvitedIds(prev => new Set(prev).add(friendId));
            toast.success('Invitation sent');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to send invitation');
        } finally {
            setInvitingIds(prev => {
                const updated = new Set(prev);
                updated.delete(friendId);
                return updated;
            });
        }
    };

    // 4. Handle Invite via Chat
    const handleInviteChat = (friend) => {
        if (!socket) return;
        
        const inviteContent = `Hey! Check out this circle: ${circle.name}. Come join us!`;
        const metadata = {
            type: 'circle_invite',
            circleId: circle._id,
            circleName: circle.name,
            senderName: currentUser.username
        };

        socket.emit('send_message', {
            receiverId: friend._id,
            content: inviteContent,
            type: 'circle_invite',
            metadata
        });

        setInvitedIds(prev => new Set(prev).add(friend._id));
        toast.success(`Invite shared with ${friend.fullname}`);
    };

    const filteredFriends = friends.filter(f => 
        f.fullname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.username?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-white rounded-none border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="p-6 bg-black text-white flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-yellow-400" />
                            Invite Friends
                        </h2>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
                            to {circle.name}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b-4 border-black">
                    <button 
                        onClick={() => setActiveTab('notifications')}
                        className={`flex-1 py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors ${activeTab === 'notifications' ? 'bg-yellow-400 text-black' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                    >
                        <Bell className="w-4 h-4" />
                        Via Apps
                    </button>
                    <button 
                        onClick={() => setActiveTab('chat')}
                        className={`flex-1 py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors ${activeTab === 'chat' ? 'bg-blue-400 text-black' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                    >
                        <MessageSquare className="w-4 h-4" />
                        Via Chat
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b-2 border-slate-100 bg-slate-50/50">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-black transition-colors" />
                        <input 
                            type="text"
                            placeholder="SEARCH FRIENDS..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-white border-2 border-black font-bold uppercase tracking-wider text-xs focus:outline-none focus:ring-4 focus:ring-yellow-100 placeholder:text-slate-300"
                        />
                    </div>
                </div>

                {/* Friends List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {loading ? (
                        Array(3).fill(0).map((_, i) => (
                            <div key={i} className="animate-pulse flex items-center gap-3 p-3 bg-slate-50">
                                <div className="w-10 h-10 bg-slate-200 rounded-none"></div>
                                <div className="flex-1 space-y-2">
                                    <div className="h-3 bg-slate-200 w-1/2"></div>
                                    <div className="h-2 bg-slate-200 w-1/3"></div>
                                </div>
                            </div>
                        ))
                    ) : filteredFriends.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <UserPlus className="w-12 h-12 mb-3 opacity-20" />
                            <p className="text-xs font-black uppercase tracking-widest">No friends found</p>
                        </div>
                    ) : (
                        filteredFriends.map(friend => (
                            <div key={friend._id} className="group flex items-center justify-between p-3 border-2 border-transparent hover:border-black hover:bg-slate-50 transition-all">
                                <div className="flex items-center gap-3">
                                    <img 
                                        src={friend.profilePic || `https://ui-avatars.com/api/?name=${friend.fullname}&background=random`}
                                        className="w-10 h-10 rounded-none border-2 border-black"
                                        alt=""
                                    />
                                    <div>
                                        <h4 className="text-sm font-black uppercase tracking-tight">{friend.fullname}</h4>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">@{friend.username}</p>
                                    </div>
                                </div>

                                {invitedIds.has(friend._id) ? (
                                    <div className="flex items-center gap-1 text-green-600 font-black text-[10px] uppercase tracking-widest">
                                        <Check className="w-4 h-4" />
                                        Sent
                                    </div>
                                ) : activeTab === 'notifications' ? (
                                    <button 
                                        onClick={() => handleInviteNotification(friend._id)}
                                        disabled={invitingIds.has(friend._id)}
                                        className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none translate-x-[-2px] translate-y-[-2px] hover:translate-x-0 hover:translate-y-0 transition-all ${invitingIds.has(friend._id) ? 'bg-slate-100 text-slate-300' : 'bg-yellow-400 text-black'}`}
                                    >
                                        {invitingIds.has(friend._id) ? 'Sending...' : 'Invite'}
                                    </button>
                                ) : (
                                    <button 
                                        onClick={() => handleInviteChat(friend)}
                                        className="px-4 py-2 text-[10px] font-black uppercase tracking-widest border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none translate-x-[-2px] translate-y-[-2px] hover:translate-x-0 hover:translate-y-0 transition-all bg-blue-400 text-black"
                                    >
                                        Share
                                    </button>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-50 border-t-4 border-black text-center">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        {invitedIds.size} friends invited so far
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default InviteFriendsModal;
