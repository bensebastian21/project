import React, { useEffect, useState } from 'react';
import config from '../config';
import { 
  X, Calendar, MapPin, Clock, Users, Tag, Globe, Phone, Mail, 
  CreditCard, Bookmark, BookmarkCheck, Building2, MessageSquare, 
  Trophy, CheckCircle, ExternalLink, Lock 
} from 'lucide-react';

const EventDetailModal = ({ 
  event, 
  isOpen, 
  onClose, 
  user, 
  onRegister, 
  onBookmark, 
  onSubscribe,
  onNavigateToReview,
  onDownloadCertificate,
  isRegistered,
  isBookmarked,
  isSubscribed,
  onOpenHost,
  certificateId,
  disabledActions = false
}) => {
  const [loading, setLoading] = useState(false);

  const toAbsoluteUrl = (u) => {
    const s = String(u || '');
    if (!s) return s;
    if (/^https?:\/\//i.test(s)) return s;
    return `${config.apiBaseUrl.replace(/\/$/, '')}${s.startsWith('/') ? '' : '/'}${s}`;
  };

  if (!isOpen || !event) return null;

  // Normalize helpers: props may be functions or booleans
  const registered = typeof isRegistered === 'function' ? isRegistered(event._id) : !!isRegistered;
  const bookmarked = typeof isBookmarked === 'function' ? isBookmarked(event._id) : !!isBookmarked;

  const handleRegister = async () => {
    setLoading(true);
    try {
      await onRegister(event);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount, currency = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const deadline = event?.registrationDeadline ? new Date(event.registrationDeadline) : null;
  const [nowTs, setNowTs] = useState(Date.now());
  useEffect(() => {
    if (!isOpen) return;
    const id = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isOpen]);
  const now = new Date(nowTs);
  const deadlinePassed = deadline && !isNaN(deadline.getTime()) && now.getTime() > deadline.getTime();
  const fmtCountdown = (end) => {
    if (!end) return '';
    const ms = new Date(end) - new Date();
    if (ms <= 0) return '0s';
    const d = Math.floor(ms / (24*60*60*1000));
    const h = Math.floor((ms % (24*60*60*1000)) / (60*60*1000));
    const m = Math.floor((ms % (60*60*1000)) / (60*1000));
    const s = Math.floor((ms % (60*1000)) / 1000);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full" style={{ maxHeight: '90vh' }}>
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:text-gray-200 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-2">{event.title}</h2>
              <div className="flex items-center space-x-4 text-blue-100">
                <div className="flex items-center space-x-1">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(event.date)}</span>
                </div>
                {event.endDate && (
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>Ends: {formatDate(event.endDate)}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => { if (disabledActions) return; onBookmark(event); }}
                disabled={disabledActions}
                className={`transition-colors ${disabledActions ? 'text-white/50 cursor-not-allowed' : 'text-white hover:text-yellow-300'}`}
                title={disabledActions ? 'Verify email and phone to use this action' : (bookmarked ? "Remove bookmark" : "Bookmark event")}
              >
                {bookmarked ? <BookmarkCheck className="w-6 h-6" /> : <Bookmark className="w-6 h-6" />}
              </button>
              <button
                onClick={() => { if (disabledActions) return; onSubscribe(event); }}
                disabled={disabledActions}
                className={`transition-colors ${disabledActions ? 'text-white/50 cursor-not-allowed' : 'text-white hover:text-yellow-300'}`}
                title={disabledActions ? 'Verify email and phone to use this action' : (isSubscribed ? "Unfollow host" : "Follow host")}
              >
                <Building2 className="w-6 h-6" />
              </button>
              {onOpenHost && (
                <button
                  onClick={() => {
                    const hid = event?.hostId && (event.hostId._id || event.hostId);
                    if (hid) onOpenHost(hid);
                  }}
                  className="text-white hover:text-yellow-300 transition-colors"
                  title="Go to Host"
                >
                  <ExternalLink className="w-6 h-6" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 120px)' }}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Event Image */}
              {event.imageUrl && (
                <div className="rounded-xl overflow-hidden">
                  <img 
                    src={toAbsoluteUrl(event.imageUrl)} 
                    alt={event.title}
                    className="w-full h-64 object-cover"
                  />
                </div>
              )}

              {/* Description */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
                <p className="text-gray-700 leading-relaxed">
                  {event.description || event.shortDescription || 'No description available.'}
                </p>
              </div>

              {/* Short Description */}
              {event.shortDescription && event.description && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Overview</h3>
                  <p className="text-gray-700 leading-relaxed">
                    {event.shortDescription}
                  </p>
                </div>
              )}

              {/* Event Details */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start space-x-3 p-3 bg-white rounded-lg border border-gray-200">
                    <MapPin className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Location</p>
                      <p className="text-gray-700">
                        {event.isOnline ? 'Online Event' : (event.location || 'To Be Announced')}
                      </p>
                      {event.address && (
                        <p className="text-sm text-gray-600 mt-1">{event.address}</p>
                      )}
                      {event.city && (
                        <p className="text-sm text-gray-600">{event.city}, {event.state} {event.pincode}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 bg-white rounded-lg border border-gray-200">
                    <Users className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Capacity</p>
                      <p className="text-gray-700">
                        {event.capacity ? `${event.capacity} participants` : 'Unlimited'}
                      </p>
                    </div>
                  </div>

                  {event.category && (
                    <div className="flex items-start space-x-3 p-3 bg-white rounded-lg border border-gray-200">
                      <Tag className="w-5 h-5 text-purple-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Category</p>
                        <p className="text-gray-700">{event.category}</p>
                      </div>
                    </div>
                  )}

                  {event.isOnline && event.meetingLink && (
                    <div className="flex items-start space-x-3 p-3 bg-white rounded-lg border border-gray-200">
                      <Globe className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Meeting Link</p>
                        <a 
                          href={event.meetingLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 flex items-center space-x-1 mt-1"
                        >
                          <span>Join Meeting</span>
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Tags */}
              {event.tags && event.tags.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {event.tags.map((tag, index) => (
                      <span 
                        key={index}
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Requirements */}
              {event.requirements && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Requirements</h3>
                  <p className="text-gray-700 leading-relaxed">
                    {event.requirements}
                  </p>
                </div>
              )}

              {/* Agenda */}
              {event.agenda && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Agenda</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-700 whitespace-pre-line">
                      {event.agenda}
                    </p>
                  </div>
                </div>
              )}

              {/* Contact Information */}
              {(event.contactEmail || event.contactPhone || event.website) && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Contact Information</h3>
                  <div className="space-y-2">
                    {event.contactEmail && (
                      <div className="flex items-center space-x-3">
                        <Mail className="w-4 h-4 text-gray-500" />
                        <a 
                          href={`mailto:${event.contactEmail}`}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          {event.contactEmail}
                        </a>
                      </div>
                    )}
                    {event.contactPhone && (
                      <div className="flex items-center space-x-3">
                        <Phone className="w-4 h-4 text-gray-500" />
                        <a 
                          href={`tel:${event.contactPhone}`}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          {event.contactPhone}
                        </a>
                      </div>
                    )}
                    {event.website && (
                      <div className="flex items-center space-x-3">
                        <Globe className="w-4 h-4 text-gray-500" />
                        <a 
                          href={event.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                        >
                          <span>Visit Website</span>
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Registration Card */}
              <div className="bg-white rounded-xl p-6 border-2 border-blue-200 shadow-lg">
                <div className="text-center mb-6">
                  <div className="text-4xl font-bold text-blue-600 mb-2">
                    {formatCurrency(event.price, event.currency)}
                  </div>
                  <p className="text-gray-600 font-medium">Registration Fee</p>
                  {event.price === 0 && (
                    <p className="text-green-600 font-semibold mt-1">Free Event!</p>
                  )}
                  {deadline && !deadlinePassed && (
                    <div className="mt-2 text-sm">
                      <span className="inline-block px-2 py-1 rounded bg-amber-100 text-amber-800 border border-amber-200">Registration closes in {fmtCountdown(deadline)}</span>
                    </div>
                  )}
                  {deadline && deadlinePassed && (
                    <div className="mt-2 text-sm">
                      <span className="inline-block px-2 py-1 rounded bg-red-100 text-red-700 border border-red-200">Registration closed</span>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {registered ? (
                    <div className="text-center">
                      <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-3" />
                      <p className="text-green-600 font-semibold text-lg">Already Registered</p>
                      <p className="text-gray-600 text-sm mt-1">You're all set for this event!</p>
                      <div className="mt-6 space-y-3">
                        {event.isCompleted && (
                          <button
                            onClick={() => onNavigateToReview(event._id)}
                            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 font-medium"
                          >
                            <MessageSquare className="w-5 h-5" />
                            <span>Write Review</span>
                          </button>
                        )}
                        <button
                          onClick={() => onDownloadCertificate(event)}
                          disabled={!event.isCompleted}
                          className={`w-full py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2 font-medium ${
                            event.isCompleted 
                              ? 'bg-yellow-600 text-white hover:bg-yellow-700' 
                              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          <Trophy className="w-5 h-5" />
                          <span>Download Certificate</span>
                        </button>
                        {certificateId && (
                          <a
                            href={`/certificate/${certificateId}`}
                            className="block w-full text-center py-2 px-4 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors"
                          >
                            View Certificate
                          </a>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <button
                        onClick={handleRegister}
                        disabled={loading || disabledActions || !!deadlinePassed}
                        title={disabledActions ? 'Verify email and phone to register' : (deadlinePassed ? 'Registration closed' : undefined)}
                        className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-200 flex items-center justify-center space-x-3 shadow-lg ${disabledActions ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed'}`}
                      >
                        {loading ? (
                          <>
                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            <span>Processing...</span>
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-6 h-6" />
                            <span>{deadlinePassed ? 'Registration Closed' : 'Register Now'}</span>
                          </>
                        )}
                      </button>
                      <p className="text-xs text-gray-500 text-center">
                        Secure payment processing
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                    <Lock className="w-4 h-4" />
                    <span>Secured by Razorpay</span>
                  </div>
                </div>
              </div>

              {/* Event Status */}
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-3">Event Status</h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${event.isPublished ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                    <span className="text-sm text-gray-600">
                      {event.isPublished ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${event.isCompleted ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                    <span className="text-sm text-gray-600">
                      {event.isCompleted ? 'Completed' : 'Upcoming'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-3">Quick Actions</h4>
                <div className="space-y-2">
                  <button
                    onClick={() => { if (disabledActions) return; onBookmark(event); }}
                    disabled={disabledActions}
                    title={disabledActions ? 'Verify email and phone to use this action' : undefined}
                    className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${disabledActions ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : (isBookmarked ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')}`}
                  >
                    {isBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                    <span>{isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
                  </button>
                  <button
                    onClick={() => { if (disabledActions) return; onSubscribe(event); }}
                    disabled={disabledActions}
                    title={disabledActions ? 'Verify email and phone to use this action' : undefined}
                    className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${disabledActions ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    <Building2 className="w-4 h-4" />
                    <span>{isSubscribed ? 'Unfollow Host' : 'Follow Host'}</span>
                  </button>
                  {onOpenHost && (
                    <button
                      onClick={() => {
                        const hid = event?.hostId && (event.hostId._id || event.hostId);
                        if (hid) onOpenHost(hid);
                      }}
                      className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Go to Host</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetailModal;
