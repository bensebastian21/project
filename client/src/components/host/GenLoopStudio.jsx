import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Calendar, MapPin, Users, Loader2, Image as ImageIcon, Send, RefreshCw, Trophy, Target } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../../utils/api';

const GenLoopStudio = ({ onPublish, onCancel }) => {
    const [idea, setIdea] = useState({
        title: '',
        topic: '',
        targetAudience: '',
        venue: ''
    });

    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedContent, setGeneratedContent] = useState(null);

    const handleGenerate = async () => {
        if (!idea.title || !idea.topic) {
            toast.error("Title and Topic are required to generate an event.");
            return;
        }

        setIsGenerating(true);
        try {
            const res = await api.post('/api/genloop/generate', idea);
            setGeneratedContent(res.data);
            toast.success("AI Generation Complete!");
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.msg || "AI Generation failed. Ensure the Python microservice is running.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handlePublish = async () => {
        if (!generatedContent) return;

        try {
            // Transform GenLoop output into standard Event payload
            const eventPayload = {
                title: generatedContent.title || idea.title,
                category: "GenLoop AI", // Defaulting for simple integration
                date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Dummy +7 days
                location: idea.venue,
                description: generatedContent.description_html,
                shortDescription: generatedContent.short_description || generatedContent.description_html.substring(0, 150),
                tags: generatedContent.keywords,
                ai: {
                    posterUrl: generatedContent.poster_base64,
                    generatedDescription: generatedContent.description_html,
                    engagementScore: generatedContent.engagement_score,
                    keywords: generatedContent.keywords
                },
                gamificationRewards: generatedContent.suggested_rewards,
                capacity: 100
            };

            onPublish(eventPayload);
        } catch (error) {
            toast.error("Failed to publish event.");
        }
    };

    return (
        <div className="w-full h-full bg-white border-4 border-black shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] p-8 flex flex-col md:flex-row gap-8">

            {/* Left Column: Input Idea */}
            <div className="w-full md:w-1/3 flex flex-col gap-6">
                <div>
                    <h2 className="text-3xl font-black uppercase text-black flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-black text-white flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(200,200,200,1)]">
                            <Sparkles className="w-6 h-6" />
                        </div>
                        GenLoop Studio
                    </h2>
                    <p className="text-slate-600 font-bold uppercase text-xs tracking-widest">
                        AI-Powered Viral Event Generator
                    </p>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-black uppercase mb-1">Catchy Title <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            placeholder="e.g. Next-Gen Hackathon 2026"
                            value={idea.title}
                            onChange={e => setIdea({ ...idea, title: e.target.value })}
                            className="w-full p-3 border-2 border-black bg-neutral-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] uppercase font-bold focus:outline-none focus:translate-y-[2px] focus:translate-x-[2px] focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black uppercase mb-1 flex items-center gap-1"><Target className="w-3 h-3" /> Core Topic <span className="text-red-500">*</span></label>
                        <textarea
                            placeholder="e.g. Building AI tools with React and Python"
                            value={idea.topic}
                            onChange={e => setIdea({ ...idea, topic: e.target.value })}
                            className="w-full p-3 border-2 border-black bg-neutral-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] resize-none h-24 font-medium focus:outline-none focus:translate-y-[2px] focus:translate-x-[2px] focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-sm transition-all"
                        />
                    </div>
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-xs font-black uppercase mb-1 flex items-center gap-1"><Users className="w-3 h-3" /> Audience</label>
                            <input
                                type="text"
                                placeholder="e.g. CS Freshmen"
                                value={idea.targetAudience}
                                onChange={e => setIdea({ ...idea, targetAudience: e.target.value })}
                                className="w-full p-2 border-2 border-black bg-neutral-50 text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs font-black uppercase mb-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> Venue</label>
                            <input
                                type="text"
                                placeholder="e.g. Library Rm 4"
                                value={idea.venue}
                                onChange={e => setIdea({ ...idea, venue: e.target.value })}
                                className="w-full p-2 border-2 border-black bg-neutral-50 text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none"
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-auto flex gap-4">
                    <button
                        onClick={onCancel}
                        className="flex-1 px-4 py-3 bg-white border-2 border-black text-black font-black uppercase tracking-widest hover:bg-neutral-100 transition-colors"
                    >
                        Back
                    </button>
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="flex-shrink-0 px-6 py-3 bg-blue-600 border-2 border-black text-white font-black uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-blue-700 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isGenerating ? (
                            <><RefreshCw className="w-5 h-5 animate-spin" /> Cooking AI...</>
                        ) : (
                            <><Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" /> Generate</>
                        )}
                    </button>
                </div>
            </div>

            {/* Right Column: Output Preview */}
            <div className="w-full md:w-2/3 border-2 border-black bg-neutral-50 p-6 flex flex-col relative overflow-hidden">
                {/* Background Grid Pattern */}
                <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, black 1px, transparent 0)', backgroundSize: '20px 20px' }} />

                {!generatedContent && !isGenerating ? (
                    <div className="m-auto text-center z-10">
                        <div className="w-24 h-24 bg-white border-4 border-black rounded-full mx-auto mb-6 flex items-center justify-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] animate-bounce">
                            <Sparkles className="w-10 h-10 text-black" />
                        </div>
                        <h3 className="text-2xl font-black uppercase tracking-tighter text-black mb-2">Waiting for Input</h3>
                        <p className="text-slate-500 font-bold max-w-sm mx-auto uppercase text-xs">GenLoop uses a local LLM and Latent Consistency Model to generate high-converting posters and copy.</p>
                    </div>
                ) : isGenerating ? (
                    <div className="m-auto text-center z-10 flex flex-col items-center">
                        <Loader2 className="w-16 h-16 text-blue-600 animate-spin mb-4" />
                        <h3 className="text-xl font-black uppercase tracking-widest text-black animate-pulse">Synthesizing...</h3>
                        <p className="text-xs text-slate-500 font-mono mt-2 uppercase">Running CPU Inference (Expect 1-2 mins for Poster Generation)</p>
                    </div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="z-10 h-full flex flex-col"
                    >
                        <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-black border-dashed">
                            <div>
                                <span className="px-2 py-1 bg-black text-white text-[10px] font-black uppercase tracking-widest">Viral Predictor</span>
                                <div className="flex items-end gap-2 mt-1">
                                    <h3 className="text-4xl font-black uppercase tracking-tighter text-blue-600">
                                        {generatedContent.engagement_score}
                                    </h3>
                                    <span className="text-black font-bold mb-1">/ 100</span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {generatedContent.keywords.map((kw, i) => (
                                    <span key={i} className="px-3 py-1 border-2 border-black bg-yellow-200 text-black text-xs font-bold uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                        #{kw}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-6 flex-1 overflow-hidden">
                            {/* Poster */}
                            <div className="w-1/2 flex flex-col">
                                <h4 className="text-xs font-black uppercase mb-2 flex items-center gap-1"><ImageIcon className="w-3 h-3" /> Event Poster</h4>
                                <div className="flex-1 border-4 border-black bg-neutral-200 relative overflow-hidden group shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                                    <img
                                        src={generatedContent.poster_base64}
                                        alt="AI Generated"
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                    />
                                    <div className="absolute top-2 right-2 bg-black text-white text-[9px] font-black uppercase px-2 py-1 shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">AI Generated</div>
                                </div>
                            </div>

                            {/* Description & Gamification */}
                            <div className="w-1/2 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
                                <div>
                                    <h4 className="text-xs font-black uppercase mb-1">Generated Title</h4>
                                    <p className="text-lg font-black uppercase text-black mb-4">{generatedContent.title}</p>

                                    <h4 className="text-xs font-black uppercase mb-1">Viral Hook (Short)</h4>
                                    <p className="text-sm font-bold text-slate-700 bg-white p-2 border-2 border-black mb-4">{generatedContent.short_description}</p>

                                    <h4 className="text-xs font-black uppercase mb-2">Promotional Copy (Full)</h4>
                                    <div className="p-4 border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] prose prose-sm max-w-none text-black selection:bg-black selection:text-white"
                                        dangerouslySetInnerHTML={{ __html: generatedContent.description_html }}
                                    />
                                </div>
                                <div>
                                    <h4 className="text-xs font-black uppercase mb-2 flex items-center gap-1"><Trophy className="w-3 h-3" /> Recommended Gamification</h4>
                                    <div className="flex flex-col gap-2">
                                        {generatedContent.suggested_rewards.map((rew, i) => (
                                            <div key={i} className="p-2 border-2 border-black bg-green-100 flex items-center gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                                <Target className="w-4 h-4 text-green-700" />
                                                <span className="text-xs font-bold uppercase text-green-900">{rew}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t-2 border-black/10 flex justify-end">
                            <button
                                onClick={handlePublish}
                                className="px-8 py-3 bg-black text-white font-black uppercase tracking-widest shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:bg-neutral-800 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all flex items-center gap-2 text-sm"
                            >
                                <Send className="w-4 h-4" /> Publish Event
                            </button>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default GenLoopStudio;
