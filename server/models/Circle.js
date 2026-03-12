const mongoose = require('mongoose');

const circleSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, required: true, maxlength: 1000 },
    interestTags: [{ type: String }],
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    admins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    events: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }],
    bannerUrl: { type: String, default: '' },
    iconColor: { type: String, default: '#3B82F6' },
    visibility: { type: String, enum: ['public', 'private'], default: 'public' },
    joinPolicy: { type: String, enum: ['open', 'request'], default: 'open' },
    pendingRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    pendingInvites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Update timestamp on save
circleSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

// Indexes
circleSchema.index({ name: 'text', interestTags: 'text' });
circleSchema.index({ members: 1 });

module.exports = mongoose.model('Circle', circleSchema);
