// Simple diagnostic script to check admin users
const { MongoClient } = require('mongodb');

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/your-db-name';

async function checkAdminUsers() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    console.log('🔍 Checking admin users in MongoDB...\n');
    
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db();
    const usersCollection = db.collection('users');
    
    // Get all users and their roles
    const allUsers = await usersCollection.find({}).toArray();
    
    console.log(`📊 Total users found: ${allUsers.length}`);
    
    // Group by role
    const roleCounts = {};
    allUsers.forEach(user => {
      roleCounts[user.role] = (roleCounts[user.role] || 0) + 1;
    });
    
    console.log('\n📈 Users by role:');
    Object.entries(roleCounts).forEach(([role, count]) => {
      console.log(`   ${role}: ${count}`);
    });
    
    // Find admin users
    const adminUsers = allUsers.filter(user => user.role === 'admin');
    console.log(`\n👑 Admin users found: ${adminUsers.length}`);
    
    if (adminUsers.length === 0) {
      console.log('❌ No admin users found!');
      console.log('\n💡 To create an admin user:');
      console.log('   1. Use the registration form with role="admin"');
      console.log('   2. Or POST to /api/auth/create-admin');
      console.log('   3. Or manually set role="admin" for an existing user');
    } else {
      console.log('\n📋 Admin user details:');
      adminUsers.forEach((user, index) => {
        console.log(`${index + 1}. Email: ${user.email}`);
        console.log(`   Username: ${user.username}`);
        console.log(`   Full Name: ${user.fullname}`);
        console.log(`   ID: ${user._id}`);
        console.log(`   Password: ${user.password ? 'Set (hashed)' : 'Not set'}`);
        console.log('---');
      });
    }
    
    // Check for default admin
    const defaultAdmin = adminUsers.find(user => user.email === 'admin@example.com');
    if (defaultAdmin) {
      console.log('✅ Default admin (admin@example.com) found');
      console.log('   Default password: admin123');
    }
    
    // Show sample login credentials
    if (adminUsers.length > 0) {
      console.log('\n🔑 Sample admin login credentials:');
      adminUsers.forEach(user => {
        if (user.password) {
          console.log(`   Email: ${user.email}`);
          console.log(`   Password: [use the password you set]`);
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Make sure MongoDB is running and the connection string is correct');
  } finally {
    await client.close();
    console.log('\n✅ Check complete');
  }
}

// Run the check
checkAdminUsers();
