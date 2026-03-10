import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { motion } from 'framer-motion';
import { getImageUrl } from '../../utils/imageUtils';
import { Camera, MessageSquare, Zap, Heart, MapPin } from 'lucide-react';

const LiveSentimentFeed = ({ onEventClick }) => {
    const [sentiments, setSentiments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchFeed = async () => {
            try {
                const res = await api.get('/api/memories/feed');
                setSentiments(res.data);
            } catch (error) {
                console.error('Failed to fetch sentiment feed:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchFeed();

        // Polling every 30 seconds for live updates
        const interval = setInterval(fetchFeed, 30000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="w-full flex items-center justify-center p-8 border-2 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mb-12">
                <Zap className="w-6 h-6 animate-pulse text-yellow-500" />
                <span className="ml-2 font-black uppercase tracking-widest text-xs">Loading Live Sentiments...</span>
            </div>
        );
    }

    if (sentiments.length === 0) {
        return null; // Don't show anything if empty
    }

    return (
        <div className="mb-12">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-yellow-400 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <Zap className="w-5 h-5 md:w-6 md:h-6 text-black" />
                </div>
                <div>
                    <h2 className="text-xl md:text-2xl font-black uppercase tracking-tighter">Live Sentiment Feed</h2>
                    <p className="text-[10px] md:text-xs font-bold text-neutral-500 uppercase tracking-widest">
                        Real-time vibes from currently active events
                    </p>
                </div>
            </div>

            {/* Horizontal Scrolling Marquee / Grid */}
            <div className="flex gap-4 md:gap-6 overflow-x-auto pb-6 snap-x pt-2 px-2 -mx-2 hide-scrollbar">
                {sentiments.map((item, idx) => (
                    <motion.div
                        key={item._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(idx * 0.1, 1) }}
                        className={`flex-shrink-0 w-[280px] sm:w-[320px] snap-center border-2 border-black p-4 flex flex-col justify-between shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] ${item.type === 'photo' ? 'bg-black text-white' : 'bg-white text-black'
                            }`}
                    >
                        {item.type === 'photo' ? (
                            <div className="relative w-full h-48 mb-3 border-2 border-neutral-700 bg-neutral-900 overflow-hidden group">
                                <img
                                    src={getImageUrl(item.imageUrl)}
                                    alt="Memory"
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                                <div className="absolute top-2 right-2 bg-black/80 px-2 py-1 text-[10px] font-bold uppercase tracking-widest border border-neutral-700 flex items-center gap-1 backdrop-blur-sm">
                                    <Camera className="w-3 h-3" /> Photo
                                </div>
                                {item.content && (
                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-3 pt-8 pb-3">
                                        <p className="text-white text-sm font-bold drop-shadow-md truncate">"{item.content}"</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex-1 mb-3 bg-amber-50 relative p-5 border-2 border-black text-base italic font-bold flex items-center justify-center shadow-[inset_4px_4px_0px_0px_rgba(0,0,0,0.05)]">
                                <div className="absolute top-2 left-2 text-4xl text-neutral-200 font-serif leading-none">"</div>
                                <div className="relative z-10 text-center text-neutral-800 leading-relaxed px-2">
                                    {item.content}
                                </div>
                                <div className="absolute bottom-[-10px] right-2 text-4xl text-neutral-200 font-serif leading-none">"</div>
                            </div>
                        )}

                        <div className="mt-auto">
                            <div className="flex items-center justify-between border-t-2 border-dashed border-current pt-3 mt-2 opacity-90">
                                <div className="flex items-center gap-2">
                                    <img
                                        src={getImageUrl(item.studentId?.profilePic, 'avatar')}
                                        alt="avatar"
                                        className="w-7 h-7 bg-neutral-200 border-2 border-current object-cover block"
                                    />
                                    <span className="text-xs font-black tracking-wide truncate max-w-[120px]">
                                        @{item.studentId?.username || 'user'}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider">
                                        <Heart className="w-3 h-3" /> {item.likes?.length || 0}
                                    </div>
                                    <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider">
                                        <MessageSquare className="w-3 h-3" /> {item.comments?.length || 0}
                                    </div>
                                </div>
                            </div>

                            {/* Event Badge */}
                            <button
                                onClick={() => onEventClick && item.eventId?._id && onEventClick(item.eventId._id)}
                                className={`mt-4 w-full flex items-center justify-center gap-1.5 truncate text-[10px] font-black uppercase tracking-widest px-3 py-2 border-2 ${item.type === 'photo'
                                    ? 'border-white text-white hover:bg-white hover:text-black'
                                    : 'border-black text-black hover:bg-black hover:text-white'
                                    } transition-colors group`}
                            >
                                <MapPin className="w-3 h-3" />
                                <span className="truncate">{item.eventId?.title || 'Unknown Event'}</span>
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default LiveSentimentFeed;
