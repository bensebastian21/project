const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  hostId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { 
    type: String, 
    enum: ['impression', 'click', 'registration'], 
    required: true 
  },
  source: { 
    type: String, 
    default: 'direct' 
  },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Optional: track who clicked
  metadata: {
    browser: String,
    device: String,
    os: String
  },
  timestamp: { type: Date, default: Date.now }
});

// Index for efficient aggregation
analyticsSchema.index({ eventId: 1, type: 1, timestamp: -1 });
analyticsSchema.index({ hostId: 1, type: 1, timestamp: -1 });

module.exports = mongoose.model('Analytics', analyticsSchema);
