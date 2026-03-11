require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const MONGO_URI = process.env.MONGO_URI;
const CURRENT_SEASON = `Season ${new Date().getMonth() + 1}/${new Date().getFullYear()}`;

const resetSeason = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log(`Starting seasonal reset for ${CURRENT_SEASON}...`);

        const students = await User.find({ role: 'student', isDeleted: { $ne: true } });

        let updatedCount = 0;
        for (const student of students) {
            // Only reset if they have some activity (seasonPoints > 0)
            if (student.seasonPoints > 0) {
                // Record current performance in rankHistory
                student.rankHistory.push({
                    season: CURRENT_SEASON,
                    tier: student.tier || 'Bronze',
                    points: student.seasonPoints
                });

                // Reset seasonal counters
                student.seasonPoints = 0;
                student.tier = 'Bronze';

                await student.save();
                updatedCount++;
            }
        }

        console.log(`Successfully reset season for ${updatedCount} students.`);
    } catch (err) {
        console.error('Seasonal Reset Error:', err);
    } finally {
        if (mongoose.connection.readyState !== 0) {
            mongoose.connection.close();
        }
    }
};

resetSeason();
