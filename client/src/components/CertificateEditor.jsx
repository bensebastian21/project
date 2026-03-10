import React, { useState, useEffect, useRef } from 'react';
import {
  Save,
  Upload,
  Image as ImageIcon,
  Settings,
  Eye,
  ZoomIn,
  ZoomOut,
  QrCode,
  Award,
} from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../utils/api';
import config from '../config';

const bearer = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const toAbsoluteUrl = (u) => {
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;
  return `${config.apiBaseUrl.replace(/\/$/, '')}${u.startsWith('/') ? '' : '/'}${u}`;
};

export default function CertificateEditor({ events }) {
  const [selectedEventId, setSelectedEventId] = useState('');
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // File upload state for instant feedback before saving to the server
  const [uploadingBg, setUploadingBg] = useState(false);
  const [uploadingSig, setUploadingSig] = useState(false);

  // Completed events only
  const completedEvents = events.filter((e) => e.isCompleted);

  // Default coordinate structure
  const defaultElements = {
    studentName: { x: 50, y: 40, fontSize: 32, color: '#000000', visible: true },
    eventName: { x: 50, y: 55, fontSize: 24, color: '#000000', visible: true },
    date: { x: 50, y: 65, fontSize: 18, color: '#000000', visible: true },
    signature: { x: 80, y: 80, fontSize: 100, color: '#000000', visible: true }, // fontSize serves as width for images
    qrCode: { x: 20, y: 80, fontSize: 100, color: '#000000', visible: true },
  };

  useEffect(() => {
    if (selectedEventId) {
      loadTemplate(selectedEventId);
    } else {
      setTemplate(null);
    }
  }, [selectedEventId]);

  const loadTemplate = async (eventId) => {
    setLoading(true);
    try {
      const res = await api.get(`/api/host/events/${eventId}/certificate`, { headers: bearer() });
      if (res.data && res.data._id) {
        setTemplate(res.data);
      } else {
        // Initialize with default state
        setTemplate({
          backgroundUrl: '',
          signatureUrl: '',
          studentName: { ...defaultElements.studentName },
          eventName: { ...defaultElements.eventName },
          date: { ...defaultElements.date },
          signature: { ...defaultElements.signature },
          qrCode: { ...defaultElements.qrCode },
        });
      }
    } catch (e) {
      toast.error('Failed to load template');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedEventId || !template) return;
    setSaving(true);
    try {
      await api.post(`/api/host/events/${selectedEventId}/certificate`, template, {
        headers: bearer(),
      });
      toast.success('Certificate template saved!');
    } catch (e) {
      toast.error('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleAssetUpload = async (file, type) => {
    if (!file || !selectedEventId) return;

    const formData = new FormData();
    formData.append('file', file);

    const setLoader = type === 'backgroundUrl' ? setUploadingBg : setUploadingSig;
    setLoader(true);

    try {
      const res = await api.post(
        `/api/host/events/${selectedEventId}/certificate/upload`,
        formData,
        {
          headers: {
            ...bearer(),
            'Content-Type': 'multipart/form-data', // Multer handles this
          },
        }
      );
      setTemplate((prev) => ({ ...prev, [type]: res.data.url }));
      toast.success(
        `${type === 'backgroundUrl' ? 'Background' : 'Signature'} uploaded successfully`
      );
    } catch (e) {
      toast.error('Failed to upload image');
    } finally {
      setLoader(false);
    }
  };

  const handleElementChange = (elementKey, field, value) => {
    setTemplate((prev) => ({
      ...prev,
      [elementKey]: {
        ...prev[elementKey],
        [field]: value,
      },
    }));
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 h-full">
      {/* Sidebar Controls */}
      <div className="w-full md:w-96 flex flex-col gap-6 bg-white border-2 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-h-[calc(100vh-10rem)] overflow-y-auto">
        <div className="border-b-2 border-black pb-4">
          <h2 className="text-xl font-black uppercase tracking-wide flex items-center gap-2 mb-4">
            <Settings className="w-5 h-5" /> Designer
          </h2>
          <label className="block text-xs font-bold uppercase mb-2">Select Completed Event</label>
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="w-full p-3 border-2 border-black bg-neutral-50 outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:-translate-y-1 transition-all"
          >
            <option value="">-- Choose Event --</option>
            {completedEvents.map((e) => (
              <option key={e._id} value={e._id}>
                {e.title}
              </option>
            ))}
          </select>
          {completedEvents.length === 0 && (
            <p className="text-xs text-red-600 mt-2 font-bold uppercase">
              No completed events available. Finish an event and mark it complete first.
            </p>
          )}
        </div>

        {selectedEventId && template && !loading && (
          <>
            {/* Global Assets */}
            <div className="space-y-4 border-b-2 border-black pb-6 mt-2">
              <h3 className="text-sm font-black uppercase flex items-center gap-2">
                <ImageIcon className="w-4 h-4" /> Assets
              </h3>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase flex justify-between">
                  Background Template{' '}
                  {uploadingBg && <span className="text-blue-500 animate-pulse">Uploading...</span>}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={template.backgroundUrl || 'No background'}
                    className="flex-1 p-2 border-2 border-neutral-300 bg-neutral-100 text-xs font-mono"
                  />
                  <label className="cursor-pointer bg-black text-white px-3 border-2 border-black flex items-center hover:bg-neutral-800 transition-colors">
                    <Upload className="w-4 h-4" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleAssetUpload(e.target.files[0], 'backgroundUrl')}
                    />
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase flex justify-between">
                  Authorized Signature{' '}
                  {uploadingSig && (
                    <span className="text-blue-500 animate-pulse">Uploading...</span>
                  )}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={template.signatureUrl || 'No signature'}
                    className="flex-1 p-2 border-2 border-neutral-300 bg-neutral-100 text-xs font-mono"
                  />
                  <label className="cursor-pointer bg-black text-white px-3 border-2 border-black flex items-center hover:bg-neutral-800 transition-colors">
                    <Upload className="w-4 h-4" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleAssetUpload(e.target.files[0], 'signatureUrl')}
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Elements */}
            <div className="space-y-6 mt-2">
              <h3 className="text-sm font-black uppercase flex items-center gap-2">
                <Eye className="w-4 h-4" /> Layout Components
              </h3>

              {[
                { key: 'studentName', label: 'Student Name Element' },
                { key: 'eventName', label: 'Event Name Element' },
                { key: 'date', label: 'Date Element' },
                { key: 'signature', label: 'Signature Element' },
                { key: 'qrCode', label: 'QR Code Element' },
              ].map(({ key, label }) => {
                const el = template[key];
                if (!el) return null;
                return (
                  <div key={key} className="p-3 bg-neutral-50 border-2 border-black">
                    <div className="flex items-center justify-between mb-3 border-b-2 border-neutral-200 pb-2">
                      <span className="text-xs font-bold uppercase">{label}</span>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={el.visible}
                          onChange={(e) => handleElementChange(key, 'visible', e.target.checked)}
                          className="accent-black w-4 h-4"
                        />
                        <span className="text-xs font-bold">Show</span>
                      </label>
                    </div>

                    <div
                      className={`space-y-3 transition-opacity ${!el.visible ? 'opacity-40 pointer-events-none' : ''}`}
                    >
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold uppercase mb-1 block text-slate-500">
                            Left Position (X %)
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={el.x}
                            onChange={(e) => handleElementChange(key, 'x', Number(e.target.value))}
                            className="w-full accent-black"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase mb-1 block text-slate-500">
                            Top Position (Y %)
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={el.y}
                            onChange={(e) => handleElementChange(key, 'y', Number(e.target.value))}
                            className="w-full accent-black"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold uppercase mb-1 block text-slate-500">
                            Scale / Size
                          </label>
                          <input
                            type="number"
                            min="8"
                            max="400"
                            value={el.fontSize}
                            onChange={(e) =>
                              handleElementChange(key, 'fontSize', Number(e.target.value))
                            }
                            className="w-full border-2 border-black px-2 py-1 text-xs outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase mb-1 block text-slate-500">
                            Color
                          </label>
                          <input
                            type="color"
                            value={el.color}
                            onChange={(e) => handleElementChange(key, 'color', e.target.value)}
                            className="w-full h-7 border-2 border-black cursor-pointer p-0"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="mt-4 w-full py-4 bg-blue-600 text-white font-black uppercase tracking-widest border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-blue-700 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all disabled:opacity-50 disabled:bg-neutral-600 flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" /> {saving ? 'Saving...' : 'Save Template'}
            </button>
          </>
        )}
      </div>

      {/* Preview Canvas */}
      <div className="flex-1 bg-neutral-100 border-2 border-black p-4 md:p-8 overflow-hidden min-h-[500px] flex items-center justify-center relative shadow-[inset_0px_0px_20px_0px_rgba(0,0,0,0.1)]">
        {loading ? (
          <div className="text-xl font-bold uppercase animate-pulse">Loading Workspace...</div>
        ) : !selectedEventId ? (
          <div className="text-center">
            <Award className="w-16 h-16 mx-auto mb-4 text-neutral-300" />
            <h3 className="text-xl font-black uppercase text-neutral-400">
              Select an event to begin
            </h3>
          </div>
        ) : (
          <div
            className="relative w-full aspect-video bg-[#0B1437] border-2 border-black shadow-[16px_16px_0px_0px_rgba(0,0,0,0.2)] overflow-hidden flex-shrink-0"
            style={{ maxWidth: '900px' }}
          >
            {/* Gold border decoration preview */}
            <div className="absolute inset-[10px] border-2 border-[#C9A84C] pointer-events-none z-20" />
            <div className="absolute left-0 top-0 bottom-0 w-2 bg-[#C9A84C] z-20" />
            {template?.backgroundUrl ? (
              <img
                src={toAbsoluteUrl(template.backgroundUrl)}
                className="absolute inset-0 w-full h-full object-cover z-0"
                alt="Background"
              />
            ) : (
              <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center pointer-events-none z-0 opacity-20">
                <ImageIcon className="w-16 h-16 mb-3 text-[#C9A84C]" />
                <span className="font-black uppercase tracking-widest text-[#C9A84C] text-xs">
                  Upload custom background
                </span>
              </div>
            )}

            {/* Canvas Elements overlay */}
            {template && (
              <div className="absolute inset-0 z-10 pointer-events-none">
                {template.studentName?.visible && (
                  <div
                    className="absolute font-serif whitespace-nowrap transform -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: `${template.studentName.x}%`,
                      top: `${template.studentName.y}%`,
                      fontSize: `${template.studentName.fontSize}px`,
                      color: template.studentName.color,
                    }}
                  >
                    John Doe (Sample)
                  </div>
                )}

                {template.eventName?.visible && (
                  <div
                    className="absolute font-sans font-bold whitespace-nowrap transform -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: `${template.eventName.x}%`,
                      top: `${template.eventName.y}%`,
                      fontSize: `${template.eventName.fontSize}px`,
                      color: template.eventName.color,
                    }}
                  >
                    {events.find((e) => e._id === selectedEventId)?.title || 'Selected Event'}
                  </div>
                )}

                {template.date?.visible && (
                  <div
                    className="absolute font-mono whitespace-nowrap transform -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: `${template.date.x}%`,
                      top: `${template.date.y}%`,
                      fontSize: `${template.date.fontSize}px`,
                      color: template.date.color,
                    }}
                  >
                    October 24, 2026
                  </div>
                )}

                {template.signature?.visible && (
                  <div
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 border-2 border-dashed border-red-400 bg-red-50/50 flex flex-col justify-center items-center"
                    style={{
                      left: `${template.signature.x}%`,
                      top: `${template.signature.y}%`,
                      width: `${template.signature.fontSize}px`,
                      height: `${template.signature.fontSize / 2}px`,
                    }}
                  >
                    {template.signatureUrl ? (
                      <img
                        src={toAbsoluteUrl(template.signatureUrl)}
                        alt="Signature"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-[10px] font-bold text-red-700 uppercase">
                        Signature
                      </span>
                    )}
                  </div>
                )}

                {template.qrCode?.visible && (
                  <div
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 border-2 border-dashed border-blue-400 bg-blue-50/50 flex flex-col justify-center items-center"
                    style={{
                      left: `${template.qrCode.x}%`,
                      top: `${template.qrCode.y}%`,
                      width: `${template.qrCode.fontSize}px`,
                      height: `${template.qrCode.fontSize}px`,
                    }}
                  >
                    <QrCode className="w-1/2 h-1/2 text-blue-800" />
                    <span className="text-[10px] font-bold text-blue-800 mt-1 uppercase">QR</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
