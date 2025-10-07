const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Event = require("../models/Event");

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

// Get user's subscribed hosts (from user.subscribedHosts)
router.get("/", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate("subscribedHosts", "fullname email username institute city")
      .lean();

    if (!user) return res.status(404).json({ error: "User not found" });

    res.json(user.subscribedHosts || []);
  } catch (error) {
    console.error("Get subscriptions error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Subscribe to a host (push into user.subscribedHosts)
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { hostId } = req.body;
    if (!hostId) {
      return res.status(400).json({ error: "Host ID is required" });
    }

    // Validate host
    const host = await User.findOne({ _id: hostId, role: "host", isDeleted: { $ne: true } });
    if (!host) return res.status(404).json({ error: "Host not found" });

    const updated = await User.findByIdAndUpdate(
      req.user.id,
      { $addToSet: { subscribedHosts: hostId }, $set: { updatedAt: new Date() } },
      { new: true }
    ).populate("subscribedHosts", "fullname email username institute city");

    res.json({ message: "Subscribed successfully", subscribedHosts: updated.subscribedHosts });
  } catch (error) {
    console.error("Subscribe error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Unsubscribe from a host (pull from user.subscribedHosts)
router.delete("/:hostId", authenticateToken, async (req, res) => {
  try {
    const { hostId } = req.params;

    const updated = await User.findByIdAndUpdate(
      req.user.id,
      { $pull: { subscribedHosts: hostId }, $set: { updatedAt: new Date() } },
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: "User not found" });

    res.json({ message: "Unsubscribed successfully" });
  } catch (error) {
    console.error("Unsubscribe error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Get recent events from subscribed hosts
router.get("/events", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).lean();
    if (!user) return res.status(404).json({ error: "User not found" });

    const hostIds = (user.subscribedHosts || []).map(String);

    if (!hostIds.length) return res.json([]);

    const recentEvents = await Event.find({
      hostId: { $in: hostIds },
      isPublished: true,
      isDeleted: { $ne: true },
      date: { $gte: new Date() }
    })
      .populate("hostId", "fullname email username institute city")
      .sort({ createdAt: -1 })
      .limit(20);

    res.json(recentEvents);
  } catch (error) {
    console.error("Get subscribed events error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
