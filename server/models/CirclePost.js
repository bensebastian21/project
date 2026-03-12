const mongoose = require('mongoose');

const circlePostSchema = new mongoose.Schema({
    circleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Circle', required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, maxlength: 5000 },
    images: [{ type: String }],
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    comments: [{
        author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        content: { type: String, required: true, maxlength: 1000 },
        createdAt: { type: Date, default: Date.now }
    }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Update timestamp on save
circlePostSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

// Indexes
circlePostSchema.index({ circleId: 1, createdAt: -1 });

module.exports = mongoose.model('CirclePost', circlePostSchema);
