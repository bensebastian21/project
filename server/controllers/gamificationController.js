const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');

// PUBG-Style Tier Config
const TIER_CONFIG = [
  { name: 'Bronze', minPoints: 0, icon: '🥉' },
  { name: 'Silver', minPoints: 1000, icon: '🥈' },
  { name: 'Gold', minPoints: 2500, icon: '🥇' },
  { name: 'Platinum', minPoints: 5000, icon: '💎' },
  { name: 'Diamond', minPoints: 10000, icon: '💠' },
  { name: 'Crown', minPoints: 20000, icon: '👑' },
  { name: 'Ace', minPoints: 35000, icon: '🌟' },
  { name: 'Conqueror', minPoints: 50000, icon: '🏆' },
];

const POINTS = {
  REGISTER_EVENT: 10,
  ATTEND_EVENT: 50,
  COMPLETE_PROFILE: 100,
  REFER_FRIEND: 20,
  FIRST_EVENT: 100,
  BOOKMARK_EVENT: 5,
  WRITE_REVIEW: 15,
  MAKE_FRIEND: 10,
  DAILY_LOGIN: 5,
  SUBSCRIBE_HOST: 25,
};

// Achievement Definitions (PUBG-Style)
const ACHIEVEMENTS = [
  { id: 'first_blood', name: 'First Blood', description: 'Attend your first event', criteria: { stat: 'eventsAttended', value: 1 } },
  { id: 'social_butterfly', name: 'Social Butterfly', description: 'Connect with 10 friends', criteria: { stat: 'friendsConnected', value: 10 } },
  { id: 'marathon_runner', name: 'Marathon Runner', description: 'Maintain a 7-day login streak', criteria: { stat: 'maxLoginStreak', value: 7 } },
  { id: 'top_critic', name: 'Top Critic', description: 'Write 20 reviews', criteria: { stat: 'reviewsWritten', value: 20 } },
  { id: 'collector', name: 'Collector', description: 'Bookmark 50 events', criteria: { stat: 'eventsBookmarked', value: 50 } },
];

const calculateTier = (points) => {
  let currentTier = TIER_CONFIG[0];
  for (const tier of TIER_CONFIG) {
    if (points >= tier.minPoints) {
      currentTier = tier;
    } else {
      break;
    }
  }
  return currentTier.name;
};

/**
 * Core function to update stats, points, skill XP, tiers and achievements
 * @param {string} userId
 * @param {string} statKey - e.g. 'eventsAttended'
 * @param {number} incrementValue
 * @param {string} actionType - e.g. 'ATTEND_EVENT' for point awarding
 * @param {string} category - technical, creative, management, social
 */
exports.updateGamificationStats = async (
  userId,
  statKey,
  incrementValue = 1,
  actionType = null,
  category = 'social'
) => {
  try {
    const user = await User.findById(userId);
    if (!user) return null;

    // Initialize fields if missing
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
    if (!user.skillXP) {
      user.skillXP = { technical: 0, creative: 0, management: 0, social: 0 };
    }

    // 1. Update Stat
    if (statKey && user.gamificationStats) {
      if (user.gamificationStats[statKey] === undefined) user.gamificationStats[statKey] = 0;
      user.gamificationStats[statKey] += incrementValue;
    }

    // 2. Award Points & Skill XP
    let pointsEarned = 0;
    if (actionType && POINTS[actionType]) {
      pointsEarned = POINTS[actionType];
      user.points += pointsEarned;
      user.seasonPoints += pointsEarned;

      // Distribute points to skill category
      if (user.skillXP[category] !== undefined) {
        user.skillXP[category] += pointsEarned;
      }
    }

    // 3. Level & Tier Check
    // Level Curve: sqrt(totalPoints / 10)
    user.level = Math.floor(Math.sqrt(user.points / 10)) || 1;

    // Tier based on seasonPoints (Monthly progress)
    const oldTier = user.tier || 'Bronze';
    user.tier = calculateTier(user.seasonPoints);
    const tierUp = oldTier !== user.tier;

    // 4. Achievement Check
    const newlyUnlocked = [];
    for (const achievement of ACHIEVEMENTS) {
      const alreadyUnlocked = user.achievements.some((a) => a.id === achievement.id);
      if (!alreadyUnlocked && user.gamificationStats[achievement.criteria.stat] >= achievement.criteria.value) {
        const unlock = {
          id: achievement.id,
          name: achievement.name,
          description: achievement.description,
          unlockedAt: new Date(),
        };
        user.achievements.push(unlock);
        newlyUnlocked.push(unlock);

        // Bonus points for achievement!
        user.points += 100;
        user.seasonPoints += 100;
      }
    }

    await user.save();

    return {
      points: user.points,
      seasonPoints: user.seasonPoints,
      level: user.level,
      tier: user.tier,
      tierUp,
      skillXP: user.skillXP,
      achievements: user.achievements,
      badges: user.badges || [],
      newAchievements: newlyUnlocked,
      stats: user.gamificationStats,
    };
  } catch (error) {
    console.error('Gamification Error:', error);
    return null;
  }
};

// Legacy/Bulk wrapper
exports.awardPoints = async (userId, actionType, category = 'social') => {
  let statKey = null;
  switch (actionType) {
    case 'ATTEND_EVENT': statKey = 'eventsAttended'; break;
    case 'BOOKMARK_EVENT': statKey = 'eventsBookmarked'; break;
    case 'WRITE_REVIEW': statKey = 'reviewsWritten'; break;
    case 'REFER_FRIEND': statKey = 'friendsConnected'; break;
    case 'SUBSCRIBE_HOST': statKey = 'hostSubscriptions'; break;
  }
  return await exports.updateGamificationStats(userId, statKey, 1, actionType, category);
};

// Skill-Based Leaderboard
exports.getLeaderboard = async (req, res) => {
  try {
    const category = req.query.category || req.query.type || 'global'; // global, seasonal, friends
    const skill = req.query.skill; // technical, creative, management, social
    const limit = parseInt(req.query.limit) || 10;
    const userId = req.user?.id;

    let query = { role: 'student', isDeleted: { $ne: true } };
    let sort = { points: -1 };

    // 1. Handle Relationship Category
    if (category === 'friends' && userId) {
      const friendships = await FriendRequest.find({
        status: 'accepted',
        $or: [{ from: userId }, { to: userId }]
      }).lean();

      const friendIds = friendships.map(f =>
        String(f.from) === String(userId) ? f.to : f.from
      );
      friendIds.push(userId); // Include self
      query._id = { $in: friendIds };
    } else if (category === 'seasonal') {
      sort = { seasonPoints: -1 };
    }

    // 2. Handle Skill Sorting (Overrides default sort if present)
    if (['technical', 'creative', 'management', 'social'].includes(skill)) {
      sort = { [`skillXP.${skill}`]: -1 };
    } else if (!skill && ['technical', 'creative', 'management', 'social'].includes(category)) {
      // Backward compatibility for old single-param calls
      sort = { [`skillXP.${category}`]: -1 };
    }

    const users = await User.find(query)
      .sort(sort)
      .limit(limit)
      .select('fullname username profilePic points seasonPoints tier skillXP level achievements')
      .lean();

    // Map _id to id for frontend consistency if needed (Dashboard uses both but component uses user.id || user._id)
    const formattedUsers = users.map(u => ({
      ...u,
      id: u._id,
      isMe: userId && String(u._id) === String(userId)
    }));

    res.json(formattedUsers);
  } catch (error) {
    console.error('Leaderboard Fetch Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getUserRank = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select('points seasonPoints tier skillXP level achievements badges gamificationStats');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const rank = await User.countDocuments({
      points: { $gt: user.points },
      role: 'student',
      isDeleted: { $ne: true },
    }) + 1;

    res.json({
      rank,
      points: user.points,
      seasonPoints: user.seasonPoints,
      tier: user.tier,
      skillXP: user.skillXP,
      level: user.level,
      stats: user.gamificationStats,
      achievements: user.achievements,
      badges: user.badges || [],
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};
