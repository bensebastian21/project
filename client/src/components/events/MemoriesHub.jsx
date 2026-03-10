import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { getImageUrl } from '../../utils/imageUtils';
import { Camera, Image as ImageIcon, Send, MessageSquare, Heart, MessageCircle, Trash2, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';

const MemoriesHub = ({ event, user }) => {
    const [memories, setMemories] = useState([]);
    const [loading, setLoading] = useState(true);

    // Posting state
    const [postType, setPostType] = useState('text'); // 'text' | 'photo'
    const [content, setContent] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [isPosting, setIsPosting] = useState(false);

    // Comment UI state
    const [activeCommentMemoryId, setActiveCommentMemoryId] = useState(null);
    const [commentText, setCommentText] = useState('');
    const [isCommenting, setIsCommenting] = useState(false);

    useEffect(() => {
        fetchMemories();
    }, [event._id]);

    const fetchMemories = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/api/memories/event/${event._id}`);
            setMemories(res.data || []);
        } catch (err) {
            console.error('Failed to fetch memories', err);
        } finally {
            setLoading(false);
        }
    };

    const currentUserId = user?._id || user?.id;
    const isRegisteredOrAttended = event.registrations?.some(r =>
        String(r.studentId?._id || r.studentId) === String(currentUserId)
    );
    const isHostOrAdmin = String(event.hostId?._id || event.hostId) === String(currentUserId) || user?.role === 'admin';
    const canPost = Boolean(isRegisteredOrAttended || isHostOrAdmin || true); // TEMPORARY true for easy testing

    const handleImageSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error('Image must be less than 5MB');
                return;
            }
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result);
            reader.readAsDataURL(file);
            setPostType('photo');
        }
    };

    const clearImage = () => {
        setImageFile(null);
        setImagePreview(null);
        if (!content) setPostType('text');
    };

    const handlePostSubmit = async (e) => {
        e.preventDefault();
        if (!content.trim() && !imageFile) {
            toast.error('Please add some text or a photo');
            return;
        }

        setIsPosting(true);
        try {
            const formData = new FormData();
            formData.append('eventId', event._id);
            formData.append('type', imageFile ? 'photo' : 'text');
            formData.append('content', content);
            if (imageFile) {
                formData.append('image', imageFile);
            }

            const res = await api.post('/api/memories', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            });

            setMemories([res.data, ...memories]);
            setContent('');
            clearImage();
            toast.success('Memory shared!');
        } catch (err) {
            console.error('Failed to post memory', err);
            toast.error(err.response?.data?.error || 'Failed to post memory');
        } finally {
            setIsPosting(false);
        }
    };

    const handleLike = async (memoryId) => {
        try {
            const res = await api.post(`/api/memories/${memoryId}/like`, {}, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });

            setMemories(memories.map(m =>
                m._id === memoryId ? { ...m, likes: res.data.likes } : m
            ));
        } catch (err) {
            console.error('Like failed', err);
        }
    };

    const handleCommentSubmit = async (memoryId) => {
        if (!commentText.trim()) return;
        setIsCommenting(true);
        try {
            const res = await api.post(`/api/memories/${memoryId}/comment`, { text: commentText }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });

            setMemories(memories.map(m =>
                m._id === memoryId ? { ...m, comments: res.data } : m
            ));
            setCommentText('');
            setActiveCommentMemoryId(null);
        } catch (err) {
            console.error('Comment failed', err);
            toast.error('Failed to add comment');
        } finally {
            setIsCommenting(false);
        }
    };

    const handleDelete = async (memoryId) => {
        if (!window.confirm('Are you sure you want to delete this memory?')) return;
        try {
            await api.delete(`/api/memories/${memoryId}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setMemories(memories.filter(m => m._id !== memoryId));
            toast.success('Memory deleted');
        } catch (err) {
            console.error('Delete failed', err);
            toast.error('Failed to delete memory');
        }
    };

    return (
        <div className="flex flex-col h-full bg-neutral-50 px-6 py-6 border-l-2 border-black max-h-[80vh] overflow-y-auto">

            {/* Create Post Form */}
            {canPost ? (
                <div className="mb-8 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4">
                    <h3 className="text-sm font-black uppercase tracking-widest mb-3 border-b-2 border-black pb-2 flex items-center gap-2">
                        <Camera className="w-4 h-4" /> Share a Memory
                    </h3>

                    <form onSubmit={handlePostSubmit} className="flex flex-col gap-3">
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="What was the best part of this event?..."
                            className="w-full text-sm font-medium border-2 border-transparent bg-neutral-100 p-3 outline-none focus:border-black resize-none h-20"
                        />

                        {imagePreview && (
                            <div className="relative w-max">
                                <img src={imagePreview} alt="Preview" className="h-32 object-cover border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" />
                                <button type="button" onClick={clearImage} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 border-2 border-black hover:bg-red-600">
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        )}

                        <div className="flex items-center justify-between">
                            <label className="cursor-pointer px-3 py-2 bg-neutral-100 border-2 border-black font-bold text-xs uppercase tracking-widest hover:bg-neutral-200 flex items-center gap-2 active:translate-y-[1px]">
                                <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                                <ImageIcon className="w-4 h-4" /> Photo
                            </label>

                            <button
                                type="submit"
                                disabled={isPosting || (!content && !imageFile)}
                                className="px-6 py-2 bg-black text-white border-2 border-black font-bold text-xs uppercase tracking-widest hover:bg-neutral-800 disabled:opacity-50 flex items-center gap-2 active:translate-y-[2px]"
                            >
                                {isPosting ? 'Posting...' : 'Post'} <Send className="w-3 h-3" />
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="mb-8 p-4 bg-amber-100 border-2 border-amber-500 text-amber-900 text-xs font-bold uppercase tracking-widest text-center">
                    Only attendees can share memories. But you can still view the gallery!
                </div>
            )}

            {/* Memories Feed */}
            <div className="flex-1">
                {loading ? (
                    <div className="text-center py-10 font-bold uppercase tracking-widest text-neutral-400 animate-pulse">
                        Loading memories...
                    </div>
                ) : memories.length === 0 ? (
                    <div className="text-center py-16 border-2 border-dashed border-neutral-300">
                        <Camera className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                        <p className="text-neutral-500 font-bold uppercase tracking-widest text-sm">No memories yet</p>
                        <p className="text-neutral-400 text-xs font-medium mt-1">Be the first to share a moment!</p>
                    </div>
                ) : (
                    <div className="space-y-6 columns-1 sm:columns-2 gap-6 space-y-none">
                        {memories.map((memory) => {
                            const isLiked = memory.likes.includes(currentUserId);
                            const author = memory.studentId;
                            const isOwn = String(author?._id || author) === String(currentUserId);

                            return (
                                <div key={memory._id} className="break-inside-avoid mb-6 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col">
                                    {/* Header */}
                                    <div className="p-3 flex items-center justify-between border-b-2 border-black">
                                        <div className="flex items-center gap-2">
                                            {author?.profilePic ? (
                                                <img src={getImageUrl(author.profilePic)} className="w-6 h-6 border border-black object-cover grayscale" alt={author.username} />
                                            ) : (
                                                <div className="w-6 h-6 bg-neutral-200 border border-black flex items-center justify-center text-[10px] font-bold">
                                                    {(author?.username || 'U')[0].toUpperCase()}
                                                </div>
                                            )}
                                            <span className="text-[10px] font-bold uppercase tracking-widest">{author?.username || 'Unknown'}</span>
                                        </div>
                                        {(isOwn || user?.role === 'admin') && (
                                            <button onClick={() => handleDelete(memory._id)} className="text-neutral-400 hover:text-red-500 transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>

                                    {/* Photo */}
                                    {memory.imageUrl && (
                                        <div className="w-full border-b-2 border-black bg-neutral-100 p-1">
                                            <img src={memory.imageUrl} alt="Memory" className="w-full h-auto object-cover grayscale hover:grayscale-0 transition-all duration-300" loading="lazy" />
                                        </div>
                                    )}

                                    {/* Content & Actions */}
                                    <div className="p-3">
                                        {memory.content && (
                                            <p className="text-sm font-medium text-neutral-800 mb-3">{memory.content}</p>
                                        )}

                                        <div className="flex items-center gap-4 text-xs font-bold text-neutral-500">
                                            <button
                                                onClick={() => handleLike(memory._id)}
                                                className={`flex items-center gap-1.5 transition-colors ${isLiked ? 'text-red-500' : 'hover:text-black'}`}
                                            >
                                                <Heart className="w-4 h-4" fill={isLiked ? "currentColor" : "none"} />
                                                <span>{memory.likes?.length || 0}</span>
                                            </button>
                                            <button
                                                onClick={() => setActiveCommentMemoryId(activeCommentMemoryId === memory._id ? null : memory._id)}
                                                className="flex items-center gap-1.5 hover:text-black transition-colors"
                                            >
                                                <MessageCircle className="w-4 h-4" />
                                                <span>{memory.comments?.length || 0}</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Comments Section */}
                                    <AnimatePresence>
                                        {activeCommentMemoryId === memory._id && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="border-t-2 border-black bg-neutral-50 flex flex-col"
                                            >
                                                <div className="max-h-32 overflow-y-auto p-3 space-y-3">
                                                    {memory.comments?.length === 0 ? (
                                                        <div className="text-[10px] text-neutral-400 uppercase font-bold text-center">No comments yet</div>
                                                    ) : (
                                                        memory.comments?.map((comment) => (
                                                            <div key={comment._id} className="text-xs">
                                                                <span className="font-bold mr-2 uppercase">{comment.studentId?.username || 'User'}:</span>
                                                                <span className="text-neutral-700">{comment.text}</span>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                                {currentUserId && (
                                                    <div className="p-2 border-t border-dashed border-neutral-300 flex">
                                                        <input
                                                            type="text"
                                                            value={commentText}
                                                            onChange={(e) => setCommentText(e.target.value)}
                                                            placeholder="Add a comment..."
                                                            className="flex-1 text-xs bg-transparent outline-none px-2"
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') handleCommentSubmit(memory._id);
                                                            }}
                                                        />
                                                        <button
                                                            onClick={() => handleCommentSubmit(memory._id)}
                                                            disabled={isCommenting || !commentText.trim()}
                                                            className="text-[10px] font-bold uppercase tracking-widest bg-black text-white px-3 py-1 border border-black hover:bg-neutral-800 disabled:opacity-50"
                                                        >
                                                            Post
                                                        </button>
                                                    </div>
                                                )}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MemoriesHub;
