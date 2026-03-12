import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    QrCode,
    MapPin,
    Calendar,
    ChevronRight,
    ArrowLeft,
    Info,
    Ticket as TicketIcon,
    Search,
    Users
} from 'lucide-react';
import api from '../utils/api';
import { toast } from 'react-toastify';

const TicketWallet = ({ user }) => {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTicket, setSelectedTicket] = useState(null);

    useEffect(() => {
        const fetchTickets = async () => {
            try {
                setLoading(true);
                const { data } = await api.get('/api/host/public/my-tickets');
                setTickets(data);
            } catch (error) {
                console.error('Failed to fetch tickets:', error);
                toast.error('Failed to load tickets');
            } finally {
                setLoading(false);
            }
        };

        fetchTickets();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-black border-t-transparent mb-4" />
                <p className="text-black font-black uppercase tracking-widest text-sm">Accessing Secure Vault...</p>
            </div>
        );
    }

    if (tickets.length === 0) {
        return (
            <div className="text-center py-20 bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] p-12">
                <div className="w-24 h-24 bg-neutral-100 border-4 border-black mx-auto mb-8 flex items-center justify-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                    <TicketIcon className="w-12 h-12 text-black" />
                </div>
                <h3 className="text-3xl font-black text-black mb-4 uppercase tracking-tighter">Your Wallet is Empty</h3>
                <p className="text-neutral-500 font-bold uppercase tracking-widest text-sm mb-8">No upcoming event tickets found.</p>
                <button
                    onClick={() => window.location.href = '#Explore'}
                    className="px-8 py-4 bg-black text-white font-black uppercase tracking-widest border-4 border-black hover:bg-neutral-800 transition-all shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none"
                >
                    Explore Events
                </button>
            </div>
        );
    }

    return (
        <div className="relative">
            <div className="flex items-center justify-between -mt-2">
                <h2 className="text-xl font-black text-black uppercase tracking-tighter flex items-center gap-2">
                    <div className="w-8 h-8 bg-black text-white flex items-center justify-center">
                        <TicketIcon className="w-4 h-4" />
                    </div>
                    Digital Wallet
                    <span className="text-[9px] bg-blue-600 text-white px-1.5 py-0.5 border-2 border-black shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)]">
                        {tickets.length} PASS{tickets.length > 1 ? 'ES' : ''}
                    </span>
                </h2>
            </div>

            <AnimatePresence mode="wait">
                {!selectedTicket ? (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="flex flex-col"
                    >
                        {/* Tickets Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8 w-full">
                            {tickets.map((ticket, index) => {
                                return (
                                    <motion.div
                                        key={ticket.eventId}
                                        layoutId={`ticket-${ticket.eventId}`}
                                        initial={{ y: 50, opacity: 0 }}
                                        animate={{
                                            y: 0,
                                            opacity: 1,
                                            transition: { delay: index * 0.1 }
                                        }}
                                        whileHover={{
                                            y: -10,
                                            transition: { duration: 0.2 }
                                        }}
                                        onClick={() => setSelectedTicket(ticket)}
                                        className="relative w-full max-w-[320px] mx-auto cursor-pointer group h-[280px]"
                                    >
                                        <div className="bg-black border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden h-full flex flex-col">
                                            {/* Card Header - Colored Strip */}
                                            <div className={`h-8 w-full shrink-0 border-b-4 border-black ${index % 4 === 0 ? 'bg-blue-500' :
                                                index % 4 === 1 ? 'bg-purple-500' :
                                                    index % 4 === 2 ? 'bg-pink-500' : 'bg-orange-500'
                                                }`} />

                                            <div className="bg-white p-4 flex-1 flex flex-col">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex-1">
                                                        <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1">Official Pass</p>
                                                        <h4 className="text-base font-black text-black uppercase tracking-tight group-hover:text-blue-600 transition-colors truncate">
                                                            {ticket.title}
                                                        </h4>
                                                    </div>
                                                    <div className="w-10 h-10 border-2 border-black flex items-center justify-center font-black">
                                                        {index + 1}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3 text-[9px] font-bold text-neutral-600 mb-2">
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <Calendar className="w-3 h-3" />
                                                        {new Date(ticket.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                                    </div>
                                                    <div className="flex items-center gap-1 min-w-0">
                                                        <MapPin className="w-3 h-3 shrink-0" />
                                                        <span className="truncate">{ticket.location}</span>
                                                    </div>
                                                </div>

                                                <div className="flex-1" />

                                                {/* Cut-out Divider Simulation */}
                                                <div className="relative h-4 my-4 flex items-center">
                                                    <div className="absolute left-[-32px] w-6 h-6 rounded-full bg-black border-r-4 border-black" />
                                                    <div className="w-full border-t-4 border-dashed border-neutral-200" />
                                                    <div className="absolute right-[-32px] w-6 h-6 rounded-full bg-black border-l-4 border-black" />
                                                </div>

                                                <div className="flex justify-between items-end">
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Entry Code</p>
                                                        <p className="text-sm font-black font-mono">EVENITE-00{index + 1}</p>
                                                    </div>
                                                    <div className="w-12 h-12 bg-neutral-50 border-2 border-black flex items-center justify-center">
                                                        <QrCode className="w-6 h-6" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>

                        <p className="mt-8 text-sm font-bold text-neutral-500 uppercase tracking-widest animate-pulse">
                            Select a ticket to reveal QR code
                        </p>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        // Fix 1: Use p-4 for safe area, ensure strict flex-col to allow scrolling
                        className="fixed inset-0 z-[100] flex flex-col items-center justify-start sm:justify-center p-4 bg-white/40 backdrop-blur-md overflow-y-auto"
                    >
                        <div className="fixed inset-0" onClick={() => setSelectedTicket(null)} />

                        <motion.div
                            layoutId={`ticket-${selectedTicket.eventId}`}
                            // Fix 2: Remove absolute height constraints, add pb-4 for bottom spacing, relative context
                            className="relative w-full max-w-sm bg-white border-4 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] z-10 my-auto shrink-0 flex flex-col"
                            style={{ maxHeight: '90vh' }}
                        >
                            {/* Header / Nav */}
                            <div className="flex items-center justify-between p-4 border-b-4 border-black bg-white sticky top-0 z-20">
                                <button
                                    onClick={() => setSelectedTicket(null)}
                                    className="p-1.5 bg-black text-white hover:bg-neutral-800 transition-all border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                </button>
                                <span className="text-[9px] font-black bg-black text-white px-2 py-0.5 uppercase tracking-widest">
                                    Verified Digital ID
                                </span>
                            </div>

                            {/* Scrollable Content Area */}
                            <div className="p-4 overflow-y-auto scrollbar-hide flex-1">
                                <div className="text-center mb-6">
                                    <h3 className="text-xl font-black text-black uppercase tracking-tighter mb-2 leading-tight break-words">
                                        {selectedTicket.title}
                                    </h3>
                                    <p className="text-neutral-500 font-bold uppercase tracking-widest text-[9px] flex items-center justify-center gap-1.5 break-words">
                                        <MapPin className="w-4 h-4 shrink-0" /> <span className="text-left">{selectedTicket.location}</span>
                                    </p>
                                </div>

                                {/* QR Code Section */}
                                <div className="bg-white border-2 border-black p-4 mb-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center justify-center">
                                    <img
                                        src={selectedTicket.qrCodeUrl}
                                        alt="Ticket QR Code"
                                        className="w-full max-w-[180px] aspect-square object-contain mb-3"
                                    />
                                    <div className="w-full text-center border-t-2 border-black pt-3">
                                        <p className="text-[8px] font-black text-neutral-400 uppercase tracking-widest mb-1">Pass ID</p>
                                        <p className="font-mono font-black text-lg tracking-widest">{selectedTicket.eventId.slice(-8).toUpperCase()}</p>
                                    </div>
                                </div>

                                {/* Details Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
                                    <div className="bg-neutral-50 border-2 border-black p-3 flex flex-col justify-center">
                                        <p className="text-[8px] font-black text-neutral-400 uppercase tracking-widest mb-1">Pass Holder</p>
                                        <p className="font-black uppercase text-xs break-words">{selectedTicket.studentName}</p>
                                    </div>
                                    <div className="bg-neutral-50 border-2 border-black p-3 flex flex-col justify-center">
                                        <p className="text-[8px] font-black text-neutral-400 uppercase tracking-widest mb-1">Date & Time</p>
                                        <p className="font-black uppercase text-xs break-words">
                                            {new Date(selectedTicket.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </p>
                                    </div>
                                    {selectedTicket.squadName && (
                                        <div className="col-span-1 sm:col-span-2 bg-blue-50 border-2 border-blue-900 p-3 flex items-center justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[8px] font-black text-blue-900/50 uppercase tracking-widest mb-1">Squad Access</p>
                                                <p className="font-black uppercase text-xs text-blue-900 truncate">{selectedTicket.squadName}</p>
                                            </div>
                                            <Users className="w-5 h-5 text-blue-900 shrink-0" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
        </div>
    );
};

export default TicketWallet;
