// routes/auth.js
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const https = require("https");
const User = require("../models/User");
const Host = require("../models/Host");
const { sendSmsTwilio } = require("../utils/sms");

// Helper to POST form-encoded data without fetch (for Node versions < 18)
// Create a reusable nodemailer transporter from environment
function createTransporter() {
  const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.EMAIL_PORT || '587', 10);
  const secure = port === 465; // true for 465, false for 587/25
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  if (!user || !pass) {
    throw new Error('EMAIL_USER/EMAIL_PASS not configured');
  }
  return nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
}

// Dedicated email verification email (for email OTP)
const sendEmailVerificationEmail = async (email, code, fullname) => {
  try {
    const transporter = createTransporter();
    const mailOptions = {
      from: process.env.EMAIL_USER || 'your-email@gmail.com',
      to: email,
      subject: 'Your Email Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">✅ Verify Your Email</h1>
          </div>
          <div style="padding: 30px; background: #f8f9fa; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-bottom: 20px;">Hello ${fullname || 'there'}!</h2>
            <p style="color: #555; line-height: 1.6;">Use the 6-digit code below to verify your email address:</p>
            <div style="background: white; padding: 15px; border: 2px dashed #dee2e6; border-radius: 8px; text-align: center; font-family: monospace; font-size: 22px; font-weight: bold; color: #111827; letter-spacing: 4px; margin: 16px 0;">
              ${code}
            </div>
            <ul style="color: #666; line-height: 1.6; margin: 0 0 16px 18px;">
              <li>This code expires in 10 minutes</li>
              <li>If you didn’t request this, you can safely ignore this email</li>
            </ul>
            <p style="color: #888; font-size: 12px;">This is an automated message. Please do not reply.</p>
          </div>
        </div>
      `
    };
    await transporter.sendMail(mailOptions);
    return true;
  } catch (err) {
    console.error('Email verification send error:', err?.message || err);
    return false;
  }
};

const postForm = (url, form) => {
  return new Promise((resolve, reject) => {
    try {
      const data = new URLSearchParams(form).toString();
      const u = new URL(url);
      const options = {
        method: "POST",
        hostname: u.hostname,
        path: u.pathname + (u.search || ""),
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(data),
        },
      };
      const req = https.request(options, (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(body));
            } catch (e) {
              reject(new Error("Invalid JSON from token endpoint"));
            }
          } else {
            console.error("Google token error:", body);
            reject(new Error(`Failed to exchange code: ${body}`));
          }
        });
      });
      req.on("error", reject);
      req.write(data);
      req.end();
    } catch (err) {
      reject(err);
    }
  });
};

// Router
const router = express.Router();

// =========================
// Availability Check
// =========================
router.get("/check-availability", async (req, res) => {
  try {
    const { username, email, phone } = req.query;
    const out = { username: null, email: null, phone: null };
    if (typeof username !== 'undefined') {
      const u1 = await User.findOne({ username: String(username) });
      const h1 = await Host.findOne({ username: String(username) });
      out.username = !(u1 || h1);
    }
    if (typeof email !== 'undefined') {
      const u2 = await User.findOne({ email: String(email) });
      const h2 = await Host.findOne({ email: String(email) });
      out.email = !(u2 || h2);
    }
    if (typeof phone !== 'undefined') {
      const p = String(phone);
      const u3 = await User.findOne({ phone: p });
      const h3 = await Host.findOne({ phone: p });
      out.phone = !(u3 || h3);
    }
    res.json({ available: out });
  } catch (err) {
    console.error("check-availability error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// User Settings (preferences) — defined after authenticateToken below

const sendResetEmail = async (email, resetCode, fullname) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_USER || 'your-email@gmail.com',
      to: email,
      subject: 'Your Password Reset Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">🔐 Password Reset</h1>
          </div>
          
          <div style="padding: 30px; background: #f8f9fa; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-bottom: 20px;">Hello ${fullname || 'there'}!</h2>
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              You requested a password reset for your account. Enter the 6-digit code below to reset your password:
            </p>
            <div style="background: #e9ecef; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
              <h3 style="color: #495057; margin: 0 0 10px 0;">Verification Code</h3>
              <div style="background: white; padding: 15px; border: 2px dashed #dee2e6; border-radius: 5px; font-family: monospace; font-size: 22px; font-weight: bold; color: #495057; letter-spacing: 4px;">
                ${resetCode}
              </div>
            </div>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              <strong>Important:</strong>
            </p>
            <ul style="color: #666; line-height: 1.6; margin-bottom: 20px; padding-left: 20px;">
              <li>This code expires in 15 minutes</li>
              <li>If you didn't request this reset, please ignore this email</li>
              <li>For security, this code can only be used once</li>
            </ul>
            
            <div style="text-align: center; margin-top: 30px;">
              <p style="color: #999; font-size: 14px;">
                Need help? Contact our support team.
              </p>
            </div>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Email sending error:', error);
    return false;
  }
};

// =========================
// Authentication Middleware
// =========================
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  console.log("Auth header:", authHeader);
  console.log("Token:", token);

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  const jwtSecret = process.env.JWT_SECRET || 'default-jwt-secret-for-development' || 'default-jwt-secret-for-development';
  jwt.verify(token, jwtSecret, (err, user) => {
    if (err) {
      console.log("JWT verification error:", err);
      return res.status(403).json({ error: "Invalid or expired token" });
    }
    console.log("Authenticated user:", user);
    req.user = user;
    next();
  });
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

// =========================
// User Settings (preferences)
// =========================
router.get("/settings", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).lean();
    if (!user) return res.status(404).json({ error: "User not found" });
    const settings = user.settings || {};
    return res.json({
      settings: {
        notifications: {
          email: !!(settings.notifications && settings.notifications.email),
          eventReminders: !!(settings.notifications && settings.notifications.eventReminders),
          newFromFollowedHosts: !!(settings.notifications && settings.notifications.newFromFollowedHosts),
          friendRequests: !!(settings.notifications && settings.notifications.friendRequests),
          weeklyDigest: !!(settings.notifications && settings.notifications.weeklyDigest),
          marketing: !!(settings.notifications && settings.notifications.marketing)
        },
        privacy: {
          onlyFriendsCanViewProfile: !!(settings.privacy && settings.privacy.onlyFriendsCanViewProfile),
          allowFriendRequests: settings.privacy?.allowFriendRequests !== false,
          searchableByEmail: settings.privacy?.searchableByEmail !== false,
          showBadgesPublic: settings.privacy?.showBadgesPublic !== false
        },
        ui: {
          theme: settings.ui?.theme || "system",
          density: settings.ui?.density || "comfortable",
          sidebarCollapsedDefault: !!settings.ui?.sidebarCollapsedDefault
        },
        recommendations: {
          personalizeUsingOnboarding: settings.recommendations?.personalizeUsingOnboarding !== false,
          showTrendingFirst: settings.recommendations?.showTrendingFirst !== false
        },
        connectedApps: { googleLinked: !!(settings.connectedApps && settings.connectedApps.googleLinked) || !!user.firebaseUid }
      },
      emailVerified: !!user.emailVerified,
      phoneVerified: !!user.phoneVerified,
      onboardingCompleted: !!user.onboardingCompleted,
      onboardingData: user.onboardingData || {},
      settings: user.settings || { notifications: { email: true }, privacy: { onlyFriendsCanViewProfile: false }, connectedApps: { googleLinked: !!user.firebaseUid } },
      isStudentIdVerified: !!user.isStudentIdVerified,
      studentIdVerifiedAt: user.studentIdVerifiedAt || null,
      studentIdNotes: user.studentIdNotes || "",
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (err) {
    console.error("/me error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// =========================
// Admin: Student ID Verification
// =========================
router.get("/admin/verification/student-ids", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const status = (req.query.status || 'pending').toLowerCase();
    const query = {};
    if (status === 'pending') {
      query.isStudentIdVerified = false;
    } else if (status === 'verified') {
      query.isStudentIdVerified = true;
    }
    // Only include users who have uploaded at least one doc
    query.$or = [
      { studentIdPath: { $exists: true, $ne: null } },
      { secondDocPath: { $exists: true, $ne: null } }
    ];

    const users = await User.find(query)
      .select('fullname institute email phone studentIdPath secondDocPath isStudentIdVerified studentIdVerifiedAt ocrMismatch createdAt')
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    res.json({ items: users });
  } catch (err) {
    console.error("list pending verification error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/admin/verification/student-id/:userId/approve", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.isStudentIdVerified = true;
    user.studentIdVerifiedAt = new Date();
    await user.save();

    // Optional email notification
    try {
      const transporter = createTransporter();
      if (user.email) {
        await transporter.sendMail({
          from: process.env.EMAIL_USER || 'no-reply@example.com',
          to: user.email,
          subject: 'Student ID Verified',
          html: `<p>Hi ${user.fullname || 'Student'},</p><p>Your student verification was approved.</p>`
        });
      }
    } catch (_) { /* ignore notification errors */ }

    res.json({ message: '✅ Approved', userId });
  } catch (err) {
    console.error("approve verification error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/admin/verification/student-id/:userId/reject", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userId = req.params.userId;
    const { reason } = req.body || {};
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.isStudentIdVerified = false;
    user.studentIdVerifiedAt = null;
    user.studentIdNotes = typeof reason === 'string' ? reason : '';
    await user.save();

    // Optional email notification
    try {
      const transporter = createTransporter();
      if (user.email) {
        await transporter.sendMail({
          from: process.env.EMAIL_USER || 'no-reply@example.com',
          to: user.email,
          subject: 'Student ID Verification Update',
          html: `<p>Hi ${user.fullname || 'Student'},</p><p>Your student verification was not approved.${reason ? ` Reason: ${reason}` : ''}</p>`
        });
      }
    } catch (_) { /* ignore notification errors */ }

    res.json({ message: '❌ Rejected', userId });
  } catch (err) {
    console.error("reject verification error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/settings", authenticateToken, async (req, res) => {
  try {
    const body = req.body || {};
    const update = { updatedAt: new Date() };
    // Notifications
    if (body.notifications) {
      const n = body.notifications;
      if (typeof n.email === 'boolean') update["settings.notifications.email"] = !!n.email;
      if (typeof n.eventReminders === 'boolean') update["settings.notifications.eventReminders"] = !!n.eventReminders;
      if (typeof n.newFromFollowedHosts === 'boolean') update["settings.notifications.newFromFollowedHosts"] = !!n.newFromFollowedHosts;
      if (typeof n.friendRequests === 'boolean') update["settings.notifications.friendRequests"] = !!n.friendRequests;
      if (typeof n.weeklyDigest === 'boolean') update["settings.notifications.weeklyDigest"] = !!n.weeklyDigest;
      if (typeof n.marketing === 'boolean') update["settings.notifications.marketing"] = !!n.marketing;
    }
    // Privacy
    if (body.privacy) {
      const p = body.privacy;
      if (typeof p.onlyFriendsCanViewProfile === 'boolean') update["settings.privacy.onlyFriendsCanViewProfile"] = !!p.onlyFriendsCanViewProfile;
      if (typeof p.allowFriendRequests === 'boolean') update["settings.privacy.allowFriendRequests"] = !!p.allowFriendRequests;
      if (typeof p.searchableByEmail === 'boolean') update["settings.privacy.searchableByEmail"] = !!p.searchableByEmail;
      if (typeof p.showBadgesPublic === 'boolean') update["settings.privacy.showBadgesPublic"] = !!p.showBadgesPublic;
    }
    // UI
    if (body.ui) {
      const ui = body.ui;
      if (typeof ui.sidebarCollapsedDefault === 'boolean') update["settings.ui.sidebarCollapsedDefault"] = !!ui.sidebarCollapsedDefault;
      if (typeof ui.theme === 'string' && ["system","light","dark"].includes(ui.theme)) update["settings.ui.theme"] = ui.theme;
      if (typeof ui.density === 'string' && ["comfortable","compact"].includes(ui.density)) update["settings.ui.density"] = ui.density;
    }
    // Recommendations
    if (body.recommendations) {
      const r = body.recommendations;
      if (typeof r.personalizeUsingOnboarding === 'boolean') update["settings.recommendations.personalizeUsingOnboarding"] = !!r.personalizeUsingOnboarding;
      if (typeof r.showTrendingFirst === 'boolean') update["settings.recommendations.showTrendingFirst"] = !!r.showTrendingFirst;
    }
    const saved = await User.findByIdAndUpdate(req.user.id, { $set: update }, { new: true });
    if (!saved) return res.status(404).json({ error: "User not found" });
    const settings = saved.settings || {};
    return res.json({
      message: "✅ Settings updated",
      settings: {
        notifications: {
          email: !!settings.notifications?.email,
          eventReminders: !!settings.notifications?.eventReminders,
          newFromFollowedHosts: !!settings.notifications?.newFromFollowedHosts,
          friendRequests: !!settings.notifications?.friendRequests,
          weeklyDigest: !!settings.notifications?.weeklyDigest,
          marketing: !!settings.notifications?.marketing
        },
        privacy: {
          onlyFriendsCanViewProfile: !!settings.privacy?.onlyFriendsCanViewProfile,
          allowFriendRequests: !!settings.privacy?.allowFriendRequests,
          searchableByEmail: !!settings.privacy?.searchableByEmail,
          showBadgesPublic: !!settings.privacy?.showBadgesPublic
        },
        ui: {
          theme: settings.ui?.theme || "system",
          density: settings.ui?.density || "comfortable",
          sidebarCollapsedDefault: !!settings.ui?.sidebarCollapsedDefault
        },
        recommendations: {
          personalizeUsingOnboarding: settings.recommendations?.personalizeUsingOnboarding !== false,
          showTrendingFirst: settings.recommendations?.showTrendingFirst !== false
        },
        connectedApps: { googleLinked: !!saved.firebaseUid || !!(settings.connectedApps && settings.connectedApps.googleLinked) }
      }
    });
  } catch (err) {
    console.error("/settings put error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// =========================
// Multer File Upload Config
// =========================
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, "..", "uploads")),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

// =========================
// Test Endpoint
// =========================
router.get("/test", (req, res) => {
  res.json({ message: "Auth server is working!", timestamp: new Date().toISOString() });
});

// =========================
// Current user profile
// =========================
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).lean();
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({
      id: user._id,
      username: user.username,
      fullname: user.fullname,
      institute: user.institute,
      street: user.street,
      city: user.city,
      pincode: user.pincode,
      age: user.age,
      course: user.course,
      email: user.email,
      phone: user.phone,
      countryCode: user.countryCode,
      role: user.role,
      displayBadges: Array.isArray(user.displayBadges) ? user.displayBadges : [],
      profilePic: user.profilePic || "",
      bio: user.bio || "",
      bannerUrl: user.bannerUrl || "",
      interests: user.interests || [],
      emailVerified: !!user.emailVerified,
      phoneVerified: !!user.phoneVerified,
      onboardingCompleted: !!user.onboardingCompleted,
      onboardingData: user.onboardingData || {},
      settings: user.settings || { notifications: { email: true }, privacy: { onlyFriendsCanViewProfile: false }, connectedApps: { googleLinked: !!user.firebaseUid } },
      isStudentIdVerified: !!user.isStudentIdVerified,
      studentIdVerifiedAt: user.studentIdVerifiedAt || null,
      studentIdNotes: user.studentIdNotes || "",
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (err) {
    console.error("/me error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/me", authenticateToken, async (req, res) => {
  try {
    const allowed = [
      "username","fullname","institute","street","city","pincode","age","course","countryCode","interests","bio","bannerUrl"
    ,"displayBadges"];
    const update = { updatedAt: new Date() };
    allowed.forEach(k => {
      if (typeof req.body[k] !== 'undefined') update[k] = req.body[k];
    });

    // Basic validations
    // Email and phone are not updatable via this endpoint
    // Validate displayBadges if provided (max 3 strings)
    if (typeof update.displayBadges !== "undefined") {
      const arr = Array.isArray(update.displayBadges) ? update.displayBadges : String(update.displayBadges).split(",");
      update.displayBadges = arr.map(x => String(x).trim()).filter(Boolean);
      if (update.displayBadges.length > 3) update.displayBadges = update.displayBadges.slice(0,3);
    }
    if (typeof update.pincode !== 'undefined' && !/^\d{6}$/.test(String(update.pincode))) {
      return res.status(400).json({ error: "Pincode must be 6 digits" });
    }
    if (typeof update.phone !== 'undefined' && !/^\d{10}$/.test(String(update.phone))) {
      return res.status(400).json({ error: "Phone must be 10 digits" });
    }
    if (typeof update.countryCode !== 'undefined' && !/^\+\d{1,4}$/.test(String(update.countryCode))) {
      return res.status(400).json({ error: "Invalid country code" });
    }

    // Normalize interests if provided
    if (typeof update.interests !== 'undefined') {
      const arr = Array.isArray(update.interests) ? update.interests : String(update.interests).split(',');
      update.interests = arr
        .map(s => String(s).trim())
        .filter(Boolean)
        .slice(0, 50);
    }

    const current = await User.findById(req.user.id);
    if (!current) return res.status(404).json({ error: "User not found" });

    // Reset verification if email/phone changed
    if (typeof update.email !== 'undefined' && update.email !== current.email) {
      update.emailVerified = false;
      update.emailOTP = undefined;
      update.emailOTPExpires = undefined;
    }
    if (typeof update.phone !== 'undefined' && update.phone !== current.phone) {
      // Ensure unique phone across Users and Hosts (exclude self)
      const phoneStr = String(update.phone);
      const existsUser = await User.findOne({ _id: { $ne: current._id }, phone: phoneStr });
      const existsHost = await Host.findOne({ phone: phoneStr });
      if (existsUser || existsHost) {
        return res.status(400).json({ error: "Phone number already in use" });
      }
      update.phoneVerified = false;
      update.phoneOTP = undefined;
      update.phoneOTPExpires = undefined;
    }

    const saved = await User.findByIdAndUpdate(req.user.id, update, { new: true });
    res.json({ message: "✅ Profile updated", emailVerified: saved.emailVerified, phoneVerified: saved.phoneVerified });
  } catch (err) {
    console.error("/me update error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Update display badges (max 3)
router.put("/display-badges", authenticateToken, async (req, res) => {
  try {
    let badges = req.body?.badges;
    if (typeof badges === "undefined") {
      return res.status(400).json({ error: "badges is required" });
    }
    if (!Array.isArray(badges)) {
      badges = String(badges).split(",");
    }
    const allowed = new Set([
      'first_event',
      'bookmarker',
      'social_butterfly',
      'reviewer',
      'streak_7',
      'certificate_collector',
      'early_bird',
      'networker'
    ]);
    const cleanedAll = badges
      .map((b) => String(b).trim())
      .filter(Boolean)
      .slice(0, 3);
    const clean = cleanedAll.filter(b => allowed.has(b));
    const ignored = cleanedAll.filter(b => !allowed.has(b));

    const updated = await User.findByIdAndUpdate(
      req.user.id,
      { displayBadges: clean, updatedAt: new Date() },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: "User not found" });
    res.json({ message: "✅ Display badges updated", displayBadges: updated.displayBadges || [], ignored });
  } catch (err) {
    console.error("display-badges update error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/upload-profile-pic", authenticateToken, upload.single('profilePic'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    const rel = `uploads/${req.file.filename}`.replace(/\\/g, '/');
    user.profilePic = rel;
    await user.save();
    res.json({ message: "Profile picture updated", profilePic: rel });
  } catch (err) {
    console.error("upload-profile-pic error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Banner upload route (after router, storage, and authenticateToken are defined)
router.post("/upload-banner", authenticateToken, upload.single('banner'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    const rel = `uploads/${req.file.filename}`.replace(/\\/g, '/');
    user.bannerUrl = rel;
    await user.save();
    res.json({ message: "Banner updated", bannerUrl: rel });
  } catch (err) {
    console.error("upload-banner error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// =========================
// Email/Phone OTP send & verify
// =========================
router.post("/send-email-otp", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (!user.email) return res.status(400).json({ error: "Email not set" });
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    user.emailOTP = code;
    user.emailOTPExpires = new Date(Date.now() + 10 * 60 * 1000); // 10min
    await user.save();
    const sent = await sendEmailVerificationEmail(user.email, code, user.fullname || user.username || "");
    if (sent) return res.json({ message: "OTP sent to email" });
    if (process.env.NODE_ENV !== 'production') return res.json({ message: "Dev mode: email OTP", devCode: code });
    return res.status(500).json({ error: "Failed to send OTP email" });
  } catch (err) {
    console.error("send-email-otp error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/verify-email-otp", authenticateToken, async (req, res) => {
  try {
    const { code } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (!code || user.emailOTP !== code || !user.emailOTPExpires || user.emailOTPExpires.getTime() < Date.now()) {
      return res.status(400).json({ error: "Invalid or expired code" });
    }
    user.emailVerified = true;
    user.emailOTP = undefined;
    user.emailOTPExpires = undefined;
    await user.save();
    res.json({ message: "✅ Email verified" });
  } catch (err) {
    console.error("verify-email-otp error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/send-phone-otp", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (!user.phone) return res.status(400).json({ error: "Phone not set" });
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    user.phoneOTP = code;
    user.phoneOTPExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();
    // Try sending SMS via Twilio when configured
    const cc = user.countryCode || process.env.DEFAULT_SMS_COUNTRY_CODE || '+91';
    const to = String(user.phone).startsWith('+') ? String(user.phone) : `${cc}${String(user.phone)}`;
    const body = `Your verification code is ${code}. It expires in 10 minutes.`;
    const smsSent = await sendSmsTwilio(to, body);
    if (smsSent) return res.json({ message: "OTP sent to phone" });
    // Fallbacks
    if (process.env.NODE_ENV !== 'production') return res.json({ message: "Dev mode: phone OTP", devCode: code });
    return res.status(500).json({ error: "Failed to send OTP SMS" });
  } catch (err) {
    console.error("send-phone-otp error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/verify-phone-otp", authenticateToken, async (req, res) => {
  try {
    const { code } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (!code || user.phoneOTP !== code || !user.phoneOTPExpires || user.phoneOTPExpires.getTime() < Date.now()) {
      return res.status(400).json({ error: "Invalid or expired code" });
    }
    user.phoneVerified = true;
    user.phoneOTP = undefined;
    user.phoneOTPExpires = undefined;
    await user.save();
    res.json({ message: "✅ Phone verified" });
  } catch (err) {
    console.error("verify-phone-otp error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// =========================
// Google OAuth 2.0 (Server-initiated)
// =========================
router.get("/google", (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  
  if (!clientId) {
    return res.status(400).json({ 
      error: "Google OAuth not configured. Please contact administrator." 
    });
  }
  
  const redirectUri = process.env.OAUTH_REDIRECT_URI || "http://localhost:5000/api/auth/google/callback";
  const scope = encodeURIComponent("openid email profile");
  const state = req.query.state || "";

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
    clientId
  )}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&access_type=offline&prompt=select_account&state=${encodeURIComponent(
    state
  )}`;

  res.redirect(authUrl);
});

router.get("/google/callback", async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) {
      return res.status(400).send("Missing code");
    }

    // Check if Google OAuth is configured
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.status(400).send("Google OAuth not configured");
    }

    // Exchange code for tokens (supports Node without fetch)
    let tokenJson;
    try {
      tokenJson = await postForm("https://oauth2.googleapis.com/token", {
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.OAUTH_REDIRECT_URI || "http://localhost:5000/api/auth/google/callback",
        grant_type: "authorization_code",
      });
    } catch (err) {
      console.error("Google token error:", err.message || err);
      return res.status(400).send(err.message || "Failed to exchange code");
    }

    const { id_token } = tokenJson;
    if (!id_token) {
      return res.status(400).send("Missing id_token");
    }

    // Decode id_token payload (basic parse)
    const payload = JSON.parse(Buffer.from(id_token.split(".")[1], "base64").toString());
    const email = payload.email;
    const fullname = payload.name || "";
    const sub = payload.sub; // Google user id

    if (!email) {
      return res.status(400).send("Email not available from Google");
    }

    let user = await User.findOne({ email });
    if (!user) {
      user = new User({
        username: email.split("@")[0],
        fullname,
        institute: "",
        street: "",
        city: "",
        pincode: "",
        age: 18,
        course: "",
        email,
        phone: "",
        countryCode: "+91",
        password: null, // Google-only
        studentIdPath: null,
        firebaseUid: sub, // reuse field to store Google ID
        role: "student",
      });
      await user.save();
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'default-jwt-secret-for-development',
      { expiresIn: "1h" }
    );

    const userPayload = {
      id: user._id,
      fullname: user.fullname,
      email: user.email,
      role: user.role,
      displayBadges: Array.isArray(user.displayBadges) ? user.displayBadges : [],
    };

    const userB64 = Buffer.from(JSON.stringify(userPayload)).toString("base64");
    const clientCallback = process.env.CLIENT_OAUTH_CALLBACK || "http://localhost:3000/oauth-callback";
    const redirectUrl = `${clientCallback}?token=${encodeURIComponent(token)}&user=${encodeURIComponent(userB64)}`;

    res.redirect(redirectUrl);
  } catch (err) {
    console.error("Google OAuth callback error:", err);
    res.status(500).send("OAuth error");
  }
});

// =========================
// Test Forgot Password (for development)
// =========================
router.get("/test-forgot-password", async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ error: "Email parameter required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      message: "User found",
      user: {
        email: user.email,
        hasPassword: !!user.password,
        role: user.role
      }
    });
  } catch (err) {
    console.error("Test forgot password error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// =========================
// Test Email Sending (for development)
// =========================
router.post("/test-email", async (req, res) => {
  try {
    const { email, resetToken, fullname } = req.body;
    
    if (!email || !resetToken) {
      return res.status(400).json({ error: "Email and resetToken required" });
    }

    const emailSent = await sendResetEmail(email, resetToken, fullname || "Test User");
    
    if (emailSent) {
      res.json({ 
        message: "✅ Test email sent successfully!",
        note: "Check the specified email address for the test message."
      });
    } else {
      res.status(500).json({ 
        error: "Failed to send test email",
        note: "Check your email configuration and server logs."
      });
    }
  } catch (err) {
    console.error("Test email error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// =========================
// Register User
// =========================
router.post("/register", upload.fields([
  { name: "studentId", maxCount: 1 },
  { name: "secondDoc", maxCount: 1 },
]), async (req, res) => {
  try {
    const {
      uid,
      email,
      password,
      username,
      fullname,
      institute,
      street,
      city,
      pincode,
      age,
      course,
      phone,
      countryCode,
      // studentId is handled as file; keep body fallback if provided
      studentId,
      role, // Accept role
      agreeVerification,
      ocrRaw,
      ocrMismatch,
    } = req.body;

    const existsUserByEmail = await User.findOne({ email });
    const existsHostByEmail = await Host.findOne({ email });
    if (existsUserByEmail || existsHostByEmail) return res.status(400).json({ error: "Email already in use" });
    const existsUserByUsername = await User.findOne({ username });
    const existsHostByUsername = await Host.findOne({ username });
    if (existsUserByUsername || existsHostByUsername) return res.status(400).json({ error: "Username already in use" });

    // Normalize and validate phone
    const phoneStr = String(phone || "").trim();
    if (!/^\d{10}$/.test(phoneStr)) {
      return res.status(400).json({ error: "Phone must be 10 digits" });
    }
    // Ensure unique phone across Users and Hosts
    const phoneInUsers = await User.findOne({ phone: phoneStr });
    const phoneInHosts = await Host.findOne({ phone: phoneStr });
    if (phoneInUsers || phoneInHosts) {
    return res.status(400).json({ error: "Phone number already in use" });
  }

    // If password is provided -> hash; if not provided, keep null (e.g., Google account)
    let hashedPassword = null;
    if (password && password.trim() !== "") {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // Ensure at least one verification document was uploaded
    const studentIdFile = req.files && Array.isArray(req.files["studentId"]) ? req.files["studentId"][0] : null;
    const secondDocFile = req.files && Array.isArray(req.files["secondDoc"]) ? req.files["secondDoc"][0] : null;
    if (!studentIdFile && !secondDocFile && !studentId) {
      return res.status(400).json({ error: "Student ID or Bonafide/Receipt document is required" });
    }

    const userData = {
      username,
      fullname,
      institute,
      street,
      city,
      pincode,
      age: age ? parseInt(age) : undefined,
      course,
      email,
      phone: phoneStr,
      countryCode: countryCode || "+91",
      password: hashedPassword,                    // null for Google accounts
      studentIdPath: (studentIdFile && studentIdFile.path) || studentId || null,
      secondDocPath: (secondDocFile && secondDocFile.path) || null,
      // Manual verification defaults
      isStudentIdVerified: false,
      studentIdVerifiedAt: null,
      agreeVerification: String(agreeVerification || "").toLowerCase() === "true",
      ocrRaw: typeof ocrRaw === 'string' ? ocrRaw : '',
      ocrMismatch: String(ocrMismatch || "false").toLowerCase() === "true",
      firebaseUid: uid || null,
      role: role || "student",
    };

    const user = new User(userData);
    await user.save();

    res.json({ message: "✅ Registered. Verification pending — admin will review your document(s).", userId: user._id, pendingVerification: true });
  } catch (err) {
    console.error("❌ Registration error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// =========================
// Register Host
// =========================
router.post("/register-host", upload.single("document"), async (req, res) => {
  try {
    const {
      email,
      password,
      username,
      fullname,
      institute,
      street,
      city,
      pincode,
      age,
      course,
      phone,
      countryCode,
    } = req.body;

    // Check if user already exists in User collection
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: "User already exists" });

    // Check if host already exists in Host collection
    const existingHost = await Host.findOne({ email });
    if (existingHost) return res.status(400).json({ error: "Host already exists" });

    if (!req.file) {
      return res.status(400).json({ error: "Document upload is required" });
    }

    // Normalize and validate phone
    const phoneStr = String(phone || "").trim();
    if (!/^\d{10}$/.test(phoneStr)) {
      return res.status(400).json({ error: "Phone must be 10 digits" });
    }
    // Ensure unique phone across Users and Hosts
    const phoneInUsers2 = await User.findOne({ phone: phoneStr });
    const phoneInHosts2 = await Host.findOne({ phone: phoneStr });
    if (phoneInUsers2 || phoneInHosts2) {
      return res.status(400).json({ error: "Phone number already in use" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const hostData = {
      username,
      fullname,
      institute,
      street,
      city,
      pincode,
      age: age ? parseInt(age) : undefined,
      course,
      email,
      phone,
      countryCode: countryCode || "+91",
      password: hashedPassword,
      documentPath: req.file.path,
      approvalStatus: "pending", // Default to pending approval
    };

    const host = new Host(hostData);
    await host.save();

    res.json({ 
      message: "✅ Host registration submitted successfully. Your application is pending admin approval.", 
      hostId: host._id,
      status: "pending"
    });
  } catch (err) {
    console.error("❌ Host registration error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// =========================
// Get User by Email
// =========================
router.get("/user/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({
      username: user.username,
      fullname: user.fullname,
      email: user.email,
      institute: user.institute,
      street: user.street,
      city: user.city,
      pincode: user.pincode,
      age: user.age,
      course: user.course,
      phone: user.phone,
      countryCode: user.countryCode,
      studentIdPath: user.studentIdPath,
      firebaseUid: user.firebaseUid,
      role: user.role,
      displayBadges: Array.isArray(user.displayBadges) ? user.displayBadges : [],
    });
  } catch (err) {
    console.error("Get user error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// =========================
// Login User (JWT Auth)
// Blocks password login for Google-only accounts
// =========================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Invalid email" });

    // Google-only accounts have password === null
    if (!user.password) {
      return res.status(400).json({ error: "This account uses Google login only" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: "Invalid password" });

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'default-jwt-secret-for-development',
      { expiresIn: "1h" }
    );

    res.json({
      message: "✅ Login successful",
      token,
      user: {
        id: user._id,
        fullname: user.fullname,
        email: user.email,
        role: user.role,
        displayBadges: Array.isArray(user.displayBadges) ? user.displayBadges : [],
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// =========================
// Login Host (JWT Auth)
// Checks approval status before allowing login
// =========================
router.post("/login-host", async (req, res) => {
  try {
    const { email, password } = req.body;

    const host = await Host.findOne({ email });
    if (!host) return res.status(400).json({ error: "Invalid email" });

    const match = await bcrypt.compare(password, host.password);
    if (!match) return res.status(400).json({ error: "Invalid password" });

    // Check approval status
    if (host.approvalStatus === "pending") {
      return res.status(403).json({ 
        error: "Your host application is pending admin approval. Please wait for approval before logging in." 
      });
    }

    if (host.approvalStatus === "rejected") {
      return res.status(403).json({ 
        error: "Your host application was rejected. Please contact admin for more information." 
      });
    }

    const token = jwt.sign(
      { id: host._id, email: host.email, role: "host" },
      process.env.JWT_SECRET || 'default-jwt-secret-for-development',
      { expiresIn: "1h" }
    );

    res.json({
      message: "✅ Host login successful",
      token,
      user: {
        id: host._id,
        fullname: host.fullname,
        email: host.email,
        role: "host",
      },
    });
  } catch (err) {
    console.error("Host login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// =========================
// Google Login (from Firebase on the client)
// Creates/fetches Mongo user with password=null and returns JWT
// =========================
router.post("/google-login", async (req, res) => {
  try {
    const { uid, email, fullname, username } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    let user = await User.findOne({ email });

    if (!user) {
      user = new User({
        username: username || email.split("@")[0],
        fullname: fullname || "",
        email,
        firebaseUid: uid || null,
        password: null,           // 🔒 Google-only
        role: "student",
      });
      await user.save();
    } else {
      // if existing user had a password before but is now using Google,
      // you can enforce Google-only by nulling it (optional – uncomment if desired)
      // user.password = null;
      // await user.save();
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'default-jwt-secret-for-development',
      { expiresIn: "1h" }
    );

    res.json({
      message: "✅ Google login successful",
      token,
      user: {
        id: user._id,
        fullname: user.fullname,
        email: user.email,
        role: user.role,
        displayBadges: Array.isArray(user.displayBadges) ? user.displayBadges : [],
      },
    });
  } catch (err) {
    console.error("Google login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// =========================
// Forgot Password
// Blocks for Google-only accounts
// =========================
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "No account found with this email" });

    // Block resets for Google-only accounts
    if (!user.password) {
      return res.status(400).json({ error: "This account uses Google login. Use 'Sign in with Google'." });
    }

    // Generate 6-digit numeric code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const resetCodeExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes

    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.resetCode = resetCode;
    user.resetCodeExpires = new Date(resetCodeExpiry);
    await user.save();

    // Try to send email with code
    const emailSent = await sendResetEmail(email, resetCode, user.fullname);
    
    if (emailSent) {
      return res.json({ 
        message: "✅ Password reset email sent successfully!",
        note: "Check your email for the verification code. If you don't see it, check your spam folder."
      });
    }

    // Dev fallback if email sending fails
    if (process.env.NODE_ENV !== 'production') {
      console.warn("Email failed to send. Returning dev reset code in response (non-production).");
      return res.json({
        message: "✅ Dev mode: use this code to reset your password",
        devCode: resetCode
      });
    }

    return res.status(500).json({ 
      error: "Failed to send reset email. Please try again later.",
    });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// =========================
// Reset Password
// =========================
router.post("/reset-password", async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    const user = await User.findOne({
      email,
      resetCode: code,
      resetCodeExpires: { $gt: Date.now() },
    });
    if (!user) return res.status(400).json({ error: "Invalid or expired code" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.resetCode = undefined;
    user.resetCodeExpires = undefined;
    user.updatedAt = new Date();
    await user.save();

    res.json({ message: "✅ Password reset successful" });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// =========================
/** Admin Management - Protected Routes */
// =========================
router.get("/hosts", authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Prefer approved Host applications as source of truth
    const approvedHosts = await Host.find({ approvalStatus: "approved", isDeleted: { $ne: true } }).lean();
    // Try to attach corresponding User id if exists (by email)
    const emails = approvedHosts.map(h => h.email);
    const users = await User.find({ email: { $in: emails }, role: "host", isDeleted: { $ne: true } }).select("_id email").lean();
    const emailToUserId = new Map(users.map(u => [u.email, u._id.toString()]));

    const result = approvedHosts.map(h => ({
      _id: h._id, // Host collection id
      userId: emailToUserId.get(h.email) || null,
      username: h.username,
      fullname: h.fullname,
      institute: h.institute,
      street: h.street,
      city: h.city,
      pincode: h.pincode,
      age: h.age,
      course: h.course,
      email: h.email,
      phone: h.phone,
      countryCode: h.countryCode,
    }));

    res.json(result);
  } catch (err) {
    console.error("Get hosts error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// =========================
// Admin: Host Applications Management
// =========================
router.get("/admin/host-applications", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const hosts = await Host.find({ isDeleted: { $ne: true } }).sort({ createdAt: -1 });
    res.json(hosts);
  } catch (err) {
    console.error("Get host applications error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/admin/host-applications/:id/approve", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const host = await Host.findById(id);
    if (!host) return res.status(404).json({ error: "Host application not found" });

    host.approvalStatus = "approved";
    host.approvedBy = req.user.id;
    host.approvedAt = new Date();
    host.updatedAt = new Date();
    await host.save();
    // Upsert corresponding User with role "host"
    const userPayload = {
      username: host.username,
      fullname: host.fullname,
      institute: host.institute,
      street: host.street,
      city: host.city,
      pincode: host.pincode,
      age: host.age,
      course: host.course,
      email: host.email,
      phone: host.phone,
      countryCode: host.countryCode,
      // password already hashed in Host model at registration time
      password: host.password,
      role: "host",
      updatedAt: new Date(),
    };
    const upsertedUser = await User.findOneAndUpdate(
      { email: host.email },
      { $set: userPayload, $setOnInsert: { createdAt: new Date() } },
      { new: true, upsert: true }
    );

    res.json({ message: "✅ Host application approved", host, user: upsertedUser });
  } catch (err) {
    console.error("Approve host error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/admin/host-applications/:id/reject", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    const host = await Host.findById(id);
    if (!host) return res.status(404).json({ error: "Host application not found" });

    host.approvalStatus = "rejected";
    host.rejectionReason = rejectionReason || "No reason provided";
    host.updatedAt = new Date();
    await host.save();

    res.json({ message: "✅ Host application rejected", host });
  } catch (err) {
    console.error("Reject host error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/update/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const body = { ...req.body };

    // Server-side validation
    const required = ["fullname", "username", "email", "institute", "street", "city", "pincode", "age", "course", "phone"];    
    for (const f of required) {
      if (typeof body[f] === "undefined" || String(body[f]).trim() === "") {
        return res.status(400).json({ error: `Missing required field: ${f}` });
      }
    }
    if (!/\S+@\S+\.\S+/.test(body.email)) return res.status(400).json({ error: "Invalid email format" });
    if (!/^\d{6}$/.test(String(body.pincode))) return res.status(400).json({ error: "Pincode must be 6 digits" });
    if (!/^\d{10}$/.test(String(body.phone))) return res.status(400).json({ error: "Phone must be 10 digits" });
    if (body.countryCode && !/^\+\d{1,4}$/.test(String(body.countryCode))) return res.status(400).json({ error: "Invalid country code" });
    const ageNum = parseInt(body.age, 10); if (isNaN(ageNum) || ageNum < 16 || ageNum > 100) return res.status(400).json({ error: "Age must be between 16 and 100" });

    // Remove non-persisted fields
    if (typeof body.confirmPassword !== "undefined") delete body.confirmPassword;

    // Hash new password if provided and non-empty
    if (typeof body.password !== "undefined") {
      if (body.password && body.password.trim() !== "") {
        body.password = await bcrypt.hash(body.password, 10);
      } else {
        // Do not overwrite existing password with empty string/null
        delete body.password;
      }
    }

    body.updatedAt = new Date();

    const updatedUser = await User.findByIdAndUpdate(id, body, { new: true });
    if (!updatedUser) return res.status(404).json({ error: "User not found" });
    res.json(updatedUser);
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/delete/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.isDeleted) return res.json({ message: "✅ User already deleted" });
    user.isDeleted = true;
    user.deletedAt = new Date();
    user.updatedAt = new Date();
    await user.save();
    res.json({ message: "✅ User deleted (soft)", userId: user._id });
  } catch (err) {
    console.error("Soft delete user error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// =========================
// Create Default Admin
// =========================
router.post("/create-admin", async (req, res) => {
  try {
    const exists = await User.findOne({ email: "admin@example.com" });
    if (exists) return res.status(400).json({ error: "Admin already exists" });

    const hashedPassword = await bcrypt.hash("admin123", 10);

    const adminUser = new User({
      username: "admin",
      fullname: "System Admin",
      institute: "Admin Institute",
      street: "Main Road",
      city: "AdminCity",
      pincode: "123456",
      age: 30,
      course: "Management",
      email: "admin@example.com",
      phone: "9999999999",
      countryCode: "+91",
      password: hashedPassword,
      role: "admin",
    });

    await adminUser.save();
    res.json({ message: "✅ Admin user created", adminId: adminUser._id });
  } catch (err) {
    console.error("Admin creation error:", err);
    res.status(500).json({ error: "Failed to create admin" });
  }
});

// =========================
// Student Onboarding
// =========================
router.post("/onboarding", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const onboardingData = req.body;

    console.log("Onboarding data received:", JSON.stringify(onboardingData, null, 2));

    // Validate required fields
    const requiredFields = [
      'preferredCareerSectors', 'preferredJobRoles', 'futurePlan', 
      'careerGoals', 'skillsToDevelop', 'preferredWorkMode', 
      'preferredCompanyType', 'eventTypesInterested', 
      'availabilityPreferences', 'willingnessToTravel', 'preferredLearningStyle'
    ];

    for (const field of requiredFields) {
      console.log(`Checking field ${field}:`, onboardingData[field]);
      if (!onboardingData[field] || 
          (Array.isArray(onboardingData[field]) && onboardingData[field].length === 0) ||
          (typeof onboardingData[field] === 'string' && onboardingData[field].trim() === '')) {
        console.log(`Missing required field: ${field}`);
        return res.status(400).json({ 
          error: `Missing required field: ${field}`,
          receivedData: onboardingData,
          missingField: field
        });
      }
    }

    // Update user with onboarding data
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.onboardingCompleted = true;
    user.onboardingData = onboardingData;
    user.updatedAt = new Date();
    
    await user.save();

    res.json({ 
      message: "✅ Onboarding completed successfully",
      onboardingCompleted: true 
    });
  } catch (err) {
    console.error("Onboarding error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// =========================
// Public-safe: Get host profiles by IDs
// =========================
router.get("/hosts/by-ids", async (req, res) => {
  try {
    const idsParam = req.query.ids || "";
    const ids = idsParam
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (!ids.length) return res.json([]);

    // Filter to valid ObjectIds only to avoid CastErrors
    const { Types } = require("mongoose");
    const validIds = ids.filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));
    if (!validIds.length) return res.json([]);

    const hosts = await User.find({ _id: { $in: validIds }, role: "host" })
      .select("_id username fullname email institute city")
      .lean();

    res.json(hosts);
  } catch (err) {
    console.error("Get hosts by ids error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// =========================
// Admin: Events Management
// =========================
const Event = require("../models/Event");

// List all events with basic host info
router.get("/admin/events", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const events = await Event.find({ isDeleted: { $ne: true } }).sort({ createdAt: -1 }).lean();
    res.json(events);
  } catch (err) {
    console.error("Admin list events error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Update event: publish/unpublish, complete, or edit fields
router.put("/admin/events/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const allowed = [
      "title","description","shortDescription","date","endDate","location","address","city","state","pincode","capacity","price","currency","category","tags","requirements","agenda","contactEmail","contactPhone","website","imageUrl","isOnline","meetingLink","isCompleted","isPublished"
    ,"displayBadges"];
    const update = { updatedAt: new Date() };
    Object.keys(req.body || {}).forEach((k) => {
      if (allowed.includes(k)) update[k] = req.body[k];
    });
    const ev = await Event.findByIdAndUpdate(id, update, { new: true });
    if (!ev) return res.status(404).json({ error: "Event not found" });
    res.json({ message: "✅ Event updated", event: ev });
  } catch (err) {
    console.error("Admin update event error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Soft delete event
router.delete("/admin/events/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const ev = await Event.findById(id);
    if (!ev) return res.status(404).json({ error: "Event not found" });
    if (ev.isDeleted) return res.json({ message: "✅ Event already deleted" });
    ev.isDeleted = true;
    ev.isPublished = false;
    ev.deletedAt = new Date();
    ev.updatedAt = new Date();
    await ev.save();
    res.json({ message: "✅ Event deleted (soft)", eventId: ev._id });
  } catch (err) {
    console.error("Admin soft delete event error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Admin: View registrations for an event
router.get("/admin/events/:id/registrations", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findById(id).populate("registrations.studentId", "fullname email");
    if (!event) return res.status(404).json({ error: "Event not found" });
    res.json(event.registrations || []);
  } catch (err) {
    console.error("Admin registrations fetch error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// =========================
// Admin: Metrics & Monitoring
// =========================
router.get("/admin/metrics", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({});
    const totalHosts = await User.countDocuments({ role: "host" });
    const totalStudents = await User.countDocuments({ role: "student" });
    const totalAdmins = await User.countDocuments({ role: "admin" });

    const notDeleted = { isDeleted: { $ne: true } };
    const totalEvents = await Event.countDocuments(notDeleted);
    const publishedEvents = await Event.countDocuments({ ...notDeleted, isPublished: true });
    const completedEvents = await Event.countDocuments({ ...notDeleted, isCompleted: true });

    const recentEvents = await Event.find(notDeleted).sort({ createdAt: -1 }).limit(10).select("title createdAt hostId isPublished isCompleted").lean();
    const registrationsTotalAgg = await Event.aggregate([
      { $match: notDeleted },
      { $project: { count: { $size: { $ifNull: ["$registrations", []] } } } },
      { $group: { _id: null, total: { $sum: "$count" } } }
    ]);
    const totalRegistrations = registrationsTotalAgg?.[0]?.total || 0;
    const recentRegistrations = await Event.aggregate([
      { $match: notDeleted },
      { $unwind: "$registrations" },
      { $sort: { "registrations.registeredAt": -1 } },
      { $limit: 10 },
      { $project: { title: 1, eventId: "$_id", registeredAt: "$registrations.registeredAt" } }
    ]);
    const recentFeedbacks = await Event.aggregate([
      { $match: notDeleted },
      { $unwind: "$feedbacks" },
      { $sort: { "feedbacks.createdAt": -1 } },
      { $limit: 10 },
      { $project: { title: 1, eventId: "$_id", rating: "$feedbacks.rating", createdAt: "$feedbacks.createdAt" } }
    ]);

    res.json({
      users: { total: totalUsers, hosts: totalHosts, students: totalStudents, admins: totalAdmins },
      events: { total: totalEvents, published: publishedEvents, completed: completedEvents },
      registrations: { total: totalRegistrations },
      recent: { events: recentEvents, registrations: recentRegistrations, feedbacks: recentFeedbacks }
    });
  } catch (err) {
    console.error("Admin metrics error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
