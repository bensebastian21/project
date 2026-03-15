import React, { useState, useEffect, useCallback } from 'react';
import { FlaskConical, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../../utils/api';

const CONFIDENCE_STYLES = {
  insufficient_data: 'bg-gray-200 text-gray-700',
  low: 'bg-yellow-200 text-yellow-800',
  medium: 'bg-orange-200 text-orange-800',
  high: 'bg-green-200 text-green-800',
};

const ConfidenceBadge = ({ level }) => (
  <span className={`px-2 py-0.5 text-[10px] font-black uppercase border border-black ${CONFIDENCE_STYLES[level] || CONFIDENCE_STYLES.insufficient_data}`}>
    {level?.replace('_', ' ') || 'N/A'}
  </span>
);

const StatusBadge = ({ status }) => {
  if (status === 'winner') return (
    <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-black uppercase bg-green-300 border border-black">
      <CheckCircle className="w-3 h-3" /> Winner
    </span>
  );
  if (status === 'eliminated') return (
    <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-black uppercase bg-red-300 border border-black">
      <XCircle className="w-3 h-3" /> Eliminated
    </span>
  );
  return null;
};

const fmt = (v) => v != null ? `${(v * 100).toFixed(1)}%` : '—';

const ABTestManager = ({ eventId, runId }) => {
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(null);

  const fetchStatus = useCallback(() => {
    if (!eventId) { setLoading(false); return; }
    api.get(`/api/genloop/ab-status/${eventId}`)
      .then(res => setVariants(res.data?.variants || []))
      .catch(() => setVariants([]))
      .finally(() => setLoading(false));
  }, [eventId]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const handleSelectWinner = async (variantId) => {
    setSelecting(variantId);
    try {
      await api.post(`/api/genloop/select-winner/${variantId}`);
      toast.success('Winner selected!');
      fetchStatus();
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Failed to select winner');
    } finally {
      setSelecting(null);
    }
  };

  return (
    <div className="border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white p-6 flex flex-col gap-4">
      <div className="flex items-center gap-3 border-b-2 border-black pb-4">
        <FlaskConical className="w-6 h-6" />
        <h2 className="text-xl font-black uppercase tracking-widest">A/B Test Manager</h2>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <span className="text-sm font-black uppercase tracking-widest animate-pulse">Loading variants...</span>
        </div>
      ) : variants.length === 0 ? (
        <div className="flex items-center justify-center py-12 border-2 border-dashed border-black bg-neutral-50">
          <span className="text-sm font-black uppercase tracking-widest text-slate-400">No variants available</span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-black text-white">
                {['Variant', 'Viral Score', 'Impressions', 'CTR', 'Share Rate', 'Confidence', 'Status', 'Action'].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-widest border border-black/30">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {variants.map((v, i) => {
                const decided = v.status === 'winner' || v.status === 'eliminated';
                return (
                  <tr key={v.variantId || i} className={`border-b-2 border-black ${i % 2 === 0 ? 'bg-white' : 'bg-neutral-50'}`}>
                    <td className="px-3 py-2 font-black uppercase">{v.variantName || `Variant ${i + 1}`}</td>
                    <td className="px-3 py-2 font-bold">{v.viralScore ?? '—'}</td>
                    <td className="px-3 py-2 font-bold">{v.impressions ?? '—'}</td>
                    <td className="px-3 py-2 font-bold">{fmt(v.ctr)}</td>
                    <td className="px-3 py-2 font-bold">{fmt(v.shareRate)}</td>
                    <td className="px-3 py-2"><ConfidenceBadge level={v.confidence} /></td>
                    <td className="px-3 py-2"><StatusBadge status={v.status} /></td>
                    <td className="px-3 py-2">
                      <button
                        disabled={decided || selecting === v.variantId}
                        onClick={() => handleSelectWinner(v.variantId)}
                        className="px-3 py-1 bg-blue-600 text-white text-[10px] font-black uppercase border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-blue-700 hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0"
                      >
                        {selecting === v.variantId ? 'Saving...' : 'Select Winner'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ABTestManager;
