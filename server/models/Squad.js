const mongoose = require('mongoose');

const squadSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, maxlength: 50 },
    leaderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Users who are active members of the squad
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // Users who have been invited but haven't accepted yet
    pendingMembers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // Description / bio for the squad (optional)
    description: { type: String, maxlength: 200, default: '' },

    // A visually distinct avatar or icon color (optional)
    iconColor: { type: String, default: '#4F46E5' }, // Default Indigo

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Update timestamp on save
squadSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

// Indexes for quick lookups
squadSchema.index({ leaderId: 1 });
squadSchema.index({ members: 1 });
squadSchema.index({ name: 'text' });

module.exports = mongoose.model('Squad', squadSchema);
