import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Star,
  Zap,
  Target,
  Trophy,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Loader,
  BarChart2,
  MessageSquare,
  Award,
  Lightbulb,
  ArrowRight,
} from 'lucide-react';

const SENTIMENT_COLORS = {
  Positive: '#22c55e',
  Neutral: '#94a3b8',
  Negative: '#ef4444',
};

const RATING_COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e'];

const PRIORITY_CONFIG = {
  High: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-400', dot: 'bg-red-500' },
  Medium: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-700',
    border: 'border-yellow-400',
    dot: 'bg-yellow-500',
  },
  Low: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    border: 'border-green-400',
    dot: 'bg-green-500',
  },
};

const CHART_COLORS = ['#000000', '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'];

// -- Subcomponents ----------------------------------------------------------

function ScoreGauge({ score = 50, label = 'Score' }) {
  const clamped = Math.min(100, Math.max(0, score));
  const color = clamped >= 70 ? '#22c55e' : clamped >= 45 ? '#f59e0b' : '#ef4444';
  const rotation = -90 + (clamped / 100) * 180;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-32 h-16 overflow-hidden">
        <div className="absolute inset-0 rounded-t-full border-[12px] border-neutral-200 border-b-0" />
        <div
          className="absolute bottom-0 left-1/2 w-1 h-14 origin-bottom rounded-full transition-all duration-700"
          style={{ background: color, transform: `translateX(-50%) rotate(${rotation}deg)` }}
        />
        <div className="absolute bottom-0 left-1/2 w-3 h-3 rounded-full border-2 border-black bg-white -translate-x-1/2 translate-y-1/2" />
      </div>
      <p className="font-black text-3xl" style={{ color }}>
        {clamped}
      </p>
      <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{label}</p>
    </div>
  );
}

function KeywordChip({ word, type = 'positive' }) {
  const isPos = type === 'positive';
  return (
    <span
      className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-bold border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${isPos ? 'bg-emerald-200 text-emerald-900' : 'bg-red-200 text-red-900'}`}
    >
      {isPos ? '+' : '−'} {word}
    </span>
  );
}

function SuggestionCard({ suggestion, index }) {
  if (!suggestion) return null;
  const text = typeof suggestion === 'string' ? suggestion : suggestion.text;
  const priority = suggestion.priority || 'Medium';
  const cfg = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.Medium;
  return (
    <div
      className={`flex items-start gap-4 p-4 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all`}
    >
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm border-2 border-black shrink-0 ${cfg.bg} ${cfg.text}`}
      >
        {index + 1}
      </div>
      <div className="flex-1">
        <p className="font-bold text-sm text-black leading-snug">{text}</p>
      </div>
      <span
        className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-widest border-2 border-black ${cfg.bg} ${cfg.text} shrink-0`}
      >
        {priority}
      </span>
    </div>
  );
}

function RoadmapStep({ step }) {
  const impactColors = { High: 'bg-red-400', Medium: 'bg-yellow-400', Low: 'bg-green-400' };
  return (
    <div className="flex items-start gap-4 py-3 border-b-2 border-dashed border-black/15 last:border-0">
      <div className="w-7 h-7 bg-black text-white flex items-center justify-center font-black text-sm shrink-0 rounded-sm">
        {step.step}
      </div>
      <p className="flex-1 font-medium text-sm text-black">{step.action}</p>
      <span
        className={`px-2 py-0.5 text-[10px] font-black uppercase border-2 border-black ${impactColors[step.impact] || 'bg-neutral-200'}`}
      >
        {step.impact || 'Med'} impact
      </span>
    </div>
  );
}

function EventCard({ ev, selected, onClick }) {
  const sentPos = ev.sentimentBreakdown?.Positive || 0;
  const sentNeg = ev.sentimentBreakdown?.Negative || 0;
  const total =
    (ev.sentimentBreakdown?.Positive || 0) +
    (ev.sentimentBreakdown?.Neutral || 0) +
    (ev.sentimentBreakdown?.Negative || 0);
  const posPercent = total ? Math.round((sentPos / total) * 100) : 0;
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 border-2 border-black transition-all ${selected ? 'bg-black text-white shadow-[4px_4px_0px_0px_rgba(251,191,36,1)]' : 'bg-white hover:bg-neutral-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'}`}
    >
      <p className={`font-black text-sm truncate ${selected ? 'text-white' : 'text-black'}`}>
        {ev.title}
      </p>
      <div className="flex items-center gap-3 mt-2">
        <span
          className={`flex items-center gap-1 text-xs font-bold ${selected ? 'text-yellow-300' : 'text-amber-600'}`}
        >
          <Star className="w-3 h-3 fill-current" /> {ev.avgRating?.toFixed(1) || '--'}/5
        </span>
        <span className={`text-xs font-bold ${selected ? 'text-slate-300' : 'text-slate-500'}`}>
          {ev.reviewCount} reviews
        </span>
        {total > 0 && (
          <span
            className={`text-[10px] font-black ${posPercent >= 60 ? (selected ? 'text-emerald-300' : 'text-emerald-600') : selected ? 'text-red-300' : 'text-red-600'}`}
          >
            {posPercent}% 😊
          </span>
        )}
      </div>
    </button>
  );
}

// -- Main Component ---------------------------------------------------------

export default function AiFeedbackDashboard({ api, bearer }) {
  const [portfolioData, setPortfolioData] = useState(null);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [portfolioError, setPortfolioError] = useState(null);

  const [selectedEventId, setSelectedEventId] = useState(null);
  const [eventInsights, setEventInsights] = useState(null);
  const [eventInsightsLoading, setEventInsightsLoading] = useState(false);
  const [eventInsightsError, setEventInsightsError] = useState(null);

  const [activeView, setActiveView] = useState('portfolio'); // "portfolio" | "event"

  const loadPortfolio = useCallback(async () => {
    setPortfolioLoading(true);
    setPortfolioError(null);
    try {
      const res = await api.get('/api/reviews/host/ai-portfolio', { headers: bearer() });
      if (res.status === 204) {
        setPortfolioData(null);
      } else {
        setPortfolioData(res.data);
      }
    } catch (err) {
      setPortfolioError('Failed to load portfolio insights.');
      console.error(err);
    } finally {
      setPortfolioLoading(false);
    }
  }, [api, bearer]);

  useEffect(() => {
    loadPortfolio();
  }, [loadPortfolio]);

  const loadEventInsights = useCallback(
    async (eventId) => {
      setEventInsightsLoading(true);
      setEventInsightsError(null);
      setEventInsights(null);
      try {
        const res = await api.get(`/api/reviews/events/${eventId}/reviews/ai-insights`, {
          headers: bearer(),
        });
        if (res.status === 204) {
          setEventInsights({ noData: true });
        } else {
          setEventInsights(res.data);
        }
      } catch (err) {
        setEventInsightsError('Failed to load event AI insights.');
        console.error(err);
      } finally {
        setEventInsightsLoading(false);
      }
    },
    [api, bearer]
  );

  const handleSelectEvent = (ev) => {
    setSelectedEventId(ev._id);
    setActiveView('event');
    loadEventInsights(ev._id);
  };

  const selectedEvent = portfolioData?.events?.find(
    (e) => String(e._id) === String(selectedEventId)
  );

  // Build chart data for the selected event
  const ratingDistData = selectedEvent
    ? [1, 2, 3, 4, 5].map((r) => {
      const count =
        selectedEvent.reviewCount > 0
          ? portfolioData?.events
            ?.find((e) => String(e._id) === String(selectedEvent._id))
            ?.ratingTrend?.filter((rt) => rt.rating === r).length || 0
          : 0;
      return { name: `${r}★`, count };
    })
    : [];

  const sentimentPieData = selectedEvent
    ? Object.entries(selectedEvent.sentimentBreakdown || {})
      .map(([name, value]) => ({ name, value }))
      .filter((d) => d.value > 0)
    : [];

  // Portfolio bar chart data
  const portfolioBarData =
    portfolioData?.events
      ?.filter((ev) => ev.reviewCount > 0)
      .map((ev) => ({
        name: ev.title.length > 20 ? ev.title.slice(0, 18) + '…' : ev.title,
        rating: ev.avgRating,
        reviews: ev.reviewCount,
      })) || [];

  // Portfolio overall sentiment pie
  const portfolioSentimentTotal = { Positive: 0, Neutral: 0, Negative: 0 };
  portfolioData?.events?.forEach((ev) => {
    portfolioSentimentTotal.Positive += ev.sentimentBreakdown?.Positive || 0;
    portfolioSentimentTotal.Neutral += ev.sentimentBreakdown?.Neutral || 0;
    portfolioSentimentTotal.Negative += ev.sentimentBreakdown?.Negative || 0;
  });
  const portfolioSentimentPieData = Object.entries(portfolioSentimentTotal)
    .map(([name, value]) => ({ name, value }))
    .filter((d) => d.value > 0);

  // Radar data for top events
  const radarData =
    portfolioData?.events
      ?.filter((ev) => ev.reviewCount > 0)
      .slice(0, 6)
      .map((ev) => ({
        event: ev.title.length > 14 ? ev.title.slice(0, 12) + '…' : ev.title,
        rating: ev.avgRating,
        reviews: Math.min(ev.reviewCount, 10),
        positivity: ev.sentimentBreakdown?.Positive
          ? Math.round((ev.sentimentBreakdown.Positive / ev.reviewCount) * 10)
          : 0,
      })) || [];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border-2 border-black px-3 py-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <p className="font-black text-xs uppercase">{label}</p>
          {payload.map((entry, i) => (
            <p key={i} className="text-xs font-bold" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // -- LOADING / EMPTY STATES -----------------------------------------------

  if (portfolioLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <Brain className="w-16 h-16 text-yellow-500 animate-pulse" />
        <p className="font-black text-xl uppercase tracking-widest animate-pulse">
          Loading AI Portfolio...
        </p>
        <p className="text-slate-500 font-medium text-sm">Gemini is analyzing your events 🔍</p>
      </div>
    );
  }

  // -- LAYOUT ---------------------------------------------------------------

  return (
    <div className="flex gap-6 animate-fadeIn">
      {/* Left Sidebar — Event List */}
      <div className="w-72 shrink-0 flex flex-col gap-3">
        <div className="bg-black text-white p-4 border-2 border-black shadow-[4px_4px_0px_0px_rgba(251,191,36,1)]">
          <div className="flex items-center gap-2 mb-1">
            <Brain className="w-5 h-5 text-yellow-400" />
            <h2 className="font-black uppercase tracking-widest text-sm">AI Insights</h2>
          </div>
          <p className="text-neutral-400 text-xs font-medium">Gemini-powered feedback analysis</p>
        </div>

        {/* Portfolio button */}
        <button
          onClick={() => {
            setActiveView('portfolio');
            setSelectedEventId(null);
          }}
          className={`w-full text-left p-4 border-2 border-black flex items-center gap-3 font-black text-sm uppercase tracking-widest transition-all ${activeView === 'portfolio' ? 'bg-yellow-400 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]' : 'bg-white hover:bg-yellow-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'}`}
        >
          <BarChart2 className="w-4 h-4" />
          Portfolio Overview
        </button>

        <div className="border-t-2 border-black pt-2">
          <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2 px-1">
            Event Deep-Dive
          </p>
          {!portfolioData?.events?.length ? (
            <p className="text-xs text-slate-400 italic px-2">No events found</p>
          ) : (
            <div className="flex flex-col gap-2 max-h-[calc(100vh-18rem)] overflow-y-auto pr-1">
              {portfolioData.events.map((ev) => (
                <EventCard
                  key={ev._id}
                  ev={ev}
                  selected={String(selectedEventId) === String(ev._id)}
                  onClick={() => handleSelectEvent(ev)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Refresh */}
        <button
          onClick={loadPortfolio}
          className="mt-auto flex items-center justify-center gap-2 w-full py-3 bg-white border-2 border-black text-xs font-black uppercase tracking-widest shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Portfolio
        </button>
      </div>

      {/* Right Main Panel */}
      <div className="flex-1 overflow-y-auto max-h-[calc(100vh-12rem)] pr-1 space-y-6">
        {/* ===== PORTFOLIO VIEW ===== */}
        {activeView === 'portfolio' && (
          <>
            {!portfolioData ? (
              <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-black/20">
                <Brain className="w-16 h-16 text-black/20 mb-4" />
                <p className="font-black text-xl uppercase">No portfolio data</p>
                <p className="text-slate-500 text-sm mt-1 font-medium">
                  Create events and collect reviews to see insights
                </p>
              </div>
            ) : (
              <>
                {/* Score + Summary */}
                {portfolioData.portfolioInsights && (
                  <div className="bg-black text-white border-2 border-black p-6 shadow-[8px_8px_0px_0px_rgba(251,191,36,1)]">
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                      <div className="shrink-0">
                        <ScoreGauge
                          score={portfolioData.portfolioInsights.portfolioScore}
                          label="Portfolio Score"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Brain className="w-6 h-6 text-yellow-400" />
                          <h3 className="font-black uppercase tracking-widest text-lg">
                            AI Portfolio Analysis
                          </h3>
                        </div>
                        <p className="text-neutral-300 font-medium leading-relaxed text-sm">
                          {portfolioData.portfolioInsights.portfolioSummary}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Best / Needs Attention */}
                {portfolioData.portfolioInsights && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-emerald-50 border-2 border-green-600 p-5 shadow-[4px_4px_0px_0px_rgba(22,163,74,1)]">
                      <div className="flex items-center gap-2 mb-2">
                        <Trophy className="w-5 h-5 text-green-700" />
                        <h4 className="font-black uppercase text-green-800 tracking-widest text-sm">
                          Best Performing
                        </h4>
                      </div>
                      <p className="text-green-900 font-medium text-sm leading-relaxed">
                        {portfolioData.portfolioInsights.bestEvent || '—'}
                      </p>
                    </div>
                    <div className="bg-red-50 border-2 border-red-500 p-5 shadow-[4px_4px_0px_0px_rgba(239,68,68,1)]">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-5 h-5 text-red-700" />
                        <h4 className="font-black uppercase text-red-800 tracking-widest text-sm">
                          Needs Attention
                        </h4>
                      </div>
                      <p className="text-red-900 font-medium text-sm leading-relaxed">
                        {portfolioData.portfolioInsights.needsAttentionEvent || '—'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Charts Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Rating per event bar chart */}
                  <div className="bg-white border-2 border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <h4 className="font-black uppercase tracking-widest text-sm mb-4 flex items-center gap-2">
                      <Star className="w-4 h-4 text-yellow-500" /> Avg Rating by Event
                    </h4>
                    {portfolioBarData.length === 0 ? (
                      <p className="text-slate-400 text-xs italic">No data yet</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart
                          data={portfolioBarData}
                          margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#000" strokeOpacity={0.08} />
                          <XAxis
                            dataKey="name"
                            tick={{ fontSize: 9, fontWeight: 'bold' }}
                            stroke="#000"
                          />
                          <YAxis domain={[0, 5]} tick={{ fontSize: 9 }} stroke="#000" />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="rating" fill="#000" name="Avg Rating" radius={[0, 0, 0, 0]}>
                            {portfolioBarData.map((_, i) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                  {/* Portfolio sentiment pie */}
                  <div className="bg-white border-2 border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <h4 className="font-black uppercase tracking-widest text-sm mb-4 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-blue-600" /> Overall Sentiment
                    </h4>
                    {portfolioSentimentPieData.length === 0 ? (
                      <p className="text-slate-400 text-xs italic">No sentiment data yet</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={portfolioSentimentPieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {portfolioSentimentPieData.map((entry, i) => (
                              <Cell
                                key={i}
                                fill={SENTIMENT_COLORS[entry.name] || '#94a3b8'}
                                stroke="#000"
                                strokeWidth={2}
                              />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                          <Legend wrapperStyle={{ fontWeight: 'bold', fontSize: 11 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Radar chart */}
                {radarData.length >= 3 && (
                  <div className="bg-white border-2 border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <h4 className="font-black uppercase tracking-widest text-sm mb-4 flex items-center gap-2">
                      <Target className="w-4 h-4 text-purple-600" /> Event Comparison Radar
                    </h4>
                    <ResponsiveContainer width="100%" height={260}>
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="#000" strokeOpacity={0.12} />
                        <PolarAngleAxis
                          dataKey="event"
                          tick={{ fontSize: 10, fontWeight: 'bold' }}
                        />
                        <PolarRadiusAxis angle={90} domain={[0, 5]} tick={{ fontSize: 8 }} />
                        <Radar
                          name="Avg Rating"
                          dataKey="rating"
                          stroke="#000"
                          fill="#000"
                          fillOpacity={0.15}
                          strokeWidth={2}
                        />
                        <Tooltip content={<CustomTooltip />} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Strengths & Weaknesses */}
                {portfolioData.portfolioInsights && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-emerald-50 border-2 border-green-600 p-5 shadow-[4px_4px_0px_0px_rgba(22,163,74,1)]">
                      <h4 className="font-black uppercase tracking-widest text-green-800 text-sm mb-4 flex items-center gap-2 border-b-2 border-green-600 pb-2">
                        <ThumbsUp className="w-4 h-4" /> Cross-Event Strengths
                      </h4>
                      <ul className="space-y-2">
                        {portfolioData.portfolioInsights.crossEventStrengths?.map((s, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-sm text-green-900 font-medium"
                          >
                            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" /> {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-red-50 border-2 border-red-500 p-5 shadow-[4px_4px_0px_0px_rgba(239,68,68,1)]">
                      <h4 className="font-black uppercase tracking-widest text-red-800 text-sm mb-4 flex items-center gap-2 border-b-2 border-red-500 pb-2">
                        <ThumbsDown className="w-4 h-4" /> Common Weaknesses
                      </h4>
                      <ul className="space-y-2">
                        {portfolioData.portfolioInsights.crossEventWeaknesses?.map((w, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-sm text-red-900 font-medium"
                          >
                            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" /> {w}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Strategic Roadmap */}
                {portfolioData.portfolioInsights?.strategicRoadmap?.length > 0 && (
                  <div className="bg-white border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <h4 className="font-black uppercase tracking-widest text-sm mb-5 flex items-center gap-2 border-b-2 border-black pb-3">
                      <Lightbulb className="w-5 h-5 text-yellow-500" /> Strategic Improvement
                      Roadmap
                    </h4>
                    {portfolioData.portfolioInsights.strategicRoadmap.map((step, i) => (
                      <RoadmapStep key={i} step={step} />
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ===== EVENT DEEP-DIVE VIEW ===== */}
        {activeView === 'event' && selectedEvent && (
          <>
            {/* Event header */}
            <div className="bg-black text-white border-2 border-black p-5 shadow-[6px_6px_0px_0px_rgba(251,191,36,1)] flex items-start justify-between">
              <div>
                <p className="text-yellow-400 text-xs font-black uppercase tracking-widest mb-1">
                  Event Deep-Dive
                </p>
                <h3 className="font-black text-xl">{selectedEvent.title}</h3>
                <p className="text-neutral-400 text-sm mt-1">
                  {selectedEvent.reviewCount} reviews collected
                </p>
              </div>
              <div className="text-right">
                <p className="text-yellow-400 font-black text-3xl">
                  {selectedEvent.avgRating?.toFixed(1)}
                </p>
                <p className="text-neutral-400 text-xs font-bold uppercase">/ 5 stars</p>
              </div>
            </div>

            {eventInsightsLoading && (
              <div className="flex flex-col items-center py-20 gap-4">
                <Brain className="w-12 h-12 text-yellow-500 animate-pulse" />
                <p className="font-black uppercase tracking-widest text-sm animate-pulse">
                  Gemini is generating insights...
                </p>
              </div>
            )}

            {eventInsightsError && (
              <div className="bg-red-50 border-2 border-red-500 p-5 text-red-700 font-bold">
                {eventInsightsError}
              </div>
            )}

            {!eventInsightsLoading && eventInsights?.noData && (
              <div className="flex flex-col items-center py-20 border-2 border-dashed border-black/20">
                <MessageSquare className="w-12 h-12 text-black/20 mb-4" />
                <p className="font-black text-lg uppercase">Not Enough Reviews</p>
                <p className="text-slate-500 text-sm mt-1 font-medium">
                  Need at least 2 text reviews to generate AI insights
                </p>
              </div>
            )}

            {!eventInsightsLoading && eventInsights && !eventInsights?.noData && (
              <>
                {/* Score + Summary Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-yellow-50 border-2 border-black p-5 flex flex-col items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <ScoreGauge score={eventInsights.overallScore || 50} label="Event Score" />
                  </div>
                  <div className="md:col-span-2 bg-white border-2 border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <h4 className="font-black uppercase tracking-widest text-sm mb-3 flex items-center gap-2">
                      <Brain className="w-4 h-4 text-yellow-600" /> AI Executive Summary
                    </h4>
                    <p className="text-black font-medium leading-relaxed text-sm">
                      {eventInsights.overallSentiment}
                    </p>
                  </div>
                </div>

                {/* Rating distribution + Sentiment Pie */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Rating trend line */}
                  <div className="bg-white border-2 border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <h4 className="font-black uppercase tracking-widest text-sm mb-4 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-blue-600" /> Rating Trend
                    </h4>
                    {eventInsights.ratingTrend?.length >= 2 ? (
                      <ResponsiveContainer width="100%" height={180}>
                        <LineChart
                          data={eventInsights.ratingTrend}
                          margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#000" strokeOpacity={0.08} />
                          <XAxis
                            dataKey="index"
                            tick={{ fontSize: 9 }}
                            stroke="#000"
                            label={{
                              value: 'Review #',
                              position: 'insideBottom',
                              offset: -2,
                              fontSize: 9,
                            }}
                          />
                          <YAxis domain={[0, 5]} tick={{ fontSize: 9 }} stroke="#000" />
                          <Tooltip content={<CustomTooltip />} />
                          <Line
                            type="monotone"
                            dataKey="rating"
                            stroke="#000"
                            strokeWidth={2}
                            dot={{ r: 3, fill: '#000' }}
                            name="Rating"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-slate-400 text-xs italic">
                        Need more reviews for trend data
                      </p>
                    )}
                  </div>

                  {/* Sentiment donut */}
                  <div className="bg-white border-2 border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <h4 className="font-black uppercase tracking-widest text-sm mb-4 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-purple-600" /> Sentiment Breakdown
                    </h4>
                    {sentimentPieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                          <Pie
                            data={sentimentPieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={70}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {sentimentPieData.map((entry, i) => (
                              <Cell
                                key={i}
                                fill={SENTIMENT_COLORS[entry.name] || '#94a3b8'}
                                stroke="#000"
                                strokeWidth={2}
                              />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                          <Legend wrapperStyle={{ fontWeight: 'bold', fontSize: 10 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-slate-400 text-xs italic">No sentiment data available</p>
                    )}
                  </div>
                </div>

                {/* Keywords */}
                {(eventInsights.positiveKeywords?.length > 0 ||
                  eventInsights.negativeKeywords?.length > 0) && (
                    <div className="bg-white border-2 border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                      <h4 className="font-black uppercase tracking-widest text-sm mb-4 border-b-2 border-black pb-2">
                        🏷️ Keyword Highlights
                      </h4>
                      {eventInsights.positiveKeywords?.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs font-black uppercase text-emerald-700 mb-2">
                            Positive Themes
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {eventInsights.positiveKeywords.map((kw, i) => (
                              <KeywordChip key={i} word={kw} type="positive" />
                            ))}
                          </div>
                        </div>
                      )}
                      {eventInsights.negativeKeywords?.length > 0 && (
                        <div>
                          <p className="text-xs font-black uppercase text-red-700 mb-2">
                            Areas of Concern
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {eventInsights.negativeKeywords.map((kw, i) => (
                              <KeywordChip key={i} word={kw} type="negative" />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                {/* Positives + Improvements */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-emerald-50 border-2 border-green-600 p-5 shadow-[4px_4px_0px_0px_rgba(22,163,74,1)]">
                    <h4 className="font-black uppercase tracking-widest text-green-800 text-sm mb-4 flex items-center gap-2 border-b-2 border-green-600 pb-2">
                      <ThumbsUp className="w-4 h-4" /> Top Positives
                    </h4>
                    <ul className="space-y-2">
                      {eventInsights.topPositives?.map((p, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-sm text-green-900 font-medium"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 shrink-0" />{' '}
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-red-50 border-2 border-red-500 p-5 shadow-[4px_4px_0px_0px_rgba(239,68,68,1)]">
                    <h4 className="font-black uppercase tracking-widest text-red-800 text-sm mb-4 flex items-center gap-2 border-b-2 border-red-500 pb-2">
                      <Target className="w-4 h-4" /> Areas for Improvement
                    </h4>
                    <ul className="space-y-2">
                      {eventInsights.keyAreasForImprovement?.map((a, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-sm text-red-900 font-medium"
                        >
                          <div className="w-1.5 h-1.5 rounded-sm bg-red-500 mt-2 shrink-0 rotate-45" />{' '}
                          {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Actionable Suggestions */}
                {eventInsights.actionableSuggestions?.length > 0 && (
                  <div className="bg-white border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <h4 className="font-black uppercase tracking-widest text-sm mb-4 flex items-center gap-2 border-b-2 border-black pb-3">
                      <Zap className="w-5 h-5 text-yellow-500" /> Actionable Suggestions
                    </h4>
                    <div className="space-y-3">
                      {eventInsights.actionableSuggestions.map((sug, i) => (
                        <SuggestionCard key={i} suggestion={sug} index={i} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
