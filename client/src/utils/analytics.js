import config from '../config';

/**
 * Log an analytics event (impression, click, etc.)
 * @param {Object} params 
 * @param {string} params.eventId
 * @param {string} params.type - 'impression' | 'click' | 'registration'
 * @param {string} params.source - 'landing' | 'search' | 'recommendation' | 'direct'
 */
export const logEvent = async ({ eventId, type, source = 'direct' }) => {
  try {
    let baseUrl = config?.apiBaseUrl || 'http://localhost:5000/api';
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
    if (!baseUrl.endsWith('/api')) baseUrl += '/api';

    const token = localStorage.getItem('token');
    
    await fetch(`${baseUrl}/analytics/log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        eventId,
        type,
        source,
        metadata: {
          browser: navigator.userAgent,
          device: window.innerWidth < 768 ? 'mobile' : 'desktop',
          url: window.location.href
        }
      })
    });
  } catch (err) {
    // Fail silently to not disrupt user experience
    console.error('Analytics log failed:', err);
  }
};
