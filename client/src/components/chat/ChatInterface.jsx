import EmojiPicker from 'emoji-picker-react';
import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api'; // Ensure this uses correct axios instance
import config from '../../config'; // API Base URL
import { Send, Lock, Smile, Search, ArrowLeft, Users, ExternalLink, Sparkles, Check, CheckCheck } from 'lucide-react';
import { toast } from 'react-toastify';

// Helper to format time
const formatChatTime = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const ChatInterface = ({
  currentUser,
  friendId,
  friendName,
  friendPic,
  onClose,
  isMobile,
  isOverlay,
  initialMessage,
}) => {
  const navigate = useNavigate();
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMsg, setInputMsg] = useState(initialMessage || '');
  const [loading, setLoading] = useState(true);
  const [onlineStatus, setOnlineStatus] = useState('offline'); // "online" | "offline"
  const [showEmoji, setShowEmoji] = useState(false); // Emoji Picker state

  const messagesEndRef = useRef(null);

  // Scroll to bottom helper
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (initialMessage) setInputMsg(initialMessage);
  }, [initialMessage]);

  // 1. Initialize Socket & Load History
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !currentUser) return;

    // Connect Socket
    // socket.io needs the origin (http://localhost:5000), not the full API path
    const socketUrl = config.apiBaseUrl.replace('/api', '');
    const newSocket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'], // Enforce websocket if possible
    });

    setSocket(newSocket);

    // Socket Events
    newSocket.on('connect', () => {
      // console.log("Socket connected");
      setOnlineStatus('online'); // Self online (kinda)
    });

    newSocket.on('receive_message', (msg) => {
      // Check if message belongs to this conversation
      const currentUserId = String(currentUser?._id || currentUser?.id || '');
      const msgSenderId = String(msg.sender?._id || msg.sender || '');
      const targetFriendId = String(friendId || '');

      if (msgSenderId === targetFriendId || msgSenderId === currentUserId) {
        setMessages((prev) => [...prev, msg]);
        scrollToBottom();

        // If I received it (and I'm reading it), acknowledge delivery
        if (msgSenderId === targetFriendId) {
          newSocket.emit('message_delivered_ack', { messageId: msg._id, senderId: targetFriendId });
          // If active, also mark read
          newSocket.emit('mark_read', { friendId: targetFriendId });
        }
      }
    });

    // 📩 Handle status updates from my perspective
    newSocket.on('message_status_update', ({ messageId, status }) => {
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, ...status } : m));
    });

    newSocket.on('message_delivered', ({ messageId }) => {
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, delivered: true } : m));
    });

    newSocket.on('messages_delivered', ({ receiverId }) => {
      if (String(friendId) === String(receiverId)) {
        setMessages(prev => prev.map(m => m.sender === (currentUser._id || currentUser.id) ? { ...m, delivered: true } : m));
      }
    });

    newSocket.on('messages_read', ({ readerId }) => {
      if (String(friendId) === String(readerId)) {
        setMessages(prev => prev.map(m => m.sender === (currentUser._id || currentUser.id) ? { ...m, read: true, delivered: true } : m));
      }
    });

    // Acknowledgement for sent messages
    newSocket.on('message_sent', (msg) => {
      setMessages((prev) => 
        prev.map(m => (m._id === `temp-${msg.tempId}` || m.tempId === msg.tempId) ? { ...m, ...msg, pending: false } : m)
      );
    });

    newSocket.on('user_online', (uid) => {
      if (uid === friendId) setOnlineStatus('online');
    });

    newSocket.on('user_offline', (uid) => {
      if (uid === friendId) setOnlineStatus('offline');
    });

    // Load History
    const loadHistory = async () => {
      try {
        setLoading(true);
        const { data } = await api.get(`/api/p2p-chat/history/${friendId}`);
        setMessages(Array.isArray(data) ? data : []);
        setTimeout(scrollToBottom, 500);
      } catch (err) {
        console.error('Failed to load chat history', err);
        toast.error('Could not load chat history');
      } finally {
        setLoading(false);
        // Mark as read once history is loaded and chat is open
        setTimeout(() => {
          newSocket.emit('mark_read', { friendId });
        }, 1000);
      }
    };
    loadHistory();

    return () => {
      newSocket.disconnect();
    };
  }, [friendId, currentUser]);

  // 2. Send Message
  const handleSend = async (e) => {
    e?.preventDefault();
    if (!inputMsg.trim() || !socket) return;

    const content = inputMsg.trim();
    const tempId = Date.now();

    // Optimistic Update
    const optimisticMsg = {
      _id: `temp-${tempId}`,
      sender: currentUser._id || currentUser.id,
      receiver: friendId,
      content,
      createdAt: new Date().toISOString(),
      pending: true,
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setInputMsg('');
    scrollToBottom();

    // Emit to server
    socket.emit('send_message', {
      receiverId: friendId,
      content,
      tempId,
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden">
      {/* Header - Only show if not overlay/embedded, or handle specifically */}
      {!isOverlay && (
        <div className="bg-white/80 backdrop-blur-md border-b border-slate-200 p-4 flex items-center justify-between shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-3">
            {isMobile && (
              <button onClick={onClose} className="p-1 -ml-1 text-slate-500 hover:text-slate-700">
                <ArrowLeft className="w-6 h-6" />
              </button>
            )}

            <div className="relative">
              <img
                src={
                  friendPic ||
                  'https://uiavatars.com/api/?background=random&name=' + (friendName || 'User')
                }
                alt={friendName}
                className="w-10 h-10 rounded-full object-cover border border-slate-200"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = `https://ui-avatars.com/api/?name=${friendName || 'User'}&background=random`;
                }}
              />
              {onlineStatus === 'online' && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
              )}
            </div>

            <div>
              <h3 className="font-bold text-slate-800 leading-tight">{friendName || 'Chat'}</h3>
              <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                <Lock className="w-3 h-3" />
                <span>End-to-end Encrypted</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-slate-400">
            {/* Options removed as requested */}
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 relative">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-3">
              <Lock className="w-8 h-8 text-slate-300" />
            </div>
            <p>Messages are secured with AES-256 encryption.</p>
            <p>Say hello to start the conversation!</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const currentUserId = String(currentUser?._id || currentUser?.id || '');
            const msgSenderId = String(msg.sender?._id || msg.sender || '');
            const isMe = msgSenderId === currentUserId;
            
            return (
              <div
                key={msg._id || index}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-2 shadow-sm text-sm break-words relative group ${
                    isMe
                      ? 'bg-blue-600 text-white rounded-tr-none'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                  } ${msg.type === 'circle_invite' ? 'p-0 overflow-hidden' : ''}`}
                >
                  {msg.type === 'circle_invite' ? (
                    <div className="flex flex-col">
                      <div className={`p-3 flex items-center gap-3 ${isMe ? 'bg-blue-700' : 'bg-slate-100'}`}>
                        <div className="p-2 bg-black text-white rounded-lg shadow-sm">
                          <Users className="w-5 h-5 text-yellow-400" />
                        </div>
                        <div className="min-w-0">
                          <p className={`text-[10px] font-black uppercase tracking-widest ${isMe ? 'text-blue-200' : 'text-slate-400'}`}>Circle Invitation</p>
                          <p className="font-black uppercase tracking-tight truncate">{msg.metadata?.circleName || 'Community Circle'}</p>
                        </div>
                      </div>
                      <div className="p-4 bg-white space-y-3">
                        <p className="text-slate-600 font-medium leading-relaxed italic text-xs">
                          "{msg.content}"
                        </p>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => navigate(`/circles/${msg.metadata?.circleId}`)}
                            className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-100 text-black text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all border border-slate-200"
                          >
                            VIEW
                          </button>
                          {!isMe && (
                            <button 
                              onClick={async () => {
                                try {
                                  await api.post(`/api/circles/${msg.metadata?.circleId}/join`);
                                  toast.success('Joined Circle!');
                                } catch (e) {
                                  toast.error(e.response?.data?.error || 'Failed to join');
                                }
                              }}
                              className="flex-1 flex items-center justify-center gap-2 py-2 bg-yellow-400 text-black text-[10px] font-black uppercase tracking-widest hover:bg-yellow-500 transition-all border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                            >
                              JOIN NOW
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {msg.content.split(/(https?:\/\/[^\s]+)/g).map((part, i) => {
                        if (part.match(/https?:\/\/[^\s]+/)) {
                          return (
                            <a
                              key={i}
                              href={part}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`hover:underline break-all font-medium ${isMe ? 'text-white underline decoration-blue-200' : 'text-blue-600 underline decoration-blue-200'}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {part}
                            </a>
                          );
                        }
                        return part;
                      })}
                    </p>
                  )}
                  <div
                    className={`text-[10px] mt-1 text-right opacity-70 flex items-center justify-end gap-1 p-2 ${isMe ? 'text-blue-100' : 'text-slate-400'} ${msg.type === 'circle_invite' ? 'absolute bottom-0 right-2' : ''}`}
                  >
                    <span>{formatChatTime(msg.createdAt)}</span>
                    {isMe && (
                      <div className="flex items-center ml-1">
                        {msg.pending ? (
                          <span className="animate-pulse">◌</span>
                        ) : msg.read ? (
                          <CheckCheck className="w-3 h-3 text-sky-200" />
                        ) : msg.delivered ? (
                          <CheckCheck className="w-3 h-3 text-blue-100/70" />
                        ) : (
                          <Check className="w-3 h-3 text-blue-100/50" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-200 shrink-0 relative">
        {showEmoji && (
          <div className="absolute bottom-16 left-4 z-50">
            <EmojiPicker
              onEmojiClick={(e) => setInputMsg((prev) => prev + e.emoji)}
              width={300}
              height={400}
            />
          </div>
        )}
        <form
          onSubmit={handleSend}
          className="flex items-center gap-2 bg-slate-100 rounded-full px-2 py-2 border border-slate-200 focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100 transition-all"
        >
          <button
            type="button"
            onClick={() => setShowEmoji(!showEmoji)}
            className={`p-2 rounded-full transition-colors ${showEmoji ? 'text-blue-500 bg-blue-100' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200'}`}
          >
            <Smile className="w-5 h-5" />
          </button>

          <input
            type="text"
            value={inputMsg}
            onChange={(e) => setInputMsg(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 bg-transparent border-none focus:ring-0 text-slate-800 placeholder:text-slate-400 text-sm"
            onFocus={() => setShowEmoji(false)}
          />

          <button
            type="submit"
            disabled={!inputMsg.trim()}
            className={`p-2.5 rounded-full transition-all duration-300 shadow-sm flex items-center justify-center ${
              inputMsg.trim()
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-md transform hover:scale-105 active:scale-95'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Send className="w-4 h-4 ml-0.5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;
