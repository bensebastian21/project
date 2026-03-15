import React, { useState, useEffect } from 'react';
import { MapPin, RefreshCw, AlertCircle } from 'lucide-react';
import api from '../utils/api';
import { GamifiedEventCard } from './GamifiedComponents';

export default function EventsNearMe({ onRegister, onBookmark, onViewMore, userStats }) {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const fetchEvents = async (lat, lng) => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await api.get(`/api/host/public/events-nearby`, {
        params: { lat, lng, dist: 50 }, // 50km radius (route expects km)
      });
      setEvents(data || []);
    } catch (err) {
      console.error('Failed to fetch nearby events', err);
      setError('Failed to load events nearby.');
    } finally {
      setLoading(false);
    }
  };

  const getLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    setLoading(true);
    setError(null);
    setPermissionDenied(false);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ latitude, longitude });
        fetchEvents(latitude, longitude);
      },
      (err) => {
        setLoading(false);
        if (err.code === 1) {
          // PERMISSION_DENIED
          setPermissionDenied(true);
          setError(
            'Location permission denied. Please enable location services to see events near you.'
          );
        } else {
          setError('Unable to retrieve location.');
        }
      }
    );
  };

  useEffect(() => {
    getLocation();
  }, []);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between mb-4 bg-white border-2 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div>
          <h2 className="text-xl font-black text-black flex items-center gap-2 uppercase tracking-tighter">
            <MapPin className="w-6 h-6 text-black" />
            Events Near Me
          </h2>
          <p className="text-slate-500 font-medium uppercase tracking-wide text-xs">
            Discover events happening around you (within 50km)
          </p>
        </div>
        <button
          onClick={getLocation}
          className="p-3 bg-black text-white border-2 border-black hover:bg-neutral-800 transition-all hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] active:translate-y-[2px] active:shadow-none"
          title="Refresh Location"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading && !events.length && (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border-2 border-black p-6 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <AlertCircle className="w-10 h-10 text-red-600 mx-auto mb-3" />
          <h3 className="text-lg font-black text-red-900 mb-2 uppercase tracking-wide">
            Location Error
          </h3>
          <p className="text-red-800 font-bold mb-4">{error}</p>
          {permissionDenied && (
            <button
              onClick={getLocation}
              className="px-6 py-2 bg-red-600 text-white font-bold uppercase tracking-widest border-2 border-black hover:bg-red-700 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
            >
              Retry Permission
            </button>
          )}
        </div>
      )}

      {!loading && !error && events.length === 0 && (
        <div className="text-center py-20 bg-white border-2 border-dashed border-black">
          <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-black text-black uppercase tracking-wide">
            No events found nearby
          </h3>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-2">
            Try checking back later.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
        {events.map((event) => (
          <GamifiedEventCard
            key={event._id}
            event={event}
            onRegister={() => onRegister(event)}
            onBookmark={() => onBookmark(event)}
            onViewMore={() => onViewMore(event)}
            userStats={userStats}
          />
        ))}
      </div>
    </div>
  );
}
