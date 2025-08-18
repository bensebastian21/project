// Diagnostic script to check admin user setup
const mongoose = require('mongoose');
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');
require('dotenv').config();

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/your-db-name';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// User model
const User = require('./server/models/User');

async function checkAdminSetup() {
  try {
    console.log('🔍 Starting admin user diagnostic...\n');
    
    // Connect to MongoDB
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    console.log('✅ Connected to Firestore');
    
    // Check for admin users in MongoDB
    console.log('\n📊 MongoDB Users by Role:');
    const allUsers = await User.find({});
    const roleCounts = {};
    
    allUsers.forEach(user => {
      roleCounts[user.role] = (roleCounts[user.role] || 0) + 1;
    });
    
    console.table(roleCounts);
    
    // Find specific admin users
    const adminUsers = await User.find({ role: 'admin' });
    console.log(`\n👑 Found ${adminUsers.length} admin user(s) in MongoDB:`);
    
    adminUsers.forEach((user, index) => {
      console.log(`${index + 1}. Email: ${user.email}`);
      console.log(`   Username: ${user.username}`);
      console.log(`   Full Name: ${user.fullname}`);
      console.log(`   ID: ${user._id}`);
      console.log('---');
    });
    
    // Check Firestore for admin users
    console.log('\n🔥 Checking Firestore for admin users...');
    
    for (const admin of adminUsers) {
      try {
        const userDoc = await getDoc(doc(db, 'users', admin._id.toString()));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          console.log(`✅ Firestore user found for ${admin.email}`);
          console.log(`   Role: ${userData.role}`);
          console.log(`   Username: ${userData.username}`);
        } else {
          console.log(`❌ No Firestore user found for ${admin.email}`);
        }
      } catch (error) {
        console.log(`⚠️  Error checking Firestore for ${admin.email}:`, error.message);
      }
    }
    
    // Check for default admin
    console.log('\n🎯 Checking for default admin (admin@example.com)...');
    const defaultAdmin = await User.findOne({ email: 'admin@example.com' });
    
    if (defaultAdmin) {
      console.log('✅ Default admin found:');
      console.log(`   Email: ${defaultAdmin.email}`);
      console.log(`   Role: ${defaultAdmin.role}`);
      console.log(`   Password: admin123 (hashed)`);
    } else {
      console.log('❌ Default admin not found');
      console.log('💡 You can create one by running: POST /api/auth/create-admin');
    }
    
    // Check for any users with admin email patterns
    console.log('\n🔍 Checking for potential admin emails...');
    const adminEmails = allUsers.filter(user => 
      user.email.includes('admin') || 
      user.email.includes('manager') ||
      user.role === 'admin'
    );
    
    console.log(`Found ${adminEmails.length} potential admin accounts:`);
    adminEmails.forEach(user => {
      console.log(`   ${user.email} (${user.role})`);
    });
    
  } catch (error) {
    console.error('❌ Diagnostic error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Diagnostic complete');
  }
}

// Run the diagnostic
checkAdminSetup();
