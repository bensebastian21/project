import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Plus, Trash2, Trophy, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'react-toastify';

const BucketListGoals = () => {
    const [goals, setGoals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    const [newGoal, setNewGoal] = useState({
        title: '',
        targetCount: 1,
        category: 'Any'
    });

    const CATEGORIES = [
        'Any', 'Coding', 'Volunteer', 'Technology', 'Business', 'Arts',
        'Sports', 'Music', 'Charity', 'Education'
    ];

    const fetchGoals = async () => {
        try {
            const res = await api.get('/api/goals');
            setGoals(res.data);
        } catch (error) {
            console.error('Failed to fetch goals:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGoals();
    }, []);

    const handleAddGoal = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post('/api/goals', newGoal);
            setGoals([res.data, ...goals]);
            setShowForm(false);
            setNewGoal({ title: '', targetCount: 1, category: 'Any' });
            toast.success('Goal added to your Bucket List!');
        } catch (error) {
            toast.error(error?.response?.data?.error || 'Failed to add goal');
        }
    };

    const handleDeleteGoal = async (goalId) => {
        if (!window.confirm("Delete this goal?")) return;
        try {
            await api.delete(`/api/goals/${goalId}`);
            setGoals(goals.filter(g => g._id !== goalId));
            toast.success('Goal deleted');
        } catch (error) {
            toast.error('Failed to delete goal');
        }
    };

    if (loading) {
        return (
            <div className="p-6 border-2 border-black flex items-center justify-center min-h-[200px] bg-white text-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="bg-white border-2 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col h-full">
            <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-black">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-400 border-2 border-black">
                        <Target className="w-6 h-6 text-black" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black uppercase tracking-tighter">Bucket List</h2>
                        <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                            Your Semester Goals
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="p-2 bg-black text-white hover:bg-neutral-800 transition-colors border-2 border-transparent hover:border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]"
                    title="Add Goal"
                >
                    <Plus className={`w-5 h-5 transition-transform ${showForm ? 'rotate-45' : ''}`} />
                </button>
            </div>

            <AnimatePresence>
                {showForm && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <form onSubmit={handleAddGoal} className="bg-neutral-50 border-2 border-black p-4 mb-6 relative">
                            <h3 className="text-sm font-bold uppercase tracking-widest mb-4">New Goal</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider mb-1">I want to...</label>
                                    <input
                                        type="text"
                                        value={newGoal.title}
                                        onChange={e => setNewGoal({ ...newGoal, title: e.target.value })}
                                        placeholder="e.g. 5 coding meetups"
                                        className="w-full px-3 py-2 border-2 border-black focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
                                        required
                                    />
                                </div>
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <label className="block text-xs font-bold uppercase tracking-wider mb-1">Target</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={newGoal.targetCount}
                                            onChange={e => setNewGoal({ ...newGoal, targetCount: parseInt(e.target.value) || 1 })}
                                            className="w-full px-3 py-2 border-2 border-black focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
                                            required
                                        />
                                    </div>
                                    <div className="flex-[2]">
                                        <label className="block text-xs font-bold uppercase tracking-wider mb-1">Category</label>
                                        <select
                                            value={newGoal.category}
                                            onChange={e => setNewGoal({ ...newGoal, category: e.target.value })}
                                            className="w-full px-3 py-2 border-2 border-black focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
                                        >
                                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <button type="submit" className="w-full py-2 bg-emerald-400 text-black border-2 border-black font-bold uppercase tracking-widest hover:bg-emerald-300 transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px]">
                                    Set Goal
                                </button>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                {goals.length === 0 ? (
                    <div className="text-center py-8">
                        <Target className="w-12 h-12 text-neutral-200 mx-auto mb-3" />
                        <p className="text-sm font-bold text-neutral-400 uppercase tracking-widest">No goals set yet.</p>
                        <p className="text-xs text-neutral-500 mt-1">Challenge yourself this semester!</p>
                    </div>
                ) : (
                    goals.map(goal => {
                        const progress = Math.min((goal.currentProgress / goal.targetCount) * 100, 100);
                        const isDone = goal.currentProgress >= goal.targetCount;

                        return (
                            <motion.div
                                key={goal._id}
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`relative p-4 border-2 border-black overflow-hidden group ${isDone ? 'bg-emerald-50' : 'bg-white'}`}
                            >
                                <div className="relative z-10 flex justify-between items-start mb-3">
                                    <div className="pr-8">
                                        <h4 className={`font-black text-sm uppercase tracking-wider ${isDone ? 'text-emerald-900 line-through' : 'text-black'}`}>
                                            {goal.title}
                                        </h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] font-bold text-white bg-black px-1.5 py-0.5 uppercase tracking-widest">
                                                {goal.category}
                                            </span>
                                            {isDone && (
                                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-200 px-1.5 py-0.5 flex items-center gap-1">
                                                    <Sparkles className="w-3 h-3" /> Achieved
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteGoal(goal._id)}
                                        className="text-neutral-400 hover:text-red-600 transition-colors bg-white p-1 border-2 border-transparent hover:border-red-600"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="space-y-1 relative z-10">
                                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-neutral-600">
                                        <span>Progress</span>
                                        <span>{goal.currentProgress} / {goal.targetCount}</span>
                                    </div>
                                    <div className="h-3 w-full bg-neutral-200 border border-black overflow-hidden relative">
                                        <div
                                            className={`h-full border-r border-black transition-all duration-1000 ${isDone ? 'bg-emerald-500' : 'bg-black'}`}
                                            style={{ width: `${progress}%` }}
                                        />
                                        {/* Grid overlay for brutalism */}
                                        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNCIgaGVpZ2h0PSI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIGQ9Ik0wIDEwaDRNMCAyaDRtLTEgMnY1bTEgOHY1IiBzdHJva2U9IiNmZmZmZmYyMiIgc3Ryb2tlLXdpZHRoPSIxIiBmaWxsPSJub25lIi8+PC9zdmc+')] opacity-30 pointer-events-none mix-blend-overlay"></div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })
                )}
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: #000;
                    border: 2px solid #fff;
                }
            `}</style>
        </div>
    );
};

export default BucketListGoals;
