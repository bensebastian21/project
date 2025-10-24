const express = require("express");
const router = express.Router();
const ChatThread = require("../models/ChatThread");
const User = require("../models/User");

// auth helper (local copy)
function authenticateToken(req, res, next) {
  try {
    const jwt = require("jsonwebtoken");
    const authHeader = req.headers["authorization"]; const token = authHeader && authHeader.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Access token required" });
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) return res.status(403).json({ error: "Invalid or expired token" });
      req.user = user; next();
    });
  } catch (e) { return res.status(500).json({ error: "Auth error" }); }
}

function roleToOwnerType(role) {
  const r = String(role || "").toLowerCase();
  if (r === "host") return "host"; if (r === "admin") return "admin"; return "student";
}

const SYSTEM_PROMPTS = {
  student: "You are the Evenite student assistant. Help with exploring events, registrations, deadlines, calendar, reviews, and certificates. Be concise and specific to the app.",
  host: "You are the Evenite host assistant. Help with creating/updating events, attendance, exports/imports, analytics, reviews setup, and certificates. Be concise and specific to the app.",
  admin: "You are the Evenite admin assistant. Help with moderating content and operational questions."
};

// List threads for the current owner
router.get("/threads", authenticateToken, async (req, res) => {
  try {
    const ownerType = roleToOwnerType(req.user.role);
    const items = await ChatThread.find({ ownerType, ownerId: req.user.id })
      .sort({ updatedAt: -1 })
      .select("_id title updatedAt messages")
      .lean();
    const threads = items.map(t => ({
      _id: t._id,
      title: t.title,
      updatedAt: t.updatedAt,
      last: t.messages && t.messages.length ? t.messages[t.messages.length - 1] : null
    }));
    res.json(threads);
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
});

// Create a new thread
router.post("/start", authenticateToken, async (req, res) => {
  try {
    const ownerType = roleToOwnerType(req.user.role);
    const title = (req.body?.title || "New Chat").slice(0, 80);
    const sys = SYSTEM_PROMPTS[ownerType] || SYSTEM_PROMPTS.student;
    const t = await ChatThread.create({ ownerType, ownerId: req.user.id, title, messages: [{ role: "system", content: sys }] });
    res.json({ _id: t._id, title: t.title, createdAt: t.createdAt });
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
});

// Get thread messages
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const ownerType = roleToOwnerType(req.user.role);
    const t = await ChatThread.findOne({ _id: req.params.id, ownerType, ownerId: req.user.id });
    if (!t) return res.status(404).json({ error: "Thread not found" });
    res.json({ _id: t._id, title: t.title, messages: t.messages, updatedAt: t.updatedAt });
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
});

// Post a message and get assistant reply
router.post("/:id/message", authenticateToken, async (req, res) => {
  try {
    const ownerType = roleToOwnerType(req.user.role);
    const content = String(req.body?.content || "").trim();
    if (!content) return res.status(400).json({ error: "Message content required" });
    const t = await ChatThread.findOne({ _id: req.params.id, ownerType, ownerId: req.user.id });
    if (!t) return res.status(404).json({ error: "Thread not found" });

    // append user message
    t.messages.push({ role: "user", content });

    // call support AI provider (Gemini if configured, else FAQ fallback)
    let reply = "";
    try {
      const origin = process.env.CHAT_SELF_ORIGIN || `http://localhost:${process.env.PORT || 5000}`;
      const resp = await fetch(`${origin}/api/support/ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: t.messages.slice(-12), user: { id: req.user.id, role: req.user.role, name: req.user.fullname || req.user.username || "" } })
      });
      const data = await resp.json();
      reply = String(data?.reply || "");
    } catch (e) {
      reply = "I'm having trouble reaching the AI service right now. Please try again later.";
    }

    t.messages.push({ role: "assistant", content: reply });
    t.updatedAt = new Date();
    await t.save();

    res.json({ reply });
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
