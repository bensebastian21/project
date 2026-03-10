import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import { UserCircle2, MessageSquare, Eye, Users } from 'lucide-react';
import { getImageUrl } from '../../utils/imageUtils';

export default function FriendsList({ onViewProfile }) {
  const [loading, setLoading] = useState(true);
  const [friends, setFriends] = useState([]);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const { data } = await api.get('/api/friends');
      setFriends(Array.isArray(data) ? data : []);
    } catch (e) {
      setError('Failed to load friends');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading)
    return (
      <div className="flex items-center gap-3 py-8 text-black font-bold uppercase tracking-widest text-sm">
        <div className="w-4 h-4 border-2 border-black border-t-transparent animate-spin" />
        Loading friends...
      </div>
    );

  if (error)
    return (
      <div className="p-4 border-2 border-black bg-red-100 text-black font-bold uppercase tracking-widest text-sm">
        {error}
      </div>
    );

  if (!friends.length)
    return (
      <div className="text-center py-12 border-2 border-dashed border-black">
        <Users className="w-10 h-10 mx-auto mb-3 text-slate-300" />
        <p className="font-bold uppercase tracking-widest text-sm text-slate-500">
          No friends yet. Search for people to add!
        </p>
      </div>
    );

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
      {friends.map((u) => {
        const hasPic = !!u.profilePic;
        const src = hasPic ? getImageUrl(u.profilePic) || '' : '';
        return (
          <div
            key={u._id}
            className="bg-pink-50 border-2 border-black p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all duration-200"
          >
            <div className="flex flex-col items-center text-center">
              {/* Avatar */}
              <div className="relative mb-4">
                {hasPic ? (
                  <img
                    src={src}
                    alt={u.fullname || ''}
                    className="w-16 h-16 object-cover border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-16 h-16 bg-slate-100 border-2 border-black flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <UserCircle2 className="w-8 h-8 text-slate-400" />
                  </div>
                )}
                {/* Online dot */}
                <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-black" />
                {/* Level badge */}
                <div className="absolute -top-2 -left-2 bg-black text-white text-[10px] font-black px-2 py-0.5 uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]">
                  Lv.{u.level || 1}
                </div>
              </div>

              <h4 className="text-sm font-black text-black uppercase tracking-tight mb-0.5 line-clamp-1">
                {u.fullname || u.username}
              </h4>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-4">
                @{u.username}
              </p>

              <div className="flex gap-2 w-full">
                <button
                  onClick={() => onViewProfile && onViewProfile(u)}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-white border-2 border-black text-black font-bold uppercase tracking-widest text-[10px] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all"
                >
                  <Eye className="w-3 h-3" /> Profile
                </button>
                <button
                  onClick={() => {
                    window.dispatchEvent(
                      new CustomEvent('open-chat', {
                        detail: {
                          friendId: u._id,
                          friendName: u.fullname || u.username,
                          friendPic: u.profilePic,
                        },
                      })
                    );
                  }}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-black text-white border-2 border-black font-bold uppercase tracking-widest text-[10px] shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)] hover:bg-neutral-800 transition-all"
                >
                  <MessageSquare className="w-3 h-3" /> Chat
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
