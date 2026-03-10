require('dotenv').config();
const mongoose = require('mongoose');
const gamificationController = require('./controllers/gamificationController');
const User = require('./models/User');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  try {
    let testUser = new User({
      username: 'testbadgeuser',
      fullname: 'Test Badge User',
      email: 'testbadge@example.com',
      institute: 'Test Inst',
      street: '123',
      city: 'Test',
      pincode: '123456',
      age: 20,
      course: 'BTech',
      phone: '1234567890',
      role: 'student',
      gamificationStats: {
        eventsAttended: 0,
        eventsBookmarked: 0,
        reviewsWritten: 0,
        friendsConnected: 0,
        loginStreak: 0,
        maxLoginStreak: 0,
      },
      badges: [],
    });
    await testUser.save();
    console.log(
      'Created user. Initial attended:',
      testUser.gamificationStats.eventsAttended,
      'Badges:',
      testUser.badges.length,
    );

    let res = await gamificationController.awardPoints(testUser._id, 'ATTEND_EVENT');
    console.log(
      'Result from controller:',
      res.badges.length,
      'New Badges:',
      res.newBadges.map((b) => b.id),
    );

    let u = await User.findById(testUser._id);
    console.log(
      'After DB reload:',
      u.gamificationStats.eventsAttended,
      'Badges:',
      u.badges.map((b) => b.id),
    );

    await User.findByIdAndDelete(testUser._id);
  } catch (err) {
    console.error(err);
  }
  mongoose.connection.close();
});
