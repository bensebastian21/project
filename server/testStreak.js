require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

function mockLoginDate(dateStr) {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return d;
}

mongoose.connect(process.env.MONGO_URI).then(async () => {
  try {
    let testUser = new User({
      username: 'teststreak',
      fullname: 'Test Streak User',
      email: 'teststreak@example.com',
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
    console.log('Created user.');

    const gamificationController = require('./controllers/gamificationController');

    // Helper to simulate arbitrary login day
    async function simulateLogin(mockTodayStr) {
      console.log(`\n--- Simulating Login on ${mockTodayStr} ---`);
      const now = new Date(mockTodayStr);
      now.setHours(0, 0, 0, 0);

      const lastLogin = testUser.gamificationStats.lastLoginDate
        ? new Date(testUser.gamificationStats.lastLoginDate)
        : null;
      if (lastLogin) lastLogin.setHours(0, 0, 0, 0);

      if (!lastLogin || lastLogin.getTime() < now.getTime()) {
        const diffDays = lastLogin ? Math.floor((now - lastLogin) / (1000 * 60 * 60 * 24)) : null;

        if (diffDays === 1) {
          testUser.gamificationStats.loginStreak += 1;
        } else {
          testUser.gamificationStats.loginStreak = 1;
        }

        // Actually Set Last Login to the full original time or just start of day for testing
        testUser.gamificationStats.lastLoginDate = now;
        testUser.gamificationStats.maxLoginStreak = Math.max(
          testUser.gamificationStats.maxLoginStreak,
          testUser.gamificationStats.loginStreak,
        );

        await testUser.save();
        await gamificationController.updateGamificationStats(
          testUser._id,
          'loginStreak',
          0,
          'DAILY_LOGIN',
        );
      } else {
        console.log('Same day login, doing nothing.');
      }

      // Reload user
      testUser = await User.findById(testUser._id);
      console.log(
        `Streak: ${testUser.gamificationStats.loginStreak} | Max: ${testUser.gamificationStats.maxLoginStreak}`,
      );
    }

    await simulateLogin('2023-11-01'); // Day 1
    await simulateLogin('2023-11-02'); // Day 2 (Streak = 2)
    await simulateLogin('2023-11-03'); // Day 3 (Streak = 3 => badge!)
    await simulateLogin('2023-11-05'); // Skipped day 4, login Day 5 (Streak = 1)

    console.log(
      '\nFinal Badges:',
      testUser.badges.map((b) => b.id),
    );

    await User.findByIdAndDelete(testUser._id);
  } catch (err) {
    console.error(err);
  }
  mongoose.connection.close();
});
