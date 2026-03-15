const mongoose = require('mongoose');

const generationRunSchema = new mongoose.Schema({
  runId: { type: String, required: true, unique: true },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  hostId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  variantCount: { type: Number, default: 1 },
  status: {
    type: String,
    enum: ['in_progress', 'completed', 'failed', 'stale'],
    default: 'in_progress',
  },
  promptTemplateId: { type: String, default: null },
  loopIteration: { type: Number, default: 1 },
  completedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

generationRunSchema.index({ eventId: 1, loopIteration: -1 });
generationRunSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('GenerationRun', generationRunSchema);
