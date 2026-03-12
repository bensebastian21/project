import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Users, Sparkles, Filter, Plus, ChevronRight, X, Shield, Globe, Lock, ArrowLeft } from 'lucide-react';
import api from '../utils/api';
import { toast } from 'react-toastify';

const CircleCard = ({ circle, onJoin }) => (
    <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="group relative bg-white border-2 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] transition-all flex flex-col gap-4"
    >
        <div 
            className="h-32 w-full bg-neutral-100 border-2 border-black flex items-center justify-center overflow-hidden"
            style={{ backgroundColor: circle.iconColor + '20' }}
        >
            {circle.bannerUrl ? (
                <img src={circle.bannerUrl} alt={circle.name} className="w-full h-full object-cover" />
            ) : (
                <Users className="w-12 h-12" style={{ color: circle.iconColor }} />
            )}
        </div>

        <div className="flex flex-col gap-2">
            <h3 className="text-xl font-black uppercase tracking-tight line-clamp-1">{circle.name}</h3>
            <p className="text-sm font-medium text-neutral-600 line-clamp-2 min-h-[40px] uppercase tracking-wide leading-relaxed">
                {circle.description}
            </p>
        </div>

        <div className="flex flex-wrap gap-2">
            {circle.interestTags?.slice(0, 3).map(tag => (
                <span key={tag} className="text-[10px] font-black uppercase px-2 py-1 bg-neutral-100 border border-black italic">
                    #{tag}
                </span>
            ))}
        </div>

        <div className="flex items-center justify-between mt-auto pt-4 border-t-2 border-black border-dashed">
            <div className="flex items-center gap-1.5 font-bold text-xs uppercase">
                <Users className="w-4 h-4" />
                {circle.members?.length || 0} Members
            </div>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onJoin(circle._id);
                }}
                className="px-4 py-2 bg-black text-white text-xs font-black uppercase tracking-widest hover:bg-neutral-800 transition-colors border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] hover:shadow-none translate-x-[-2px] translate-y-[-2px] hover:translate-x-0 hover:translate-y-0"
            >
                View Circle
            </button>
        </div>
    </motion.div>
);

export default function Circles() {
    const [circles, setCircles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchingAI, setIsSearchingAI] = useState(false);
    const [aiParsedQuery, setAiParsedQuery] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newCircle, setNewCircle] = useState({
        name: '',
        description: '',
        interestTags: '',
        iconColor: '#3B82F6',
        visibility: 'public',
        joinPolicy: 'open'
    });
    const navigate = useNavigate();

    const fetchCircles = async () => {
        try {
            setLoading(true);
            const { data } = await api.get(`/api/circles${searchQuery ? `?query=${searchQuery}` : ''}`);
            setCircles(data);
        } catch (e) {
            toast.error('Failed to load circles');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const query = searchQuery.trim();
        if (!query) {
            fetchCircles();
            setIsSearchingAI(false);
            setAiParsedQuery(null);
            return;
        }

        setIsSearchingAI(true);
        const timer = setTimeout(async () => {
            try {
                const { data } = await api.post('/api/circles/smart-search', { query });
                if (data && data.circles) {
                    setCircles(data.circles);
                    setAiParsedQuery(data.parsedQuery || null);
                }
            } catch (e) {
                console.error("Circles smart search failed:", e);
                // Fallback to standard search if AI fails
                fetchCircles();
            } finally {
                setIsSearchingAI(false);
            }
        }, 800);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleCreateCircle = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...newCircle,
                interestTags: newCircle.interestTags.split(',').map(t => t.trim()).filter(Boolean)
            };
            const { data } = await api.post('/api/circles', payload);
            toast.success('Community Created!');
            setShowCreateModal(false);
            setCircles([data, ...circles]);
            navigate(`/circles/${data._id}`);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to create community');
        }
    };

    return (
        <div className="min-h-screen bg-[#fafafa] p-6 lg:p-12">
            <div className="max-w-7xl mx-auto space-y-12">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b-4 border-black pb-8">
                    <div className="space-y-4">
                        <button 
                            onClick={() => navigate('/dashboard?tab=Friends&subTab=Circles')} 
                            className="flex items-center gap-2 group text-slate-500 hover:text-black transition-colors mb-2"
                        >
                            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                            <span className="text-xs font-black uppercase tracking-widest">Back to Dashboard</span>
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-black text-white rounded-none">
                                <Sparkles className="w-8 h-8" />
                            </div>
                            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter">
                                Community <br /> Circles
                            </h1>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 items-center">
                        <button 
                            onClick={() => setShowCreateModal(true)}
                            className="flex items-center gap-2 px-6 py-3 bg-black text-white font-black uppercase tracking-widest hover:bg-neutral-800 transition-all border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] hover:shadow-none translate-x-[-2px] translate-y-[-2px] hover:translate-x-0 hover:translate-y-0"
                        >
                            <Plus className="w-5 h-5" />
                            Create Community
                        </button>

                        <div className="w-full md:w-96 space-y-4">
                        <div className="relative group border-b border-slate-300 focus-within:border-black hover:border-slate-400 transition-all flex items-center">
                            <Search className="w-4 h-4 text-slate-400 group-focus-within:text-black transition-colors ml-2" />
                            <div className="relative flex-1 flex items-center">
                                <input
                                    type="text"
                                    placeholder="ASK AI TO FIND CIRCLES..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-3 pr-12 py-3 bg-transparent text-sm font-medium uppercase tracking-wider focus:outline-none placeholder:text-slate-400"
                                />
                                
                                {isSearchingAI ? (
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 flex gap-1 items-end h-3">
                                        <motion.div className="w-1 bg-gradient-to-t from-blue-500 to-purple-500 rounded-full" animate={{ height: ["4px", "12px", "4px"] }} transition={{ duration: 1, repeat: Infinity, delay: 0 }} />
                                        <motion.div className="w-1 bg-gradient-to-t from-purple-500 to-pink-500 rounded-full" animate={{ height: ["4px", "12px", "4px"] }} transition={{ duration: 1, repeat: Infinity, delay: 0.2 }} />
                                        <motion.div className="w-1 bg-gradient-to-t from-pink-500 to-orange-500 rounded-full" animate={{ height: ["4px", "12px", "4px"] }} transition={{ duration: 1, repeat: Infinity, delay: 0.4 }} />
                                    </div>
                                ) : (
                                    searchQuery && (
                                        <button
                                            onClick={() => { setSearchQuery(''); setAiParsedQuery(null); }}
                                            className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 hover:text-black transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )
                                )}
                            </div>
                        </div>

                        <AnimatePresence>
                            {aiParsedQuery && searchQuery && (
                                <motion.div 
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="p-2 border-slate-200 flex flex-wrap gap-2 items-center"
                                >
                                    <span className="text-[10px] font-black uppercase text-slate-400 italic">Matched AI Intent:</span>
                                    {aiParsedQuery.interestTags?.map(tag => (
                                        <span key={tag} className="text-[10px] font-black uppercase px-2 py-0.5 bg-black text-white italic">
                                            {tag}
                                        </span>
                                    ))}
                                    {aiParsedQuery.keywords?.map(kw => (
                                        <span key={kw} className="text-[10px] font-black uppercase px-2 py-0.5 border border-black italic">
                                            {kw}
                                        </span>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <AnimatePresence mode="popLayout">
                        {loading ? (
                            Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="h-[350px] bg-neutral-100 border-2 border-black border-dashed animate-pulse shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)]" />
                            ))
                        ) : circles.length > 0 ? (
                            circles.map(circle => (
                                <div key={circle._id} onClick={() => navigate(`/circles/${circle._id}`)} className="cursor-pointer">
                                    <CircleCard circle={circle} onJoin={() => navigate(`/circles/${circle._id}`)} />
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full py-20 text-center border-4 border-dashed border-neutral-200">
                                <Users className="w-20 h-20 mx-auto text-neutral-300 mb-6" />
                                <h3 className="text-3xl font-black uppercase text-neutral-400">No circles found</h3>
                                <p className="text-neutral-400 font-bold uppercase italic mt-2">Try a different search term or create one!</p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Create Modal */}
                <AnimatePresence>
                    {showCreateModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setShowCreateModal(false)}
                                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            />
                            <motion.div 
                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                className="relative bg-white border-4 border-black p-8 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                            >
                                <div className="flex justify-between items-start mb-8">
                                    <div className="space-y-1">
                                        <h2 className="text-3xl font-black uppercase tracking-tighter">New Community</h2>
                                        <p className="text-xs font-bold text-neutral-400 uppercase italic">Build your tribe, share your vibe.</p>
                                    </div>
                                    <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-neutral-100 border-2 border-black transition-colors">
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>

                                <form onSubmit={handleCreateCircle} className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-wider">Community Name</label>
                                        <input 
                                            required
                                            type="text"
                                            placeholder="ENTER NAME..."
                                            value={newCircle.name}
                                            onChange={(e) => setNewCircle({...newCircle, name: e.target.value})}
                                            className="w-full p-4 bg-neutral-50 border-2 border-black font-bold uppercase outline-none focus:bg-white transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:shadow-none"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-wider">Description</label>
                                        <textarea 
                                            required
                                            placeholder="WHAT'S THIS COMMUNITY ABOUT?"
                                            value={newCircle.description}
                                            onChange={(e) => setNewCircle({...newCircle, description: e.target.value})}
                                            className="w-full h-32 p-4 bg-neutral-50 border-2 border-black font-bold uppercase outline-none focus:bg-white transition-all resize-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:shadow-none"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-black uppercase tracking-wider">Interest Tags (comma separated)</label>
                                            <input 
                                                type="text"
                                                placeholder="TECH, MUSIC, CODING..."
                                                value={newCircle.interestTags}
                                                onChange={(e) => setNewCircle({...newCircle, interestTags: e.target.value})}
                                                className="w-full p-4 bg-neutral-50 border-2 border-black font-bold uppercase outline-none focus:bg-white transition-all"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-black uppercase tracking-wider">Accent Color</label>
                                            <div className="flex gap-2 p-2 bg-neutral-50 border-2 border-black h-[58px] items-center overflow-x-auto">
                                                {['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#000000'].map(c => (
                                                    <button 
                                                        key={c}
                                                        type="button"
                                                        onClick={() => setNewCircle({...newCircle, iconColor: c})}
                                                        className={`w-8 h-8 rounded-none border-2 border-black shrink-0 transition-transform ${newCircle.iconColor === c ? 'scale-110 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'opacity-60'}`}
                                                        style={{ backgroundColor: c }}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t-2 border-black border-dashed">
                                        <div className="space-y-2">
                                            <label className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                                                <Globe className="w-3 h-3" /> Visibility
                                            </label>
                                            <select 
                                                value={newCircle.visibility}
                                                onChange={(e) => setNewCircle({...newCircle, visibility: e.target.value})}
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
                                                value={newCircle.joinPolicy}
                                                onChange={(e) => setNewCircle({...newCircle, joinPolicy: e.target.value})}
                                                className="w-full p-4 bg-black text-white font-black uppercase tracking-widest outline-none border-2 border-black cursor-pointer"
                                            >
                                                <option value="open">Open (Auto-Join)</option>
                                                <option value="request">Request (Approval)</option>
                                            </select>
                                        </div>
                                    </div>

                                    <button 
                                        type="submit"
                                        className="w-full py-5 bg-black text-white font-black uppercase tracking-[0.2em] text-lg hover:bg-neutral-800 transition-all border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,0.2)] hover:shadow-none translate-x-[-4px] translate-y-[-4px] hover:translate-x-0 hover:translate-y-0 mt-4"
                                    >
                                        Establish Community
                                    </button>
                                </form>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
