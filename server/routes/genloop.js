const express = require('express');
const router = express.Router();
const axios = require('axios');
const { authenticateToken: auth } = require('../utils/auth');
const Event = require('../models/Event');

// URL of the local Python FastAPI microservice
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000/api/genloop';

// Custom Axios instance with extended timeout for heavy AI generation (LCM models take ~60-120s)
const aiClient = axios.create({
    baseURL: AI_SERVICE_URL,
    timeout: 300000, // 5 minutes timeout for CPU inference
});

/**
 * @desc Generate complete event content via local AI
 * @route POST /api/genloop/generate
 * @access Private (Host only)
 */
router.post('/generate', auth, async (req, res) => {
    try {
        const { title, topic, targetAudience, venue } = req.body;

        if (!title || !topic) {
            return res.status(400).json({ msg: 'Title and Topic are required for generation.' });
        }

        console.log(`[GenLoop] Initiating AI sequence for: ${title}`);

        // Call Python Microservice
        const response = await aiClient.post('/generate', {
            title,
            topic,
            target_audience: targetAudience || 'All Students',
            venue: venue || 'TBD'
        });

        if (response.data && response.data.success) {
            return res.json(response.data.data);
        } else {
            throw new Error('AI Service returned an error payload');
        }

    } catch (err) {
        console.error('[GenLoop Error] Generation failed:', err.message);
        if (err.code === 'ECONNABORTED') {
            return res.status(504).json({ msg: 'AI Generation timed out. CPU is processing heavily.' });
        }
        if (err.code === 'ECONNREFUSED') {
            return res.status(503).json({ msg: 'AI Microservice is offline. Ensure Python FastAPI is running.' });
        }
        res.status(500).json({ msg: 'Failed to generate content', error: err.message });
    }
});

/**
 * @desc Track a view/click manually (The Viral Feedback Loop)
 * @route POST /api/genloop/track/:id
 * @access Public
 */
router.post('/track/:id', async (req, res) => {
    try {
        const eventId = req.params.id;
        const { action } = req.body; // 'view' or 'click'

        const update = {};
        if (action === 'view') update['metrics.views'] = 1;
        if (action === 'click') update['metrics.clicks'] = 1;

        if (Object.keys(update).length === 0) return res.status(400).json({ msg: 'Invalid action' });

        // Increment the specific metric atomically
        const event = await Event.findByIdAndUpdate(
            eventId,
            { $inc: update },
            { new: true }
        );

        res.json({ success: true });
    } catch (err) {
        console.error('[GenLoop Error] Tracking failed:', err.message);
        res.status(500).send('Server Error');
    }
});

/**
 * @desc CRON-like endpoint to extract data for Scikit-Learn nightly training
 * @route POST /api/genloop/export-feedback
 * @access Admin/Internal
 */
router.post('/export-feedback', async (req, res) => {
    try {
        // Find events that use the AI and have some views
        const events = await Event.find({
            'ai.generatedDescription': { $ne: null },
            'metrics.views': { $gt: 0 }
        }).select('ai.generatedDescription metrics.views metrics.registrations _id');

        // Format to JSON for the Python pipeline
        const feedbackPayload = events.map(e => ({
            event_id: e._id.toString(),
            aiDescription: e.ai.generatedDescription,
            views: e.metrics.views || 1,
            registrations: e.metrics.registrations || e.registrations?.length || 0
        }));

        // Send raw JSON to the python backend to be written to viral_feedback.json
        // (In a real system, you'd save it to a shared volume or trigger the python pipeline directly)

        res.json({ success: true, exported_count: feedbackPayload.length, data: feedbackPayload });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

module.exports = router;
