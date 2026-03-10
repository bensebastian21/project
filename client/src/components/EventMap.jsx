import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { motion } from 'framer-motion';
import { MapPin, Navigation, Calendar, Users, ArrowRight } from 'lucide-react';
import L from 'leaflet';

// Fix for default marker icons in React-Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    tooltipAnchor: [16, -28],
    shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Component to dynamically change map center
function ChangeView({ center, zoom }) {
    const map = useMap();
    useEffect(() => {
        if (center) map.setView(center, zoom);
    }, [center, zoom, map]);
    return null;
}

const EventMap = ({ events = [], onEventClick }) => {
    const [userLoc, setUserLoc] = useState(null);
    const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]); // Default India
    const [mapZoom, setMapZoom] = useState(5);

    // Filter events that actually have valid coordinates
    const validEvents = useMemo(() => events.filter(e =>
        e.coordinates &&
        Array.isArray(e.coordinates) &&
        e.coordinates.length === 2 &&
        typeof e.coordinates[0] === 'number' &&
        typeof e.coordinates[1] === 'number'
    ), [events]);

    const handleLocateMe = () => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const loc = [position.coords.latitude, position.coords.longitude];
                    setUserLoc(loc);
                    setMapCenter(loc);
                    setMapZoom(13);
                },
                (error) => {
                    console.error("Error getting location: ", error);
                }
            );
        }
    };

    // If we don't have user location but have events, center on the first event
    useEffect(() => {
        if (!userLoc && validEvents.length > 0) {
            // GeoJSON is [longitude, latitude], Leaflet expects [latitude, longitude]
            setMapCenter([validEvents[0].coordinates[1], validEvents[0].coordinates[0]]);
            setMapZoom(11);
        }
    }, [validEvents, userLoc]);

    return (
        <div className="relative w-full h-[600px] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white overflow-hidden flex flex-col">
            {/* Map Header / Toolbar */}
            <div className="bg-neutral-100 border-b-4 border-black p-4 flex items-center justify-between z-[400] relative">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-black text-white">
                        <MapPin className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black uppercase tracking-widest">Event Map</h2>
                        <p className="text-sm font-bold text-neutral-600 uppercase tracking-wider">
                            {validEvents.length} Events With Locations
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleLocateMe}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white font-bold uppercase tracking-widest border-2 border-transparent hover:border-black transition-all"
                >
                    <Navigation className="w-5 h-5" />
                    <span className="hidden sm:inline">Center On Me</span>
                </button>
            </div>

            {/* Map Container */}
            <div className="flex-1 relative z-0">
                <MapContainer
                    center={mapCenter}
                    zoom={mapZoom}
                    style={{ height: '100%', width: '100%' }}
                    zoomControl={false} // We'll rely on default or custom ones if needed, but disabling default to avoid z-index bleeding
                >
                    <ChangeView center={mapCenter} zoom={mapZoom} />

                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        className="map-tiles"
                    />

                    {/* Render User Location Marker if available */}
                    {userLoc && (
                        <Marker position={userLoc}>
                            <Popup>
                                <div className="font-bold text-center">You are here</div>
                            </Popup>
                        </Marker>
                    )}

                    {/* Render Event Markers */}
                    {validEvents.map((event) => {
                        // Coordinate in schema is [longitude, latitude]
                        const lat = event.coordinates[1];
                        const lng = event.coordinates[0];

                        return (
                            <Marker key={event._id} position={[lat, lng]}>
                                <Popup className="event-popup" closeButton={false}>
                                    <div className="w-64 -m-4">
                                        {/* Popup Banner Image */}
                                        <div className="h-24 w-full bg-neutral-200 relative overflow-hidden">
                                            {event.imageUrl ? (
                                                <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-indigo-100 text-indigo-400">
                                                    <MapPin className="w-8 h-8" />
                                                </div>
                                            )}
                                            <div className="absolute top-2 right-2 bg-black text-white text-[10px] font-bold px-2 py-1 uppercase tracking-widest">
                                                {event.category || 'Event'}
                                            </div>
                                        </div>

                                        {/* Popup Content */}
                                        <div className="p-4 flex flex-col gap-3 font-sans">
                                            <h3 className="font-black text-lg leading-tight line-clamp-2">{event.title}</h3>

                                            <div className="flex flex-col gap-1.5 text-xs text-neutral-600 font-medium">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-4 h-4 text-emerald-600" />
                                                    <span>{new Date(event.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="w-4 h-4 text-rose-600" />
                                                    <span className="line-clamp-1">{event.location || event.city || 'Location TBA'}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Users className="w-4 h-4 text-blue-600" />
                                                    <span>{(event.registrations || []).length} Attending</span>
                                                </div>
                                            </div>

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (onEventClick) onEventClick(event);
                                                }}
                                                className="mt-2 w-full py-2 bg-black text-white font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-neutral-800 transition-colors"
                                            >
                                                View Details <ArrowRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        )
                    })}
                </MapContainer>
            </div>

            {/* Global override for Leaflet styles to fit Brutalist theme */}
            <style dangerouslySetInnerHTML={{
                __html: `
        .leaflet-container {
           font-family: inherit;
        }
        .leaflet-popup-content-wrapper {
           border-radius: 0;
           border: 3px solid black;
           box-shadow: 6px 6px 0px 0px rgba(0,0,0,1) !important;
           padding: 0;
           overflow: hidden;
        }
        .leaflet-popup-tip-container {
           display: none; /* Hide the little triangle */
        }
        .leaflet-popup-content {
           margin: 0 !important;
        }
        .map-tiles {
           filter: grayscale(0.2) contrast(1.1); /* Slightly mute the map colors but keep contrast */
        }
      `}} />
        </div>
    );
};

export default EventMap;
