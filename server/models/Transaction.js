const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    eventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true
    },
    hostId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'INR'
    },
    platformFee: {
        type: Number,
        required: true
    },
    hostEarnings: {
        type: Number,
        required: true
    },
    type: {
        type: String,
        enum: ['TicketSale', 'Refund', 'Payout'],
        default: 'TicketSale'
    },
    status: {
        type: String,
        enum: ['Pending', 'Completed', 'Failed', 'Refunded'],
        default: 'Completed'
    },
    paymentId: {
        type: String, // From Razorpay/Stripe
        required: true
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

transactionSchema.index({ eventId: 1 });
transactionSchema.index({ hostId: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
