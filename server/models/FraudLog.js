const mongoose = require('mongoose');

const fraudLogSchema = new mongoose.Schema({
    targetType: {
        type: String,
        enum: ['User', 'Event', 'Review'],
        required: true
    },
    targetId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'targetType'
    },
    targetName: {
        type: String,
        default: ''
    },
    reason: {
        type: String,
        required: true
    },
    severity: {
        type: String,
        enum: ['Low', 'Medium', 'High'],
        default: 'Low'
    },
    status: {
        type: String,
        enum: ['Pending', 'Verified', 'Dismissed'],
        default: 'Pending'
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    flaggedBy: {
        type: String,
        default: 'System'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

fraudLogSchema.index({ targetType: 1, status: 1 });
fraudLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('FraudLog', fraudLogSchema);
