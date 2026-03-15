import React, { useState, useEffect } from 'react';
import { TrendingUp, Eye, MousePointerClick, Share2, UserCheck } from 'lucide-react';
import api from '../../utils/api';

const MetricCard = ({ icon: Icon, label, value }) => (
  <div className="flex-1 border-2 border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center gap-1">
    <Icon className="w-5 h-5 text-black" />
    <span className="text-2xl font-black text-black">{value}</span>
    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</span>
  </div>
);

const ViralLoopAnalyticsPanel = ({ eventId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId) { setLoading(false); return; }
    api.get(`/api/genloop/analytics/${eventId}`)
      .then(res => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [eventId]);

  if (loading) {
    return (
      <div className="border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 bg-white flex items-center justify-center">
        <span className="text-sm font-black uppercase tracking-widest animate-pulse">Loading Analytics...</span>
      </div>
    );
  }

  if (!data || !data.bestVariant) {
    return (
      <div className="border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 bg-white flex items-center justify-center">
        <span className="text-sm font-black uppercase tracking-widest text-slate-400">No generation runs yet</span>
      </div>
    );
  }

  const { bestVariant, totalImpressions, ctr, shareRate, registrationConversion } = data;
  const fmt = (v) => v != null ? `${(v * 100).toFixed(1)}%` : '—';

  return (
    <div className="border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white p-6 flex flex-col gap-6">
      <div className="flex items-center gap-3 border-b-2 border-black pb-4">
        <TrendingUp className="w-6 h-6" />
        <h2 className="text-xl font-black uppercase tracking-widest">Viral Loop Analytics</h2>
      </div>

      {/* Best Viral Score Badge */}
      <div className="flex flex-col items-center gap-2 py-4 border-2 border-black bg-yellow-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Best Viral Score</span>
        <span className="text-6xl font-black text-black">{bestVariant.viralScore ?? '—'}</span>
        <span className="text-xs font-bold uppercase text-slate-500">/ 100</span>
      </div>

      {/* Metrics Row */}
      <div className="flex gap-3">
        <MetricCard icon={Eye} label="Total Impressions" value={totalImpressions ?? '—'} />
        <MetricCard icon={MousePointerClick} label="CTR" value={fmt(ctr)} />
        <MetricCard icon={Share2} label="Share Rate" value={fmt(shareRate)} />
        <MetricCard icon={UserCheck} label="Reg. Conversion" value={fmt(registrationConversion)} />
      </div>
    </div>
  );
};

export default ViralLoopAnalyticsPanel;
