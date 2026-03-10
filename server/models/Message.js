const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Encrypted Content
  content: { type: String, required: true }, // Hex string
  iv: { type: String, required: true }, // Hex string

  read: { type: Boolean, default: false },
  readAt: { type: Date },

  // Metadata for easy sorting/grouping
  createdAt: { type: Date, default: Date.now },
});

// Indexes for quick lookup of chat history between two users
messageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
messageSchema.index({ receiver: 1, sender: 1, createdAt: -1 });
messageSchema.index({ receiver: 1, read: 1 }); // For unread counts

module.exports = mongoose.model('Message', messageSchema);
