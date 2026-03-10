const User = require('../models/User');

// Points configuration
const POINTS = {
  REGISTER_EVENT: 10,
  ATTEND_EVENT: 50,
  COMPLETE_PROFILE: 100,
  REFER_FRIEND: 20,
  FIRST_EVENT: 100, // Bonus
  BOOKMARK_EVENT: 5,
  WRITE_REVIEW: 15,
  MAKE_FRIEND: 10,
  DAILY_LOGIN: 5,
  SUBSCRIBE_HOST: 25,
};

// Tiered Badge Registry
const BADGE_REGISTRY = {
  // 1. Social Butterfly (Friends)
  SOCIALITE: {
    id: 'socialite',
    baseName: 'Social Butterfly',
    tiers: [
      { tier: 'bronze', threshold: 1, name: 'Friendly Face', icon: '👋', points: 50 },
      { tier: 'silver', threshold: 10, name: 'Popular Pal', icon: '🤝', points: 150 },
      { tier: 'gold', threshold: 50, name: 'Community Pillar', icon: '👑', points: 500 },
    ],
    statKey: 'friendsConnected',
  },
  // 2. Curator (Bookmarks)
  CURATOR: {
    id: 'curator',
    baseName: 'Curator',
    tiers: [
      { tier: 'bronze', threshold: 5, name: 'Collector', icon: '📌', points: 30 },
      { tier: 'silver', threshold: 20, name: 'Librarian', icon: '📚', points: 100 },
      { tier: 'gold', threshold: 100, name: 'Museum Keeper', icon: '🏛️', points: 300 },
    ],
    statKey: 'eventsBookmarked',
  },
  // 3. Explorer (Attendance)
  EXPLORER: {
    id: 'explorer',
    baseName: 'Explorer',
    tiers: [
      { tier: 'bronze', threshold: 1, name: 'First Steps', icon: '🌱', points: 50 },
      { tier: 'silver', threshold: 5, name: 'Adventurer', icon: '🧭', points: 200 },
      { tier: 'gold', threshold: 20, name: 'Globe Trotter', icon: '🌎', points: 800 },
    ],
    statKey: 'eventsAttended',
  },
  // 4. Critic (Reviews)
  CRITIC: {
    id: 'critic',
    baseName: 'Critic',
    tiers: [
      { tier: 'bronze', threshold: 1, name: 'Voice', icon: '🗣️', points: 20 },
      { tier: 'silver', threshold: 10, name: 'Reviewer', icon: '✍️', points: 100 },
      { tier: 'gold', threshold: 25, name: 'Tastemaker', icon: '🎭', points: 400 },
    ],
    statKey: 'reviewsWritten',
  },
  // 5. Streaks (Login)
  DEDICATED: {
    id: 'dedicated',
    baseName: 'Dedicated',
    tiers: [
      { tier: 'bronze', threshold: 3, name: 'Regular', icon: '📅', points: 30 },
      { tier: 'silver', threshold: 7, name: 'Committed', icon: '🔥', points: 100 },
      { tier: 'gold', threshold: 30, name: 'Unstoppable', icon: '🚀', points: 500 },
    ],
    statKey: 'maxLoginStreak',
  },
};

// Helper: Calculate level based on points (Level = sqrt(points/100))
// Helper: Calculate level based on points (Quadratic Curve, Max Level 500)
// Formula: Points = 10 * Level^2  =>  Level = sqrt(Points / 10)
const calculateLevel = (points) => {
  const level = Math.floor(Math.sqrt(points / 10));
  return Math.min(500, Math.max(1, level));
};

/**
 * Core function to update stats and check for badges via stat increments
 * @param {string} userId
 * @param {string} statKey - check User model gamificationStats
 * @param {number} incrementValue
 * @param {string} actionType - for point awarding
 */
exports.updateGamificationStats = async (
  userId,
  statKey,
  incrementValue = 1,
  actionType = null,
) => {
  try {
    const user = await User.findById(userId);
    if (!user) return null;

    // Ensure gamificationStats exists
    if (!user.gamificationStats) {
      user.gamificationStats = {
        eventsAttended: 0,
        eventsBookmarked: 0,
        reviewsWritten: 0,
        friendsConnected: 0,
        hostSubscriptions: 0,
        loginStreak: 0,
        lastLoginDate: null,
        maxLoginStreak: 0,
      };
    }

    // 1. Update Stat
    if (statKey && user.gamificationStats) {
      // Mongoose should handle property access without hasOwnProperty on subdoc,
      // but just to be safe and simple:
      if (user.gamificationStats[statKey] === undefined) user.gamificationStats[statKey] = 0;
      user.gamificationStats[statKey] += incrementValue;
    }

    // 2. Award Points (if actionType provided)
    let pointsEarned = 0;
    if (actionType && POINTS[actionType]) {
      pointsEarned = POINTS[actionType];
      user.points += pointsEarned;
    }

    // 3. Level Up Check
    const newLevel = calculateLevel(user.points);
    let levelUp = false;
    if (newLevel > user.level) {
      user.level = newLevel;
      levelUp = true;
    }

    // 4. Check Badges
    const newBadges = [];

    // Iterate through all badge definitions
    Object.values(BADGE_REGISTRY).forEach((badgeDef) => {
      const userStatValue = user.gamificationStats[badgeDef.statKey];

      // Check each tier
      badgeDef.tiers.forEach((tier) => {
        const badgeIdString = `${badgeDef.id}_${tier.tier}`;

        // If user doesn't have this specific tier badge yet
        const alreadyHas = user.badges.some((b) => b.id === badgeIdString);

        if (!alreadyHas && userStatValue >= tier.threshold) {
          // Award Badge!
          const badgeObj = {
            id: badgeIdString,
            name: tier.name,
            icon: tier.icon,
            tier: tier.tier,
            description: `${tier.name} (${badgeDef.baseName} ${tier.tier})`,
            earnedAt: new Date(),
          };
          user.badges.push(badgeObj);
          newBadges.push(badgeObj);

          // Award bonus points for the badge
          user.points += tier.points;
        }
      });
    });

    await user.save();

    return {
      points: user.points,
      level: user.level,
      levelUp,
      badges: user.badges,
      newBadges,
      stats: user.gamificationStats,
    };
  } catch (error) {
    console.error('Gamification Error:', error);
    return null;
  }
};

// Legacy/Simple wrapper for direct point awarding
exports.awardPoints = async (userId, actionType) => {
  // Map legacy actions to stats if possible, or just award points
  let statKey = null;

  switch (actionType) {
    case 'ATTEND_EVENT':
      statKey = 'eventsAttended';
      break;
    case 'BOOKMARK_EVENT':
      statKey = 'eventsBookmarked';
      break; // Virtual action for controller
    case 'WRITE_REVIEW':
      statKey = 'reviewsWritten';
      break; // Virtual
    case 'REFER_FRIEND':
      statKey = 'friendsConnected';
      break;
    case 'SUBSCRIBE_HOST':
      statKey = 'hostSubscriptions';
      break;
  }

  return await exports.updateGamificationStats(userId, statKey, 1, actionType);
};

exports.getLeaderboard = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const users = await User.find({ role: 'student', isDeleted: { $ne: true } })
      .sort({ points: -1 })
      .limit(limit)
      .select('fullname username profilePic points level institute badges gamificationStats');

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getUserRank = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select('points gamificationStats badges level');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const rank =
      (await User.countDocuments({
        points: { $gt: user.points },
        role: 'student',
        isDeleted: { $ne: true },
      })) + 1;

    res.json({
      rank,
      points: user.points,
      level: user.level,
      stats: user.gamificationStats,
      badges: user.badges,
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};
