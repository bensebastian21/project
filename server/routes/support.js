// server/routes/support.js
const express = require('express');
const router = express.Router();
// Polyfill fetch for Node < 18
if (typeof fetch === 'undefined') {
  global.fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
}

const isProd = (process.env.NODE_ENV || 'development') === 'production';
const debug = (...args) => { if (!isProd) console.log(...args); };

// Lightweight, no-external-API support AI fallback
// Matches user prompts to short canned responses; otherwise echoes a helpful default
const FAQ = [
  { k: /register.*event|how .*register/i, a: 'To register: open the event, click Register. If it is completed or past, registration is disabled.' },
  { k: /completed|past.*register/i, a: 'Events marked completed or with a past date cannot be registered. Try future dates.' },
  { k: /certificate|download/i, a: 'Your certificates are under Profile → Certificates. You can also verify via the certificate link.' },
  { k: /verify.*(email|phone)|otp/i, a: 'Verify email/phone in Profile → Credentials (OTP). If SMS fails in dev, a dev OTP may be returned.' },
  { k: /calendar/i, a: 'Use the Calendar button to open the overlay, Month/Week switch, and click a day chip to view details.' },
  { k: /bookmarks?/i, a: 'Bookmark events using the bookmark icon; view them in the Bookmarks tab.' },
];

router.post('/ai', async (req, res) => {
  try {
    const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
    const user = req.body?.user || null; // { id, role, name }
    const last = messages.slice().reverse().find(m => m?.role === 'user');
    const q = (last?.content || '').trim();

    const isStudent = (user?.role || '').toLowerCase() === 'student';
    const isHost = (user?.role || '').toLowerCase() === 'host';
    const greet = user?.name ? `Hi ${user.name.split(' ')[0]}, ` : '';

    let reply = '';
    // Prefer Gemini if API key is available
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    const usingGemini = Boolean(apiKey);
    if (apiKey && q) {
      try {
        const roleTag = isStudent ? 'student' : (isHost ? 'host' : (user?.role || 'user'));
        const context = `${greet}You are the in-app support assistant for an events platform (Explore events, register, calendar overlay, reviews, certificates, host dashboard). The user role is ${roleTag}. Be concise and specific to the app. If a feature is disabled (e.g., past/completed event), explain why and what to do next.`;
        const conv = messages.slice(-12).map(m => `${m.role}: ${m.content}`).join('\n');
        const prompt = `${context}\n\nConversation:\n${conv}\n\nassistant:`;

        const MODEL = process.env.SUPPORT_GEMINI_MODEL || 'gemini-2.5-flash';
        // Try v1 first
        const callGen = async (version) => {
          const url = `https://generativelanguage.googleapis.com/${version}/models/${encodeURIComponent(MODEL)}:generateContent?key=${encodeURIComponent(apiKey)}`;
          const body = { contents: [{ role: 'user', parts: [{ text: prompt }] }] };
          const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
          const data = await resp.json();
          if (!resp.ok) throw new Error(data?.error?.message || JSON.stringify(data));
          const text = data?.candidates?.[0]?.content?.parts?.map(p => p?.text).filter(Boolean).join('\n') || '';
          return text.trim();
        };

        try {
          const txt = await callGen('v1');
          if (txt) { debug(`[support.ai] Gemini success (v1/${MODEL})`); return res.json({ reply: txt, _meta: { provider: 'gemini', model: MODEL, via: 'v1' } }); }
        } catch (e1) {
          debug('[support.ai] v1 failed, trying v1beta:', e1?.message || e1);
          try {
            const txt2 = await callGen('v1beta');
            if (txt2) { debug(`[support.ai] Gemini success (v1beta/${MODEL})`); return res.json({ reply: txt2, _meta: { provider: 'gemini', model: MODEL, via: 'v1beta' } }); }
          } catch (e2) {
            debug('[support.ai] v1beta also failed:', e2?.message || e2);
          }
        }
      } catch (err) {
        debug('[support.ai] Gemini error:', err?.message || err);
        // fall through to FAQ/role logic
      }
    }
    if (q) {
      // Role-specific branches first
      if (isStudent && /register|sign\s*up|join\s*event/i.test(q)) {
        reply = `${greet}to register for an event:\n1) Open the event from Explore or your bookmarks.\n2) Make sure your email/phone are verified (Profile → Credentials). The dashboard will prompt if not verified.\n3) Click Register. If the event is completed or in the past, registration is disabled by design.\nTip: You can also use the Calendar overlay to jump to your event's start date.`;
      } else if (isStudent && /verify|otp|email|phone/i.test(q)) {
        reply = `${greet}verify your account in Profile → Credentials:\n- Email: Request OTP, check your inbox, enter code.\n- Phone: Request OTP. In development, the server may return a dev code.\nAfter verification, registration and bookmarks are enabled.`;
      } else if (isHost && /(review\s*fields|event\s*fields|feedback\s*form)/i.test(q)) {
        reply = `${greet}configure review fields in the Host Dashboard:\n1) Open Host Dashboard → Events → choose an event.\n2) Go to Reviews/Feedback settings to add fields (rating, text, textarea) and mark required ones.\n3) After the event is marked completed, students will see the Review page with your configured fields.`;
      } else if (isHost && /(create|manage).*events?|publish/i.test(q)) {
        reply = `${greet}create/manage events from Host Dashboard → Events:\n- Use the Create Event button, fill details including start date (and end date if multi-day).\n- You can edit, publish, or mark completed when done.\n- Registered attendees appear under the event's Registrations tab.`;
      } else if (isStudent && /(certificate|download|verify\s*certificate)/i.test(q)) {
        reply = `${greet}certificates are available under Profile → Certificates. You can download as PDF and verify via the certificate verification page (QR or ID). If a recent event is missing, ensure the host marked it completed.`;
      } else if (isHost && /(payout|payment|promotions?|promo|discount|coupon)/i.test(q)) {
        reply = `${greet}for promotions, you can include discount codes in event descriptions and communicate to followers (Following tab). Payouts depend on your payment setup; if using external gateways (e.g., Razorpay), reconcile orders in your merchant dashboard.`;
      } else {
        const hit = FAQ.find(f => f.k.test(q));
        reply = hit ? hit.a : `${greet}Here are some quick tips:\n- Registration is available only for upcoming events.\n- Certificates live under Profile → Certificates.\n- Use the Calendar overlay for a monthly view and day details.\nTell me more about what you need and I’ll guide you.`;
      }
    } else {
      reply = `${greet}How can I help you today? You can ask about registration, calendar, certificates, verification, or host features.`;
    }
    res.json({ reply, _meta: { provider: usingGemini ? 'fallback' : 'local-faq' } });
  } catch (e) {
    debug('[support.ai] route error:', e?.message || e);
    res.status(500).json({ error: 'Support service error' });
  }
});

module.exports = router;
