const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const jwt = require('jsonwebtoken');

// Middleware to authenticate token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });

  const jwtSecret = process.env.JWT_SECRET || 'default-jwt-secret-for-development';
  jwt.verify(token, jwtSecret, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

/**
 * POST /api/events/:id/classify
 * Classify an event using the Bayesian classifier
 */
router.post('/:id/classify', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // For now, we'll allow any authenticated user to classify events
    // In a production environment, you might want to add additional permissions
    const event = await Event.findById(id);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Classify the event
    const classification = event.classifyCategory();

    res.json({
      category: classification.category,
      confidence: classification.confidence,
    });
  } catch (err) {
    console.error('Event classification error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/events/:id/categories
 * Get top categories for an event
 */
router.get('/:id/categories', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const event = await Event.findById(id);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Get top categories
    const categories = event.getTopCategories(5);

    res.json({
      categories,
    });
  } catch (err) {
    console.error('Event category prediction error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/events/train-classifier
 * Train the classifier with all categorized events (admin only)
 */
router.post('/train-classifier', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    const user = await require('../models/User').findById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Get all events that have categories
    const events = await Event.find({
      category: { $exists: true, $ne: '' },
      $or: [
        { title: { $exists: true, $ne: '' } },
        { description: { $exists: true, $ne: '' } },
        { tags: { $exists: true, $ne: [] } },
      ],
    });

    if (events.length === 0) {
      return res.status(400).json({ error: 'No categorized events found for training' });
    }

    // Train the classifier
    const classifier = Event.trainClassifier(events);

    res.json({
      message: `Classifier trained with ${events.length} events`,
      categories: classifier.categories,
    });
  } catch (err) {
    console.error('Classifier training error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
