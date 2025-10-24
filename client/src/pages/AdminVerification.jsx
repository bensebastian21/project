// src/pages/AdminVerification.jsx
import React, { useEffect, useMemo, useState } from "react";
import config from "../config";

function buildFileUrl(p) {
  if (!p) return "";
  // Normalize to relative uploads path if absolute
  const idx = p.lastIndexOf("uploads");
  const rel = idx >= 0 ? p.slice(idx).replace(/\\/g, "/") : p.replace(/\\/g, "/");
  return `${config.apiBaseUrl}/${rel}`;
}

function useAuthToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("auth_token") ||
    ""
  );
}

export default function AdminVerification() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reasonById, setReasonById] = useState({});
  const token = useAuthToken();

  const headers = useMemo(() => ({
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }), [token]);

  const fetchPending = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${config.apiBaseUrl}/api/auth/admin/verification/student-ids?status=pending`, {
        headers,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      setError(err.message || "Failed to load pending");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const approve = async (userId) => {
    try {
      const res = await fetch(`${config.apiBaseUrl}/api/auth/admin/verification/student-id/${userId}/approve`, {
        method: "PUT",
        headers,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      await fetchPending();
    } catch (err) {
      alert(`Approve failed: ${err.message}`);
    }
  };

  const reject = async (userId) => {
    try {
      const reason = reasonById[userId] || "";
      const res = await fetch(`${config.apiBaseUrl}/api/auth/admin/verification/student-id/${userId}/reject`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setReasonById((prev) => ({ ...prev, [userId]: "" }));
      await fetchPending();
    } catch (err) {
      alert(`Reject failed: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Student ID Verification</h1>
        <div className="flex justify-between items-center mb-4">
          <p className="text-gray-400">Pending users awaiting manual review</p>
          <button className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded" onClick={fetchPending} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
        {error && (
          <div className="mb-4 p-3 bg-red-900/40 border border-red-700 rounded text-red-200">{error}</div>
        )}
        {items.length === 0 && !loading && (
          <div className="text-gray-400">No pending submissions.</div>
        )}
        <div className="grid grid-cols-1 gap-4">
          {items.map((u) => {
            const studentIdUrl = buildFileUrl(u.studentIdPath);
            const secondDocUrl = buildFileUrl(u.secondDocPath);
            return (
              <div key={u._id || u.id || `${u.email}-${u.createdAt}`} className="bg-gray-800/60 border border-gray-700 rounded p-4">
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <div className="font-semibold text-lg">{u.fullname}</div>
                    <div className="text-gray-400 text-sm">{u.institute}</div>
                    <div className="text-gray-500 text-sm">{u.email} {u.phone ? `• ${u.phone}` : ""}</div>
                    {u.ocrMismatch ? (
                      <div className="mt-1 inline-block text-xs px-2 py-1 rounded bg-yellow-900/40 border border-yellow-700 text-yellow-200">
                        OCR mismatch flagged
                      </div>
                    ) : null}
                  </div>
                  <div className="flex gap-3 items-start">
                    {studentIdUrl ? (
                      <a href={studentIdUrl} target="_blank" rel="noreferrer" className="block">
                        <img src={studentIdUrl} alt="Student ID" className="w-24 h-24 object-cover rounded border border-gray-600" onError={(e)=>{ e.currentTarget.style.display='none'; }} />
                        <div className="text-xs text-blue-300 hover:underline mt-1">Open ID</div>
                      </a>
                    ) : (
                      <div className="text-xs text-gray-500">No ID file</div>
                    )}
                    {secondDocUrl ? (
                      <a href={secondDocUrl} target="_blank" rel="noreferrer" className="block">
                        <img src={secondDocUrl} alt="Second Doc" className="w-24 h-24 object-cover rounded border border-gray-600" onError={(e)=>{ /* show link if not image */ e.currentTarget.style.display='none'; }} />
                        <div className="text-xs text-blue-300 hover:underline mt-1">Open Doc</div>
                      </a>
                    ) : (
                      <div className="text-xs text-gray-500">No second doc</div>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex flex-col md:flex-row gap-2 md:items-center">
                  <input
                    className="flex-1 p-2 rounded bg-gray-900 border border-gray-700"
                    placeholder="Reason (for rejection)"
                    value={reasonById[u._id] || reasonById[u.id] || ""}
                    onChange={(e)=> setReasonById((prev)=> ({ ...prev, [u._id || u.id]: e.target.value }))}
                  />
                  <div className="flex gap-2">
                    <button className="px-3 py-2 bg-green-600 hover:bg-green-700 rounded" onClick={()=> approve(u._id || u.id)}>Approve</button>
                    <button className="px-3 py-2 bg-red-600 hover:bg-red-700 rounded" onClick={()=> reject(u._id || u.id)}>Reject</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
