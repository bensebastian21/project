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
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  timestamp: { type: Date, default: Date.now },
  // Generative viral loop fields
  variantId: { type: String, default: null },
  signal: {
    type: String,
    enum: ['impression', 'click', 'share', 'registration', 'orphaned', null],
    default: null,
  },
  dedupeKey: { type: String },
});

// Index for efficient aggregation
analyticsSchema.index({ eventId: 1, type: 1, timestamp: -1 });
analyticsSchema.index({ hostId: 1, type: 1, timestamp: -1 });
// Dedup lookup index for registration uniqueness per user
analyticsSchema.index({ eventId: 1, type: 1, userId: 1 });
// dedupeKey: only index when set, no unique constraint (nulls break sparse unique indexes)
analyticsSchema.index({ dedupeKey: 1 }, { sparse: true });

module.exports = mongoose.model('Analytics', analyticsSchema);
