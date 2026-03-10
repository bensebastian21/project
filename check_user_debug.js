const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const User = require(path.join(__dirname, 'server', 'models', 'User.js'));
require('dotenv').config({ path: path.join(__dirname, 'server', '.env') });

const checkUser = async () => {
    let output = '';
    const log = (msg) => {
        console.log(msg);
        output += msg + '\n';
    };

    try {
        const uri = process.env.MONGO_URI;
        if (!uri) {
            log('MONGO_URI not found in .env');
            return;
        }
        log(`Connecting to DB: ${uri.substring(0, 15)}...`);

        // Disable buffering to see immediate failures
        mongoose.set('bufferCommands', false);

        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 5000
        });
        log('Connected to DB successfully');

        const email = 'jomygeorge@duck.com';
        log(`Querying for: ${email}`);
        const user = await User.findOne({ email }).exec();
        log('Query finished');

        if (user) {
            log('--- USER FOUND ---');
            log(`ID: ${user._id}`);
            log(`Username: ${user.username}`);
            log(`Email: ${user.email}`);
            log(`Phone: ${user.phone}`);
            log(`emailVerified: ${user.emailVerified}`);
            log(`phoneVerified: ${user.phoneVerified}`);
            log(`Google/Firebase UID: ${user.firebaseUid}`);
            log('------------------');
        } else {
            log('--- USER NOT FOUND ---');
            const count = await User.countDocuments();
            log(`Total users in DB: ${count}`);
        }
    } catch (err) {
        log(`ERROR: ${err.message}`);
        if (err.reason) log(`Reason: ${JSON.stringify(err.reason)}`);
    } finally {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
        fs.writeFileSync('debug_output.txt', output);
        log('DONE');
    }
};

checkUser();
