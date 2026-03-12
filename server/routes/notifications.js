const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const jwt = require('jsonwebtoken');

// Middleware to authenticate token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, process.env.JWT_SECRET || 'default-jwt-secret-for-development', (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// GET / - Fetch all notifications for the user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(200); // Increased limit for history
    res.json(notifications);
  } catch (err) {
    console.error('Fetch notifications error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST / - Create a notification
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { type, title, message, data } = req.body;
    const notification = new Notification({
      userId: req.user.id,
      type: type || 'System',
      title,
      message,
      data,
    });
    await notification.save();
    res.json(notification);
  } catch (err) {
    console.error('Create notification error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /:id/read - Mark a notification as read
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId: req.user.id },
      { read: true },
      { new: true },
    );
    if (!notification) return res.status(404).json({ error: 'Notification not found' });
    res.json(notification);
  } catch (err) {
    console.error('Mark read error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /:id/status - Update notification status (active -> processed)
router.patch('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId: req.user.id },
      { status },
      { new: true },
    );
    if (!notification) return res.status(404).json({ error: 'Notification not found' });
    res.json(notification);
  } catch (err) {
    console.error('Update status error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /:id - Delete a notification
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Notification.findOneAndDelete({ _id: id, userId: req.user.id });
    if (!result) return res.status(404).json({ error: 'Notification not found' });
    res.json({ message: 'Notification deleted' });
  } catch (err) {
    console.error('Delete notification error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /all/read - Delete all read notifications (optional cleanup)
router.delete('/all/read', authenticateToken, async (req, res) => {
  try {
    await Notification.deleteMany({ userId: req.user.id, read: true });
    res.json({ message: 'Read notifications cleared' });
  } catch (err) {
    console.error('Clear read error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
