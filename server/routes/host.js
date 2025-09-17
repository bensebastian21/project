const express = require("express");
const router = express.Router();
const Event = require("../models/Event");
const User = require("../models/User");

// Reuse auth helpers from auth routes by re-defining minimal middleware here
const jwt = require("jsonwebtoken");

// Public: list published events regardless of host
router.get("/public/events", async (req, res) => {
  try {
    const events = await Event.find({ isPublished: true }).sort({ date: -1 });
    res.json(events);
  } catch (err) {
    console.error("Public events error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

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
    const allowed = [
      "title","description","shortDescription","date","endDate","location","address","city","state","pincode","capacity","price","currency","category","tags","requirements","agenda","contactEmail","contactPhone","website","imageUrl","isOnline","meetingLink","isCompleted","isPublished"
    ];
    const data = { hostId: req.user.id };
    Object.keys(req.body || {}).forEach((k) => {
      if (allowed.includes(k)) data[k] = req.body[k];
    });

    // Coerce some types
    if (typeof data.capacity !== "undefined") data.capacity = parseInt(data.capacity) || 0;
    if (typeof data.price !== "undefined") data.price = parseFloat(data.price) || 0;
    if (typeof data.tags === "string") data.tags = data.tags.split(',').map(t => t.trim()).filter(Boolean);

    const event = new Event(data);
    await event.save();
    res.json({ message: "✅ Event created", event });
  } catch (err) {
    console.error("Create event error:", err);
    if (err.name === 'ValidationError') {
      // Surface first validation error to the client
      const firstKey = Object.keys(err.errors)[0];
      const msg = firstKey ? err.errors[firstKey].message : 'Validation error';
      return res.status(400).json({ error: msg });
    }
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

// Host metrics (counts & recent)
router.get("/metrics", authenticateToken, requireHost, async (req, res) => {
  try {
    const hostId = req.user.id;
    const totalEvents = await Event.countDocuments({ hostId });
    const publishedEvents = await Event.countDocuments({ hostId, isPublished: true });
    const completedEvents = await Event.countDocuments({ hostId, isCompleted: true });

    const registrationsAgg = await Event.aggregate([
      { $match: { hostId: require("mongoose").Types.ObjectId(hostId) } },
      { $project: { regs: { $filter: { input: { $ifNull: ["$registrations", []] }, as: "r", cond: { $eq: ["$$r.status", "registered"] } } } } },
      { $project: { count: { $size: "$regs" } } },
      { $group: { _id: null, total: { $sum: "$count" } } }
    ]);
    const totalRegistrations = registrationsAgg?.[0]?.total || 0;

    res.json({
      events: { total: totalEvents, published: publishedEvents, completed: completedEvents },
      registrations: { total: totalRegistrations }
    });
  } catch (err) {
    console.error("Host metrics error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Update registration status for an event
router.put("/events/:id/registrations/:studentId", authenticateToken, requireHost, async (req, res) => {
  try {
    const { id, studentId } = req.params;
    const { status } = req.body; // 'registered' | 'cancelled'
    if (!['registered', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    const event = await Event.findOne({ _id: id, hostId: req.user.id });
    if (!event) return res.status(404).json({ error: "Event not found" });
    const reg = (event.registrations || []).find(r => String(r.studentId) === String(studentId));
    if (!reg) return res.status(404).json({ error: "Registration not found" });
    reg.status = status;
    event.updatedAt = new Date();
    await event.save();
    res.json({ message: "✅ Registration updated", registration: reg });
  } catch (err) {
    console.error("Update registration error:", err);
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

// Public: register for an event
router.post("/public/events/:id/register", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findOne({ _id: id, isPublished: true });
    if (!event) return res.status(404).json({ error: "Event not found" });

    // Already registered check
    const already = (event.registrations || []).some(
      (r) => String(r.studentId) === String(req.user.id) && r.status === "registered"
    );
    if (already) return res.status(400).json({ error: "Already registered" });

    // Capacity check (if capacity > 0)
    if (event.capacity && event.capacity > 0) {
      const current = (event.registrations || []).filter((r) => r.status === "registered").length;
      if (current >= event.capacity) return res.status(400).json({ error: "Event is full" });
    }

    event.registrations = event.registrations || [];
    event.registrations.push({ studentId: req.user.id, status: "registered" });
    event.updatedAt = new Date();
    await event.save();

    res.json({ message: "✅ Registered", registration: { eventId: id, studentId: req.user.id } });
  } catch (err) {
    console.error("Public register error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
