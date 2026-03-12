import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import ChatInterface from './ChatInterface';
import { Search, MessageSquarePlus, MessageSquare, UserCircle2 } from 'lucide-react';

export default function DashboardChat({ currentUser }) {
  const [conversations, setConversations] = useState([]);
  const [activeFriendId, setActiveFriendId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Fetch Conversations
  const fetchConvos = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/api/p2p-chat/conversations');
      setConversations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load conversations', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) fetchConvos();
  }, [currentUser]);

  // Filtered List
  const filtered = conversations.filter(
    (c) =>
      (c.friendName || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.friendUsername || '').toLowerCase().includes(search.toLowerCase())
  );

  // Active Friend Object
  const activeChat = activeFriendId
    ? conversations.find((c) => c.friendId === activeFriendId) || {
        friendId: activeFriendId,
        friendName: 'Chat',
        friendPic: null,
      }
    : null;

  const handleSelect = (id) => {
    setActiveFriendId(id);
  };

  return (
    <div className="flex h-[70vh] bg-white border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
      {/* Sidebar (Conversations) */}
      <div
        className={`w-full md:w-80 lg:w-96 bg-white border-r-2 border-black flex flex-col transition-all duration-300 ${activeFriendId ? 'hidden md:flex' : 'flex'}`}
      >
        {/* Sidebar Header */}
        <div className="p-6 border-b-2 border-black bg-neutral-50">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-black uppercase tracking-tighter text-black">Messages</h1>
            <button 
              onClick={fetchConvos}
              className="p-2 bg-black text-white hover:bg-neutral-800 transition-colors border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]"
            >
              <MessageSquarePlus className="w-4 h-4" />
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black" />
            <input
              type="text"
              placeholder="SEARCH CHATS..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border-2 border-black text-xs font-bold uppercase tracking-widest focus:outline-none focus:bg-blue-50 transition-all placeholder:text-neutral-400"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar divide-y-2 divide-black/5">
          {loading ? (
            <div className="p-8 text-center text-black font-bold uppercase tracking-widest text-xs animate-pulse">Syncing vibes...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-neutral-400">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-10" />
              <p className="text-xs font-bold uppercase tracking-widest">No conversations</p>
            </div>
          ) : (
            filtered.map((c) => (
              <div
                key={c.friendId}
                onClick={() => handleSelect(c.friendId)}
                className={`p-4 flex items-center gap-4 cursor-pointer hover:bg-blue-50 transition-all ${activeFriendId === c.friendId ? 'bg-blue-50' : ''}`}
              >
                <div className="relative shrink-0">
                  <div className="w-12 h-12 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] overflow-hidden bg-white">
                    {c.friendPic ? (
                      <img
                        src={c.friendPic.startsWith('http') ? c.friendPic : `/cloudinary/${c.friendPic}`}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className="hidden w-full h-full items-center justify-center bg-slate-100 text-black font-black text-lg" style={{ display: c.friendPic ? 'none' : 'flex' }}>
                       {(c.friendName || 'U').charAt(0).toUpperCase()}
                    </div>
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <h3 className="font-black text-sm uppercase tracking-tight truncate text-black">
                      {c.friendName}
                    </h3>
                    <span className="text-[9px] font-bold text-neutral-400 uppercase">
                      {c.lastMessage?.createdAt ? new Date(c.lastMessage.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className={`text-[11px] truncate font-medium ${c.unreadCount > 0 ? 'text-black font-bold' : 'text-neutral-500 italic'}`}>
                      {c.lastMessage?.content || 'Start chatting...'}
                    </p>
                    {c.unreadCount > 0 && (
                      <span className="bg-blue-600 text-white text-[9px] font-black px-1.5 py-0.5 border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ml-2">
                        {c.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div
        className={`flex-1 flex flex-col h-full bg-slate-50 relative transition-all duration-300 ${!activeFriendId ? 'hidden md:flex' : 'flex'}`}
      >
        {activeFriendId ? (
          <ChatInterface
            currentUser={currentUser}
            friendId={activeFriendId}
            friendName={activeChat?.friendName || 'Friend'}
            friendPic={activeChat?.friendPic}
            onClose={() => setActiveFriendId(null)}
            isOverlay={false}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <div className="w-20 h-20 bg-white border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center mb-6">
              <MessageSquare className="w-10 h-10 text-black" />
            </div>
            <h2 className="text-xl font-black uppercase tracking-tighter text-black mb-2">Select a Conversation</h2>
            <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest max-w-xs">
              Choose a friend from the left to start a secure encrypted chat session.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
