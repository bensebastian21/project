const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const FriendRequest = require('../models/FriendRequest');
const User = require('../models/User');
const Event = require('../models/Event');

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

// Utility: get current user's accepted friend IDs
async function getFriendIds(userId) {
  const edges = await FriendRequest.find({ status: 'accepted', $or: [{ from: userId }, { to: userId }] }).select('from to').lean();
  const ids = new Set();
  edges.forEach(e => {
    const a = String(e.from);
    const b = String(e.to);
    if (a === String(userId)) ids.add(b); else if (b === String(userId)) ids.add(a);
  });
  return Array.from(ids);
}

// GET /api/friends -> list of accepted friends (basic profile)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const friendIds = await getFriendIds(req.user.id);
    const users = await User.find({ _id: { $in: friendIds }, role: 'student' })
      .select('_id fullname username email institute interests profilePic role')
      .lean();
    res.json(users);
  } catch (e) {
    console.error('friends list error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/friends/requests -> inbound and outbound
router.get('/requests', authenticateToken, async (req, res) => {
  try {
    const inboundRaw = await FriendRequest.find({ to: req.user.id, status: 'pending' })
      .populate('from', '_id fullname username institute profilePic role')
      .lean();
    const outboundRaw = await FriendRequest.find({ from: req.user.id, status: 'pending' })
      .populate('to', '_id fullname username institute profilePic role')
      .lean();
    const inbound = inboundRaw.filter(r => r.from && r.from.role === 'student');
    const outbound = outboundRaw.filter(r => r.to && r.to.role === 'student');
    res.json({ inbound, outbound });
  } catch (e) {
    console.error('requests error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/friends/requests { to }
router.post('/requests', authenticateToken, async (req, res) => {
  try {
    const { to } = req.body || {};
    if (!to || String(to) === String(req.user.id)) return res.status(400).json({ error: 'Invalid target user' });
    // Respect recipient privacy: allowFriendRequests must not be false
    const recipient = await User.findById(to).select('_id role settings').lean();
    if (!recipient) return res.status(404).json({ error: 'User not found' });
    const allow = recipient?.settings?.privacy?.allowFriendRequests !== false;
    if (!allow) return res.status(403).json({ error: 'This user is not accepting friend requests' });
    // Prevent duplicates/opposites
    const existing = await FriendRequest.findOne({
      $or: [
        { from: req.user.id, to },
        { from: to, to: req.user.id },
      ],
    });
    if (existing) return res.status(200).json({ message: 'Request already exists', requestId: existing._id, status: existing.status });

    const fr = await FriendRequest.create({ from: req.user.id, to, status: 'pending' });
    res.json({ message: 'Request sent', requestId: fr._id });
  } catch (e) {
    if (e.code === 11000) return res.status(200).json({ message: 'Request already exists' });
    console.error('send request error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/friends/requests/:id/accept
router.put('/requests/:id/accept', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const fr = await FriendRequest.findOne({ _id: id, to: req.user.id, status: 'pending' });
    if (!fr) return res.status(404).json({ error: 'Request not found' });
    fr.status = 'accepted';
    await fr.save();
    res.json({ message: 'Accepted', requestId: fr._id });
  } catch (e) {
    console.error('accept request error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/friends/requests/:id/decline
router.put('/requests/:id/decline', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const fr = await FriendRequest.findOne({ _id: id, to: req.user.id, status: 'pending' });
    if (!fr) return res.status(404).json({ error: 'Request not found' });
    fr.status = 'declined';
    await fr.save();
    res.json({ message: 'Declined', requestId: fr._id });
  } catch (e) {
    console.error('decline request error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/friends/requests/:id -> cancel own outbound pending
router.delete('/requests/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const fr = await FriendRequest.findOne({ _id: id, from: req.user.id, status: 'pending' });
    if (!fr) return res.status(404).json({ error: 'Request not found' });
    await fr.deleteOne();
    res.json({ message: 'Cancelled' });
  } catch (e) {
    console.error('cancel request error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/friends/suggestions
router.get('/suggestions', authenticateToken, async (req, res) => {
  try {
    const me = await User.findById(req.user.id).select('_id institute interests').lean();
    if (!me) return res.status(401).json({ error: 'Unauthorized' });
    const myFriends = new Set(await getFriendIds(req.user.id));
    // Exclude me and already-friends
    const candidates = await User.find({ _id: { $ne: req.user.id }, role: 'student' })
      .select('_id fullname username institute interests profilePic role')
      .lean();

    // Build a quick map of accepted edges to compute mutuals
    const accepted = await FriendRequest.find({ status: 'accepted' }).select('from to').lean();
    const graph = new Map();
    const addEdge = (a, b) => {
      if (!graph.has(a)) graph.set(a, new Set());
      graph.get(a).add(b);
    };
    accepted.forEach(e => { addEdge(String(e.from), String(e.to)); addEdge(String(e.to), String(e.from)); });

    const mySet = graph.get(String(req.user.id)) || new Set();

    // Compute mutual events between current user and candidates
    const myEvents = await Event.find({ 'registrations.studentId': req.user.id, isDeleted: { $ne: true } })
      .select('registrations')
      .lean();
    // Build per-event attendee sets for quick lookup
    const eventAttendeeSets = myEvents.map(ev => new Set((ev.registrations||[]).filter(r=>r.status==='registered').map(r=>String(r.studentId))));

    const W1 = 3, W2 = 2, W3 = 1, W4 = 3; // sameInstitute, mutualFriends, sharedInterests, mutualEvents
    const CAP = 10;
    const myInterests = new Set((me.interests || []).map(s => String(s).toLowerCase()));
    const ranked = candidates
      .filter(u => !myFriends.has(String(u._id)))
      .map(u => {
        const sameInstitute = me.institute && u.institute && me.institute === u.institute ? 1 : 0;
        const mutuals = [...(graph.get(String(u._id)) || new Set())].filter(x => mySet.has(x)).length;
        const sharedInterests = (u.interests || []).reduce((acc, it) => acc + (myInterests.has(String(it).toLowerCase()) ? 1 : 0), 0);
        // mutual events count: number of my events where candidate also registered
        let mutualEvents = 0;
        if (eventAttendeeSets.length) {
          const uid = String(u._id);
          for (const set of eventAttendeeSets) { if (set.has(uid)) mutualEvents++; }
        }
        const score = (sameInstitute * W1) + (Math.min(CAP, mutuals) * W2) + (sharedInterests * W3) + (Math.min(CAP, mutualEvents) * W4);
        return { ...u, sameInstitute: !!sameInstitute, mutuals, sharedInterests, mutualEvents, score };
      })
      .filter(u => u.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.mutualEvents !== a.mutualEvents) return b.mutualEvents - a.mutualEvents;
        if (b.mutuals !== a.mutuals) return b.mutuals - a.mutuals;
        return b.sharedInterests - a.sharedInterests;
      })
      .slice(0, 20);

    res.json(ranked);
  } catch (e) {
    console.error('suggestions error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
// DELETE /api/friends/:userId -> unfriend target user (remove accepted edge)
router.delete('/:userId', authenticateToken, async (req, res) => {
  try {
    const me = String(req.user.id);
    const other = String(req.params.userId);
    const fr = await FriendRequest.findOne({
      status: 'accepted',
      $or: [ { from: me, to: other }, { from: other, to: me } ]
    });
    if (!fr) return res.status(404).json({ error: 'Friendship not found' });
    await fr.deleteOne();
    res.json({ message: 'Unfriended' });
  } catch (e) {
    console.error('unfriend error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});
