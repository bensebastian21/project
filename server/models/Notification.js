const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: ['System', 'Friend Request', 'Achievement', 'Event', 'Reminder', 'Squad', 'Circle Invite'],
    default: 'System',
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  data: { type: Object, default: {} }, // For linking to entities (e.g. friendId, eventId)
  read: { type: Boolean, default: false },
  status: { type: String, enum: ['active', 'processed'], default: 'active' }, // To track if a request has been handled
  createdAt: { type: Date, default: Date.now, expires: '30d' }, // Auto-delete after 30 days
});

module.exports = mongoose.model('Notification', NotificationSchema);
