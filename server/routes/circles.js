const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Circle = require('../models/Circle');
const CirclePost = require('../models/CirclePost');
const Notification = require('../models/Notification');
const path = require('path');

// Polyfill fetch for Node < 18 if not globally available
if (typeof fetch === 'undefined') {
    global.fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
}

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access token required' });
    const jwtSecret = process.env.JWT_SECRET || 'default-jwt-secret-for-development';
    jwt.verify(token, jwtSecret, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid or expired token' });
        req.user = user;
        next();
    });
}

// GET /api/circles - List all circles
router.get('/', async (req, res) => {
    try {
        const { query, tags } = req.query;
        let filter = {};
        if (query) {
            filter.$text = { $search: query };
        }
        if (tags) {
            const tagArray = tags.split(',').map(t => t.trim());
            filter.interestTags = { $in: tagArray };
        }
        const circles = await Circle.find(filter)
            .select('name description interestTags members admins bannerUrl iconColor createdAt')
            .lean();
        res.json(circles);
    } catch (e) {
        console.error('List circles error:', e);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/circles/joined - List circles where user is a member
router.get('/joined', authenticateToken, async (req, res) => {
    try {
        const circles = await Circle.find({ members: req.user.id })
            .select('name description interestTags members admins bannerUrl iconColor createdAt')
            .lean();
        res.json(circles);
    } catch (e) {
        console.error('List joined circles error:', e);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/circles - Create a circle
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { name, description, interestTags, bannerUrl, iconColor, visibility, joinPolicy } = req.body;
        if (!name || !description) {
            return res.status(400).json({ error: 'Name and description are required' });
        }
        const circle = await Circle.create({
            name,
            description,
            interestTags,
            bannerUrl,
            iconColor,
            visibility: visibility || 'public',
            joinPolicy: joinPolicy || 'open',
            admins: [req.user.id],
            members: [req.user.id]
        });
        res.status(201).json(circle);
    } catch (e) {
        console.error('Create circle error:', e);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * POST /api/circles/smart-search
 * NLP-based search for community circles
 */
router.post('/smart-search', async (req, res) => {
    try {
        const { query } = req.body;
        if (!query) return res.status(400).json({ error: 'Query is required' });

        const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
        let parsed = null;

        // Try AI Parsing (Gemini)
        if (geminiKey) {
            try {
                const { GoogleGenerativeAI } = require('@google/generative-ai');
                const genAI = new GoogleGenerativeAI(geminiKey);
                const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

                const prompt = `
Extract community circle search parameters from: "${query}"
Circles are interest-based groups (e.g., Coding, Music, Sports, Wellness).
Output ONLY JSON:
{
  "keywords": ["string"],
  "interestTags": ["string"]
}
                `;

                const result = await model.generateContent(prompt);
                const text = result.response.text().trim();
                const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
                parsed = JSON.parse(cleanJson);
            } catch (e) {
                console.warn('Circles AI search parsing failed:', e.message);
            }
        }

        // Fallback to basic keywords if AI fails
        if (!parsed) {
            parsed = { keywords: [query], interestTags: [] };
        }

        // Build Mongo Query
        let mongoFilter = {};
        
        if (parsed.interestTags && parsed.interestTags.length > 0) {
            mongoFilter.interestTags = { $in: parsed.interestTags.map(t => new RegExp(t, 'i')) };
        } else if (parsed.keywords && parsed.keywords.length > 0) {
            const searchTerms = parsed.keywords.join(' ');
            mongoFilter.$or = [
                { name: { $regex: searchTerms, $options: 'i' } },
                { description: { $regex: searchTerms, $options: 'i' } },
                { interestTags: { $in: parsed.keywords.map(k => new RegExp(k, 'i')) } }
            ];
        }

        const circles = await Circle.find(mongoFilter)
            .select('name description interestTags members admins bannerUrl iconColor createdAt')
            .limit(20)
            .lean();

        res.json({
            circles,
            parsedQuery: parsed
        });

    } catch (e) {
        console.error('Circles smart search error:', e);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/circles/:id - Get circle details
router.get('/:id', async (req, res) => {
    try {
        const circle = await Circle.findById(req.params.id)
            .populate('admins', 'fullname username profilePic')
            .populate('members', 'fullname username profilePic')
            .populate('pendingRequests', 'fullname username profilePic')
            .lean();
        if (!circle) return res.status(404).json({ error: 'Circle not found' });
        res.json(circle);
    } catch (e) {
        console.error('Get circle error:', e);
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT /api/circles/:id - Update circle settings (Admin only)
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const circle = await Circle.findById(req.params.id);
        if (!circle) return res.status(404).json({ error: 'Circle not found' });
        
        if (!circle.admins.includes(req.user.id)) {
            return res.status(403).json({ error: 'Only admins can update settings' });
        }
        
        const updates = req.body;
        const allowed = ['name', 'description', 'interestTags', 'bannerUrl', 'iconColor', 'visibility', 'joinPolicy'];
        
        Object.keys(updates).forEach(key => {
            if (allowed.includes(key)) {
                circle[key] = updates[key];
            }
        });
        
        await circle.save();
        res.json(circle);
    } catch (e) {
        console.error('Update circle error:', e);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE /api/circles/:id - Delete a circle (Admin only)
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const circle = await Circle.findById(req.params.id);
        if (!circle) return res.status(404).json({ error: 'Circle not found' });
        
        if (!circle.admins.includes(req.user.id)) {
            return res.status(403).json({ error: 'Only admins can delete the circle' });
        }
        
        await Circle.deleteOne({ _id: req.params.id });
        // Also delete posts associated with the circle
        await CirclePost.deleteMany({ circleId: req.params.id });
        
        res.json({ message: 'Circle deleted successfully' });
    } catch (e) {
        console.error('Delete circle error:', e);
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT /api/circles/:id/admins - Manage admins (Admins only)
router.put('/:id/admins', authenticateToken, async (req, res) => {
    try {
        const { userId, action } = req.body; // action: 'add' | 'remove'
        const circle = await Circle.findById(req.params.id);
        if (!circle) return res.status(404).json({ error: 'Circle not found' });
        
        if (!circle.admins.includes(req.user.id)) {
            return res.status(403).json({ error: 'Only admins can manage admins' });
        }
        
        if (action === 'add') {
            if (!circle.admins.includes(userId)) circle.admins.push(userId);
        } else if (action === 'remove') {
            if (circle.admins.length <= 1) return res.status(400).json({ error: 'Circle must have at least one admin' });
            circle.admins = circle.admins.filter(id => id.toString() !== userId);
        }
        
        await circle.save();
        res.json(circle);
    } catch (e) {
        console.error('Manage admins error:', e);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE /api/circles/:id/members/:memberId - Remove a member (Admins only)
router.delete('/:id/members/:memberId', authenticateToken, async (req, res) => {
    try {
        const { id, memberId } = req.params;
        const circle = await Circle.findById(id);
        if (!circle) return res.status(404).json({ error: 'Circle not found' });
        
        if (!circle.admins.includes(req.user.id)) {
            return res.status(403).json({ error: 'Only admins can remove members' });
        }
        
        if (circle.admins.includes(memberId)) {
            return res.status(400).json({ error: 'Remove admin status before kicking' });
        }
        
        circle.members = circle.members.filter(m => m.toString() !== memberId);
        await circle.save();
        res.json({ message: 'Member removed successfully' });
    } catch (e) {
        console.error('Remove member error:', e);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/circles/:id/join - Join a circle
router.post('/:id/join', authenticateToken, async (req, res) => {
    try {
        const circle = await Circle.findById(req.params.id);
        if (!circle) return res.status(404).json({ error: 'Circle not found' });
        
        if (circle.members.includes(req.user.id)) {
            return res.status(400).json({ error: 'Already a member' });
        }
        
        if (circle.pendingRequests?.includes(req.user.id)) {
            return res.status(400).json({ error: 'Join request already pending' });
        }

        if (circle.joinPolicy === 'request') {
            circle.pendingRequests.push(req.user.id);
            await circle.save();
            return res.json({ message: 'Join request sent', pending: true });
        }
        
        circle.members.push(req.user.id);
        await circle.save();
        res.json({ message: 'Joined successfully' });
    } catch (e) {
        console.error('Join circle error:', e);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/circles/:id/requests/:userId/approve - Approve a request (Admin only)
router.post('/:id/requests/:userId/approve', authenticateToken, async (req, res) => {
    try {
        const { id, userId } = req.params;
        const circle = await Circle.findById(id);
        if (!circle) return res.status(404).json({ error: 'Circle not found' });
        
        if (!circle.admins.includes(req.user.id)) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        
        // Remove from pending, add to members
        circle.pendingRequests = circle.pendingRequests.filter(r => r.toString() !== userId);
        if (!circle.members.includes(userId)) {
            circle.members.push(userId);
        }
        
        await circle.save();
        res.json({ message: 'Request approved' });
    } catch (e) {
        console.error('Approve request error:', e);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/circles/:id/requests/:userId/reject - Reject a request (Admin only)
router.post('/:id/requests/:userId/reject', authenticateToken, async (req, res) => {
    try {
        const { id, userId } = req.params;
        const circle = await Circle.findById(id);
        if (!circle) return res.status(404).json({ error: 'Circle not found' });
        
        if (!circle.admins.includes(req.user.id)) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        
        circle.pendingRequests = circle.pendingRequests.filter(r => r.toString() !== userId);
        await circle.save();
        res.json({ message: 'Request rejected' });
    } catch (e) {
        console.error('Reject request error:', e);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/circles/:id/posts - Get forum posts
router.get('/:id/posts', async (req, res) => {
    try {
        const posts = await CirclePost.find({ circleId: req.params.id })
            .populate('author', 'fullname username profilePic')
            .populate('comments.author', 'fullname username profilePic')
            .sort({ createdAt: -1 })
            .lean();
        res.json(posts);
    } catch (e) {
        console.error('Get posts error:', e);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/circles/:id/posts - Create a forum post
router.post('/:id/posts', authenticateToken, async (req, res) => {
    try {
        const { content, images } = req.body;
        if (!content) return res.status(400).json({ error: 'Content is required' });
        
        const post = await CirclePost.create({
            circleId: req.params.id,
            author: req.user.id,
            content,
            images
        });
        
        const populatedPost = await CirclePost.findById(post._id)
            .populate('author', 'fullname username profilePic')
            .lean();
            
        res.status(201).json(populatedPost);
    } catch (e) {
        console.error('Create post error:', e);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/circles/:id/posts/:postId/like - Like/Unlike a post
router.post('/:id/posts/:postId/like', authenticateToken, async (req, res) => {
    try {
        const post = await CirclePost.findById(req.params.postId);
        if (!post) return res.status(404).json({ error: 'Post not found' });
        
        const likeIndex = post.likes.indexOf(req.user.id);
        if (likeIndex > -1) {
            post.likes.splice(likeIndex, 1);
        } else {
            post.likes.push(req.user.id);
        }
        
        await post.save();
        res.json({ likes: post.likes.length, isLiked: ! (likeIndex > -1) });
    } catch (e) {
        console.error('Like post error:', e);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/circles/:id/posts/:postId/comment - Comment on a post
router.post('/:id/posts/:postId/comment', authenticateToken, async (req, res) => {
    try {
        const { content } = req.body;
        if (!content) return res.status(400).json({ error: 'Comment content is required' });
        
        const post = await CirclePost.findById(req.params.postId);
        if (!post) return res.status(404).json({ error: 'Post not found' });
        
        post.comments.push({
            author: req.user.id,
            content
        });
        
        await post.save();
        
        const updatedPost = await CirclePost.findById(post._id)
            .populate('comments.author', 'fullname username profilePic')
            .lean();
            
        res.json(updatedPost.comments[updatedPost.comments.length - 1]);
    } catch (e) {
        console.error('Comment post error:', e);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/circles/:id/invite - Invite friends to a circle
router.post('/:id/invite', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { userIds } = req.body; // Array of user IDs
        
        if (!userIds || !Array.isArray(userIds)) {
            return res.status(400).json({ error: 'User IDs array required' });
        }

        const circle = await Circle.findById(id);
        if (!circle) return res.status(404).json({ error: 'Circle not found' });

        // Check if sender is a member
        if (!circle.members.includes(req.user.id)) {
            return res.status(403).json({ error: 'Only members can invite others' });
        }

        const addedInvites = [];
        for (const targetUid of userIds) {
            // Skip if already a member or already invited/pending
            if (circle.members.includes(targetUid) || 
                circle.pendingInvites?.includes(targetUid) ||
                circle.pendingRequests?.includes(targetUid)) {
                continue;
            }

            circle.pendingInvites.push(targetUid);
            addedInvites.push(targetUid);

            // Create notification
            await Notification.create({
                userId: targetUid,
                type: 'Circle Invite',
                title: 'New Community Invitation',
                message: `${req.user.username} invited you to join "${circle.name}"`,
                data: {
                    circleId: circle._id,
                    circleName: circle.name,
                    senderId: req.user.id,
                    senderName: req.user.username
                }
            });
        }

        if (addedInvites.length > 0) {
            await circle.save();
        }

        res.json({ message: 'Invitations sent', count: addedInvites.length });
    } catch (e) {
        console.error('Invite error:', e);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/circles/:id/respond-invite - Respond to a circle invitation
router.post('/:id/respond-invite', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { action } = req.body; // 'accept' | 'decline'
        
        const circle = await Circle.findById(id);
        if (!circle) return res.status(404).json({ error: 'Circle not found' });

        // Check if user has a pending invite
        if (!circle.pendingInvites?.includes(req.user.id)) {
            return res.status(400).json({ error: 'No pending invitation found' });
        }

        // Remove from pending
        circle.pendingInvites = circle.pendingInvites.filter(uid => uid.toString() !== req.user.id);

        if (action === 'accept') {
            if (!circle.members.includes(req.user.id)) {
                circle.members.push(req.user.id);
            }
            await circle.save();
            res.json({ message: 'Invite accepted', joined: true });
        } else {
            await circle.save();
            res.json({ message: 'Invite declined' });
        }
    } catch (e) {
        console.error('Respond invite error:', e);
        res.status(500).json({ error: 'Server error' });
    }
});


module.exports = router;
