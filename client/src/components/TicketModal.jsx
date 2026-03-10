import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { X, Download, Share2, Ticket } from 'lucide-react';
import api from '../utils/api';

const TicketModal = ({ isOpen, onClose, eventId }) => {
  const [ticketData, setTicketData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && eventId) {
      setLoading(true);
      setError(null);
      api
        .get(`/api/host/public/events/${eventId}/ticket`)
        .then((res) => {
          setTicketData(res.data);
          setLoading(false);
        })
        .catch((err) => {
          console.error('Failed to load ticket', err);
          setError('Failed to load ticket. Please try again.');
          setLoading(false);
        });
    }
  }, [isOpen, eventId]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-2xl w-full max-w-sm overflow-hidden relative border-2 border-black"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Minimalist Black */}
        <div className="bg-black p-6 text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="w-12 h-12 bg-white flex items-center justify-center mx-auto mb-3 rounded-full border-2 border-transparent">
            <Ticket className="w-6 h-6 text-black" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-widest uppercase">Event Pass</h2>
          <p className="text-neutral-400 text-xs font-bold uppercase tracking-wider mt-1">
            Scan at entrance
          </p>
        </div>

        {/* Ticket Content */}
        <div className="p-8 flex flex-col items-center bg-white relative">
          {/* Dashed Line Separator */}
          <div className="absolute top-0 left-4 right-4 border-t-2 border-dashed border-slate-300"></div>
          {/* Semi-circles for ticket tear effect */}
          <div className="absolute top-0 left-0 w-4 h-4 bg-black rounded-br-full -mt-2 -ml-2"></div>
          <div className="absolute top-0 right-0 w-4 h-4 bg-black rounded-bl-full -mt-2 -mr-2"></div>

          {loading ? (
            <div className="py-10 flex flex-col items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber-500 border-t-transparent mb-4"></div>
              <p className="text-amber-600 font-bold text-xs uppercase tracking-widest animate-pulse">
                Generating Ticket...
              </p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-red-500 text-3xl mb-4">⚠️</div>
              <p className="text-slate-700 font-bold text-sm">{error}</p>
            </div>
          ) : ticketData ? (
            <>
              {/* QR Code Section */}
              <div className="bg-white p-3 rounded-lg border-2 border-black shadow-[4px_4px_0px_0px_rgba(245,158,11,1)] mb-6 transition-transform hover:scale-105 duration-300">
                <img
                  src={ticketData.qrCodeUrl}
                  alt="Event QR Ticket"
                  className="w-40 h-40 object-contain mix-blend-multiply"
                />
              </div>

              <div className="text-center w-full space-y-4">
                <div>
                  <h3 className="text-lg font-black text-black uppercase tracking-tight leading-tight line-clamp-2">
                    {ticketData.eventTitle}
                  </h3>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <div className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wider rounded">
                      {new Date(ticketData.eventDate).toLocaleDateString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                    <div className="px-2 py-0.5 bg-neutral-100 text-neutral-600 text-[10px] font-bold uppercase tracking-wider rounded">
                      {new Date(ticketData.eventDate).toLocaleTimeString(undefined, {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>

                {/* Attendee Details Box */}
                <div className="bg-neutral-50 border-2 border-dashed border-neutral-300 p-4 w-full flex flex-col gap-3 relative group hover:border-amber-400 transition-colors">
                  <div className="flex justify-between items-center text-xs">
                    <div className="text-left z-10">
                      <div className="text-neutral-400 uppercase tracking-widest font-bold text-[10px] mb-1 group-hover:text-amber-600 transition-colors">
                        Attendee
                      </div>
                      <div className="font-bold text-black uppercase tracking-wide text-sm">
                        {ticketData.studentName}
                      </div>
                    </div>
                    <div className="h-8 w-[2px] bg-neutral-200 group-hover:bg-amber-200 transition-colors"></div>
                    <div className="text-right z-10">
                      <div className="text-neutral-400 uppercase tracking-widest font-bold text-[10px] mb-1 group-hover:text-amber-600 transition-colors">
                        Status
                      </div>
                      <div className="font-bold text-green-600 uppercase tracking-wide flex items-center gap-1 justify-end">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        Confirmed
                      </div>
                    </div>
                  </div>

                  {ticketData.squadName && (
                    <div className="border-t-[1px] border-neutral-200 pt-2 flex justify-between items-center z-10">
                      <div className="text-left">
                        <div className="text-amber-600 uppercase tracking-widest font-bold text-[10px] mb-0.5">
                          Squad
                        </div>
                        <div className="font-black text-black text-xs uppercase">
                          {ticketData.squadName}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 w-full">
                  {/* High-Res PDF Download */}
                  <button
                    onClick={async () => {
                      try {
                        const response = await api.get(
                          `/api/host/public/events/${eventId}/ticket/pdf`,
                          {
                            responseType: 'blob',
                          }
                        );

                        // Create blob link to download
                        const url = window.URL.createObjectURL(new Blob([response.data]));
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `Ticket-${ticketData.eventTitle.replace(/\s+/g, '_')}.pdf`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        window.URL.revokeObjectURL(url);
                      } catch (err) {
                        console.error('Download error:', err);
                        // Try to read error message from blob if possible, or fallback to status text
                        let msg = 'Download failed';
                        if (err.response?.data instanceof Blob) {
                          const text = await err.response.data.text();
                          try {
                            msg = JSON.parse(text).error;
                          } catch (_) {
                            msg = text;
                          }
                        } else if (err.response?.data?.error) {
                          msg = err.response.data.error;
                        }
                        // If it's a 404, it might be the route or the event/registration check
                        if (err.response?.status === 404)
                          msg += ' (Not Found - Check registration)';
                        alert(`Failed to download ticket: ${msg}`);
                      }
                    }}
                    className="w-full py-3 bg-black text-white font-bold text-xs uppercase tracking-widest hover:bg-amber-500 hover:text-black transition-all border-2 border-transparent shadow-lg flex items-center justify-center gap-2 group"
                  >
                    <Download className="w-4 h-4 group-hover:-translate-y-1 transition-transform" />
                    Download PDF Ticket
                  </button>

                  {/* Image Save (Legacy/Quick) */}
                  <button
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = ticketData.qrCodeUrl;
                      link.download = `qr-ticket-${eventId}.png`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="w-full py-2 bg-white text-black font-bold text-[10px] uppercase tracking-widest hover:bg-neutral-100 transition-all border-2 border-black flex items-center justify-center gap-2"
                  >
                    Save QR Code Only
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default TicketModal;
