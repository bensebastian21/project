const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');
const { decryptMessage } = require('../utils/encryption');
const { authenticateToken } = require('../utils/auth'); // Assuming this utility exists or inline it

// Auth Middleware (Reusing snippet from other files if utils/auth is not centralized)
// For robustness, let's use the one from index.js or recreate it here if not exported.
// Ideally, `authenticateToken` should be imported. I'll assume common pattern or local definition.
const jwt = require('jsonwebtoken');
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

/**
 * @route GET /api/p2p-chat/history/:friendId
 * @desc Get chat history with a specific friend (decrypted)
 */
router.get('/history/:friendId', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { friendId } = req.params;

    // Fetch messages where (sender=me AND receiver=friend) OR (sender=friend AND receiver=me)
    const messages = await Message.find({
      $or: [
        { sender: userId, receiver: friendId },
        { sender: friendId, receiver: userId },
      ],
    })
      .sort({ createdAt: 1 })
      .limit(100); // Limit last 100 messages

    // Decrypt messages
    const decryptedMessages = messages.map((msg) => ({
      _id: msg._id,
      sender: msg.sender,
      receiver: msg.receiver,
      content: decryptMessage({ content: msg.content, iv: msg.iv }),
      createdAt: msg.createdAt,
      read: msg.read,
    }));

    res.json(decryptedMessages);

    // Async: Mark messages from friend as read
    await Message.updateMany(
      { sender: friendId, receiver: userId, read: false },
      { $set: { read: true, readAt: new Date() } },
    );
  } catch (err) {
    console.error('Chat history error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @route GET /api/p2p-chat/conversations
 * @desc Get list of recent conversations (last message with each friend)
 */
router.get('/conversations', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Aggregate to find unique interlocutors and last message
    // This is complex in Mongo, simplified strategy:
    // 1. Get recent messages involving user
    // 2. Group by "other" person

    // Aggregation pipeline
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: require('mongoose').Types.ObjectId(userId) },
            { receiver: require('mongoose').Types.ObjectId(userId) },
          ],
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$sender', require('mongoose').Types.ObjectId(userId)] },
              '$receiver',
              '$sender',
            ],
          },
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$receiver', require('mongoose').Types.ObjectId(userId)] },
                    { $eq: ['$read', false] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'friend',
        },
      },
      {
        $unwind: '$friend',
      },
      {
        $project: {
          friendId: '$friend._id',
          friendName: '$friend.fullname',
          friendUsername: '$friend.username',
          friendPic: '$friend.profilePic',
          lastMessage: 1,
          unreadCount: 1,
        },
      },
      { $sort: { 'lastMessage.createdAt': -1 } },
    ]);

    // Decrypt last messages
    const result = conversations.map((c) => ({
      ...c,
      lastMessage: {
        ...c.lastMessage,
        content: decryptMessage({ content: c.lastMessage.content, iv: c.lastMessage.iv }),
      },
    }));

    res.json(result);
  } catch (err) {
    console.error('Conversations error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
