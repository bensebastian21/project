import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import config from '../config';

export default function GlobalTrafficTracker() {
    const location = useLocation();

    useEffect(() => {
        const token = localStorage.getItem('token');
        // No longer returning if !token, to track anonymous traffic too

        const socketUrl = process.env.REACT_APP_API_URL || config.apiBaseUrl.replace(/\/api$/, '');
        const socket = io(socketUrl, {
            auth: { token: token || null }
        });

        // Track clicks
        const handleClick = (e) => {
            // Get percentage coordinates relative to the window
            // Use e.pageY / document.documentElement.scrollHeight for vertical to account for scrolling
            const xPercent = (e.clientX / window.innerWidth) * 100;
            const yPercent = (e.pageY / document.documentElement.scrollHeight) * 100;

            socket.emit('track_click', {
                x: xPercent,
                y: yPercent,
                path: location.pathname,
                timestamp: new Date().toISOString()
            });
        };

        window.addEventListener('click', handleClick);

        return () => {
            window.removeEventListener('click', handleClick);
            socket.disconnect();
        };
    }, [location.pathname]); // Re-bind if pathname changes (though not strictly necessary as location.pathname gets captured in closure)

    return null; // This component doesn't render anything visually
}
