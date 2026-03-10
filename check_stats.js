const mongoose = require('mongoose');
const User = require('./server/models/User');
const Event = require('./server/models/Event');
require('dotenv').config({ path: './server/.env' });

async function checkStats() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB");

        const students = await User.countDocuments({ role: "student", isDeleted: { $ne: true } });
        const hosts = await User.countDocuments({ role: "host", isDeleted: { $ne: true } });
        const events = await Event.countDocuments({ isPublished: true, isDeleted: { $ne: true } });
        const campuses = await User.distinct("institute", { institute: { $nin: ["", null] } });

        console.log("--- ACTUAL DB COUNTS ---");
        console.log("Students:", students);
        console.log("Hosts:", hosts);
        console.log("Events:", events);
        console.log("Campuses:", campuses.length);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkStats();
