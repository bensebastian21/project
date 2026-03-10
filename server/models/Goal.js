const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    targetCount: { type: Number, required: true, min: 1 },
    category: { type: String, required: true }, // e.g., 'Technology', 'Business', 'Charity', or 'Any'
    isCompleted: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Goal', goalSchema);
