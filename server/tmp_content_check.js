
const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config();

async function checkContent() {
    let output = '';
    const log = (msg) => {
        console.log(msg);
        output += msg + '\n';
    };

    try {
        await mongoose.connect(process.env.MONGO_URI);
        log('Connected to MongoDB');

        const Memory = mongoose.models.Memory || mongoose.model('Memory', new mongoose.Schema({
            eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
            text: String,
            createdAt: Date
        }));

        const Event = mongoose.models.Event || mongoose.model('Event', new mongoose.Schema({
            title: String,
            date: Date,
            endDate: Date,
            isCompleted: Boolean
        }));

        const m1 = await Memory.findOne({ text: /great vibe/i }).populate('eventId');
        const m2 = await Memory.findOne({ text: /fantastic event/i }).populate('eventId');

        log('Memory "great vibe":');
        if (m1) {
            log(`- Event: ${m1.eventId.title} (${m1.eventId._id})`);
            log(`  IsCompleted: ${m1.eventId.isCompleted}`);
            log(`  Date: ${m1.eventId.date?.toISOString()}`);
        } else log('Not found');

        log('Memory "fantastic event":');
        if (m2) {
            log(`- Event: ${m2.eventId.title} (${m2.eventId._id})`);
            log(`  IsCompleted: ${m2.eventId.isCompleted}`);
            log(`  Date: ${m2.eventId.date?.toISOString()}`);
        } else log('Not found');

        fs.writeFileSync('content_check.txt', output);
        await mongoose.disconnect();
    } catch (err) {
        fs.writeFileSync('content_check.txt', err.stack);
        console.error(err);
    }
}

checkContent();
