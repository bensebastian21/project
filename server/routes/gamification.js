const express = require('express');
const router = express.Router();
const gamificationController = require('../controllers/gamificationController');
const User = require('../models/User');

// Middleware to authenticate token (reused)
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });

  const jwt = require('jsonwebtoken');
  const jwtSecret = process.env.JWT_SECRET || 'default-jwt-secret-for-development';
  jwt.verify(token, jwtSecret, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

router.get('/leaderboard', authenticateToken, gamificationController.getLeaderboard);
router.get('/my-rank', authenticateToken, gamificationController.getUserRank);

// Manual point award (e.g. from frontend interactions verified by token)
router.post('/points', authenticateToken, async (req, res) => {
  try {
    const { action } = req.body;
    if (!action) return res.status(400).json({ error: 'Action required' });
    const result = await gamificationController.awardPoints(req.user.id, action);
    res.json({ success: true, ...result });
  } catch (e) {
    console.error('Award points error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/badges/sync', authenticateToken, async (req, res) => {
  try {
    const { badges } = req.body;
    if (!badges || !Array.isArray(badges))
      return res.status(400).json({ error: 'Badges array required' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const existingIds = new Set(user.badges.map((b) => (typeof b === 'string' ? b : b.id)));
    let updated = false;

    badges.forEach((badgeObj) => {
      const badgeId = badgeObj.id || badgeObj;
      if (!existingIds.has(badgeId)) {
        user.badges.push({
          id: badgeId,
          name: badgeObj.name || badgeId,
          icon: badgeObj.icon || '🏆',
          tier: badgeObj.tier || 'bronze',
          description: badgeObj.description || 'Retroactively earned',
          earnedAt: new Date(),
        });
        updated = true;
      }
    });

    if (updated) {
      await user.save();
    }

    res.json({ success: true, saved: updated });
  } catch (e) {
    console.error('Badge sync error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
