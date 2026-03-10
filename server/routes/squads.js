const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Squad = require('../models/Squad');
const User = require('../models/User');
const Event = require('../models/Event');
const Notification = require('../models/Notification');

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access token required' });
    const jwtSecret = process.env.JWT_SECRET || 'default-jwt-secret-for-development';
    jwt.verify(token, jwtSecret, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid or expired token' });
        req.user = user;
        // Map id to _id for consistency in squads routes
        if (req.user && req.user.id && !req.user._id) {
            req.user._id = req.user.id;
        }
        next();
    });
}

// GET /api/squads/mine
// Get all squads the current user is a part of or leads
router.get('/mine', authenticateToken, async (req, res) => {
    try {
        const squads = await Squad.find({
            $or: [{ leaderId: req.user._id }, { members: req.user._id }],
        })
            .populate('leaderId', 'fullname username profilePic')
            .populate('members', 'fullname username profilePic')
            .populate('pendingMembers', 'fullname username profilePic')
            .sort({ updatedAt: -1 });
        res.json(squads);
    } catch (err) {
        console.error('Error fetching squads:', err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// GET /api/squads/:id/events
// Get all events this squad is registered for
router.get('/:id/events', authenticateToken, async (req, res) => {
    try {
        const squad = await Squad.findById(req.params.id);
        if (!squad) return res.status(404).json({ error: 'Squad not found' });

        // Auth check: only squad members or leader can view
        const userId = req.user._id.toString();
        const isMember = squad.members.some(m => m.toString() === userId);
        const isLeader = squad.leaderId.toString() === userId;
        if (!isMember && !isLeader) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const events = await Event.find({
            'registrations.squadId': squad._id,
            isDeleted: { $ne: true }
        }).select('title date location isOnline price category imageUrl isTeamEvent').lean();

        res.json(events);
    } catch (err) {
        console.error('Error fetching squad events:', err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// GET /api/squads/:id
// Get a specific squad
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const squad = await Squad.findById(req.params.id)
            .populate('leaderId', 'fullname username profilePic')
            .populate('members', 'fullname username profilePic')
            .populate('pendingMembers', 'fullname username profilePic');

        if (!squad) {
            return res.status(404).json({ error: 'Squad not found' });
        }

        // Check if user is in squad or leading it
        const isMember = squad.members.some(id => id.toString() === req.user._id.toString());
        const isPending = squad.pendingMembers.some(id => id.toString() === req.user._id.toString());
        const isLeader = squad.leaderId._id.toString() === req.user._id.toString();

        if (!isMember && !isPending && !isLeader) {
            return res.status(403).json({ error: 'Not authorized to view this squad' });
        }

        res.json(squad);
    } catch (err) {
        console.error('Error fetching squad:', err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// POST /api/squads
// Create a new squad
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { name, description, iconColor } = req.body;
        if (!name || name.trim() === '') {
            return res.status(400).json({ error: 'Squad name is required' });
        }

        const squad = new Squad({
            name: name.trim(),
            description: description || '',
            iconColor: iconColor || '#4F46E5',
            leaderId: req.user._id,
            members: [req.user._id], // Leader is automatically a member
        });

        await squad.save();
        res.status(201).json(squad);
    } catch (err) {
        console.error('Error creating squad:', err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// POST /api/squads/:id/invite
// Invite a user to the squad (by username or email)
router.post('/:id/invite', authenticateToken, async (req, res) => {
    try {
        const { username, userId } = req.body;
        if (!username && !userId) {
            return res.status(400).json({ error: 'Username, email, or userId required' });
        }

        const squad = await Squad.findById(req.params.id);
        if (!squad) {
            return res.status(404).json({ error: 'Squad not found' });
        }

        // Only leader can invite for MVP
        if (squad.leaderId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Only the squad leader can invite members' });
        }

        // Find the user to invite
        let userToInvite;
        if (userId) {
            userToInvite = await User.findById(userId);
        } else {
            userToInvite = await User.findOne({
                $or: [
                    { username: new RegExp(`^${username}$`, 'i') },
                    { email: new RegExp(`^${username}$`, 'i') }
                ]
            });
        }

        if (!userToInvite) {
            return res.status(404).json({ error: 'User not found' });
        }

        const targetId = userToInvite._id.toString();

        if (squad.members.some(id => id.toString() === targetId)) {
            return res.status(400).json({ error: 'User is already a member' });
        }
        if (squad.pendingMembers.some(id => id.toString() === targetId)) {
            return res.status(400).json({ error: 'User is already invited' });
        }

        squad.pendingMembers.push(userToInvite._id);
        await squad.save();

        // Create a Notification for the invited user
        const notification = new Notification({
            userId: userToInvite._id,
            type: 'Squad',
            title: 'Squad Invitation',
            message: `${req.user.fullname || req.user.username} invited you to join the squad "${squad.name}".`,
            data: { squadId: squad._id, action: 'squad_invite' }
        });
        await notification.save();

        res.json({ message: 'User invited successfully', squad });
    } catch (err) {
        console.error('Error inviting to squad:', err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// POST /api/squads/:id/respond
// Respond to a squad invitation (accept or decline)
router.post('/:id/respond', authenticateToken, async (req, res) => {
    try {
        const { action } = req.body;
        const squad = await Squad.findById(req.params.id);
        if (!squad) {
            return res.status(404).json({ error: 'Squad not found' });
        }

        const userId = req.user._id.toString();
        const isPending = squad.pendingMembers.some(id => id.toString() === userId);

        if (!isPending) {
            return res.status(400).json({ error: 'You do not have a pending invitation for this squad' });
        }

        if (action === 'accept') {
            squad.pendingMembers = squad.pendingMembers.filter(id => id.toString() !== userId);
            if (!squad.members.some(id => id.toString() === userId)) {
                squad.members.push(new mongoose.Types.ObjectId(userId));
            }
            await squad.save();
            return res.json({ message: 'Successfully joined the squad', squad });
        } else if (action === 'decline') {
            squad.pendingMembers = squad.pendingMembers.filter(id => id.toString() !== userId);
            await squad.save();
            return res.json({ message: 'Declined squad invitation' });
        } else {
            return res.status(400).json({ error: 'Invalid action' });
        }
    } catch (err) {
        console.error('Error responding to squad invite:', err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// DELETE /api/squads/:id/leave
// Leave a squad
router.delete('/:id/leave', authenticateToken, async (req, res) => {
    try {
        const squad = await Squad.findById(req.params.id);
        if (!squad) {
            return res.status(404).json({ error: 'Squad not found' });
        }

        const userId = req.user._id.toString();

        if (squad.leaderId.toString() === userId) {
            return res.status(400).json({ error: 'Leader cannot leave the squad. Transfer leadership or delete the squad.' });
        }

        squad.members = squad.members.filter(id => id.toString() !== userId);
        await squad.save();

        res.json({ message: 'Successfully left the squad' });
    } catch (err) {
        console.error('Error leaving squad:', err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// DELETE /api/squads/:id
// Delete a squad completely (Leader only)
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const squad = await Squad.findById(req.params.id);
        if (!squad) {
            return res.status(404).json({ error: 'Squad not found' });
        }

        const userId = req.user._id.toString();

        if (squad.leaderId.toString() !== userId) {
            return res.status(403).json({ error: 'Only the squad leader can delete the squad.' });
        }

        await Squad.findByIdAndDelete(req.params.id);

        res.json({ message: 'Squad successfully deleted' });
    } catch (err) {
        console.error('Error deleting squad:', err);
        res.status(500).json({ error: 'Server Error' });
    }
});

module.exports = router;
