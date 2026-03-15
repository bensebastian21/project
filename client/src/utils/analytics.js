import api from './api';

/**
 * Log an analytics event (impression, click, etc.)
 * @param {Object} params 
 * @param {string} params.eventId
 * @param {string} params.type - 'impression' | 'click' | 'registration'
 * @param {string} params.source - 'landing' | 'search' | 'recommendation' | 'direct'
 */
export const logEvent = async ({ eventId, type, source = 'direct' }) => {
  try {
    await api.post('/api/analytics/log', {
      eventId,
      type,
      source,
      metadata: {
        browser: navigator.userAgent,
        device: window.innerWidth < 768 ? 'mobile' : 'desktop',
        url: window.location.href
      }
    });
  } catch (err) {
    console.error('Analytics log failed:', err?.response?.data || err.message);
  }
};
