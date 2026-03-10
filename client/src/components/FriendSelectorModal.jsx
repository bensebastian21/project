import React, { useEffect, useState } from 'react';
import { X, Search, UserCircle2, Send } from 'lucide-react';
import api from '../utils/api';
import config from '../config';

export default function FriendSelectorModal({ isOpen, onClose, onSelect }) {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadFriends();
    }
  }, [isOpen]);

  const loadFriends = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/api/friends');
      setFriends(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to load friends', e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = friends.filter((f) =>
    (f.fullname || f.username || '').toLowerCase().includes(search.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="p-4 border-b-2 border-black flex items-center justify-between bg-neutral-50">
          <h3 className="text-lg font-black uppercase tracking-wide">Select Friend</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-neutral-200 border-2 border-transparent hover:border-black transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b-2 border-black bg-white">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search friends..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border-2 border-neutral-200 focus:border-black focus:outline-none text-sm font-bold uppercase tracking-wide transition-colors"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-neutral-100">
          {loading ? (
            <div className="text-center py-8 text-neutral-500 font-medium">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-neutral-500 font-medium">No friends found</div>
          ) : (
            filtered.map((friend) => (
              <button
                key={friend._id}
                onClick={() => onSelect(friend)}
                className="w-full flex items-center gap-3 p-3 bg-white border-2 border-transparent hover:border-black hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all group text-left"
              >
                {friend.profilePic ? (
                  <img
                    src={
                      friend.profilePic.startsWith('http')
                        ? friend.profilePic
                        : `${config.apiBaseUrl}${friend.profilePic}`
                    }
                    alt={friend.username}
                    className="w-10 h-10 object-cover border-2 border-neutral-200 group-hover:border-black"
                  />
                ) : (
                  <div className="w-10 h-10 bg-neutral-200 border-2 border-neutral-200 group-hover:border-black flex items-center justify-center">
                    <UserCircle2 className="w-6 h-6 text-neutral-400 group-hover:text-black" />
                  </div>
                )}
                <div>
                  <div className="font-bold text-black text-sm uppercase leading-tight">
                    {friend.fullname || friend.username}
                  </div>
                  <div className="text-xs text-neutral-500 font-medium">@{friend.username}</div>
                </div>
                <Send className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
