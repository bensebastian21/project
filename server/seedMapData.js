require('dotenv').config();
const mongoose = require('mongoose');
const Event = require('./models/Event');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log('Connected to MongoDB...'))
    .catch(err => console.error('Could not connect to MongoDB...', err));

async function seedCoordinates() {
    try {
        const events = await Event.find({ isPublished: true });

        // Bounds roughly around India
        const latMin = 8.0;
        const latMax = 37.0;
        const lngMin = 68.0;
        const lngMax = 97.0;

        let updatedCount = 0;

        for (const event of events) {
            if (!event.coordinates || event.coordinates.length < 2) {
                // Generate random coordinates [longitude, latitude]
                const lng = lngMin + Math.random() * (lngMax - lngMin);
                const lat = latMin + Math.random() * (latMax - latMin);

                event.coordinates = [lng, lat];
                await event.save();
                updatedCount++;
                console.log(`Updated event ${event.title} with coordinates: [${lng}, ${lat}]`);
            }
        }

        console.log(`\nFinished! Updated ${updatedCount} events with coordinates.`);
        process.exit(0);
    } catch (error) {
        console.error('Error seeding coordinates:', error);
        process.exit(1);
    }
}

seedCoordinates();
