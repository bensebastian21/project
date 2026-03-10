// create_admin.js
const path = require('path');
// IMPORTANT: Use the same mongoose instance as the server/models to avoid dual-instance buffering
const mongoose = require(path.resolve(__dirname, './server/node_modules/mongoose'));
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import User model relative to this file so it works from any CWD
const User = require(path.resolve(__dirname, './server/models/User'));

// Load environment variables from server/.env using absolute path
require('dotenv').config({ path: path.resolve(__dirname, './server/.env') });

async function createAdminUser() {
  try {
    // Prepare Mongo URI and basic diagnostics
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/student_event_db';
    const maskUri = (uri) => {
      try {
        // Hide username/password if present
        return uri.replace(/(mongodb(?:\+srv)?:\/\/)([^:@\/]+):([^@]+)@/i, '$1****:****@');
      } catch (_) { return uri; }
    };
    console.log('Connecting to MongoDB using URI:', maskUri(mongoUri));

    // Connection event listeners for diagnostics
    mongoose.connection.on('connecting', () => console.log('MongoDB: connecting...'));
    mongoose.connection.on('connected', () => console.log('✅ MongoDB: connected'));
    mongoose.connection.on('open', () => console.log('MongoDB: connection open'));
    mongoose.connection.on('disconnected', () => console.log('⚠️ MongoDB: disconnected'));
    mongoose.connection.on('reconnected', () => console.log('MongoDB: reconnected'));
    mongoose.connection.on('error', (err) => console.error('❌ MongoDB connection error:', err?.message || err));

    // Connect to MongoDB with explicit options and timeout
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 15000,
      // useNewUrlParser/useUnifiedTopology are defaults in Mongoose >= 6
      // directConnection: false helps SRV-based Atlas clusters
      directConnection: false,
    });

    console.log('✅ Connected to MongoDB');

    // --- Simple CLI arg parser (no deps) ---
    const getArg = (flag, fallback = undefined) => {
      const idx = process.argv.indexOf(flag);
      if (idx !== -1 && idx + 1 < process.argv.length) return process.argv[idx + 1];
      return fallback;
    };

    const email = getArg('--email', process.env.ADMIN_EMAIL || 'admin@example.com');
    const password = getArg('--password', process.env.ADMIN_PASSWORD || 'admin123');
    const fullname = getArg('--fullname', process.env.ADMIN_FULLNAME || 'System Admin');
    const username = getArg('--username', process.env.ADMIN_USERNAME || 'admin');
    const phone = getArg('--phone', process.env.ADMIN_PHONE || '9999999999');
    const countryCode = getArg('--countryCode', process.env.ADMIN_COUNTRY_CODE || '+91');
    const city = getArg('--city', process.env.ADMIN_CITY || 'AdminCity');
    const street = getArg('--street', process.env.ADMIN_STREET || 'Main Road');
    const institute = getArg('--institute', process.env.ADMIN_INSTITUTE || 'Admin Institute');
    const pincode = getArg('--pincode', process.env.ADMIN_PINCODE || '123456');
    const age = parseInt(getArg('--age', process.env.ADMIN_AGE || '30'), 10);
    const course = getArg('--course', process.env.ADMIN_COURSE || 'Management');

    // Find existing by email
    let user = await User.findOne({ email });

    const updates = {
      username: user?.username || username,
      fullname: fullname,
      institute: user?.institute || institute,
      street: user?.street || street,
      city: user?.city || city,
      pincode: user?.pincode || pincode,
      age: isNaN(age) ? user?.age || 30 : age,
      course: user?.course || course,
      email,
      phone: user?.phone || phone,
      countryCode: user?.countryCode || countryCode,
      role: 'admin',
      updatedAt: new Date(),
    };

    // If password provided, hash and set (updates only if supplied)
    if (password && String(password).trim() !== '') {
      updates.password = await bcrypt.hash(password, 10);
    }

    if (user) {
      // Update existing user to admin
      await User.updateOne({ _id: user._id }, { $set: updates });
      user = await User.findById(user._id);
      console.log('✅ Existing user updated to admin');
    } else {
      // Create new admin user
      const adminUser = new User({
        ...updates,
        createdAt: new Date(),
      });
      await adminUser.save();
      user = adminUser;
      console.log('✅ Admin user created successfully');
    }

    console.log('Admin details:', {
      id: user._id,
      email: user.email,
      role: user.role,
    });
    console.log(`Login email: ${email}`);
    if (password) console.log(`Temporary password: ${password}`);

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

createAdminUser();