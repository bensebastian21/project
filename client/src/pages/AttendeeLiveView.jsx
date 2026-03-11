import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { toast } from 'react-toastify';
import { ArrowLeft, MessageSquare, BarChart2, ThumbsUp } from 'lucide-react';
import api from '../utils/api';
import config from '../config';

const AttendeeLiveView = () => {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const [socket, setSocket] = useState(null);
    const [qaList, setQaList] = useState([]);
    const [polls, setPolls] = useState([]);
    const [isQaActive, setIsQaActive] = useState(false);
    const [loading, setLoading] = useState(true);
    const [questionText, setQuestionText] = useState('');

    // To track local votes before socket confirms (optimistic UI)
    const [upvotedQuestions, setUpvotedQuestions] = useState(new Set());
    const [votedPolls, setVotedPolls] = useState(new Set());
    const [userId, setUserId] = useState(null);

    useEffect(() => {
        const u = JSON.parse(localStorage.getItem('user') || '{}');
        setUserId(u._id || u.id);

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

        newSocket.on('question_upvoted', ({ questionId, upvotes, upvotedBy }) => {
            setQaList(prev => {
                const updated = prev.map(q => q._id === questionId ? { ...q, upvotes, upvotedBy } : q);
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
            toast.info('A new poll is live!');
        });

        newSocket.on('poll_updated', ({ pollId, options, voters }) => {
            setPolls(prev => prev.map(p => p._id === pollId ? { ...p, options, voters } : p));
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
            setPolls(le.polls ? [...le.polls].reverse() : []);

            const u = JSON.parse(localStorage.getItem('user') || '{}');
            const currentUserId = u._id || u.id;

            // Populate local state for already upvoted/voted items
            const upvoted = new Set();
            (le.qaList || []).forEach(q => {
                if (q.upvotedBy && q.upvotedBy.includes(currentUserId)) {
                    upvoted.add(q._id);
                }
            });
            setUpvotedQuestions(upvoted);

            const voted = new Set();
            (le.polls || []).forEach(p => {
                if (p.voters && p.voters.includes(currentUserId)) {
                    voted.add(p._id);
                }
            });
            setVotedPolls(voted);

        } catch (err) {
            toast.error('Failed to connect to live event');
        } finally {
            setLoading(false);
        }
    };

    const askQuestion = (e) => {
        e.preventDefault();
        if (!questionText.trim()) return;
        socket?.emit('ask_question', { eventId, question: questionText });
        setQuestionText('');
        toast.success('Question submitted!', { icon: '🙌' });
    };

    const upvoteQuestion = (qId) => {
        if (upvotedQuestions.has(qId)) return;
        socket?.emit('upvote_question', { eventId, questionId: qId });
        setUpvotedQuestions(prev => new Set(prev).add(qId));
    };

    const votePoll = (pollId, optionId) => {
        if (votedPolls.has(pollId)) return;
        socket?.emit('vote_poll', { eventId, pollId, optionId });
        setVotedPolls(prev => new Set(prev).add(pollId));
        toast.success('Vote cast!', { icon: '🗳️' });
    };

    if (loading) return <div className="p-10 font-black uppercase text-center mt-20">Connecting to Live Event...</div>;

    const activePoll = polls.find(p => p.isActive);

    return (
        <div className="min-h-screen bg-neutral-100 text-black font-sans pb-20">
            {/* Header */}
            <header className="bg-white border-b-4 border-black p-4 flex items-center gap-4 sticky top-0 z-10 shadow-[0_4px_0_0_rgba(0,0,0,1)]">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="p-2 border-2 border-black bg-neutral-200 hover:bg-neutral-300 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-1">
                    <h1 className="text-xl font-black uppercase tracking-widest flex items-center gap-2">
                        <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" /> Live View
                    </h1>
                </div>
            </header>

            <main className="max-w-xl mx-auto p-4 space-y-8 mt-4">

                {/* Active Poll Section */}
                {activePoll && (
                    <section className="bg-blue-100 border-4 border-black p-5 shadow-[4px_4px_0_0_rgba(0,0,0,1)] animate-fadeIn">
                        <div className="flex items-center gap-2 mb-4 border-b-4 border-black pb-2">
                            <BarChart2 className="w-6 h-6 text-black" />
                            <h2 className="text-xl font-black uppercase tracking-tight">Live Poll</h2>
                        </div>
                        <h3 className="font-bold text-lg mb-4">{activePoll.question}</h3>

                        <div className="space-y-3">
                            {activePoll.options.map((opt, i) => {
                                const totalVotes = activePoll.options.reduce((sum, o) => sum + o.votes, 0);
                                const pct = totalVotes === 0 ? 0 : Math.round((opt.votes / totalVotes) * 100);
                                const hasVoted = votedPolls.has(activePoll._id);

                                return (
                                    <div key={i} className="relative">
                                        {hasVoted ? (
                                            <div>
                                                <div className="flex justify-between font-bold text-sm mb-1 px-1">
                                                    <span>{opt.text}</span>
                                                    <span>{pct}%</span>
                                                </div>
                                                <div className="h-6 w-full bg-white border-2 border-black overflow-hidden relative">
                                                    <div
                                                        style={{ width: `${pct}%` }}
                                                        className="h-full bg-blue-400 border-r-2 border-black transition-all duration-1000"
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => votePoll(activePoll._id, opt._id)}
                                                className="w-full text-left p-3 bg-white border-2 border-black hover:bg-neutral-200 hover:-translate-x-1 hover:-translate-y-1 transition-all shadow-[2px_2px_0_0_rgba(0,0,0,1)] font-bold mb-2 uppercase text-sm"
                                            >
                                                {opt.text}
                                            </button>
                                        )}
                                    </div>
                                )
                            })}
                            {votedPolls.has(activePoll._id) && (
                                <div className="text-center text-xs font-black uppercase tracking-widest mt-4 text-slate-500">
                                    Vote Recorded ✅
                                </div>
                            )}
                        </div>
                    </section>
                )}

                {/* Q&A Section */}
                <section className="bg-yellow-100 border-4 border-black p-5 shadow-[4px_4px_0_0_rgba(0,0,0,1)] flex flex-col min-h-[50vh]">
                    <div className="flex items-center justify-between mb-4 border-b-4 border-black pb-2">
                        <div className="flex items-center gap-2">
                            <MessageSquare className="w-6 h-6 text-black" />
                            <h2 className="text-xl font-black uppercase tracking-tight">Live Q&A</h2>
                        </div>
                        {!isQaActive && (
                            <span className="bg-red-500 text-white text-[10px] font-black uppercase px-2 py-1 border-2 border-black">Offline</span>
                        )}
                    </div>

                    {isQaActive && (
                        <form onSubmit={askQuestion} className="mb-6 flex gap-2">
                            <input
                                type="text"
                                placeholder="Ask the speaker a question..."
                                value={questionText}
                                onChange={e => setQuestionText(e.target.value)}
                                maxLength={200}
                                className="flex-1 bg-white border-2 border-black p-3 font-bold text-sm focus:outline-none focus:ring-4 focus:ring-yellow-300"
                            />
                            <button
                                type="submit"
                                disabled={!questionText.trim()}
                                className="bg-black text-white px-4 py-2 font-black uppercase text-sm border-2 border-black disabled:opacity-50 hover:bg-neutral-800 transition-colors shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
                            >
                                Ask
                            </button>
                        </form>
                    )}

                    <div className="flex-1 space-y-4">
                        {qaList.length === 0 ? (
                            <p className="text-center font-bold text-slate-500 uppercase mt-8">
                                {isQaActive ? "Be the first to ask!" : "Q&A is currently disabled"}
                            </p>
                        ) : (
                            qaList.map(q => {
                                const isMyQuestion = q.studentId === userId;
                                const hasUpvoted = upvotedQuestions.has(q._id);
                                return (
                                    <div key={q._id} className={`bg-white border-2 border-black p-3 shadow-[2px_2px_0_0_rgba(0,0,0,1)] ${q.answered ? 'opacity-60 bg-neutral-200' : ''}`}>
                                        <div className="flex gap-3">
                                            {/* Upvote Column */}
                                            <div className="flex flex-col items-center justify-start">
                                                <button
                                                    onClick={() => upvoteQuestion(q._id)}
                                                    disabled={hasUpvoted || q.answered}
                                                    className={`p-2 border-2 border-black transition-all ${hasUpvoted
                                                        ? 'bg-blue-500 text-white'
                                                        : 'bg-neutral-100 hover:bg-neutral-200'
                                                        }`}
                                                >
                                                    <ThumbsUp className="w-4 h-4" />
                                                </button>
                                                <span className="font-black mt-1 text-sm">{q.upvotes}</span>
                                            </div>

                                            {/* Question Content */}
                                            <div className="flex-1 pt-1">
                                                <p className="font-bold text-sm mb-2">{q.question}</p>
                                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-500">
                                                    <span>{isMyQuestion ? 'You' : q.studentName}</span>
                                                    {q.answered && !q.reply && <span className="text-green-600">Answered ✅</span>}
                                                </div>
                                                {q.answered && q.reply && (
                                                    <div className="mt-3 p-2 bg-green-100 border-2 border-green-600 text-sm font-bold">
                                                        <span className="text-green-800 uppercase text-[10px] block mb-1">Host Reply:</span>
                                                        {q.reply}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </section>

            </main>
        </div>
    );
};

export default AttendeeLiveView;
