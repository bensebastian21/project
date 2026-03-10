const router = require('express').Router();
const User = require('../models/User');
const Event = require('../models/Event');
const { authenticateToken } = require('../utils/auth');

/**
 * @route GET /api/recommendations/events
 * @desc Get AI-based event recommendations for the user
 * @access Private
 */
router.get('/events', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // 1. Gather User Signals (Interests + Past Behaviors)
    const interestSet = new Set((user.interests || []).map((i) => i.toLowerCase()));

    // Get past events to infer implicit interests
    // We look for events where user status is 'registered' or 'completed'
    const pastEvents = await Event.find({
      'registrations.studentId': userId,
      'registrations.status': { $ne: 'cancelled' },
    });

    pastEvents.forEach((e) => {
      if (e.category) interestSet.add(e.category.toLowerCase());
      (e.tags || []).forEach((t) => interestSet.add(t.toLowerCase()));
    });

    // 2. Fetch Candidates (Upcoming, Published, Not Registered)
    const now = new Date();
    const candidates = await Event.find({
      date: { $gte: now },
      isPublished: true,
      isDeleted: false,
      'registrations.studentId': { $ne: userId },
    })
      .limit(100)
      .populate('hostId', 'fullname username profilePic institute'); // Limit pool for performance

    // 3. Score Candidates
    const scored = candidates.map((event) => {
      let score = 0;

      // A. Content Match (Tags & Category)
      const eCat = (event.category || '').toLowerCase();
      if (interestSet.has(eCat)) score += 15;

      (event.tags || []).forEach((tag) => {
        if (interestSet.has(tag.toLowerCase())) score += 10;
      });

      // B. Social/Popularity
      // Cap popularity bonus to avoid drowning out personal interests
      const regCount = event.registrations ? event.registrations.length : 0;
      score += Math.min(regCount, 50);

      // C. Urgency (Boost if happening soon, e.g. within 3 days)
      const daysDiff = (new Date(event.date) - now) / (1000 * 3600 * 24);
      if (daysDiff <= 3 && daysDiff >= 0) score += 5;

      // D. "New" boost (published recently)
      const createdDays = (now - new Date(event.createdAt)) / (1000 * 3600 * 24);
      if (createdDays < 2) score += 3;

      return { event, score };
    });

    // 4. Sort and return Top N
    scored.sort((a, b) => b.score - a.score);

    // Take top 6
    const recommendations = scored.slice(0, 6).map((item) => ({
      ...item.event.toObject(),
      recommendationScore: item.score,
      matchReason: item.score > 20 ? 'Based on your interests' : 'Trending now',
    }));

    res.json(recommendations);
  } catch (err) {
    console.error('Recommendation Error:', err);
    res.status(500).json({ error: 'Server error generating recommendations' });
  }
});

module.exports = router;
