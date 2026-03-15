const express = require('express');
const router = express.Router();
const Analytics = require('../models/Analytics');
const Event = require('../models/Event');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

// Optional auth: decode JWT if provided, ignore if missing/invalid
const optionalAuth = (req, _res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return next();
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (!err) req.user = user;
    next();
  });
};

/**
 * @route POST /api/analytics/log
 * @desc Log an impression or click
 * @access Public (Optional Auth)
 */
router.post('/log', optionalAuth, async (req, res) => {
  const { eventId, type, source, metadata } = req.body;
  console.log(`[Analytics] POST /log - Type: ${type}, Event: ${eventId}, Source: ${source}`);
  
  try {
    if (!eventId || !type) {
      console.warn('[Analytics] Missing eventId or type in log request');
      return res.status(400).json({ error: 'eventId and type are required' });
    }

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      console.warn(`[Analytics] Invalid eventId: ${eventId}`);
      return res.status(400).json({ error: 'Invalid eventId' });
    }

    // Find the event to get the hostId
    const event = await Event.findById(eventId).select('hostId');
    if (!event) {
      console.warn(`[Analytics] Event not found for log: ${eventId}`);
      return res.status(404).json({ error: 'Event not found' });
    }

    if (!event.hostId) {
      console.warn(`[Analytics] Event ${eventId} has no hostId!`);
      return res.status(400).json({ error: 'Event has no owner' });
    }

    // Dedup logic varies by type:
    // - registration: one per userId+eventId ever (cancel+reregister = same count)
    // - impression/click: one per userId+eventId within 30 seconds
    const userId = req.user ? req.user.id : null;

    let dedupQuery;
    if (type === 'registration') {
      // For registrations, only count once per user per event regardless of time
      if (!userId) {
        // Anonymous registrations — skip logging entirely, not meaningful
        return res.status(201).json({ success: true, deduplicated: true });
      }
      dedupQuery = { eventId, type: 'registration', userId };
    } else {
      const dedupWindow = new Date(Date.now() - 30 * 1000);
      dedupQuery = {
        eventId,
        type,
        timestamp: { $gte: dedupWindow },
        ...(userId ? { userId } : { userId: null, 'metadata.url': metadata?.url })
      };
    }

    const existing = await Analytics.findOne(dedupQuery).select('_id').lean();
    if (existing) {
      console.log(`[Analytics] Dedup skip for event ${eventId} type ${type}`);
      return res.status(201).json({ success: true, deduplicated: true });
    }

    const log = new Analytics({
      eventId,
      hostId: event.hostId,
      type,
      source: source || 'direct',
      userId,
      metadata: metadata || {}
    });

    try {
      await log.save();
      console.log(`[Analytics] Log saved for event ${eventId}`);
    } catch (saveErr) {
      if (saveErr.code === 11000) {
        return res.status(201).json({ success: true, deduplicated: true });
      }
      throw saveErr;
    }

    // Increment high-level metrics in Event model for quick reference
    const update = {};
    if (type === 'impression') update['metrics.views'] = 1;
    if (type === 'click') update['metrics.clicks'] = 1;

    if (Object.keys(update).length > 0) {
      await Event.findByIdAndUpdate(eventId, { $inc: update });
    }

    res.status(201).json({ success: true });
  } catch (err) {
    console.error('[Analytics] Log error:', err.message, err.stack);
    res.status(500).json({ error: 'Server error saving log', details: err.message });
  }
});

/**
 * @route GET /api/analytics/studio
 * @desc Get aggregated analytics for host events
 * @access Private (Host Only)
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Missing token' });
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

router.get('/studio', authenticateToken, async (req, res) => {
  const { days = 28, eventId } = req.query;
  console.log(`[Analytics] GET /studio - User: ${req.user.id}, Days: ${days}, Event: ${eventId}`);
  
  try {
    if (!mongoose.Types.ObjectId.isValid(req.user.id)) {
      return res.status(400).json({ error: 'Invalid user ID in token' });
    }
    const hostId = new mongoose.Types.ObjectId(req.user.id);
    
    if (eventId && !mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ error: 'Invalid eventId' });
    }

    // Calculate start date
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Base query for this host's analytics
    const matchQuery = { hostId, timestamp: { $gte: startDate } };
    if (eventId) {
      matchQuery.eventId = new mongoose.Types.ObjectId(eventId);
    }

    // 1. Get high-level summary metrics
    const overallMetrics = await Analytics.aggregate([
      { $match: matchQuery },
      { $group: { _id: "$type", count: { $sum: 1 } } }
    ]);

    const metrics = {
      impressions: 0,
      clicks: 0,
      registrations: 0
    };

    overallMetrics.forEach(m => {
      if (m._id === 'impression') metrics.impressions = m.count;
      if (m._id === 'click') metrics.clicks = m.count;
      if (m._id === 'registration') metrics.registrations = m.count;
    });

    metrics.ctr = metrics.impressions > 0 ? (metrics.clicks / metrics.impressions) * 100 : 0;
    metrics.conversionRate = metrics.clicks > 0 ? (metrics.registrations / metrics.clicks) * 100 : 0;

    // 2. Get time-series data
    const timeSeries = await Analytics.aggregate([
      { $match: matchQuery },
      { $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
            type: "$type"
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.date": 1 } }
    ]);

    // 3. Get top events (only if eventId is NOT provided, otherwise it's redundant)
    let populatedTopEvents = [];
    if (!eventId) {
      const topEvents = await Analytics.aggregate([
        { $match: { hostId, timestamp: { $gte: startDate } } },
        { $group: {
            _id: { eventId: "$eventId", type: "$type" },
            count: { $sum: 1 }
          }
        },
        { $group: {
            _id: "$_id.eventId",
            metrics: { $push: { type: "$_id.type", count: "$count" } }
          }
        },
        { $limit: 10 }
      ]);

      populatedTopEvents = await Promise.all(topEvents.map(async (te) => {
        const event = await Event.findById(te._id).select('title');
        const eventMetrics = {
          impressions: 0,
          clicks: 0,
          registrations: 0
        };
        te.metrics.forEach(m => {
          if (m.type === 'impression') eventMetrics.impressions = m.count;
          if (m.type === 'click') eventMetrics.clicks = m.count;
          if (m.type === 'registration') eventMetrics.registrations = m.count;
        });
        return {
          id: te._id,
          title: event ? event.title : 'Deleted Event',
          ...eventMetrics,
          ctr: eventMetrics.impressions > 0 ? (eventMetrics.clicks / eventMetrics.impressions) * 100 : 0
        };
      }));
    }

    res.json({
      summary: metrics,
      timeSeries,
      topEvents: populatedTopEvents.sort((a, b) => b.clicks - a.clicks)
    });
  } catch (err) {
    console.error('Analytics studio error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @route DELETE /api/analytics/dev/clear
 * @desc Dev-only: wipe all analytics records
 * @access Dev only (NODE_ENV !== production)
 */
router.delete('/dev/clear', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Not available in production' });
  }
  try {
    const result = await Analytics.deleteMany({});
    console.log(`[Analytics] Dev clear: deleted ${result.deletedCount} records`);
    res.json({ success: true, deleted: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
