import React, { useEffect, useState } from 'react';
import api from '../../utils/api';

export default function InterestsEditor() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [interests, setInterests] = useState([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const run = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) { setLoading(false); return; }
        const { data } = await api.get('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
        setInterests(Array.isArray(data?.interests) ? data.interests : []);
      } catch (e) {
        setError('Failed to load interests');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const addFromInput = () => {
    const items = input
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .slice(0, 10);
    if (!items.length) return;
    setInterests(prev => Array.from(new Set([...prev, ...items])).slice(0, 50));
    setInput('');
  };

  const remove = (i) => {
    setInterests(prev => prev.filter((_, idx) => idx !== i));
  };

  const save = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      if (!token) { setError('Login required'); return; }
      await api.put('/api/auth/me', { interests }, { headers: { Authorization: `Bearer ${token}` } });
    } catch (e) {
      setError('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-slate-900">Interests</h3>
        <button onClick={save} disabled={saving} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
      </div>
      {loading ? (
        <div className="text-sm text-slate-600">Loading...</div>
      ) : (
        <>
          {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
          <div className="flex flex-wrap gap-2 mb-3">
            {interests.length === 0 ? (
              <div className="text-sm text-slate-600">Add a few interests to improve suggestions</div>
            ) : (
              interests.map((it, idx) => (
                <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs">
                  {it}
                  <button onClick={() => remove(idx)} className="text-blue-600 hover:text-blue-800">×</button>
                </span>
              ))
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e)=>{ if(e.key==='Enter'){ e.preventDefault(); addFromInput(); } }}
              placeholder="Type interests, press Enter or add comma-separated"
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg"
            />
            <button onClick={addFromInput} className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg">Add</button>
          </div>
        </>
      )}
    </div>
  );
}
