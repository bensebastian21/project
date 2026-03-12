const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Encrypted Content
  content: { type: String, required: true }, // Hex string
  iv: { type: String, required: true }, // Hex string

  delivered: { type: Boolean, default: false },
  deliveredAt: { type: Date },

  read: { type: Boolean, default: false },
  readAt: { type: Date },

  // Structured Message support (e.g. invites)
  type: { type: String, default: 'text' }, // 'text' | 'circle_invite'
  metadata: { type: Object }, // { circleId, circleName, etc }
  createdAt: { type: Date, default: Date.now },
});

// Indexes for quick lookup of chat history between two users
messageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
messageSchema.index({ receiver: 1, sender: 1, createdAt: -1 });
messageSchema.index({ receiver: 1, read: 1 }); // For unread counts

module.exports = mongoose.model('Message', messageSchema);
