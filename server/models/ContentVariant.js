const mongoose = require('mongoose');

const contentVariantSchema = new mongoose.Schema({
  variantId: { type: String, required: true, unique: true },
  runId: { type: String, required: true },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  hostId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  promptTemplateId: { type: String, default: null },
  posterUrl: { type: String, default: null },
  imageFallback: { type: Boolean, default: false },
  textCopy: {
    title: { type: String, default: '' },
    shortHook: { type: String, default: '' },
    descriptionHtml: { type: String, default: '' },
    socialPosts: {
      twitter: { type: String, default: '' },
      instagram: { type: String, default: '' },
      linkedin: { type: String, default: '' },
    },
    keywords: { type: [String], default: [] },
    callToAction: { type: String, default: '' },
    gamificationRewards: { type: [String], default: [] },
    badges: { type: [String], default: [] },
    urgencyTriggers: { type: [String], default: [] },
    targetAudienceInsight: { type: String, default: '' },
  },
  predictedViralScore: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['active', 'winner', 'eliminated', 'partial', 'stale'],
    default: 'active',
  },
  metrics: {
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    registrations: { type: Number, default: 0 },
    ctr: { type: Number, default: 0 },
    shareRate: { type: Number, default: 0 },
    registrationConversionRate: { type: Number, default: 0 },
  },
  isDeleted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

contentVariantSchema.index({ variantId: 1 }, { unique: true });
contentVariantSchema.index({ runId: 1 });
contentVariantSchema.index({ eventId: 1, status: 1 });
contentVariantSchema.index({ hostId: 1, createdAt: -1 });

module.exports = mongoose.model('ContentVariant', contentVariantSchema);
