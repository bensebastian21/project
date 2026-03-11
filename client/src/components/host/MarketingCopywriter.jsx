import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Sparkles,
    Copy,
    Twitter,
    Instagram,
    Linkedin,
    Send,
    RefreshCw,
    Check,
    Calendar,
    Clock,
    Terminal
} from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../../utils/api';

const MarketingCopywriter = ({ events = [] }) => {
    const [form, setForm] = useState({
        title: '',
        date: '',
        time: '',
        topic: ''
    });
    const [selectedEventId, setSelectedEventId] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [copiedField, setCopiedField] = useState(null);

    const handleCopy = (text, field) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        toast.success('Copied to clipboard!');
        setTimeout(() => setCopiedField(null), 2000);
    };

    const handleEventSelect = (e) => {
        const evId = e.target.value;
        setSelectedEventId(evId);
        if (!evId) {
            setForm({ title: '', date: '', time: '', topic: '' });
            return;
        }
        const ev = events.find(x => x._id === evId);
        if (ev) {
            let d = '';
            let t = '';
            if (ev.date) {
                const dateObj = new Date(ev.date);
                if (!isNaN(dateObj)) {
                    d = dateObj.toISOString().split('T')[0];
                    t = dateObj.toTimeString().slice(0, 5); // HH:MM
                }
            }
            setForm({
                ...form,
                title: ev.title || '',
                date: d,
                time: t,
                topic: ev.description || ev.shortDescription || ''
            });
        }
    };


    const handleGenerate = async () => {
        if (!form.topic) {
            toast.error('Please provide a topic or description.');
            return;
        }
        setLoading(true);
        try {
            const { data } = await api.post('/api/marketing/generate', form);
            setResult(data);
            toast.success('Marketing copy generated!');
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.error || 'Failed to generate copy.');
        } finally {
            setLoading(false);
        }
    };

    const NeubrutalistInput = ({ label, icon: Icon, ...props }) => (
        <div className="flex flex-col gap-2">
            <label className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                {Icon && <Icon className="w-3 h-3" />}
                {label}
            </label>
            <input
                {...props}
                className="w-full p-4 border-4 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all outline-none font-bold"
            />
        </div>
    );

    const ResultCard = ({ title, content, icon: Icon, color = "bg-white", fieldId }) => (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-6 border-4 border-black ${color} shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative group`}
        >
            <div className="flex justify-between items-start mb-4">
                <h4 className="text-sm font-black uppercase tracking-tighter flex items-center gap-2">
                    {Icon && <Icon className="w-4 h-4" />}
                    {title}
                </h4>
                <button
                    onClick={() => handleCopy(content, fieldId)}
                    className="p-2 border-2 border-black bg-white hover:bg-neutral-100 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[1px] active:translate-y-[1px]"
                >
                    {copiedField === fieldId ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </button>
            </div>
            <p className="font-bold text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
        </motion.div>
    );

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-8 flex flex-col lg:flex-row gap-12">
            {/* Input Section */}
            <div className="w-full lg:w-1/3 flex flex-col gap-8">
                <div>
                    <h2 className="text-4xl font-black uppercase tracking-tighter flex items-center gap-3">
                        <div className="w-12 h-12 bg-black text-white flex items-center justify-center border-4 border-black shadow-[4px_4px_0px_0px_rgba(200,200,200,1)]">
                            <Sparkles className="w-8 h-8" />
                        </div>
                        AI Copywriter
                    </h2>
                    <p className="mt-4 font-bold text-slate-500 uppercase text-xs tracking-[0.2em]">
                        Supercharge your event marketing with generic AI
                    </p>
                </div>

                <div className="flex flex-col gap-6">
                    {events && events.length > 0 && (
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                <Sparkles className="w-3 h-3" />
                                Select Existing Event
                            </label>
                            <select
                                value={selectedEventId}
                                onChange={handleEventSelect}
                                className="w-full p-4 border-4 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all outline-none font-bold cursor-pointer"
                            >
                                <option value="">-- Start from scratch --</option>
                                {events.map(ev => (
                                    <option key={ev._id} value={ev._id}>{ev.title}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <NeubrutalistInput
                        label="Event Title (Optional)"
                        placeholder="e.g. Neo-Design Summit"
                        value={form.title}
                        onChange={e => setForm({ ...form, title: e.target.value })}
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <NeubrutalistInput
                            label="Date"
                            type="date"
                            icon={Calendar}
                            value={form.date}
                            onChange={e => setForm({ ...form, date: e.target.value })}
                        />
                        <NeubrutalistInput
                            label="Time"
                            type="time"
                            icon={Clock}
                            value={form.time}
                            onChange={e => setForm({ ...form, time: e.target.value })}
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                            <Terminal className="w-3 h-3" />
                            Event Topic/Details
                        </label>
                        <textarea
                            placeholder="What is the event about? Who is it for?"
                            value={form.topic}
                            onChange={e => setForm({ ...form, topic: e.target.value })}
                            className="w-full h-40 p-4 border-4 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all outline-none font-bold resize-none"
                        />
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={loading}
                        className="w-full py-5 bg-black text-white text-xl font-black uppercase tracking-widest shadow-[8px_8px_0px_0px_rgba(0,0,0,0.2)] hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-1 hover:-translate-y-1 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        {loading ? (
                            <RefreshCw className="w-6 h-6 animate-spin" />
                        ) : (
                            <Send className="w-6 h-6" />
                        )}
                        {loading ? 'Thinking...' : 'Generate Copy'}
                    </button>
                </div>
            </div>

            {/* Results Section */}
            <div className="w-full lg:w-2/3 flex flex-col gap-8">
                {!result && !loading && (
                    <div className="h-full min-h-[400px] border-4 border-dashed border-black/20 flex flex-col items-center justify-center p-12 text-center opacity-40">
                        <Sparkles className="w-24 h-24 mb-6" />
                        <h3 className="text-2xl font-black uppercase">Ready to Write</h3>
                        <p className="font-bold">Input your details on the left and let AI do the heavy lifting.</p>
                    </div>
                )}

                {loading && (
                    <div className="h-full min-h-[400px] flex flex-col items-center justify-center animate-pulse">
                        <div className="w-24 h-24 bg-black/10 rounded-full flex items-center justify-center mb-6">
                            <RefreshCw className="w-12 h-12 animate-spin text-black" />
                        </div>
                        <h3 className="text-2xl font-black uppercase">Synthesizing Copy...</h3>
                        <p className="font-mono text-xs uppercase tracking-widest mt-2">Connecting to Neural Engine</p>
                    </div>
                )}

                {result && (
                    <div className="flex flex-col gap-8">
                        {/* Titles Section */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {result.titles.map((t, i) => (
                                <ResultCard
                                    key={i}
                                    title={`Headline ${i + 1}`}
                                    content={t}
                                    fieldId={`title-${i}`}
                                    color="bg-yellow-200"
                                />
                            ))}
                        </div>

                        {/* Description Section */}
                        <ResultCard
                            title="Promotional Description"
                            content={result.description}
                            fieldId="desc"
                            color="bg-white"
                        />

                        {/* Social Posts Section */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <ResultCard
                                title="Twitter"
                                icon={Twitter}
                                content={result.socialPosts.twitter}
                                fieldId="tw"
                                color="bg-sky-200"
                            />
                            <ResultCard
                                title="Instagram"
                                icon={Instagram}
                                content={result.socialPosts.instagram}
                                fieldId="ig"
                                color="bg-pink-200"
                            />
                            <ResultCard
                                title="LinkedIn"
                                icon={Linkedin}
                                content={result.socialPosts.linkedin}
                                fieldId="li"
                                color="bg-blue-200"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MarketingCopywriter;
