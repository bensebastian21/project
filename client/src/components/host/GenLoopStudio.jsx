import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, MapPin, Users, Loader2, Image as ImageIcon, Send, RefreshCw,
         Trophy, Target, ChevronDown, ChevronUp, Calendar, Clock, UserCheck, Hash } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../../utils/api';
import config from '../../config';

// Strip HTML tags to plain text
const stripHtml = (html) => {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
};

// Resolve relative server paths to full URLs
const resolveMediaUrl = (url) => {
  if (!url) return url;
  if (url.startsWith('http') || url.startsWith('data:')) return url;
  const serverBase = (config.apiBaseUrl || '').replace(/\/api$/, '');
  return `${serverBase}${url}`;
};

// ── Validation ────────────────────────────────────────────────────────────────
const validateField = (field, value, idea) => {
  const v = String(value ?? '').trim();
  switch (field) {
    case 'title':
      return v.length >= 3 ? '' : 'Title must be at least 3 characters';
    case 'topic':
      return v.length >= 10 ? '' : 'Topic must be at least 10 characters';
    case 'venue':
      return v.length >= 2 ? '' : 'Venue is required';
    case 'target_audience':
      return v.length >= 2 ? '' : 'Target audience is required';
    case 'eventDate': {
      if (!v) return 'Event date is required';
      const d = new Date(v);
      return d > new Date() ? '' : 'Event date must be in the future';
    }
    case 'eventTime':
      return v ? '' : 'Start time is required';
    case 'registrationDeadline': {
      if (!v) return '';
      if (!idea?.eventDate) return '';
      const deadline = new Date(v);
      const eventDate = new Date(`${idea.eventDate}T${idea.eventTime || '00:00'}`);
      return deadline < eventDate ? '' : 'Deadline must be before the event date';
    }
    case 'capacity': {
      const n = parseInt(v);
      return !isNaN(n) && n >= 1 ? '' : 'Capacity must be at least 1';
    }
    case 'teamSize': {
      if (idea?.eventType !== 'team') return '';
      const n = parseInt(v);
      return !isNaN(n) && n >= 2 && n <= 20 ? '' : 'Team size must be between 2 and 20';
    }
    default:
      return '';
  }
};

const REQUIRED_FIELDS = ['title', 'topic', 'venue', 'target_audience', 'eventDate', 'eventTime', 'capacity'];

// ── Shared style helpers ──────────────────────────────────────────────────────
const inputCls = (err) =>
  `w-full p-2 border-2 ${err ? 'border-red-500' : 'border-black'} bg-neutral-50 text-xs font-medium shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:translate-y-[1px] focus:translate-x-[1px] focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all`;
const LABEL_CLS = 'block text-[10px] font-black uppercase mb-1 text-black';
const ErrorMsg = ({ msg }) => msg ? <p className="text-red-600 font-bold text-[10px] mt-1 uppercase">{msg}</p> : null;

// Returns today's date as YYYY-MM-DD
const todayStr = () => new Date().toISOString().slice(0, 10);

// Returns now as YYYY-MM-DDTHH:MM (for datetime-local min)
const nowDateTimeStr = () => {
  const d = new Date();
  return d.toISOString().slice(0, 16);
};

const GenLoopStudio = ({ onPublish, onCancel }) => {
    const [idea, setIdea] = useState({
        title: '', topic: '', target_audience: '', venue: '',
        tone: 'Professional', eventDate: '', eventTime: '',
        registrationDeadline: '', eventType: 'solo', teamSize: '',
        capacity: '100', category: 'Hackathon', imageStyle: 'Vibrant',
    });

    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});
    const [variantCount, setVariantCount] = useState(1);
    const [isGenerating, setIsGenerating] = useState(false);
    const [pipelineStage, setPipelineStage] = useState('idle');
    const [generatedContent, setGeneratedContent] = useState(null);
    const [variants, setVariants] = useState([]);
    const [runId, setRunId] = useState(null);
    const [loopIteration, setLoopIteration] = useState(null);
    const [expandedVariants, setExpandedVariants] = useState({});
    const stageTimers = React.useRef([]);

    // ── Validation helpers ────────────────────────────────────────────────────
    const validate = (field, value) => validateField(field, value, idea);

    const handleChange = (field, value) => {
        const updated = { ...idea, [field]: value };
        setIdea(updated);
        if (touched[field]) {
            setErrors(prev => ({ ...prev, [field]: validateField(field, value, updated) }));
        }
        // Re-validate deadline when date/time changes
        if ((field === 'eventDate' || field === 'eventTime') && touched['registrationDeadline']) {
            setErrors(prev => ({ ...prev, registrationDeadline: validateField('registrationDeadline', updated.registrationDeadline, updated) }));
        }
    };

    const handleBlur = (field) => {
        setTouched(prev => ({ ...prev, [field]: true }));
        setErrors(prev => ({ ...prev, [field]: validate(field, idea[field]) }));
    };

    const handleFocus = (field) => {
        setTouched(prev => ({ ...prev, [field]: true }));
        setErrors(prev => ({ ...prev, [field]: validate(field, idea[field]) }));
    };

    const validateAll = () => {
        const fields = [...REQUIRED_FIELDS, ...(idea.eventType === 'team' ? ['teamSize'] : [])];
        const newErrors = {};
        fields.forEach(f => {
            const err = validateField(f, idea[f], idea);
            if (err) newErrors[f] = err;
        });
        setErrors(newErrors);
        setTouched(Object.fromEntries(fields.map(f => [f, true])));
        return Object.keys(newErrors).length === 0;
    };

    // ── Pipeline ──────────────────────────────────────────────────────────────
    const clearStageTimers = () => { stageTimers.current.forEach(t => clearTimeout(t)); stageTimers.current = []; };

    const handleGenerate = async () => {
        if (!validateAll()) {
            toast.error('Please fix the form errors before generating.');
            return;
        }
        clearStageTimers();
        setIsGenerating(true);
        setPipelineStage('generating-text');
        stageTimers.current.push(setTimeout(() => setPipelineStage('generating-image'), 3000));
        stageTimers.current.push(setTimeout(() => setPipelineStage('scoring'), 8000));
        try {
            const res = await api.post('/api/genloop/generate', { ...idea, variantCount }, { timeout: 600000 });
            clearStageTimers();
            setPipelineStage('done');
            const data = res.data;
            if (data.variants && Array.isArray(data.variants)) {
                setVariants(data.variants);
                setGeneratedContent(data.variants[0]);
                setRunId(data.runId || null);
                setLoopIteration(data.loopIteration || null);
            } else {
                setVariants([data]);
                setGeneratedContent(data);
            }
            toast.success('AI Generation Complete!');
        } catch (error) {
            clearStageTimers();
            setPipelineStage('idle');
            toast.error(error.response?.data?.msg || 'AI Generation failed.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handlePublish = async (variant) => {
        const v = variant || generatedContent;
        if (!v) return;
        try {
            let posterUrl = v.posterUrl || v.poster_base64;
            if (v.variantId && posterUrl && !posterUrl.startsWith('http') && !posterUrl.startsWith('data:')) {
                try {
                    const uploadRes = await api.post(`/api/genloop/upload-poster/${v.variantId}`);
                    posterUrl = uploadRes.data.cloudinaryUrl || posterUrl;
                } catch (e) { console.warn('Cloudinary upload failed:', e.message); }
            }
            const textCopy = v.textCopy || {};
            const eventPayload = {
                title: textCopy.title || v.title || idea.title,
                category: idea.category || 'GenLoop AI',
                date: idea.eventDate
                    ? new Date(`${idea.eventDate}T${idea.eventTime || '09:00'}`).toISOString()
                    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                registrationDeadline: idea.registrationDeadline || null,
                location: idea.venue,
                description: stripHtml(textCopy.descriptionHtml || v.description_html || ''),
                shortDescription: textCopy.shortHook || v.short_description || '',
                tags: textCopy.keywords || v.keywords || [],
                eventType: idea.eventType,
                teamSize: idea.eventType === 'team' ? parseInt(idea.teamSize) || 2 : 1,
                capacity: parseInt(idea.capacity) || 100,
                ai: {
                    posterUrl,
                    generatedDescription: stripHtml(textCopy.descriptionHtml || v.description_html),
                    engagementScore: v.predictedViralScore || v.engagement_score,
                    keywords: textCopy.keywords || v.keywords,
                },
                gamificationRewards: v.textCopy?.gamificationRewards || v.suggested_rewards,
            };
            onPublish(eventPayload);
        } catch (error) {
            toast.error('Failed to publish event.');
        }
    };

    const toggleVariantExpand = (idx) =>
        setExpandedVariants(prev => ({ ...prev, [idx]: !prev[idx] }));

    // ── Sub-components ────────────────────────────────────────────────────────
    const PipelineStageIndicator = () => {
        if (pipelineStage === 'idle' || pipelineStage === 'done') return null;
        const labels = { 'generating-text': 'Generating copy...', 'generating-image': 'Generating poster...', 'scoring': 'Scoring variants...' };
        return (
            <div className="flex items-center gap-2 mt-3 text-xs font-bold uppercase text-blue-700">
                <Loader2 className="w-4 h-4 animate-spin" /><span>{labels[pipelineStage]}</span>
            </div>
        );
    };

    const DescriptionBlock = ({ html }) => (
        <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">{stripHtml(html)}</p>
    );

    const SingleVariantDisplay = ({ v }) => (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="z-10 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4 pb-4 border-b-2 border-black border-dashed">
                <div>
                    <span className="px-2 py-1 bg-black text-white text-[10px] font-black uppercase tracking-widest">Viral Score</span>
                    <div className="flex items-end gap-2 mt-1">
                        <h3 className="text-4xl font-black uppercase tracking-tighter text-blue-600">{v.predictedViralScore ?? v.engagement_score}</h3>
                        <span className="text-black font-bold mb-1">/ 100</span>
                    </div>
                </div>
                <div className="flex gap-2 flex-wrap justify-end">
                    {((v.textCopy?.keywords) || v.keywords || []).map((kw, i) => (
                        <span key={i} className="px-2 py-0.5 border-2 border-black bg-yellow-200 text-black text-[10px] font-bold uppercase">#{kw}</span>
                    ))}
                </div>
            </div>
            <div className="flex gap-6 flex-1 overflow-hidden">
                <div className="w-1/2 flex flex-col">
                    <h4 className="text-[10px] font-black uppercase mb-2 flex items-center gap-1"><ImageIcon className="w-3 h-3" /> Poster</h4>
                    <div className="flex-1 border-4 border-black bg-neutral-200 relative overflow-hidden group shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                        <img src={resolveMediaUrl(v.posterUrl || v.poster_base64)} alt="AI Generated" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                        <div className="absolute top-2 right-2 bg-black text-white text-[9px] font-black uppercase px-2 py-1">AI Generated</div>
                    </div>
                </div>
                <div className="w-1/2 flex flex-col gap-3 overflow-y-auto pr-1 custom-scrollbar">
                    <div>
                        <h4 className="text-[10px] font-black uppercase mb-1">Title</h4>
                        <p className="text-base font-black uppercase text-black">{v.textCopy?.title || v.title}</p>
                    </div>
                    <div>
                        <h4 className="text-[10px] font-black uppercase mb-1">Viral Hook</h4>
                        <p className="text-xs font-bold text-slate-700 bg-white p-2 border-2 border-black">{v.textCopy?.shortHook || v.short_description}</p>
                    </div>
                    <div>
                        <h4 className="text-[10px] font-black uppercase mb-1">Description</h4>
                        <div className="p-3 border-2 border-black bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                            <DescriptionBlock html={v.textCopy?.descriptionHtml || v.description_html} />
                        </div>
                    </div>
                    {v.textCopy?.callToAction && (
                        <div>
                            <h4 className="text-[10px] font-black uppercase mb-1">Call to Action</h4>
                            <p className="text-xs font-black text-white bg-blue-600 p-2 border-2 border-black uppercase tracking-wide">{v.textCopy.callToAction}</p>
                        </div>
                    )}
                    {(v.textCopy?.gamificationRewards || v.suggested_rewards || []).length > 0 && (
                        <div>
                            <h4 className="text-[10px] font-black uppercase mb-1 flex items-center gap-1"><Trophy className="w-3 h-3" /> Gamification Rewards</h4>
                            {(v.textCopy?.gamificationRewards || v.suggested_rewards || []).map((rew, i) => (
                                <div key={i} className="p-2 border-2 border-black bg-green-100 flex items-center gap-2 mb-1">
                                    <Target className="w-3 h-3 text-green-700 flex-shrink-0" />
                                    <span className="text-[10px] font-bold uppercase text-green-900">{rew}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    {v.textCopy?.badges?.length > 0 && (
                        <div>
                            <h4 className="text-[10px] font-black uppercase mb-1">Badges</h4>
                            <div className="flex flex-wrap gap-1">
                                {v.textCopy.badges.map((b, i) => (
                                    <span key={i} className="px-2 py-0.5 border-2 border-black bg-purple-100 text-purple-900 text-[10px] font-bold uppercase">🏅 {b}</span>
                                ))}
                            </div>
                        </div>
                    )}
                    {v.textCopy?.urgencyTriggers?.length > 0 && (
                        <div>
                            <h4 className="text-[10px] font-black uppercase mb-1">Urgency Triggers</h4>
                            <div className="flex flex-wrap gap-1">
                                {v.textCopy.urgencyTriggers.map((u, i) => (
                                    <span key={i} className="px-2 py-0.5 border-2 border-red-500 bg-red-50 text-red-700 text-[10px] font-bold uppercase">⚡ {u}</span>
                                ))}
                            </div>
                        </div>
                    )}
                    {v.textCopy?.targetAudienceInsight && (
                        <div>
                            <h4 className="text-[10px] font-black uppercase mb-1">Audience Insight</h4>
                            <p className="text-xs text-slate-600 italic bg-yellow-50 border-2 border-yellow-300 p-2">{v.textCopy.targetAudienceInsight}</p>
                        </div>
                    )}
                </div>
            </div>
            <div className="mt-4 pt-4 border-t-2 border-black/10 flex justify-end gap-3">
                <button onClick={handleGenerate} className="px-5 py-2.5 bg-white border-2 border-black text-black font-black uppercase text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" /> Regenerate
                </button>
                <button onClick={() => handlePublish(v)} className="px-6 py-2.5 bg-black text-white font-black uppercase text-xs shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:bg-neutral-800 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center gap-2">
                    <Send className="w-4 h-4" /> Publish Event
                </button>
            </div>
        </motion.div>
    );

    const MultiVariantGrid = ({ variantList }) => (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="z-10 h-full flex flex-col">
            {loopIteration && (
                <div className="mb-3 flex items-center gap-2">
                    <span className="px-2 py-1 bg-blue-600 text-white text-[10px] font-black uppercase">Loop #{loopIteration}</span>
                    {runId && <span className="text-[10px] font-mono text-slate-400 uppercase">Run: {runId.slice(0, 8)}...</span>}
                </div>
            )}
            <div className="grid grid-cols-2 gap-4 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                {variantList.map((v, idx) => (
                    <div key={v.variantId || idx} className="border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between px-3 py-2 border-b-2 border-black bg-neutral-50">
                            <span className="text-[10px] font-black uppercase bg-black text-white px-2 py-0.5">Variant {idx + 1}</span>
                            <span className="text-[10px] font-black uppercase bg-blue-100 border border-blue-400 text-blue-700 px-2 py-0.5">{v.predictedViralScore ?? '—'} / 100</span>
                        </div>
                        <div className="relative h-32 bg-neutral-200 overflow-hidden">
                            {(v.posterUrl || v.poster_base64) ? (
                                <img src={resolveMediaUrl(v.posterUrl || v.poster_base64)} alt={`Variant ${idx + 1}`} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-neutral-400"><ImageIcon className="w-8 h-8" /></div>
                            )}
                        </div>
                        <div className="px-3 py-2 flex-1">
                            <p className="text-xs font-bold text-slate-700 line-clamp-3">{v.textCopy?.shortHook || v.short_description || ''}</p>
                        </div>
                        {expandedVariants[idx] && (
                            <div className="px-3 pb-2 border-t border-dashed border-black/20">
                                <div className="mt-2"><DescriptionBlock html={v.textCopy?.descriptionHtml || v.description_html || ''} /></div>
                                {v.textCopy?.callToAction && (
                                    <p className="mt-2 text-[10px] font-black text-white bg-blue-600 px-2 py-1 border border-black uppercase">{v.textCopy.callToAction}</p>
                                )}
                                {v.textCopy?.badges?.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1">
                                        {v.textCopy.badges.map((b, i) => (
                                            <span key={i} className="px-1.5 py-0.5 border border-black bg-purple-100 text-purple-900 text-[9px] font-bold uppercase">🏅 {b}</span>
                                        ))}
                                    </div>
                                )}
                                {v.textCopy?.urgencyTriggers?.length > 0 && (
                                    <div className="mt-1 flex flex-wrap gap-1">
                                        {v.textCopy.urgencyTriggers.map((u, i) => (
                                            <span key={i} className="px-1.5 py-0.5 border border-red-400 bg-red-50 text-red-700 text-[9px] font-bold uppercase">⚡ {u}</span>
                                        ))}
                                    </div>
                                )}
                                {v.textCopy?.targetAudienceInsight && (
                                    <p className="mt-2 text-[9px] text-slate-600 italic bg-yellow-50 border border-yellow-300 px-2 py-1">{v.textCopy.targetAudienceInsight}</p>
                                )}
                            </div>
                        )}
                        <div className="flex gap-2 px-3 py-2 border-t-2 border-black bg-neutral-50">
                            <button onClick={() => toggleVariantExpand(idx)} className="flex-1 py-1.5 text-[10px] font-black uppercase border-2 border-black bg-white hover:bg-neutral-100 flex items-center justify-center gap-1 transition-colors">
                                {expandedVariants[idx] ? <><ChevronUp className="w-3 h-3" /> Collapse</> : <><ChevronDown className="w-3 h-3" /> View Full</>}
                            </button>
                            {idx === 0 && (
                                <button onClick={() => handlePublish(v)} className="flex-1 py-1.5 text-[10px] font-black uppercase border-2 border-black bg-black text-white hover:bg-neutral-800 flex items-center justify-center gap-1 transition-colors">
                                    <Send className="w-3 h-3" /> Publish
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            <div className="mt-4 pt-4 border-t-2 border-black/10 flex justify-end">
                <button onClick={handleGenerate} className="px-5 py-2.5 bg-white border-2 border-black text-black font-black uppercase text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" /> Regenerate
                </button>
            </div>
        </motion.div>
    );

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="w-full bg-white border-4 border-black shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row" style={{ height: 'calc(100vh - 12rem)', minHeight: 640 }}>

            {/* ── Left: Form ── */}
            <div className="w-full md:w-[42%] flex flex-col border-r-4 border-black" style={{ overflowY: 'auto' }}>
                {/* Header */}
                <div className="px-6 pt-6 pb-4 border-b-2 border-black">
                    <h2 className="text-2xl font-black uppercase text-black flex items-center gap-3">
                        <div className="w-9 h-9 bg-black text-white flex items-center justify-center">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        AI Event Studio
                    </h2>
                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">AI-Powered Event Content Generator</p>
                </div>

                <div className="px-6 py-4 flex flex-col gap-4 flex-1">

                    {/* Title */}
                    <div>
                        <label className={LABEL_CLS}>Catchy Title <span className="text-red-500">*</span></label>
                        <input type="text" placeholder="e.g. Next-Gen Hackathon 2026"
                            value={idea.title}
                            onChange={e => handleChange('title', e.target.value)}
                            onBlur={() => handleBlur('title')}
                            onFocus={() => handleFocus('title')}
                            className={inputCls(errors.title) + ' uppercase font-bold'} />
                        <ErrorMsg msg={errors.title} />
                    </div>

                    {/* Topic */}
                    <div>
                        <label className={LABEL_CLS + ' flex items-center gap-1'}><Target className="w-3 h-3" /> Core Topic <span className="text-red-500">*</span></label>
                        <textarea placeholder="e.g. Building AI tools with React and Python"
                            value={idea.topic}
                            onChange={e => handleChange('topic', e.target.value)}
                            onBlur={() => handleBlur('topic')}
                            onFocus={() => handleFocus('topic')}
                            className={inputCls(errors.topic) + ' resize-none h-20'} />
                        <ErrorMsg msg={errors.topic} />
                    </div>

                    {/* Category + Event Type */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={LABEL_CLS + ' flex items-center gap-1'}><Hash className="w-3 h-3" /> Category</label>
                            <select value={idea.category} onChange={e => handleChange('category', e.target.value)}
                                className={inputCls(false) + ' appearance-none cursor-pointer'}>
                                {['Hackathon','Workshop','Seminar','Competition','Networking','Cultural','Sports','Tech Talk','Career Fair','Other'].map(c => (
                                    <option key={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={LABEL_CLS + ' flex items-center gap-1'}><UserCheck className="w-3 h-3" /> Event Type</label>
                            <div className="flex gap-2 mt-1">
                                {['solo','team'].map(t => (
                                    <button key={t} onClick={() => handleChange('eventType', t)}
                                        className={`flex-1 py-1.5 text-[10px] font-black uppercase border-2 border-black transition-all ${idea.eventType === t ? 'bg-black text-white' : 'bg-white text-black'}`}>
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Team size (conditional) */}
                    {idea.eventType === 'team' && (
                        <div>
                            <label className={LABEL_CLS}>Max Team Size <span className="text-red-500">*</span></label>
                            <input type="number" min="2" max="20" placeholder="e.g. 4"
                                value={idea.teamSize}
                                onChange={e => handleChange('teamSize', e.target.value)}
                                onBlur={() => handleBlur('teamSize')}
                                onFocus={() => handleFocus('teamSize')}
                                className={inputCls(errors.teamSize)} />
                            <ErrorMsg msg={errors.teamSize} />
                        </div>
                    )}

                    {/* Date + Time */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={LABEL_CLS + ' flex items-center gap-1'}><Calendar className="w-3 h-3" /> Event Date <span className="text-red-500">*</span></label>
                            <input type="date"
                                min={todayStr()}
                                value={idea.eventDate}
                                onChange={e => handleChange('eventDate', e.target.value)}
                                onBlur={() => handleBlur('eventDate')}
                                onFocus={() => handleFocus('eventDate')}
                                className={inputCls(errors.eventDate)} />
                            <ErrorMsg msg={errors.eventDate} />
                        </div>
                        <div>
                            <label className={LABEL_CLS + ' flex items-center gap-1'}><Clock className="w-3 h-3" /> Start Time <span className="text-red-500">*</span></label>
                            <input type="time"
                                value={idea.eventTime}
                                onChange={e => handleChange('eventTime', e.target.value)}
                                onBlur={() => handleBlur('eventTime')}
                                onFocus={() => handleFocus('eventTime')}
                                className={inputCls(errors.eventTime)} />
                            <ErrorMsg msg={errors.eventTime} />
                        </div>
                    </div>

                    {/* Registration Deadline */}
                    <div>
                        <label className={LABEL_CLS + ' flex items-center gap-1'}><Clock className="w-3 h-3" /> Registration Deadline</label>
                        <input type="datetime-local"
                            min={nowDateTimeStr()}
                            max={idea.eventDate && idea.eventTime ? `${idea.eventDate}T${idea.eventTime}` : idea.eventDate ? `${idea.eventDate}T23:59` : undefined}
                            value={idea.registrationDeadline}
                            onChange={e => handleChange('registrationDeadline', e.target.value)}
                            onBlur={() => handleBlur('registrationDeadline')}
                            onFocus={() => handleFocus('registrationDeadline')}
                            className={inputCls(errors.registrationDeadline)} />
                        <ErrorMsg msg={errors.registrationDeadline} />
                    </div>

                    {/* Audience + Venue */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={LABEL_CLS + ' flex items-center gap-1'}><Users className="w-3 h-3" /> Audience <span className="text-red-500">*</span></label>
                            <input type="text" placeholder="e.g. CS Freshmen"
                                value={idea.target_audience}
                                onChange={e => handleChange('target_audience', e.target.value)}
                                onBlur={() => handleBlur('target_audience')}
                                onFocus={() => handleFocus('target_audience')}
                                className={inputCls(errors.target_audience)} />
                            <ErrorMsg msg={errors.target_audience} />
                        </div>
                        <div>
                            <label className={LABEL_CLS + ' flex items-center gap-1'}><MapPin className="w-3 h-3" /> Venue <span className="text-red-500">*</span></label>
                            <input type="text" placeholder="e.g. Library Rm 4"
                                value={idea.venue}
                                onChange={e => handleChange('venue', e.target.value)}
                                onBlur={() => handleBlur('venue')}
                                onFocus={() => handleFocus('venue')}
                                className={inputCls(errors.venue)} />
                            <ErrorMsg msg={errors.venue} />
                        </div>
                    </div>

                    {/* Capacity */}
                    <div>
                        <label className={LABEL_CLS}>Capacity (seats) <span className="text-red-500">*</span></label>
                        <input type="number" min="1" placeholder="100"
                            value={idea.capacity}
                            onChange={e => handleChange('capacity', e.target.value)}
                            onBlur={() => handleBlur('capacity')}
                            onFocus={() => handleFocus('capacity')}
                            className={inputCls(errors.capacity)} />
                        <ErrorMsg msg={errors.capacity} />
                    </div>

                    {/* Tone */}
                    <div>
                        <label className={LABEL_CLS}>Copy Tone</label>
                        <div className="flex gap-1 mt-1">
                            {['Professional','Hype','Academic'].map(t => (
                                <button key={t} onClick={() => handleChange('tone', t)}
                                    className={`flex-1 py-1.5 text-[9px] font-black uppercase border-2 border-black transition-all ${idea.tone === t ? 'bg-black text-white' : 'bg-white text-black'}`}>
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Image Style */}
                    <div>
                        <label className={LABEL_CLS}>Poster Style</label>
                        <select value={idea.imageStyle} onChange={e => handleChange('imageStyle', e.target.value)}
                            className={inputCls(false) + ' appearance-none cursor-pointer'}>
                            {['Vibrant','Minimalist','Retro','Futuristic','Illustrated','Dark','Neon'].map(s => (
                                <option key={s}>{s}</option>
                            ))}
                        </select>
                    </div>

                    {/* Variants */}
                    <div>
                        <label className={LABEL_CLS}>A/B Variants</label>
                        <select value={variantCount} onChange={e => setVariantCount(Number(e.target.value))}
                            className={inputCls(false) + ' appearance-none cursor-pointer'}>
                            {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} Variant{n > 1 ? 's' : ''}</option>)}
                        </select>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 pb-6 pt-2 border-t-2 border-black flex flex-col gap-2">
                    <div className="flex gap-3">
                        <button onClick={onCancel} className="flex-1 py-3 bg-white border-2 border-black text-black font-black uppercase text-xs hover:bg-neutral-100 transition-colors">
                            Back
                        </button>
                        <button onClick={handleGenerate} disabled={isGenerating}
                            className="flex-[2] py-3 bg-blue-600 border-2 border-black text-white font-black uppercase text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-blue-700 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                            {isGenerating ? <><RefreshCw className="w-4 h-4 animate-spin" /> Generating...</> : <><Sparkles className="w-4 h-4" /> Generate</>}
                        </button>
                    </div>
                    <PipelineStageIndicator />
                </div>
            </div>

            {/* ── Right: Output ── */}
            <div className="w-full md:w-[58%] bg-neutral-50 p-6 flex flex-col relative overflow-hidden" style={{ minHeight: 0 }}>
                <div className="absolute inset-0 opacity-[0.06] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, black 1px, transparent 0)', backgroundSize: '20px 20px' }} />
                {!generatedContent && !isGenerating ? (
                    <div className="m-auto text-center z-10">
                        <div className="w-20 h-20 bg-white border-4 border-black rounded-full mx-auto mb-5 flex items-center justify-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] animate-bounce">
                            <Sparkles className="w-9 h-9 text-black" />
                        </div>
                        <h3 className="text-xl font-black uppercase tracking-tighter text-black mb-2">Waiting for Input</h3>
                        <p className="text-slate-500 font-bold max-w-xs mx-auto uppercase text-[10px]">Fill in the form and hit Generate to create AI-powered event content.</p>
                    </div>
                ) : isGenerating ? (
                    <div className="m-auto text-center z-10 flex flex-col items-center">
                        <Loader2 className="w-14 h-14 text-blue-600 animate-spin mb-4" />
                        <h3 className="text-lg font-black uppercase tracking-widest text-black animate-pulse">Synthesizing...</h3>
                        <p className="text-[10px] text-slate-500 font-mono mt-2 uppercase text-center">Running Multimodal AI Pipeline<br/>(Image generation may take up to 60s)</p>
                    </div>
                ) : variantCount > 1 && variants.length > 1 ? (
                    <MultiVariantGrid variantList={variants} />
                ) : (
                    <SingleVariantDisplay v={generatedContent} />
                )}
            </div>
        </div>
    );
};

export default GenLoopStudio;
