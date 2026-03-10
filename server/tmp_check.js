
const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config();

async function checkData() {
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
            createdAt: Date
        }));

        const Event = mongoose.models.Event || mongoose.model('Event', new mongoose.Schema({
            title: String,
            date: Date,
            endDate: Date,
            isCompleted: Boolean
        }));

        const now = new Date();
        log('Current Time: ' + now.toISOString());

        const memories = await Memory.find().populate('eventId').sort({ createdAt: -1 }).limit(20);

        log('Recent Memories:');
        memories.forEach(m => {
            const e = m.eventId;
            if (e) {
                log(`- Memory ID: ${m._id}`);
                log(`  Event: ${e.title} (${e._id})`);
                log(`  IsCompleted: ${e.isCompleted}`);
                log(`  StartDate: ${e.date?.toISOString()}`);
                log(`  EndDate: ${e.endDate?.toISOString()}`);

                const start = new Date(e.date);
                const end = e.endDate ? new Date(e.endDate) : new Date(start.getTime() + 3 * 60 * 60 * 1000);
                log(`  Calculated End: ${end.toISOString()}`);

                const isLive = !e.isCompleted && now >= start && now <= end;
                log(`  Live Match: ${isLive}`);
            } else {
                log(`- Memory ID: ${m._id} (No Event)`);
            }
        });

        fs.writeFileSync('check_output.txt', output);
        await mongoose.disconnect();
    } catch (err) {
        fs.writeFileSync('check_output.txt', err.stack);
        console.error(err);
    }
}

checkData();
