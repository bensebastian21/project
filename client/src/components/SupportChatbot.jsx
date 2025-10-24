import React, { useEffect, useRef, useState } from "react";
import { MessageSquare, Send, X, Loader2 } from "lucide-react";
import api from "../utils/api";

export default function SupportChatbot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([{ role: "assistant", content: "Hi! I’m your support assistant. How can I help you?" }]);
  const [threadId, setThreadId] = useState(null);
  const panelRef = useRef(null);
  const listRef = useRef(null);

  const token = (() => localStorage.getItem('token'))();
  const headers = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

  const ensureThread = async () => {
    try {
      const userRaw = localStorage.getItem('user');
      const user = userRaw ? JSON.parse(userRaw) : null;
      const key = user?.email ? `chat.thread.${user.email}` : 'chat.thread.self';
      const saved = localStorage.getItem(key);
      if (saved) {
        setThreadId(saved);
        try {
          const { data } = await api.get(`/api/chat/${saved}`, headers);
          if (Array.isArray(data?.messages) && data.messages.length) setMessages(data.messages);
          return;
        } catch {}
      }
      const { data: list } = await api.get('/api/chat/threads', headers);
      let tid = list?.[0]?._id || null;
      if (!tid) {
        const { data: started } = await api.post('/api/chat/start', { title: 'Support' }, headers);
        tid = started?._id || null;
      }
      if (tid) {
        localStorage.setItem(key, tid);
        setThreadId(tid);
        const { data } = await api.get(`/api/chat/${tid}`, headers);
        if (Array.isArray(data?.messages) && data.messages.length) setMessages(data.messages);
      }
    } catch {}
  };

  useEffect(() => {
    if (open && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [open, messages]);

  const sendMsg = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const next = [...messages, { role: "user", content: text }];
    setMessages(next);
    setLoading(true);
    try {
      if (!threadId) await ensureThread();
      const tid = threadId || (() => null)();
      const { data } = await api.post(`/api/chat/${tid}/message`, { content: text }, headers);
      const reply = data?.reply || "Sorry, I couldn’t process that right now.";
      setMessages(m => [...m, { role: "assistant", content: reply }]);
    } catch (e) {
      setMessages(m => [...m, { role: "assistant", content: e?.response?.data?.error || "Network error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const quick = [
    "How do I register for an event?",
    "Why can’t I register (event completed)?",
    "Where is my certificate?",
    "How to verify email/phone?",
  ];

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={async () => { const opening = !open; setOpen(opening); if (opening) await ensureThread(); }}
        className="fixed bottom-5 right-5 z-[90] rounded-full bg-blue-600 hover:bg-blue-700 text-white p-5 shadow-xl"
        aria-label="Open support chat"
      >
        <MessageSquare className="w-8 h-8" />
      </button>

      {open && (
        <div ref={panelRef} className="fixed bottom-24 right-5 z-[95] w-[min(96vw,420px)] h-[min(80vh,600px)] bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div className="font-semibold text-slate-900">Support</div>
            <button onClick={()=> setOpen(false)} className="p-1 rounded hover:bg-slate-100" aria-label="Close">
              <X className="w-5 h-5 text-slate-600" />
            </button>
          </div>
          <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-white">
            {messages.map((m, i) => (
              <div key={i} className={`max-w-[85%] ${m.role==='user'?'ml-auto text-right':''}`}>
                <div className={`${m.role==='user'?'bg-blue-600 text-white':'bg-slate-100 text-slate-900'} inline-block px-3 py-2 rounded-2xl`}>{m.content}</div>
              </div>
            ))}
            {loading && (
              <div className="max-w-[85%]"><div className="inline-flex items-center gap-2 bg-slate-100 text-slate-900 px-3 py-2 rounded-2xl"><Loader2 className="w-4 h-4 animate-spin"/>Typing…</div></div>
            )}
          </div>
          <div className="px-3 pb-2">
            <div className="flex gap-2 flex-wrap mb-2">
              {quick.map(q => (
                <button key={q} onClick={()=> setInput(q)} className="text-xs px-2 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700">{q}</button>
              ))}
            </div>
            <div className="flex items-center gap-2 border border-slate-200 rounded-xl p-2">
              <input
                value={input}
                onChange={e=>setInput(e.target.value)}
                onKeyDown={e=>{ if(e.key==='Enter') sendMsg(); }}
                placeholder="Type your message…"
                className="flex-1 outline-none text-sm"
              />
              <button onClick={sendMsg} className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm inline-flex items-center gap-1" disabled={loading}>
                <Send className="w-4 h-4"/> Send
              </button>
            </div>
            <div className="text-[10px] text-slate-500 mt-1">AI answers may be experimental. Do not share sensitive info.</div>
          </div>
        </div>
      )}
    </>
  );
}
