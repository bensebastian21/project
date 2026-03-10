const express = require('express');
const router = express.Router();
const Memory = require('../models/Memory');
const Event = require('../models/Event');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
require('dotenv').config();

// Temporary storage for images before Cloudinary upload
const upload = multer({ dest: 'uploads/' });

// Provide a flexible generic verifyAuth that allows students OR hosts to interact
// This relies on whatever standard token verification middleware exists.
// For simplicity, we'll write a quick custom verifier that checks either role, 
// using the existing jsonwebtoken approach in auth.js.
const jwt = require('jsonwebtoken');

const verifyAnyAuth = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // { id, role, username }
        next();
    } catch (error) {
        res.status(400).json({ error: 'Invalid token.' });
    }
};

/**
 * GET: Fetch global sentiment feed (latest 20 memories)
 */
router.get('/feed', async (req, res) => {
    try {
        const now = new Date();
        const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);

        // Fetch all memories and then filter based on populated event status
        // More efficient to do in aggregation, but for simplicity with existing schema:
        const memories = await Memory.find()
            .populate({
                path: 'eventId',
                select: 'title location date endDate isCompleted'
            })
            .populate('studentId', 'fullname username profilePic role')
            .sort({ createdAt: -1 });

        const liveFeed = memories.filter(m => {
            if (!m.eventId) return false;
            const event = m.eventId;

            // If event is explicitly marked completed, ignore
            if (event.isCompleted) return false;

            const start = new Date(event.date);
            const end = event.endDate ? new Date(event.endDate) : new Date(start.getTime() + 3 * 60 * 60 * 1000);

            const isLive = now >= start && now <= end;
            if (isLive) {
                console.log(`[FEED] ✅ Live: ${event.title} (${event._id})`);
            }
            return isLive;
        }).slice(0, 20);

        console.log(`[FEED] Returning ${liveFeed.length} live memories`);
        res.status(200).json(liveFeed);
    } catch (error) {
        console.error('Error fetching sentiment feed:', error);
        res.status(500).json({ error: 'Failed to fetch sentiment feed' });
    }
});

/**
 * GET: Fetch all memories for a specific event
 */
router.get('/event/:eventId', async (req, res) => {
    try {
        const { eventId } = req.params;
        const memories = await Memory.find({ eventId })
            .populate('studentId', 'fullname username profilePic role')
            .populate('comments.studentId', 'fullname username profilePic role')
            .sort({ createdAt: -1 });

        res.status(200).json(memories);
    } catch (error) {
        console.error('Error fetching memories:', error);
        res.status(500).json({ error: 'Failed to fetch memories' });
    }
});

/**
 * POST: Create a new memory
 */
router.post('/', verifyAnyAuth, upload.single('image'), async (req, res) => {
    try {
        const { eventId, type, content } = req.body;
        let imageUrl = null;

        // Optional Check: Ensure the user actually registered or attended the event
        // For wider testing purposes right now, we will allow anyone authenticated to post.
        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ error: 'Event not found' });

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const eventDate = new Date(event.date);
        eventDate.setHours(0, 0, 0, 0);

        const isToday = eventDate.getTime() === today.getTime();

        if (!event.isCompleted && !isToday) {
            return res.status(400).json({ error: 'Memories can only be posted for active (today) or completed events' });
        }

        if (type === 'photo' && req.file) {
            const result = await cloudinary.uploader.upload(req.file.path, {
                folder: 'memories',
            });
            imageUrl = result.secure_url;
            // Cleanup local temp file
            fs.unlinkSync(req.file.path);
        } else if (type === 'photo' && !req.file) {
            return res.status(400).json({ error: 'Photo requires an image file' });
        }

        const newMemory = new Memory({
            eventId,
            studentId: req.user.id,
            type,
            content,
            imageUrl
        });

        await newMemory.save();

        // Populate the author info so the frontend can render it immediately
        await newMemory.populate('studentId', 'fullname username profilePic role');

        res.status(201).json(newMemory);
    } catch (error) {
        console.error('Error creating memory:', error);
        res.status(500).json({ error: 'Failed to create memory' });
    }
});

/**
 * POST: Toggle Like on a memory
 */
router.post('/:memoryId/like', verifyAnyAuth, async (req, res) => {
    try {
        const memory = await Memory.findById(req.params.memoryId);
        if (!memory) return res.status(404).json({ error: 'Memory not found' });

        const userId = req.user.id;
        const likeIndex = memory.likes.findIndex(id => id.toString() === userId);

        if (likeIndex === -1) {
            memory.likes.push(userId); // Add like
        } else {
            memory.likes.splice(likeIndex, 1); // Remove like
        }

        await memory.save();
        res.status(200).json({ likes: memory.likes });
    } catch (error) {
        console.error('Error toggling memory like:', error);
        res.status(500).json({ error: 'Failed to toggle like' });
    }
});

/**
 * POST: Add comment to memory
 */
router.post('/:memoryId/comment', verifyAnyAuth, async (req, res) => {
    try {
        const { text } = req.body;
        if (!text || !text.trim()) return res.status(400).json({ error: 'Comment text is required' });

        const memory = await Memory.findById(req.params.memoryId);
        if (!memory) return res.status(404).json({ error: 'Memory not found' });

        const newComment = {
            studentId: req.user.id,
            text: text.trim()
        };

        memory.comments.push(newComment);
        await memory.save();

        // Re-populate comments to send back the full details
        await memory.populate('comments.studentId', 'fullname username profilePic role');

        res.status(201).json(memory.comments);
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({ error: 'Failed to add comment' });
    }
});

/**
 * DELETE: Remove a memory
 */
router.delete('/:memoryId', verifyAnyAuth, async (req, res) => {
    try {
        const memory = await Memory.findById(req.params.memoryId);
        if (!memory) return res.status(404).json({ error: 'Memory not found' });

        // Allow author or admin to delete
        if (memory.studentId.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized to delete this memory' });
        }

        await Memory.findByIdAndDelete(req.params.memoryId);
        res.status(200).json({ message: 'Memory deleted successfully' });
    } catch (error) {
        console.error('Error deleting memory:', error);
        res.status(500).json({ error: 'Failed to delete memory' });
    }
});

module.exports = router;
