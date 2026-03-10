import React, { useState, useEffect, useRef } from 'react';
import ChatInterface from './ChatInterface';
import { X, Minus, MessageSquare, ArrowLeft, Phone, Video, MoreVertical } from 'lucide-react';
import { getImageUrl } from '../../utils/imageUtils';

export default function ChatOverlay() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeFriend, setActiveFriend] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const overlayRef = useRef(null);

  useEffect(() => {
    // Load currentUser once
    const u = localStorage.getItem('user');
    if (u) setCurrentUser(JSON.parse(u));

    // Listen for global open event
    const handleOpen = (e) => {
      const { friendId, friendName, friendPic, initialMessage } = e.detail;
      setActiveFriend({ friendId, friendName, friendPic, initialMessage });
      setIsOpen(true);
      setIsMinimized(false);
    };

    window.addEventListener('open-chat', handleOpen);
    return () => window.removeEventListener('open-chat', handleOpen);
  }, []);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isOpen &&
        !isMinimized &&
        overlayRef.current &&
        !overlayRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, isMinimized]);

  if (!currentUser) return null; // Don't show if not logged in

  if (!isOpen) return null;

  if (isMinimized) {
    return (
      <div
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-4 right-4 z-50 bg-white border border-slate-200 shadow-xl rounded-full p-4 cursor-pointer hover:scale-105 transition-transform flex items-center gap-3"
      >
        <div className="relative">
          <img
            src={
              getImageUrl(activeFriend?.friendPic) ||
              `https://uiavatars.com/api/?name=${activeFriend?.friendName}`
            }
            alt="Chat"
            className="w-10 h-10 rounded-full object-cover border border-slate-100"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = `https://ui-avatars.com/api/?name=${activeFriend?.friendName || 'User'}&background=random`;
            }}
          />
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
        </div>
        <div className="pr-2">
          <h4 className="font-bold text-sm text-slate-800">{activeFriend?.friendName}</h4>
          <p className="text-xs text-slate-500">Click to expand</p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(false);
          }}
          className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-red-500"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // Active Chat Window
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div
        ref={overlayRef}
        className="w-full sm:w-[500px] h-[600px] max-h-[90vh] bg-white border border-slate-200 shadow-2xl rounded-2xl flex flex-col overflow-hidden animate-slideUp"
      >
        {/* Header Overlay Controls */}
        <div className="bg-white border-b border-slate-100 p-3 flex items-center justify-between shrink-0 h-14">
          <div className="flex items-center gap-2 overflow-hidden">
            <button
              onClick={() => setIsOpen(false)}
              className="mr-1 p-1 hover:bg-slate-100 rounded-full text-slate-500"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <img
              src={
                activeFriend?.friendPic ||
                `https://uiavatars.com/api/?name=${activeFriend?.friendName}`
              }
              alt={activeFriend?.friendName}
              className="w-9 h-9 rounded-full object-cover border border-slate-100"
            />
            <div className="min-w-0">
              <h4 className="font-bold text-sm text-slate-900 truncate">
                {activeFriend?.friendName}
              </h4>
              <span className="text-[10px] text-green-600 font-medium flex items-center gap-1">
                ● Online
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              className="p-2 hover:bg-slate-100 rounded-full text-slate-500 hidden sm:block"
              title="Voice Call"
            >
              <Phone className="w-5 h-5" />
            </button>
            <button
              className="p-2 hover:bg-slate-100 rounded-full text-slate-500 hidden sm:block"
              title="Video Call"
            >
              <Video className="w-5 h-5" />
            </button>
            <button
              className="p-2 hover:bg-slate-100 rounded-full text-slate-500 hidden sm:block"
              title="More"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block"></div>
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500"
              title="Minimize"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded-lg text-slate-500"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="flex-1 relative">
          <div className="absolute inset-0 -top-16">
            <ChatInterface
              currentUser={currentUser}
              friendId={activeFriend?.friendId}
              friendName={activeFriend?.friendName}
              friendPic={activeFriend?.friendPic}
              onClose={() => setIsOpen(false)}
              isMobile={false}
              isOverlay={true}
              initialMessage={activeFriend?.initialMessage}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
