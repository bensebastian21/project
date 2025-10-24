const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');
const Event = require('../models/Event');
const Certificate = require('../models/Certificate');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });
  const jwtSecret = process.env.JWT_SECRET || 'default-jwt-secret-for-development';
  jwt.verify(token, jwtSecret, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

// GET /api/users/search?q=&page=&limit=
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '10', 10), 1), 50);
    const isEmailLike = /@/.test(q);
    const or = [
      { fullname: { $regex: q, $options: 'i' } },
      { username: { $regex: q, $options: 'i' } },
    ];
    if (isEmailLike && q) {
      // Only include email clause when user has searchableByEmail !== false
      or.push({ $and: [ { email: { $regex: q, $options: 'i' } }, { 'settings.privacy.searchableByEmail': { $ne: false } } ] });
    }
    const filter = q ? { $or: or } : {};
    const users = await User.find(filter)
      .select('_id fullname username email institute interests profilePic settings.privacy')
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    // Redact email if not searchable
    const sanitized = users.map(u => {
      const canShowEmail = u?.settings?.privacy?.searchableByEmail !== false;
      if (!canShowEmail) {
        delete u.email;
      }
      delete u.settings;
      return u;
    });
    res.json(sanitized);
  } catch (e) {
    console.error('user search error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/users/:id/mutual-events?ids=a,b,c -> counts of mutual events with each id (friends/self only)
router.get('/:id/mutual-events', authenticateToken, async (req, res) => {
  try {
    const me = String(req.user.id);
    const other = String(req.params.id);
    const idsParam = String(req.query.ids || '').trim();
    const ids = idsParam ? idsParam.split(',').map(s=>s.trim()).filter(Boolean) : [];
    const target = await User.findById(other).select('_id role').lean();
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (target.role !== 'student') return res.status(403).json({ error: 'Not a student' });
    if (me !== other) {
      const ok = await areFriends(me, other);
      if (!ok) return res.status(403).json({ error: 'Friends only' });
    }
    if (ids.length === 0) return res.json({});
    // Only include candidate ids who are friends with `other` to avoid leaking
    const friendsOfOther = new Set(await getFriendIds(other));
    const candidates = ids.filter(id => friendsOfOther.has(String(id)));
    if (candidates.length === 0) return res.json({});
    // Load events where `other` is registered
    const myEvents = await Event.find({ 'registrations.studentId': other, isDeleted: { $ne: true } })
      .select('registrations date')
      .lean();
    const counts = Object.fromEntries(candidates.map(id => [String(id), { total: 0, recent: 0 }]));
    const recentDays = Math.max(0, parseInt(req.query.recent || '0', 10));
    const recentCutoff = recentDays > 0 ? new Date(Date.now() - recentDays*24*60*60*1000) : null;
    for (const ev of myEvents) {
      const set = new Set((ev.registrations||[]).filter(r=>r.status==='registered').map(r=>String(r.studentId)));
      for (const id of candidates) {
        if (set.has(String(id))) {
          counts[String(id)].total = (counts[String(id)].total||0) + 1;
          if (recentCutoff && ev.date && new Date(ev.date) >= recentCutoff) counts[String(id)].recent = (counts[String(id)].recent||0) + 1;
        }
      }
    }
    res.json(counts);
  } catch (e) {
    console.error('mutual-events error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/users/:id/profile -> public profile
router.get('/:id/profile', authenticateToken, async (req, res) => {
  try {
    const me = String(req.user.id);
    const other = String(req.params.id);
    const user = await User.findById(other)
      .select('_id fullname username email institute course city pincode age countryCode interests profilePic bannerUrl bio displayBadges role settings')
      .lean();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const privacy = (user.settings && user.settings.privacy) || {};
    const isSelf = me === other;
    let isFriend = false;
    if (!isSelf) {
      isFriend = await areFriends(me, other);
    }

    // Apply privacy gates
    const resp = {
      _id: user._id,
      fullname: user.fullname,
      username: user.username,
      profilePic: user.profilePic,
      bannerUrl: privacy.onlyFriendsCanViewProfile && !isFriend && !isSelf ? undefined : user.bannerUrl,
      institute: privacy.onlyFriendsCanViewProfile && !isFriend && !isSelf ? undefined : user.institute,
      course: privacy.onlyFriendsCanViewProfile && !isFriend && !isSelf ? undefined : user.course,
      city: privacy.onlyFriendsCanViewProfile && !isFriend && !isSelf ? undefined : user.city,
      pincode: privacy.onlyFriendsCanViewProfile && !isFriend && !isSelf ? undefined : user.pincode,
      age: privacy.onlyFriendsCanViewProfile && !isFriend && !isSelf ? undefined : user.age,
      countryCode: privacy.onlyFriendsCanViewProfile && !isFriend && !isSelf ? undefined : user.countryCode,
      email: privacy.onlyFriendsCanViewProfile && !isFriend && !isSelf ? undefined : user.email,
      interests: privacy.onlyFriendsCanViewProfile && !isFriend && !isSelf ? [] : (user.interests || []),
      bio: privacy.onlyFriendsCanViewProfile && !isFriend && !isSelf ? undefined : user.bio,
      role: user.role,
      displayBadges: privacy.showBadgesPublic === false && !isSelf && !isFriend ? [] : (user.displayBadges || []),
    };
    res.json(resp);
  } catch (e) {
    console.error('user profile error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/users/:id/mutuals -> mutual friends with current user
router.get('/:id/mutuals', authenticateToken, async (req, res) => {
  try {
    const me = String(req.user.id);
    const other = String(req.params.id);
    if (me === other) return res.json([]);
    const edges = await FriendRequest.find({ status: 'accepted', $or: [ { from: me }, { to: me }, { from: other }, { to: other } ] }).select('from to').lean();
    const setMe = new Set();
    const setOther = new Set();
    edges.forEach(e => {
      const a = String(e.from), b = String(e.to);
      if (a === me) setMe.add(b); else if (b === me) setMe.add(a);
      if (a === other) setOther.add(b); else if (b === other) setOther.add(a);
    });
    const mutualIds = [...setMe].filter(x => setOther.has(x));
    const users = await User.find({ _id: { $in: mutualIds } }).select('_id fullname username profilePic').lean();
    res.json(users);
  } catch (e) {
    console.error('mutuals error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

// Helpers
async function areFriends(a, b){
  const fr = await FriendRequest.findOne({ status: 'accepted', $or: [ { from: a, to: b }, { from: b, to: a } ] }).lean();
  return !!fr;
}

async function getFriendIds(userId){
  const edges = await FriendRequest.find({ status: 'accepted', $or: [{ from: userId }, { to: userId }] }).select('from to').lean();
  const ids = new Set();
  edges.forEach(e => {
    const a = String(e.from), b = String(e.to);
    if (a === String(userId)) ids.add(b); else if (b === String(userId)) ids.add(a);
  });
  return Array.from(ids);
}

// GET /api/users/:id/attendance -> recent events attended by user (friends or self), students only
router.get('/:id/attendance', authenticateToken, async (req, res) => {
  try {
    const me = String(req.user.id);
    const other = String(req.params.id);
    const target = await User.findById(other).select('_id role').lean();
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (target.role !== 'student') return res.status(403).json({ error: 'Not a student' });

    if (me !== other) {
      const ok = await areFriends(me, other);
      if (!ok) return res.status(403).json({ error: 'Friends only' });
    }

    const notDeleted = { isDeleted: { $ne: true } };
    const events = await Event.find(notDeleted)
      .select('_id title date category isCompleted registrations')
      .sort({ date: -1 })
      .lean();
    const mine = [];
    const oid = String(other);
    for (const ev of events) {
      if (!Array.isArray(ev.registrations)) continue;
      if (ev.registrations.some(r => String(r.studentId) === oid && r.status === 'registered')) {
        mine.push({ eventId: ev._id, title: ev.title, date: ev.date, category: ev.category, isCompleted: !!ev.isCompleted });
      }
      if (mine.length >= 50) break;
    }
    res.json(mine);
  } catch (e) {
    console.error('attendance error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/users/:id/stats -> public progress stats (friends or self)
router.get('/:id/stats', authenticateToken, async (req, res) => {
  try {
    const me = String(req.user.id);
    const other = String(req.params.id);
    const target = await User.findById(other).select('_id role interests').lean();
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (target.role !== 'student') return res.status(403).json({ error: 'Not a student' });

    if (me !== other) {
      const ok = await areFriends(me, other);
      if (!ok) return res.status(403).json({ error: 'Friends only' });
    }

    const notDeleted = { isDeleted: { $ne: true } };
    const events = await Event.find(notDeleted)
      .select('date category isCompleted registrations')
      .sort({ date: -1 })
      .lean();
    const oid = String(other);
    const regs = [];
    for (const ev of events) {
      if (!Array.isArray(ev.registrations)) continue;
      if (ev.registrations.some(r => String(r.studentId) === oid && r.status === 'registered')) {
        regs.push({ date: ev.date, category: ev.category, isCompleted: !!ev.isCompleted });
      }
    }
    const total = regs.length;
    const completed = regs.filter(r => r.isCompleted).length;
    const byCategory = regs.reduce((acc, r) => { acc[r.category||'General']=(acc[r.category||'General']||0)+1; return acc; }, {});
    const dates = regs.map(r => new Date(r.date)).sort((a,b)=>b-a);
    let streak = 0;
    if (dates.length) {
      streak = 1;
      for (let i=0;i<dates.length-1;i++){
        const diffDays = Math.round((dates[i].setHours(0,0,0,0)-dates[i+1].setHours(0,0,0,0))/(1000*60*60*24));
        if (diffDays === 1) streak++; else break;
      }
    }
    // Compute badges (server-side mirror)
    const friendCount = (await getFriendIds(other)).length;
    const badges = [];
    if (total >= 1) badges.push('first_event');
    if (completed >= 3) badges.push('certificate_collector');
    if (streak >= 7) badges.push('streak_7');
    if (friendCount >= 10) badges.push('networker');
    res.json({ totalEvents: total, completedEvents: completed, byCategory, streak, interests: target.interests || [], badges });
  } catch (e) {
    console.error('stats error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/users/:id/certificates -> list of certificates for user (friends/self)
router.get('/:id/certificates', authenticateToken, async (req, res) => {
  try {
    const me = String(req.user.id);
    const other = String(req.params.id);
    const target = await User.findById(other).select('_id role').lean();
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (target.role !== 'student') return res.status(403).json({ error: 'Not a student' });
    if (me !== other) {
      const ok = await areFriends(me, other);
      if (!ok) return res.status(403).json({ error: 'Friends only' });
    }
    const certs = await Certificate.find({ studentId: other }).select('_id title url createdAt').sort({ createdAt: -1 }).lean();
    res.json(certs.map(c => ({ id: String(c._id), title: c.title, url: c.url, issuedAt: c.createdAt })));
  } catch (e) {
    console.error('certificates list error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});
