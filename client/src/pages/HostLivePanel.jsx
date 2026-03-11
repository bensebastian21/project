import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { toast } from 'react-toastify';
import { ArrowLeft, MessageSquare, BarChart2, Plus, X, Check, Trash2 } from 'lucide-react';
import api from '../utils/api';
import config from '../config';

const HostLivePanel = () => {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const [socket, setSocket] = useState(null);
    const [eventData, setEventData] = useState(null);
    const [qaList, setQaList] = useState([]);
    const [polls, setPolls] = useState([]);
    const [isQaActive, setIsQaActive] = useState(false);
    const [loading, setLoading] = useState(true);

    // Poll Creation State
    const [pollQuestion, setPollQuestion] = useState('');
    const [pollOptions, setPollOptions] = useState(['', '']);

    // Q&A Reply State
    const [replyTexts, setReplyTexts] = useState({});

    useEffect(() => {
        fetchLiveState();

        const token = localStorage.getItem('token');
        const socketUrl = process.env.REACT_APP_API_URL || config.apiBaseUrl.replace(/\/api$/, '');
        const newSocket = io(socketUrl, {
            auth: { token }
        });

        setSocket(newSocket);

        newSocket.on('connect', () => {
            newSocket.emit('join_event_room', eventId);
        });

        // Listeners
        newSocket.on('qa_status_changed', (status) => setIsQaActive(status));

        newSocket.on('new_question', (q) => {
            setQaList(prev => [...prev, q].sort((a, b) => b.upvotes - a.upvotes));
        });

        newSocket.on('question_upvoted', ({ questionId, upvotes }) => {
            setQaList(prev => {
                const updated = prev.map(q => q._id === questionId ? { ...q, upvotes } : q);
                return updated.sort((a, b) => b.upvotes - a.upvotes);
            });
        });

        newSocket.on('question_answered', ({ questionId, reply }) => {
            setQaList(prev => prev.map(q => q._id === questionId ? { ...q, answered: true, reply } : q));
        });

        newSocket.on('poll_created', (poll) => {
            setPolls(prev => {
                const withoutActive = prev.map(p => ({ ...p, isActive: false }));
                return [poll, ...withoutActive];
            });
        });

        newSocket.on('poll_updated', ({ pollId, options }) => {
            setPolls(prev => prev.map(p => p._id === pollId ? { ...p, options } : p));
        });

        newSocket.on('poll_closed', (pollId) => {
            setPolls(prev => prev.map(p => p._id === pollId ? { ...p, isActive: false } : p));
        });

        return () => newSocket.disconnect();
    }, [eventId]);

    const fetchLiveState = async () => {
        try {
            const res = await api.get(`/api/host/public/events/${eventId}/live`);
            const le = res.data.liveEngagement || {};
            setIsQaActive(le.isQaActive || false);
            setQaList(le.qaList || []);
            setPolls(le.polls ? [...le.polls].reverse() : []); // Newest first
        } catch (err) {
            toast.error('Failed to fetch live event state');
        } finally {
            setLoading(false);
        }
    };

    const toggleQa = () => {
        socket?.emit('toggle_qa', { eventId, isActive: !isQaActive });
    };

    const markAnswered = (questionId) => {
        socket?.emit('mark_answered', { eventId, questionId });
    };

    const sendReply = (questionId) => {
        const reply = replyTexts[questionId] || '';
        socket?.emit('reply_question', { eventId, questionId, reply });
        setReplyTexts(prev => ({ ...prev, [questionId]: '' }));
    };

    const pushPoll = () => {
        const validOptions = pollOptions.filter(o => o.trim() !== '');
        if (!pollQuestion.trim() || validOptions.length < 2) {
            return toast.error('Check poll question and ensure at least 2 options.');
        }
        socket?.emit('create_poll', { eventId, question: pollQuestion, options: validOptions });
        setPollQuestion('');
        setPollOptions(['', '']);
        toast.success('Poll Pushed Live!');
    };

    const closePoll = (pollId) => {
        socket?.emit('close_poll', { eventId, pollId });
    };

    if (loading) return <div className="p-10 font-bold uppercase">Loading Live Panel...</div>;

    const activePoll = polls.find(p => p.isActive);
    const pastPolls = polls.filter(p => !p.isActive);

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
            {/* Header */}
            <header className="bg-white border-b-4 border-black p-6 flex items-center justify-between sticky top-0 z-10 shadow-[0_4px_0_0_rgba(0,0,0,1)]">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/host-dashboard')}
                        className="p-2 border-2 border-black hover:bg-black hover:text-white transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-2xl font-black uppercase tracking-widest">Live Control Panel</h1>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="font-bold uppercase text-sm">Q&A Status:</span>
                        <button
                            onClick={toggleQa}
                            className={`px-4 py-2 border-2 border-black font-black uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all ${isQaActive ? 'bg-green-500 text-black hover:bg-green-400' : 'bg-red-500 text-white hover:bg-red-400'
                                }`}
                        >
                            {isQaActive ? 'Active' : 'Offline'}
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">
                {/* Left Column: Live Q&A */}
                <section className="bg-white border-4 border-black shadow-[8px_8px_0_0_rgba(0,0,0,1)] flex flex-col h-[75vh]">
                    <div className="p-4 border-b-4 border-black flex items-center gap-2 bg-yellow-300">
                        <MessageSquare className="w-6 h-6" />
                        <h2 className="text-xl font-black uppercase">Audience Q&A</h2>
                    </div>
                    <div className="p-4 flex-1 overflow-y-auto space-y-4 bg-yellow-50">
                        {qaList.length === 0 ? (
                            <p className="text-center font-bold text-slate-500 uppercase mt-10">No questions yet</p>
                        ) : (
                            qaList.map(q => (
                                <div key={q._id} className={`p-4 border-2 border-black bg-white shadow-[4px_4px_0_0_rgba(0,0,0,1)] ${q.answered ? 'opacity-50' : ''}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-black flex-1 pr-4 text-lg">{q.question}</span>
                                        <span className="bg-black text-white px-2 py-1 text-xs font-bold uppercase rounded-sm shrink-0">
                                            {q.upvotes} Votes
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center mt-4 border-t-2 border-black/10 pt-2">
                                        <span className="text-xs uppercase font-bold text-slate-500">By {q.studentName}</span>
                                        {!q.answered ? (
                                            <div className="flex gap-2 w-2/3">
                                                <input
                                                    type="text"
                                                    placeholder="Type a reply... (optional)"
                                                    value={replyTexts[q._id] || ''}
                                                    onChange={e => setReplyTexts(prev => ({ ...prev, [q._id]: e.target.value }))}
                                                    className="flex-1 text-xs border-2 border-black px-2 py-1 outline-none focus:bg-yellow-100"
                                                />
                                                <button
                                                    onClick={() => sendReply(q._id)}
                                                    className="flex items-center gap-1 text-xs font-black uppercase px-2 py-1 bg-green-400 border-2 border-black hover:bg-green-300 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                                >
                                                    <Check className="w-3 h-3" /> Reply & Mark
                                                </button>
                                                <button
                                                    onClick={() => markAnswered(q._id)}
                                                    className="px-2 py-1 bg-neutral-200 border-2 border-black hover:bg-neutral-300 transition-all shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
                                                    title="Mark Answered without replying"
                                                >
                                                    <Check className="w-3 h-3 text-black" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-end">
                                                <span className="text-xs font-black text-green-600 uppercase">Answered</span>
                                            </div>
                                        )}
                                    </div>
                                    {q.answered && q.reply && (
                                        <div className="mt-3 p-2 bg-green-100 border-2 border-green-600 text-sm font-bold">
                                            <span className="text-green-800 uppercase text-[10px] block mb-1">Host Reply:</span>
                                            {q.reply}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </section>

                {/* Right Column: Polls Management */}
                <section className="bg-white border-4 border-black shadow-[8px_8px_0_0_rgba(0,0,0,1)] flex flex-col h-[75vh]">
                    <div className="p-4 border-b-4 border-black flex items-center gap-2 bg-blue-300">
                        <BarChart2 className="w-6 h-6" />
                        <h2 className="text-xl font-black uppercase">Live Polls</h2>
                    </div>
                    <div className="p-6 flex-1 overflow-y-auto space-y-8 bg-blue-50">

                        {/* Create Poll Card */}
                        <div className="border-4 border-black bg-white p-4 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                            <h3 className="font-black uppercase mb-4 underline decoration-4 underline-offset-4">Create New Poll</h3>
                            <input
                                type="text"
                                placeholder="E.g. What framework do you use most?"
                                value={pollQuestion}
                                onChange={e => setPollQuestion(e.target.value)}
                                className="w-full border-2 border-black p-3 font-bold mb-4 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-all"
                            />
                            <div className="space-y-3 mb-4">
                                {pollOptions.map((opt, idx) => (
                                    <div key={idx} className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder={`Option ${idx + 1}`}
                                            value={opt}
                                            onChange={e => {
                                                const newOpts = [...pollOptions];
                                                newOpts[idx] = e.target.value;
                                                setPollOptions(newOpts);
                                            }}
                                            className="flex-1 border-2 border-black p-2 font-bold focus:outline-none focus:bg-yellow-100 transition-colors"
                                        />
                                        {idx > 1 && (
                                            <button
                                                onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))}
                                                className="p-2 bg-red-500 text-white border-2 border-black hover:bg-red-600"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setPollOptions([...pollOptions, ''])}
                                    className="flex items-center gap-1 font-black uppercase text-sm px-4 py-2 bg-black text-white hover:bg-neutral-800 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                >
                                    <Plus className="w-4 h-4" /> Add Option
                                </button>
                                <button
                                    onClick={pushPoll}
                                    className="flex-1 font-black uppercase text-sm px-4 py-2 bg-blue-500 text-black border-2 border-black hover:bg-blue-400 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                >
                                    Push Live
                                </button>
                            </div>
                        </div>

                        {/* Active Poll Card */}
                        {activePoll && (
                            <div className="border-4 border-black bg-yellow-300 p-4 shadow-[4px_4px_0_0_rgba(0,0,0,1)] animate-pulse-slow">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-black uppercase flex items-center gap-2 text-xl">
                                        <span className="w-3 h-3 bg-red-500 rounded-full animate-ping" /> Active Poll
                                    </h3>
                                    <button
                                        onClick={() => closePoll(activePoll._id)}
                                        className="flex items-center gap-1 text-xs font-black uppercase bg-white border-2 border-black px-2 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-red-500 hover:text-white transition-all"
                                    >
                                        Close & Lock
                                    </button>
                                </div>
                                <h4 className="font-black text-lg mb-4">{activePoll.question}</h4>
                                <div className="space-y-3">
                                    {activePoll.options.map((opt, i) => {
                                        const totalVotes = activePoll.options.reduce((sum, o) => sum + o.votes, 0);
                                        const pct = totalVotes === 0 ? 0 : Math.round((opt.votes / totalVotes) * 100);
                                        return (
                                            <div key={i} className="relative">
                                                <div className="flex justify-between font-bold text-sm mb-1">
                                                    <span>{opt.text}</span>
                                                    <span>{pct}% ({opt.votes})</span>
                                                </div>
                                                <div className="h-4 w-full bg-white border-2 border-black overflow-hidden shadow-[2px_2px_0_0_rgba(0,0,0,1)] relative">
                                                    <div
                                                        style={{ width: `${pct}%` }}
                                                        className="h-full bg-black transition-all duration-500"
                                                    />
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Past Polls */}
                        {pastPolls.length > 0 && (
                            <div>
                                <h3 className="font-black uppercase mb-4 text-slate-500">Past Polls</h3>
                                <div className="space-y-4">
                                    {pastPolls.map(p => (
                                        <div key={p._id} className="border-2 border-black bg-slate-200 p-4 opacity-70">
                                            <h4 className="font-black mb-2">{p.question}</h4>
                                            {p.options.map((opt, i) => (
                                                <div key={i} className="flex justify-between text-sm font-bold border-b border-black/10 py-1 last:border-0">
                                                    <span>{opt.text}</span>
                                                    <span>{opt.votes} votes</span>
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                    </div>
                </section>

            </main>
        </div>
    );
};

export default HostLivePanel;
