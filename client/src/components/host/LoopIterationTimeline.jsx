import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { GitBranch } from 'lucide-react';
import api from '../../utils/api';

const LoopIterationTimeline = ({ eventId }) => {
  const [loopHistory, setLoopHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId) { setLoading(false); return; }
    api.get(`/api/genloop/analytics/${eventId}`)
      .then(res => setLoopHistory(res.data?.loopHistory || []))
      .catch(() => setLoopHistory([]))
      .finally(() => setLoading(false));
  }, [eventId]);

  return (
    <div className="border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white p-6 flex flex-col gap-4">
      <div className="flex items-center gap-3 border-b-2 border-black pb-4">
        <GitBranch className="w-6 h-6" />
        <h2 className="text-xl font-black uppercase tracking-widest">Loop Iteration Timeline</h2>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <span className="text-sm font-black uppercase tracking-widest animate-pulse">Loading...</span>
        </div>
      ) : loopHistory.length === 0 ? (
        <div className="flex items-center justify-center py-12 border-2 border-dashed border-black bg-neutral-50">
          <span className="text-sm font-black uppercase tracking-widest text-slate-400">No loop history yet</span>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={loopHistory} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="loopIteration"
              label={{ value: 'Loop Iteration', position: 'insideBottom', offset: -4, style: { fontWeight: 900, fontSize: 10, textTransform: 'uppercase' } }}
              tick={{ fontWeight: 700, fontSize: 11 }}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontWeight: 700, fontSize: 11 }}
              label={{ value: 'Winner Score', angle: -90, position: 'insideLeft', style: { fontWeight: 900, fontSize: 10, textTransform: 'uppercase' } }}
            />
            <Tooltip
              contentStyle={{ border: '2px solid black', borderRadius: 0, fontWeight: 700, fontSize: 12 }}
              cursor={{ fill: 'rgba(0,0,0,0.05)' }}
            />
            <Bar dataKey="winnerScore" fill="#2563eb" radius={0} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default LoopIterationTimeline;
