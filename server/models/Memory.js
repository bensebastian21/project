const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const memorySchema = new mongoose.Schema({
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['photo', 'text'], required: true },
    content: { type: String, default: '' },
    imageUrl: { type: String, default: null }, // for 'photo' type
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    comments: [commentSchema],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Index to quickly fetch memories by event ID, sorted by newest
memorySchema.index({ eventId: 1, createdAt: -1 });

module.exports = mongoose.model('Memory', memorySchema);
