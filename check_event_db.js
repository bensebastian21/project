const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, 'server/.env') });

const eventId = '69a6834b116d7fd29f640cb2';

async function check() {
    try {
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
        console.log('Connected to DB');

        // We need to define the schema minimally or just use a generic collection
        const Event = mongoose.model('Event', new mongoose.Schema({
            isPublished: Boolean,
            isDeleted: Boolean,
            title: String,
            capacity: Number,
            registrations: Array,
            waitingList: Array
        }));

        const event = await Event.findById(eventId);
        if (!event) {
            console.log('Event NOT FOUND by ID');
        } else {
            console.log('Event found:');
            console.log('Title:', event.title);
            console.log('isPublished:', event.isPublished);
            console.log('isDeleted:', event.isDeleted);
            console.log('Capacity:', event.capacity);
            console.log('Registrations count:', event.registrations?.length || 0);
            console.log('WaitingList count:', event.waitingList?.length || 0);
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

check();
