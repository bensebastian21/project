const express = require("express");
const router = express.Router();
const Event = require("../models/Event");
const User = require("../models/User");

// Middleware to authenticate token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  const jwt = require("jsonwebtoken");
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }
    req.user = user;
    next();
  });
};

// Bookmark an event (adds current user to event.bookmarks)
router.post("/", authenticateToken, async (req, res) => {
  try {
    // Require verified contact info before allowing bookmarks
    const u = await User.findById(req.user.id).lean();
    if (!u) return res.status(401).json({ error: "User not found" });
    if (!u.emailVerified || !u.phoneVerified) {
      return res.status(403).json({ error: "Please verify your email and phone to bookmark events" });
    }
    const { eventId } = req.body;

    if (!eventId) {
      return res.status(400).json({ error: "Event ID is required" });
    }

    const event = await Event.findOneAndUpdate(
      { _id: eventId, isDeleted: { $ne: true } },
      { $addToSet: { bookmarks: req.user.id }, $set: { updatedAt: new Date() } },
      { new: true }
    ).populate("hostId", "fullname email username institute city");

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    res.json({ message: "Event bookmarked successfully", event });
  } catch (error) {
    console.error("Bookmark error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Remove bookmark (removes current user from event.bookmarks)
router.delete("/:eventId", authenticateToken, async (req, res) => {
  try {
    // Policy: manage bookmarks only for verified users
    const u = await User.findById(req.user.id).lean();
    if (!u) return res.status(401).json({ error: "User not found" });
    if (!u.emailVerified || !u.phoneVerified) {
      return res.status(403).json({ error: "Please verify your email and phone to manage bookmarks" });
    }
    const {eventId } = req.params;

    const event = await Event.findOneAndUpdate(
      { _id: eventId, isDeleted: { $ne: true } },
      { $pull: { bookmarks: req.user.id }, $set: { updatedAt: new Date() } },
      { new: true }
    );

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    res.json({ message: "Bookmark removed successfully" });
  } catch (error) {
    console.error("Remove bookmark error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Check if event is bookmarked by current user
router.get("/check/:eventId", authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;

    const exists = await Event.exists({ _id: eventId, bookmarks: req.user.id });
    res.json({ isBookmarked: !!exists });
  } catch (error) {
    console.error("Check bookmark error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;