// routes/auth.js
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const User = require("../models/User");

const router = express.Router();

// =========================
// Email Configuration
// =========================
const createTransporter = () => {
  // For development, you can use Gmail or other services
  // For production, consider using services like SendGrid, Mailgun, etc.
  return nodemailer.createTransporter({
    service: 'gmail', // or 'outlook', 'yahoo', etc.
    auth: {
      user: process.env.EMAIL_USER || 'your-email@gmail.com',
      pass: process.env.EMAIL_PASS || 'your-app-password' // Use app password for Gmail
    }
  });
};

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

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }
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
// Multer File Upload Config
// =========================
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads"),
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
// Google OAuth 2.0 (Server-initiated)
// =========================
router.get("/google", (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
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

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.OAUTH_REDIRECT_URI || "http://localhost:5000/api/auth/google/callback",
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const errTxt = await tokenRes.text();
      console.error("Google token error:", errTxt);
      return res.status(400).send("Failed to exchange code");
    }

    const tokenJson = await tokenRes.json();
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
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const userPayload = {
      id: user._id,
      fullname: user.fullname,
      email: user.email,
      role: user.role,
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
router.post("/register", upload.single("studentId"), async (req, res) => {
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
      studentId,
      role, // Accept role
    } = req.body;

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ error: "User already exists" });

    // If password is provided -> hash; if not provided, keep null (e.g., Google account)
    let hashedPassword = null;
    if (password && password.trim() !== "") {
      hashedPassword = await bcrypt.hash(password, 10);
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
      phone,
      countryCode: countryCode || "+91",
      password: hashedPassword,                    // null for Google accounts
      studentIdPath: req.file?.path || studentId || null,
      firebaseUid: uid || null,
      role: role || "student",
    };

    const user = new User(userData);
    await user.save();

    res.json({ message: "✅ Registered successfully", userId: user._id });
  } catch (err) {
    console.error("❌ Registration error:", err);
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
      process.env.JWT_SECRET,
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
      },
    });
  } catch (err) {
    console.error("Login error:", err);
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
      process.env.JWT_SECRET,
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
      res.json({ 
        message: "✅ Password reset email sent successfully!",
        note: "Check your email for the verification code. If you don't see it, check your spam folder."
      });
    } else {
      // Fallback: return code in response if email fails
      res.json({ 
        message: "⚠️ Reset code created but email failed to send",
        resetCode,
        note: "Email delivery failed. Use this code to reset your password. Check your email configuration."
      });
    }
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
    const hosts = await User.find({ role: "host" });
    res.json(hosts);
  } catch (err) {
    console.error("Get hosts error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/update/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updatedUser = await User.findByIdAndUpdate(id, req.body, { new: true });
    res.json(updatedUser);
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/delete/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await User.findByIdAndDelete(id);
    res.json({ message: "✅ User deleted" });
  } catch (err) {
    console.error("Delete error:", err);
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

module.exports = router;
