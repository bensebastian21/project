import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../utils/api';
import ChatInterface from '../components/chat/ChatInterface';
import { Search, MessageSquarePlus, MessageSquare } from 'lucide-react';

export default function ChatPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [conversations, setConversations] = useState([]);
  const [activeFriendId, setActiveFriendId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Load User from LocalStorage or API
  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) setCurrentUser(JSON.parse(u));
    // Ideally verify with /me if crucial
  }, []);

  // Fetch Conversations
  useEffect(() => {
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
    if (currentUser) fetchConvos();
  }, [currentUser]);

  // Check URL params OR LocalStorage on mount
  useEffect(() => {
    const qs = new URLSearchParams(location.search);
    const friendId = qs.get('friend');
    if (friendId) {
      setActiveFriendId(friendId);
      localStorage.setItem('last_chat_friend', friendId);
    } else {
      // Restore last active chat if no specific one requested
      const last = localStorage.getItem('last_chat_friend');
      if (last) {
        setActiveFriendId(last);
        window.history.replaceState(null, '', `/chat?friend=${last}`);
      }
    }
  }, [location.search]);

  // Filtered List
  const filtered = conversations.filter(
    (c) =>
      c.friendName.toLowerCase().includes(search.toLowerCase()) ||
      c.friendUsername.toLowerCase().includes(search.toLowerCase())
  );

  // Active Friend Object
  const activeChat = activeFriendId
    ? conversations.find((c) => c.friendId === activeFriendId) || {
        friendId: activeFriendId,
        friendName: 'Loading...',
        friendPic: null,
      } // Fallback for new empty chat
    : null;

  // Handle Select
  const handleSelect = (id) => {
    setActiveFriendId(id);
    localStorage.setItem('last_chat_friend', id);
    window.history.replaceState(null, '', `/chat?friend=${id}`);
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      {/* Sidebar (Conversations) */}
      <div
        className={`w-full md:w-80 lg:w-96 bg-white border-r border-slate-200 flex flex-col transition-all duration-300 ${activeFriendId ? 'hidden md:flex' : 'flex'}`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-slate-900">Messages</h1>
            <button className="p-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors">
              <MessageSquarePlus className="w-5 h-5" />
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search chats..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="p-4 text-center text-slate-400 text-sm">Loading chats...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p className="text-sm">No conversations yet.</p>
              <button
                onClick={() => navigate('/dashboard?tab=Friends')}
                className="mt-2 text-blue-600 text-sm font-semibold hover:underline"
              >
                Find Friends
              </button>
            </div>
          ) : (
            filtered.map((c) => (
              <div
                key={c.friendId}
                onClick={() => handleSelect(c.friendId)}
                className={`p-4 flex items-center gap-3 cursor-pointer hover:bg-slate-50 transition-colors border-b border-slate-50 ${activeFriendId === c.friendId ? 'bg-blue-50/60 border-l-4 border-l-blue-500' : 'border-l-4 border-l-transparent'}`}
              >
                <div className="relative shrink-0">
                  <img
                    src={
                      c.friendPic
                        ? c.friendPic.startsWith('http')
                          ? c.friendPic
                          : `/cloudinary/${c.friendPic}`
                        : `https://uiavatars.com/api/?name=${c.friendName}`
                    }
                    alt={c.friendName}
                    className="w-12 h-12 rounded-full object-cover border border-slate-200"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = `https://ui-avatars.com/api/?name=${c.friendName || 'User'}&background=random`;
                    }}
                  />
                  {/* Online status indicator could go here if we tracked it globally */}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <h3
                      className={`font-semibold text-sm truncate ${c.unreadCount > 0 ? 'text-slate-900' : 'text-slate-700'}`}
                    >
                      {c.friendName}
                    </h3>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap">
                      {c.lastMessage?.createdAt
                        ? new Date(c.lastMessage.createdAt).toLocaleDateString()
                        : ''}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p
                      className={`text-xs truncate max-w-[180px] ${c.unreadCount > 0 ? 'text-slate-900 font-medium' : 'text-slate-500'}`}
                    >
                      {c.lastMessage?.content || 'Start chatting'}
                    </p>
                    {c.unreadCount > 0 && (
                      <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
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
        className={`flex-1 flex flex-col h-full bg-white relative transition-all duration-300 ${!activeFriendId ? 'hidden md:flex' : 'flex'}`}
      >
        {activeFriendId ? (
          <ChatInterface
            currentUser={currentUser}
            friendId={activeFriendId}
            friendName={activeChat?.friendName || 'Friend'}
            friendPic={
              activeChat?.friendPic
                ? activeChat.friendPic.startsWith('http')
                  ? activeChat.friendPic
                  : `/cloudinary/${activeChat.friendPic}`
                : null
            }
            onClose={() => setActiveFriendId(null)}
            isMobile={window.innerWidth < 768} // Simple check, resize listener better in real app
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 text-slate-400">
            <div className="w-20 h-20 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4">
              <MessageSquarePlus className="w-10 h-10 text-blue-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-700 mb-2">Select a Conversation</h2>
            <p className="text-sm max-w-xs text-center">
              Choose a friend from the sidebar to start chatting securely.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
