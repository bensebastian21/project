const express = require("express");
const router = express.Router();
const Event = require("../models/Event");
const User = require("../models/User");

// Reuse auth helpers from auth routes by re-defining minimal middleware here
const jwt = require("jsonwebtoken");

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Access token required" });
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid or expired token" });
    req.user = user;
    next();
  });
};

const requireHost = (req, res, next) => {
  if (req.user.role !== "host" && req.user.role !== "admin") {
    return res.status(403).json({ error: "Host access required" });
  }
  next();
};

// Create Event
router.post("/events", authenticateToken, requireHost, async (req, res) => {
  try {
    const { title, description, date, location, capacity } = req.body;
    const event = new Event({
      title,
      description: description || "",
      date,
      location: location || "",
      capacity: capacity || 0,
      hostId: req.user.id,
    });
    await event.save();
    res.json({ message: "✅ Event created", event });
  } catch (err) {
    console.error("Create event error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Edit Event
router.put("/events/:id", authenticateToken, requireHost, async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findOneAndUpdate(
      { _id: id, hostId: req.user.id },
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );
    if (!event) return res.status(404).json({ error: "Event not found" });
    res.json({ message: "✅ Event updated", event });
  } catch (err) {
    console.error("Update event error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Delete Event
router.delete("/events/:id", authenticateToken, requireHost, async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Event.findOneAndDelete({ _id: id, hostId: req.user.id });
    if (!deleted) return res.status(404).json({ error: "Event not found" });
    res.json({ message: "✅ Event deleted" });
  } catch (err) {
    console.error("Delete event error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// List Events (owned by host)
router.get("/events", authenticateToken, requireHost, async (req, res) => {
  try {
    const events = await Event.find({ hostId: req.user.id }).sort({ date: -1 });
    res.json(events);
  } catch (err) {
    console.error("List events error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// View Registrations for an event
router.get("/events/:id/registrations", authenticateToken, requireHost, async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findOne({ _id: id, hostId: req.user.id }).populate("registrations.studentId", "fullname email");
    if (!event) return res.status(404).json({ error: "Event not found" });
    res.json(event.registrations || []);
  } catch (err) {
    console.error("Registrations fetch error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Mark Event as completed
router.post("/events/:id/complete", authenticateToken, requireHost, async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findOneAndUpdate(
      { _id: id, hostId: req.user.id },
      { isCompleted: true, updatedAt: new Date() },
      { new: true }
    );
    if (!event) return res.status(404).json({ error: "Event not found" });
    res.json({ message: "✅ Marked as completed", event });
  } catch (err) {
    console.error("Complete event error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// View feedback and ratings
router.get("/events/:id/feedbacks", authenticateToken, requireHost, async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findOne({ _id: id, hostId: req.user.id }).populate("feedbacks.studentId", "fullname email");
    if (!event) return res.status(404).json({ error: "Event not found" });
    res.json(event.feedbacks || []);
  } catch (err) {
    console.error("Feedback fetch error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Notifications placeholder: later integrate with real-time system
router.get("/notifications", authenticateToken, requireHost, async (req, res) => {
  try {
    // For now, return basic derived notifications based on recent registrations
    const recent = await Event.find({ hostId: req.user.id, "registrations.0": { $exists: true } })
      .select("title registrations")
      .limit(10);
    const notifications = [];
    recent.forEach((e) => {
      (e.registrations || []).slice(-3).forEach((r) => {
        notifications.push({
          type: "registration",
          message: `New registration for ${e.title}`,
          eventId: e._id,
          at: r.registeredAt,
        });
      });
    });
    res.json(notifications.sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 20));
  } catch (err) {
    console.error("Notifications error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
