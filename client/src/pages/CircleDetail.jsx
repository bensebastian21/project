import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    MessageSquare, Calendar, Users, Heart, Send, 
    MoreVertical, Share2, Shield, CalendarDays, 
    ArrowLeft, Plus, Image as ImageIcon, MapPin, Clock,
    Trash2, UserPlus, UserMinus, Settings, Globe, Lock,
    CheckCircle2, XCircle, Hourglass
} from 'lucide-react';
import api from '../utils/api';
import { toast } from 'react-toastify';
import InviteFriendsModal from '../components/circles/InviteFriendsModal';

const ForumPost = ({ post, onLike, onComment }) => {
    const [comment, setComment] = useState('');
    const [showComments, setShowComments] = useState(false);
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isLiked = post.likes?.includes(user.id);

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-4"
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 border-2 border-black bg-neutral-100 flex items-center justify-center overflow-hidden">
                        {post.author?.profilePic ? (
                            <img src={post.author.profilePic} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <Users className="w-6 h-6" />
                        )}
                    </div>
                    <div>
                        <h4 className="font-black text-sm uppercase tracking-wide">{post.author?.fullname}</h4>
                        <span className="text-[10px] font-bold text-neutral-400 uppercase">{new Date(post.createdAt).toLocaleString()}</span>
                    </div>
                </div>
                <button className="p-1 hover:bg-neutral-100 transition-colors">
                    <MoreVertical className="w-5 h-5" />
                </button>
            </div>

            <div className="text-sm font-medium leading-relaxed whitespace-pre-wrap">
                {post.content}
            </div>

            {post.images?.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                    {post.images.map((img, i) => (
                        <div key={i} className="aspect-video border-2 border-black overflow-hidden bg-neutral-100">
                            <img src={img} alt="" className="w-full h-full object-cover" />
                        </div>
                    ))}
                </div>
            )}

            <div className="flex items-center gap-6 pt-4 border-t-2 border-black border-dashed">
                <button 
                    onClick={() => onLike(post._id)}
                    className={`flex items-center gap-2 text-xs font-black uppercase transition-colors ${isLiked ? 'text-red-500' : 'hover:text-red-500'}`}
                >
                    <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                    {post.likes?.length || 0} Likes
                </button>
                <button 
                    onClick={() => setShowComments(!showComments)}
                    className="flex items-center gap-2 text-xs font-black uppercase hover:text-blue-500 transition-colors"
                >
                    <MessageSquare className="w-4 h-4" />
                    {post.comments?.length || 0} Comments
                </button>
            </div>

            <AnimatePresence>
                {showComments && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden space-y-4"
                    >
                        <div className="space-y-3 pt-4">
                            {post.comments?.map((c, i) => (
                                <div key={i} className="bg-neutral-50 border-2 border-black p-3 text-xs">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-black uppercase">{c.author?.fullname}</span>
                                        <span className="text-[8px] font-bold text-neutral-400">{new Date(c.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <p className="font-medium text-neutral-600">{c.content}</p>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input 
                                type="text"
                                placeholder="WRITE A COMMENT..."
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                className="flex-1 px-3 py-2 bg-white border-2 border-black text-xs font-bold uppercase outline-none focus:bg-neutral-50 transition-all"
                            />
                            <button 
                                onClick={() => { onComment(post._id, comment); setComment(''); }}
                                className="px-4 py-2 bg-black text-white text-xs font-black uppercase hover:bg-neutral-800 transition-colors border-2 border-black"
                            >
                                <Send className="w-3 h-3" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default function CircleDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [circle, setCircle] = useState(null);
    const [posts, setPosts] = useState([]);
    const [activeTab, setActiveTab] = useState('Forum');
    const [loading, setLoading] = useState(true);
    const [newPostContent, setNewPostContent] = useState('');
    const [showInviteModal, setShowInviteModal] = useState(false);
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const fetchCircle = async () => {
        try {
            const { data } = await api.get(`/api/circles/${id}`);
            setCircle(data);
        } catch (e) {
            toast.error('Failed to load circle details');
            navigate('/circles');
        }
    };

    const fetchPosts = async () => {
        try {
            const { data } = await api.get(`/api/circles/${id}/posts`);
            setPosts(data);
        } catch (e) {
            console.error('Failed to load posts', e);
        }
    };

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            await Promise.all([fetchCircle(), fetchPosts()]);
            setLoading(false);
        };
        init();
    }, [id]);

    const handleJoin = async () => {
        try {
            const { data } = await api.post(`/api/circles/${id}/join`);
            if (data.pending) {
                toast.info('Join request submitted for approval');
            } else {
                toast.success('You joined the circle!');
            }
            fetchCircle();
        } catch (e) {
            toast.error(e.response?.data?.error || 'Failed to join');
        }
    };

    const handleCreatePost = async () => {
        if (!newPostContent.trim()) return;
        try {
            const { data } = await api.post(`/api/circles/${id}/posts`, { content: newPostContent });
            setPosts([data, ...posts]);
            setNewPostContent('');
            toast.success('Post published!');
        } catch (e) {
            toast.error('Failed to post');
        }
    };

    const handleLike = async (postId) => {
        try {
            const { data } = await api.post(`/api/circles/${id}/posts/${postId}/like`);
            setPosts(posts.map(p => p._id === postId ? { ...p, likes: data.isLiked ? [...(p.likes || []), user.id] : (p.likes || []).filter(l => l !== user.id) } : p));
        } catch (e) {
            toast.error('Action failed');
        }
    };

    const handleComment = async (postId, content) => {
        if (!content.trim()) return;
        try {
            const { data } = await api.post(`/api/circles/${id}/posts/${postId}/comment`, { content });
            setPosts(posts.map(p => p._id === postId ? { ...p, comments: [...(p.comments || []), data] } : p));
        } catch (e) {
            toast.error('Failed to comment');
        }
    };

    const isMember = useMemo(() => {
        return circle?.members?.some(m => (m._id || m) === user.id);
    }, [circle, user.id]);

    const isPending = useMemo(() => {
        return circle?.pendingRequests?.some(r => (r._id || r) === user.id);
    }, [circle, user.id]);

    const isInvited = useMemo(() => {
        return circle?.pendingInvites?.some(i => (i._id || i) === user.id);
    }, [circle, user.id]);

    const isAdmin = useMemo(() => {
        return circle?.admins?.some(a => (a._id || a) === user.id);
    }, [circle, user.id]);

    const handleUpdateCircle = async (updates) => {
        try {
            const { data } = await api.put(`/api/circles/${id}`, updates);
            setCircle(data);
            toast.success('Settings updated');
        } catch (e) {
            toast.error('Failed to update settings');
        }
    };

    const handleDeleteCircle = async () => {
        if (!window.confirm('ARE YOU SURE? THIS ACTION IS PERMANENT AND WILL DELETE ALL FORUM POSTS!')) return;
        try {
            await api.delete(`/api/circles/${id}`);
            toast.success('Community dissolved.');
            navigate('/circles');
        } catch (e) {
            toast.error('Failed to delete community');
        }
    };

    const handleMemberAction = async (memberId, action) => {
        try {
            if (action === 'kick') {
                await api.delete(`/api/circles/${id}/members/${memberId}`);
                toast.success('Member removed');
            } else {
                // Promote/Demote
                await api.put(`/api/circles/${id}/admins`, { userId: memberId, action });
                toast.success(action === 'add' ? 'Promoted to admin' : 'Demoted from admin');
            }
            fetchCircle();
        } catch (e) {
            toast.error(e.response?.data?.error || 'Action failed');
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center p-6">
            <div className="w-16 h-16 border-4 border-black border-t-transparent animate-spin" />
        </div>
    );

    return (
        <div className="min-h-screen bg-[#fafafa]">
            {/* Custom Header */}
            <div className="relative h-64 md:h-80 bg-neutral-900 border-b-4 border-black overflow-hidden">
                {circle.bannerUrl ? (
                    <img src={circle.bannerUrl} alt="" className="w-full h-full object-cover opacity-50" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: circle.iconColor }}>
                        <Users className="w-32 h-32 text-white/20" />
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-6 md:p-12">
                    <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="space-y-2">
                            <button 
                                onClick={() => navigate('/circles')}
                                className="group flex items-center gap-2 text-white/60 hover:text-white mb-4 transition-colors font-black uppercase text-xs"
                            >
                                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                                BACK TO CIRCLES
                            </button>
                            <h1 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter leading-none">
                                {circle.name}
                            </h1>
                            <div className="flex flex-wrap gap-2 pt-2">
                                {circle.interestTags?.map(tag => (
                                    <span key={tag} className="px-2 py-0.5 bg-white/10 text-white text-[10px] font-black uppercase border border-white/20">
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {!isMember && (
                            <button 
                                onClick={isInvited ? () => navigate('/dashboard?tab=Notifications') : handleJoin}
                                disabled={isPending}
                                className={`px-8 py-3 font-black uppercase tracking-widest transition-all border-2 border-black shadow-[6px_6px_0px_0px_rgba(255,255,255,0.4)] hover:shadow-none translate-x-[-3px] translate-y-[-3px] hover:translate-x-0 hover:translate-y-0 ${isPending ? 'bg-neutral-500 text-white cursor-not-allowed' : isInvited ? 'bg-yellow-400 text-black hover:bg-yellow-500' : 'bg-white text-black hover:bg-neutral-200'}`}
                            >
                                {isPending ? (
                                    <span className="flex items-center gap-2">
                                        <Hourglass className="w-4 h-4 animate-pulse" />
                                        PENDING APPROVAL
                                    </span>
                                ) : isInvited ? (
                                    'ACCEPT INVITATION'
                                ) : (
                                    circle.joinPolicy === 'request' ? 'REQUEST TO JOIN' : 'JOIN CIRCLE'
                                )}
                            </button>
                        )}

                        {isMember && (
                            <button 
                                onClick={() => setShowInviteModal(true)}
                                className="group flex items-center gap-2 px-6 py-3 bg-yellow-400 text-black font-black uppercase tracking-widest border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none translate-x-[-3px] translate-y-[-3px] hover:translate-x-0 hover:translate-y-0 transition-all"
                            >
                                <UserPlus className="w-5 h-5" />
                                Invite Friends
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 md:px-12 py-12 grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-12">
                <div className="space-y-8">
                    {/* Tabs */}
                    <div className="flex border-b-4 border-black gap-2 overflow-x-auto pb-1">
                        {['Forum', 'Calendar', 'Members', ...(isAdmin ? ['Settings'] : [])].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-6 py-3 font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab ? 'bg-black text-white translate-y-[4px]' : 'hover:bg-neutral-100'}`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    <AnimatePresence mode="wait">
                        {activeTab === 'Forum' ? (
                            <motion.div 
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="space-y-6"
                            >
                                {isMember && (
                                    <div className="bg-white border-2 border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                                        <textarea 
                                            placeholder="WHAT'S ON YOUR MIND?"
                                            value={newPostContent}
                                            onChange={(e) => setNewPostContent(e.target.value)}
                                            className="w-full h-24 p-4 bg-neutral-50 border-2 border-black font-bold uppercase tracking-wide outline-none focus:bg-white transition-all resize-none"
                                        />
                                        <div className="flex items-center justify-between mt-4">
                                            <button className="flex items-center gap-2 text-xs font-black uppercase hover:text-blue-600 transition-colors">
                                                <ImageIcon className="w-4 h-4" />
                                                Add Images
                                            </button>
                                            <button 
                                                onClick={handleCreatePost}
                                                className="px-6 py-2 bg-black text-white font-black uppercase tracking-widest hover:bg-neutral-800 transition-all border-2 border-black"
                                            >
                                                Publish Post
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-6">
                                    {posts.length > 0 ? posts.map(post => (
                                        <ForumPost 
                                            key={post._id} 
                                            post={post} 
                                            onLike={handleLike} 
                                            onComment={handleComment} 
                                        />
                                    )) : (
                                        <div className="py-20 text-center border-4 border-dashed border-neutral-200 uppercase font-black text-neutral-300">
                                            The forum is quiet... be the first to post!
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ) : activeTab === 'Calendar' ? (
                            <motion.div 
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="grid grid-cols-1 md:grid-cols-2 gap-6"
                            >
                                {circle.events?.length > 0 ? circle.events.map(ev => (
                                    <div key={ev._id} className="bg-white border-2 border-black p-4 flex gap-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                        <div className="w-20 h-20 bg-neutral-100 border-2 border-black flex items-center justify-center shrink-0">
                                            <CalendarDays className="w-8 h-8" />
                                        </div>
                                        <div className="space-y-1">
                                            <h4 className="font-black uppercase text-sm line-clamp-1">{ev.title}</h4>
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-500 uppercase">
                                                <Clock className="w-3 h-3" />
                                                {new Date(ev.date).toLocaleDateString()}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-500 uppercase">
                                                <MapPin className="w-3 h-3" />
                                                {ev.location}
                                            </div>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="col-span-full py-20 text-center border-4 border-dashed border-neutral-200 uppercase font-black text-neutral-300">
                                        No upcoming events for this circle.
                                    </div>
                                )}
                            </motion.div>
                        ) : activeTab === 'Members' ? (
                            <motion.div 
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="grid grid-cols-2 md:grid-cols-3 gap-4"
                            >
                                {circle.members?.map(m => (
                                    <div key={m._id} className="bg-white border-2 border-black p-3 flex items-center justify-between gap-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-8 h-8 border-2 border-black bg-neutral-100 flex items-center justify-center overflow-hidden shrink-0">
                                                {m.profilePic ? (
                                                    <img src={m.profilePic} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <Users className="w-4 h-4" />
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-black text-[10px] uppercase truncate">{m.fullname}</p>
                                                <p className="text-[8px] font-bold text-neutral-400 uppercase">
                                                    {circle.admins.some(a => (a._id || a) === m._id) ? 'Admin' : 'Member'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </motion.div>
                        ) : (
                            <motion.div 
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="space-y-12"
                            >
                                {/* General Settings */}
                                <div className="space-y-6">
                                    <h3 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-2">
                                        <Settings className="w-6 h-6" /> General Settings
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-black uppercase tracking-wider">Community Name</label>
                                            <input 
                                                type="text"
                                                defaultValue={circle.name}
                                                onBlur={(e) => handleUpdateCircle({ name: e.target.value })}
                                                className="w-full p-4 bg-white border-2 border-black font-bold uppercase outline-none focus:bg-neutral-50 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:shadow-none"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-black uppercase tracking-wider">Accent Color</label>
                                            <div className="flex gap-2 p-2 bg-white border-2 border-black h-[60px] items-center">
                                                {['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#000000'].map(c => (
                                                    <button 
                                                        key={c}
                                                        onClick={() => handleUpdateCircle({ iconColor: c })}
                                                        className={`w-8 h-8 rounded-none border-2 border-black shrink-0 transition-transform ${circle.iconColor === c ? 'scale-110 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'opacity-40'}`}
                                                        style={{ backgroundColor: c }}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-wider">Description</label>
                                        <textarea 
                                            defaultValue={circle.description}
                                            onBlur={(e) => handleUpdateCircle({ description: e.target.value })}
                                            className="w-full h-32 p-4 bg-white border-2 border-black font-bold uppercase outline-none focus:bg-neutral-50 transition-all resize-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:shadow-none"
                                        />
                                    </div>
                                </div>

                                {/* Privacy & Policies */}
                                <div className="space-y-6 pt-12 border-t-4 border-black border-dashed">
                                    <h3 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-2">
                                        <Shield className="w-6 h-6" /> Privacy & Join Policy
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                                                <Globe className="w-3 h-3" /> Visibility
                                            </label>
                                            <select 
                                                value={circle.visibility}
                                                onChange={(e) => handleUpdateCircle({ visibility: e.target.value })}
                                                className="w-full p-4 bg-black text-white font-black uppercase tracking-widest outline-none border-2 border-black cursor-pointer"
                                            >
                                                <option value="public">Public (Searchable)</option>
                                                <option value="private">Private (Invite Only)</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                                                <Shield className="w-3 h-3" /> Join Policy
                                            </label>
                                            <select 
                                                value={circle.joinPolicy}
                                                onChange={(e) => handleUpdateCircle({ joinPolicy: e.target.value })}
                                                className="w-full p-4 bg-black text-white font-black uppercase tracking-widest outline-none border-2 border-black cursor-pointer"
                                            >
                                                <option value="open">Open (Auto-Join)</option>
                                                <option value="request">Request (Approval)</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Member Management */}
                                <div className="space-y-6 pt-12 border-t-4 border-black border-dashed">
                                    <h3 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-2">
                                        <Users className="w-6 h-6" /> Member Management
                                    </h3>
                                    <div className="grid grid-cols-1 gap-4">
                                        {circle.members?.map(m => {
                                            const mId = m._id || m;
                                            const mIsAdmin = circle.admins.some(a => (a._id || a) === mId);
                                            const isSelf = mId === user.id;

                                            return (
                                                <div key={mId} className="bg-white border-2 border-black p-4 flex items-center justify-between shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 border-2 border-black bg-neutral-100 flex items-center justify-center overflow-hidden">
                                                            {m.profilePic ? <img src={m.profilePic} alt="" className="w-full h-full object-cover" /> : <Users className="w-6 h-6" />}
                                                        </div>
                                                        <div>
                                                            <p className="font-black uppercase text-sm">{m.fullname} {isSelf && '(YOU)'}</p>
                                                            <p className="text-[10px] font-bold text-neutral-400 uppercase">{mIsAdmin ? 'Admin' : 'Member'}</p>
                                                        </div>
                                                    </div>

                                                    {!isSelf && (
                                                        <div className="flex gap-2">
                                                            <button 
                                                                onClick={() => handleMemberAction(mId, mIsAdmin ? 'remove' : 'add')}
                                                                className={`p-2 border-2 border-black transition-colors ${mIsAdmin ? 'bg-neutral-100' : 'bg-black text-white hover:bg-neutral-800'}`}
                                                                title={mIsAdmin ? "Demote from Admin" : "Promote to Admin"}
                                                            >
                                                                {mIsAdmin ? <UserMinus className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                                                            </button>
                                                            {!mIsAdmin && (
                                                                <button 
                                                                    onClick={() => handleMemberAction(mId, 'kick')}
                                                                    className="p-2 border-2 border-black hover:bg-red-500 hover:text-white transition-colors"
                                                                    title="Remove from Circle"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Join Requests */}
                                {circle.joinPolicy === 'request' && (
                                    <div className="space-y-6 pt-12 border-t-4 border-black border-dashed">
                                        <h3 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-2">
                                            <Hourglass className="w-6 h-6" /> Join Requests
                                            {circle.pendingRequests?.length > 0 && (
                                                <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-none">
                                                    {circle.pendingRequests.length} NEW
                                                </span>
                                            )}
                                        </h3>
                                        <div className="grid grid-cols-1 gap-4">
                                            {circle.pendingRequests?.length > 0 ? circle.pendingRequests.map(req => (
                                                <div key={req._id} className="bg-white border-2 border-black p-4 flex items-center justify-between shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 border-2 border-black bg-neutral-100 flex items-center justify-center overflow-hidden">
                                                            {req.profilePic ? <img src={req.profilePic} alt="" className="w-full h-full object-cover" /> : <Users className="w-6 h-6" />}
                                                        </div>
                                                        <div>
                                                            <p className="font-black uppercase text-sm">{req.fullname}</p>
                                                            <p className="text-[10px] font-bold text-neutral-400 uppercase">Wants to join</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button 
                                                            onClick={() => handleRequestAction(req._id, 'approve')}
                                                            className="p-2 border-2 border-black bg-green-500 text-white hover:bg-green-600 transition-colors"
                                                            title="Approve"
                                                        >
                                                            <CheckCircle2 className="w-5 h-5" />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleRequestAction(req._id, 'reject')}
                                                            className="p-2 border-2 border-black hover:bg-red-500 hover:text-white transition-colors"
                                                            title="Decline"
                                                        >
                                                            <XCircle className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            )) : (
                                                <div className="p-8 text-center border-2 border-black border-dashed uppercase font-black text-neutral-300">
                                                    No pending requests
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Danger Zone */}
                                <div className="space-y-6 pt-12 border-t-4 border-black border-dashed">
                                    <h3 className="text-2xl font-black uppercase tracking-tighter text-red-600">Danger Zone</h3>
                                    <div className="p-6 bg-red-50 border-4 border-red-600 border-dashed space-y-4">
                                        <p className="text-xs font-black uppercase text-red-600 leading-relaxed">
                                            Warning: Deleting this community is irreversible. All forum data, events, and member lists will be purged from the students network.
                                        </p>
                                        <button 
                                            onClick={handleDeleteCircle}
                                            className="px-8 py-3 bg-red-600 text-white font-black uppercase tracking-[0.2em] border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none translate-x-[-2px] translate-y-[-2px] hover:translate-x-0 hover:translate-y-0"
                                        >
                                            Dissolve Community
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Sidebar */}
                <div className="space-y-8">
                    <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-4">
                        <h3 className="text-xl font-black uppercase border-b-2 border-black pb-2">About Circle</h3>
                        <p className="text-sm font-medium leading-relaxed italic uppercase text-neutral-600">
                            {circle.description}
                        </p>
                    </div>

                    <div className="bg-black text-white p-6 space-y-4">
                        <h3 className="text-xl font-black uppercase border-b-2 border-white/20 pb-2">Circle Stats</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-[10px] font-black uppercase text-white/50">Members</p>
                                <p className="text-2xl font-black">{circle.members?.length || 0}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-white/50">Discussions</p>
                                <p className="text-2xl font-black">{posts.length}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white border-2 border-black p-6 space-y-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <h3 className="text-sm font-black uppercase">Moderators</h3>
                        <div className="space-y-3">
                            {circle.admins?.map(admin => (
                                <div key={admin._id} className="flex items-center gap-3">
                                    <div className="w-8 h-8 border-2 border-black bg-neutral-100 shrink-0 flex items-center justify-center overflow-hidden">
                                        {admin.profilePic ? (
                                            <img src={admin.profilePic} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <Shield className="w-4 h-4" />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-black text-[10px] uppercase truncate">{admin.fullname}</p>
                                        <p className="text-[8px] font-bold text-neutral-400 uppercase">Admin</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <InviteFriendsModal 
                isOpen={showInviteModal}
                onClose={() => setShowInviteModal(false)}
                circle={circle}
                currentUser={user}
            />
        </div>
    );
}
