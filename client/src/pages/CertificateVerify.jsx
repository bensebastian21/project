// src/pages/CertificateVerify.jsx
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../utils/api";
import config from "../config";
import { CheckCircle, XCircle, Download, ExternalLink } from "lucide-react";

export default function CertificateVerify() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const run = async () => {
      try {
        const res = await api.get(`/api/certificates/verify/${id}`);
        setData(res.data || {});
      } catch (e) {
        setError("Failed to verify certificate");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [id]);

  const toAbsolute = (u) => {
    if (!u) return "";
    if (/^https?:\/\//i.test(u)) return u;
    return `${config.apiBaseUrl.replace(/\/$/, "")}${u.startsWith("/") ? "" : "/"}${u}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-600">Verifying certificate...</div>
      </div>
    );
  }

  const valid = !!data?.valid;
  const certUrl = toAbsolute(data?.url);
  const event = data?.event || {};
  const host = data?.host || {};
  const student = data?.student || {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            {valid ? (
              <CheckCircle className="w-7 h-7 text-green-600" />
            ) : (
              <XCircle className="w-7 h-7 text-red-600" />
            )}
            <h1 className="text-2xl font-bold text-slate-900">Certificate Verification</h1>
          </div>
          {!valid ? (
            <div>
              <p className="text-slate-700">This certificate could not be verified. It may be invalid or revoked.</p>
              {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl">
                  <div className="text-sm text-slate-500">Certificate ID</div>
                  <div className="font-mono text-slate-800 break-all">{data.certificateId}</div>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <div className="text-sm text-slate-500">Issued At</div>
                  <div className="text-slate-800">{data.issuedAt ? new Date(data.issuedAt).toLocaleString() : "--"}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl">
                  <div className="text-sm text-slate-500">Student</div>
                  <div className="text-slate-800">{student.name || "--"}</div>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <div className="text-sm text-slate-500">Event</div>
                  <div className="text-slate-800">{event.title || "--"}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl">
                  <div className="text-sm text-slate-500">Event Date</div>
                  <div className="text-slate-800">{event.endDate || event.date ? new Date(event.endDate || event.date).toLocaleDateString() : "--"}</div>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <div className="text-sm text-slate-500">Host</div>
                  <div className="text-slate-800">{host.name || "--"}</div>
                  {host.institute && <div className="text-slate-600 text-sm">{host.institute}</div>}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                {certUrl && (
                  <a
                    href={certUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
                  >
                    <Download className="w-4 h-4" /> Download PDF
                  </a>
                )}
                <Link to="/dashboard" className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl">
                  <ExternalLink className="w-4 h-4" /> Go to Dashboard
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
