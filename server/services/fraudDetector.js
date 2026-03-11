const FraudLog = require('../models/FraudLog');
const User = require('../models/User');
const Event = require('../models/Event');
const Review = require('../models/Review');

class FraudDetector {
    static BLACKLISTED_WORDS = [
        'crypto', 'investment', 'casino', 'betting', 'win money',
        'earn money fast', 'sex', 'casino', 'viagra', 'lottery'
    ];

    static async logFraud(data) {
        try {
            const log = new FraudLog(data);
            await log.save();
            return log;
        } catch (err) {
            console.error('Error logging fraud:', err);
        }
    }

    static async analyzeReview(review, user) {
        const content = (review.comment || '').toLowerCase();
        const flags = [];

        // 1. Blacklisted Words
        const foundWords = this.BLACKLISTED_WORDS.filter(word => content.includes(word));
        if (foundWords.length > 0) {
            flags.push({ reason: `Contains blacklisted words: ${foundWords.join(', ')}`, severity: 'High' });
        }

        // 2. Duplicate Reviews by same user
        const recentReviews = await Review.find({
            reviewerId: user.id,
            _id: { $ne: review._id },
            createdAt: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } // last 24h
        });

        const isDuplicate = recentReviews.some(r => r.comment === review.comment);
        if (isDuplicate) {
            flags.push({ reason: 'Duplicate review content detected within 24h', severity: 'Medium' });
        }

        // Log flags
        for (const flag of flags) {
            await this.logFraud({
                targetType: 'Review',
                targetId: review._id,
                targetName: `Review on Event ${review.eventId}`,
                reason: flag.reason,
                severity: flag.severity,
                metadata: { userId: user.id, username: user.username }
            });
        }
    }

    static async analyzeUser(user) {
        const flags = [];

        // 1. Rapid registrations from same IP/Subnet (would need IP tracking)
        // For now, check for similar usernames or phone numbers created recently
        const recentUsers = await User.find({
            _id: { $ne: user._id },
            createdAt: { $gt: new Date(Date.now() - 1 * 60 * 60 * 1000) } // last hour
        });

        const similarPhone = recentUsers.filter(u => u.phone.substring(0, 7) === user.phone.substring(0, 7));
        if (similarPhone.length >= 3) {
            flags.push({ reason: 'Pattern of similar phone numbers created recently', severity: 'High' });
        }

        // 2. Burner emails (simplified check)
        const burnerDomains = ['tempmail.com', '10minutemail.com', 'guerrillamail.com'];
        const emailDomain = user.email.split('@')[1];
        if (burnerDomains.includes(emailDomain)) {
            flags.push({ reason: 'Suspicious burner email domain', severity: 'Medium' });
        }

        // Log flags
        for (const flag of flags) {
            await this.logFraud({
                targetType: 'User',
                targetId: user._id,
                targetName: user.fullname,
                reason: flag.reason,
                severity: flag.severity,
                metadata: { email: user.email, phone: user.phone }
            });
        }
    }

    static async analyzeEvent(event) {
        const flags = [];
        const content = `${event.title} ${event.description}`.toLowerCase();

        // 1. Blacklisted Words
        const foundWords = this.BLACKLISTED_WORDS.filter(word => content.includes(word));
        if (foundWords.length > 0) {
            flags.push({ reason: `Event title/desc contains blacklisted words: ${foundWords.join(', ')}`, severity: 'High' });
        }

        // 2. Excessive Links
        const linkCount = (event.description.match(/https?:\/\//g) || []).length;
        if (linkCount > 5) {
            flags.push({ reason: 'Excessive external links in description', severity: 'Medium' });
        }

        // Log flags
        for (const flag of flags) {
            await this.logFraud({
                targetType: 'Event',
                targetId: event._id,
                targetName: event.title,
                reason: flag.reason,
                severity: flag.severity,
                metadata: { hostId: event.hostId }
            });
        }
    }
}

module.exports = FraudDetector;
