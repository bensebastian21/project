const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'server', '.env') });

const checkUser = async () => {
    let output = '';
    const log = (msg) => {
        console.log(msg);
        output += msg + '\n';
    };

    const uri = process.env.MONGO_URI;
    if (!uri) {
        log('MONGO_URI missing');
        return;
    }

    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });

    try {
        log('Connecting...');
        await client.connect();
        log('Connected successfully to server');

        const db = client.db('student_event_db');
        const collection = db.collection('users');

        const email = 'jomygeorge@duck.com';
        log(`Finding user: ${email}`);
        const user = await collection.findOne({ email });

        if (user) {
            log('--- USER FOUND ---');
            log(`emailVerified: ${user.emailVerified}`);
            log(`phoneVerified: ${user.phoneVerified}`);
            log('------------------');
        } else {
            log('--- USER NOT FOUND ---');
        }

    } catch (err) {
        log(`ERROR: ${err.message}`);
    } finally {
        await client.close();
        fs.writeFileSync('debug_output_native.txt', output);
        log('DONE');
    }
};

checkUser();
