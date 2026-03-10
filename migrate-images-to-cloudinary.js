// Migration script to update old local image paths to use placeholder
// Run this ONCE: node migrate-images-to-cloudinary.js

const mongoose = require('mongoose');
require('dotenv').config({ path: './server/.env' });

const Event = require('./server/models/Event');
const User = require('./server/models/User');

async function migrateImages() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Placeholder image for events (you can use a default Cloudinary image)
    const PLACEHOLDER_IMAGE = 'https://res.cloudinary.com/dpzhd5yvm/image/upload/v1/student-events/placeholder-event.jpg';
    
    // Fix Events with local file paths
    const eventsWithLocalImages = await Event.find({
      $or: [
        { imageUrl: { $regex: /^\/uploads\// } },
        { imageUrl: { $regex: /^\d+\.jpg$/ } },
        { images: { $elemMatch: { $regex: /^\/uploads\// } } }
      ]
    });

    console.log(`\n📊 Found ${eventsWithLocalImages.length} events with local image paths`);

    for (const event of eventsWithLocalImages) {
      let updated = false;

      // Fix main image
      if (event.imageUrl && (event.imageUrl.startsWith('/uploads/') || /^\d+\.jpg$/.test(event.imageUrl))) {
        console.log(`  Updating event: ${event.title}`);
        console.log(`    Old imageUrl: ${event.imageUrl}`);
        event.imageUrl = null; // Set to null so hosts can re-upload
        updated = true;
      }

      // Fix gallery images
      if (Array.isArray(event.images) && event.images.length > 0) {
        const hasLocalImages = event.images.some(img => 
          img.startsWith('/uploads/') || /^\d+\.(jpg|png|jpeg)$/.test(img)
        );
        
        if (hasLocalImages) {
          console.log(`    Clearing ${event.images.length} gallery images`);
          event.images = []; // Clear gallery
          updated = true;
        }
      }

      if (updated) {
        await event.save();
        console.log(`    ✅ Updated`);
      }
    }

    // Fix Users with local profile/banner images
    const usersWithLocalImages = await User.find({
      $or: [
        { profilePic: { $regex: /^\/uploads\// } },
        { bannerUrl: { $regex: /^\/uploads\// } }
      ]
    });

    console.log(`\n📊 Found ${usersWithLocalImages.length} users with local image paths`);

    for (const user of usersWithLocalImages) {
      let updated = false;

      if (user.profilePic && user.profilePic.startsWith('/uploads/')) {
        console.log(`  User: ${user.email}`);
        console.log(`    Clearing profile pic: ${user.profilePic}`);
        user.profilePic = null;
        updated = true;
      }

      if (user.bannerUrl && user.bannerUrl.startsWith('/uploads/')) {
        console.log(`    Clearing banner: ${user.bannerUrl}`);
        user.bannerUrl = null;
        updated = true;
      }

      if (updated) {
        await user.save();
        console.log(`    ✅ Updated`);
      }
    }

    console.log('\n✅ Migration complete!');
    console.log('\n📝 NOTE: Images have been cleared. Users/hosts need to re-upload them.');
    
  } catch (error) {
    console.error('❌ Migration error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

migrateImages();
