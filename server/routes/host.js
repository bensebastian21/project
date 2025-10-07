const express = require("express");
const router = express.Router();
const Event = require("../models/Event");
const User = require("../models/User");
const https = require("https");
const crypto = require("crypto");

// Reuse auth helpers from auth routes by re-defining minimal middleware here
const jwt = require("jsonwebtoken");

// Optional auth: decode JWT if provided, ignore if missing/invalid
const optionalAuth = (req, _res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return next();
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (!err) req.user = user;
    next();
  });
};

// Public: list published events regardless of host (excluding soft-deleted), can exclude self if auth provided
router.get("/public/events", optionalAuth, async (req, res) => {
  try {
    const filter = { isPublished: true, isDeleted: { $ne: true } };
    const excludeSelf = String(req.query.excludeSelf || "false").toLowerCase() === "true";
    if (excludeSelf && req.user?.id) {
      filter.hostId = { $ne: req.user.id };
    }
    const events = await Event.find(filter).sort({ date: -1 });
    res.json(events);
  } catch (err) {
    console.error("Public events error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Public: list events the current user is registered for (server source of truth)
router.get("/public/my-registrations", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const events = await Event.find({
      isDeleted: { $ne: true },
      registrations: { $elemMatch: { studentId: userId, status: "registered" } },
    }).select("_id title").lean();
    const list = (events || []).map(e => ({ eventId: String(e._id), title: e.title }));
    res.json(list);
  } catch (err) {
    console.error("List my registrations error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Payments config (public-safe: only exposes key id)
router.get("/payments/config", async (_req, res) => {
  try {
    res.json({ keyId: process.env.RAZORPAY_KEY_ID || null });
  } catch (err) {
    res.status(500).json({ keyId: null });
  }
});

// Create Razorpay order
router.post("/payments/create-order", authenticateToken, async (req, res) => {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      console.error("Razorpay not configured - missing environment variables");
      return res.status(500).json({ error: "Payment is not configured" });
    }

    const { amount, currency = "INR", receipt } = req.body || {};
    console.log("Payment request:", { amount, currency, receipt });
    
    const amt = parseInt(amount, 10);
    if (!amt || amt <= 0) {
      console.error("Invalid amount:", amount);
      return res.status(400).json({ error: "Invalid amount" });
    }

    const payload = JSON.stringify({ 
      amount: amt, 
      currency, 
      receipt: receipt || `rcpt_${Date.now()}`,
      notes: {
        source: "student-event-portal"
      }
    });
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const options = {
      hostname: "api.razorpay.com",
      path: "/v1/orders",
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload)
      }
    };

    console.log("Making Razorpay request with payload:", payload);

    const rq = https.request(options, (rs) => {
      let body = "";
      rs.on("data", (chunk) => (body += chunk));
      rs.on("end", () => {
        console.log("Razorpay response status:", rs.statusCode);
        console.log("Razorpay response body:", body);
        try {
          const data = JSON.parse(body || "{}");
          if (rs.statusCode >= 200 && rs.statusCode < 300) return res.json(data);
          return res.status(rs.statusCode || 500).json({ error: data.error?.description || "Order create failed" });
        } catch (e) {
          console.error("Failed to parse Razorpay response:", e);
          return res.status(500).json({ error: "Invalid response from payment gateway" });
        }
      });
    });
    rq.on("error", (e) => {
      console.error("Razorpay request error:", e);
      res.status(500).json({ error: e.message });
    });
    rq.write(payload);
    rq.end();
  } catch (err) {
    console.error("Create order error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Verify Razorpay payment signature
router.post("/payments/verify", authenticateToken, async (req, res) => {
  try {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) return res.status(500).json({ error: "Payment is not configured" });
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: "Missing payment params" });
    }
    const generated = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");
    const valid = generated === razorpay_signature;
    if (!valid) return res.status(400).json({ error: "Invalid payment signature" });
    res.json({ success: true });
  } catch (err) {
    console.error("Verify payment error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Public: list published events occurring on a given date (YYYY-MM-DD), optional exclude self
router.get("/public/events-by-date", optionalAuth, async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: "Missing date (YYYY-MM-DD)" });
    const day = new Date(date);
    if (isNaN(day.getTime())) return res.status(400).json({ error: "Invalid date" });
    const start = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 0, 0, 0));
    const end = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 23, 59, 59, 999));

    const filter = { isPublished: true, isDeleted: { $ne: true }, date: { $gte: start, $lte: end } };
    const excludeSelf = String(req.query.excludeSelf || "false").toLowerCase() === "true";
    if (excludeSelf && req.user?.id) {
      filter.hostId = { $ne: req.user.id };
    }
    const events = await Event.find(filter).sort({ date: 1 });
    res.json(events);
  } catch (err) {
    console.error("Public events-by-date error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Access token required" });
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid or expired token" });
    req.user = user;
    next();
  });
}

function requireHost(req, res, next) {
  if (req.user.role !== "host" && req.user.role !== "admin") {
    return res.status(403).json({ error: "Host access required" });
  }
  next();
}

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

// Soft Delete Event
router.delete("/events/:id", authenticateToken, requireHost, async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findOne({ _id: id, hostId: req.user.id });
    if (!event) return res.status(404).json({ error: "Event not found" });
    if (event.isDeleted) return res.json({ message: "✅ Event already deleted" });
    event.isDeleted = true;
    event.isPublished = false; // hide from public
    event.deletedAt = new Date();
    event.updatedAt = new Date();
    await event.save();
    res.json({ message: "✅ Event deleted (soft)", eventId: event._id });
  } catch (err) {
    console.error("Soft delete event error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// List Events (owned by host), include both active and soft-deleted if requested
router.get("/events", authenticateToken, requireHost, async (req, res) => {
  try {
    const { includeDeleted } = req.query; // optional flag
    const filter = { hostId: req.user.id };
    if (!includeDeleted) filter.isDeleted = { $ne: true };
    const events = await Event.find(filter).sort({ date: -1 });
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

// Public: register for an event (only active, not soft-deleted)
router.post("/public/events/:id/register", authenticateToken, async (req, res) => {
  try {
    // Enforce verification
    const u = await User.findById(req.user.id).lean();
    if (!u) return res.status(401).json({ error: "User not found" });
    if (!u.emailVerified || !u.phoneVerified) {
      return res.status(403).json({ error: "Please verify your email and phone to register for events" });
    }
    const { id } = req.params;
    const event = await Event.findOne({ _id: id, isPublished: true, isDeleted: { $ne: true } });
    if (!event) return res.status(404).json({ error: "Event not found" });

    // Already registered check
    const already = (event.registrations || []).some(
      (r) => String(r.studentId) === String(req.user.id) && r.status === "registered"
    );
    if (already) {
      // Idempotent success to simplify client flows
      return res.json({ message: "Already registered" });
    }

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
