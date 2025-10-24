const express = require("express");
const router = express.Router();
const Event = require("../models/Event");
const User = require("../models/User");
const https = require("https");
const crypto = require("crypto");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
let ExcelJS;

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

// ---------- Uploads (profile & events) ----------
const multerStorage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, path.join(__dirname, "..", "uploads"));
  },
  filename: function (_req, file, cb) {
    const ext = path.extname(file.originalname || "").toLowerCase();
    cb(null, `img_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
  }
});
const upload = multer({ storage: multerStorage });

// Import registrations attendance from uploaded XLSX file
router.post("/events/:id/registrations/import-xlsx", authenticateToken, requireHost, upload.single("file"), async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ error: "XLSX file required" });
    const event = await Event.findOne({ _id: id, hostId: req.user.id }).populate("registrations.studentId", "email");
    if (!event) return res.status(404).json({ error: "Event not found" });
    if (!ExcelJS) {
      try { ExcelJS = require('exceljs'); } catch (e) { return res.status(500).json({ error: 'exceljs not installed on server' }); }
    }
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(req.file.path);
    const ws = wb.worksheets[0];
    if (!ws) return res.status(400).json({ error: "No worksheet found in XLSX" });
    // Read header row case-insensitively
    const headerRow = ws.getRow(1);
    const headers = [];
    headerRow.eachCell((cell, col) => headers[col] = String(cell.value || '').toLowerCase().trim());
    const idx = (name) => headers.findIndex(h => h === String(name).toLowerCase());
    const iEventId = idx('event id');
    const iEmail = idx('email');
    const iStudentId = idx('studentid');
    const iAttended = idx('attended') >= 0 ? idx('attended') : idx('attendance');
    if (iAttended < 1) return res.status(400).json({ error: "Missing Attended column" });

    // Optional Event ID safety check if present
    if (iEventId > 0) {
      for (let r = 2; r <= ws.rowCount; r++) {
        const val = String(ws.getRow(r).getCell(iEventId).value || '').trim();
        if (val && val !== String(id)) {
          return res.status(400).json({ error: "XLSX Event ID does not match the selected event" });
        }
      }
    }

    // Build maps for quick lookup
    const byId = new Map();
    const byEmail = new Map();
    (event.registrations || []).forEach(r => {
      byId.set(String(r.studentId), r);
      if (r.studentId?.email) byEmail.set(String(r.studentId.email).toLowerCase(), r);
    });

    let updated = 0;
    for (let r = 2; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const attendedRaw = String(row.getCell(iAttended).value || '').toLowerCase();
      if (!attendedRaw) continue;
      const attended = ["1","true","yes","y"].includes(attendedRaw);
      let reg = null;
      if (iStudentId > 0) {
        const sid = String(row.getCell(iStudentId).value || '').trim();
        if (sid) reg = byId.get(sid);
      }
      if (!reg && iEmail > 0) {
        const email = String(row.getCell(iEmail).value || '').toLowerCase().trim();
        if (email) reg = byEmail.get(email);
      }
      if (reg) { reg.attended = attended; updated++; }
    }

    if (updated) {
      event.updatedAt = new Date();
      await event.save();
    }
    res.json({ message: `✅ Attendance updated for ${updated} registrations` });
  } catch (err) {
    console.error('Import XLSX error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Export registrations (with attendance) as XLSX with Yes/No dropdown for Attended
router.get("/events/:id/registrations.xlsx", authenticateToken, requireHost, async (req, res) => {
  try {
    const { id } = req.params;
    // Lazy load exceljs to avoid cost if unused
    if (!ExcelJS) {
      try { ExcelJS = require('exceljs'); } catch (e) { return res.status(500).json({ error: 'exceljs not installed on server' }); }
    }
    const event = await Event.findOne({ _id: id, hostId: req.user.id })
      .populate("registrations.studentId", "_id fullname email")
      .select("title registrations");
    if (!event) return res.status(404).json({ error: "Event not found" });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Registrations');

    const headers = [
      'Event ID','Event Title','Student Name','Email','Registered At','Status','Attended','StudentId'
    ];
    ws.addRow(headers);

    const safe = (v)=> String(v ?? "").replace(/\r|\n/g, " ");
    (event.registrations || []).forEach(r => {
      const sid = r.studentId && (r.studentId._id || r.studentId);
      ws.addRow([
        String(id),
        safe(event.title || ''),
        safe(r.studentId?.fullname || ''),
        safe(r.studentId?.email || ''),
        r.registeredAt ? new Date(r.registeredAt).toLocaleString() : '',
        safe(r.status || ''),
        r.attended ? 'Yes' : 'No',
        sid ? String(sid) : ''
      ]);
    });

    // Data validation: Attended column (G) rows 2..N
    const lastRow = ws.rowCount;
    if (lastRow >= 2) {
      ws.dataValidations.add(`G2:G${lastRow}`, {
        type: 'list',
        allowBlank: true,
        formulae: ['"Yes,No"']
      });
    }

    // Set a reasonable column width
    const widths = [18, 30, 24, 28, 22, 14, 12, 34];
    ws.columns.forEach((col, i) => { col.width = widths[i] || 16; });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=registrations_${id}.xlsx`);
    const buffer = await wb.xlsx.writeBuffer();
    return res.end(Buffer.from(buffer));
  } catch (err) {
    console.error('Export XLSX error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a gallery image by URL
router.delete("/events/:id/images", authenticateToken, requireHost, async (req, res) => {
  try {
    const { id } = req.params;
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: "Missing image url" });
    const event = await Event.findOne({ _id: id, hostId: req.user.id });
    if (!event) return res.status(404).json({ error: "Event not found" });
    event.images = (event.images || []).filter(u => String(u) !== String(url));
    event.updatedAt = new Date();
    await event.save();
    res.json({ message: "✅ Image removed", images: event.images });
  } catch (err) {
    console.error("Event image delete error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ---- Host profile validation helpers ----
const isHttpUrl = (v) => /^(https?:)\/\/.+/.test(String(v || "").trim());
const isHandle = (v) => /^@?\w{1,30}$/.test(String(v || "").trim());
const isLinkedInHandle = (v) => /^@?[-\w.]{1,100}$/.test(String(v || "").trim());
const ensureAt = (v) => {
  const s = String(v || '').trim();
  if (!s) return '';
  return s.startsWith('@') ? s : '@' + s.replace(/^@+/, '');
};

// Update host presentation fields (bio, website, socials)
router.put("/profile", authenticateToken, requireHost, async (req, res) => {
  try {
    const allowed = ["bio", "website", "socials", "bannerUrl", "profilePic", "fullname", "username"];
    const body = {};
    Object.keys(req.body || {}).forEach(k => { if (allowed.includes(k)) body[k] = req.body[k]; });

    const errors = {};
    // Validate website
    if (body.website && !isHttpUrl(body.website)) {
      errors.website = "Website must start with http:// or https://";
    }
    const socials = body.socials || {};
    // Validate socials: allow URL or @handle
    if (socials.twitter && !isHttpUrl(socials.twitter) && !isHandle(socials.twitter)) {
      errors.twitter = "Use handle like @username";
    }
    if (socials.instagram && !isHttpUrl(socials.instagram) && !isHandle(socials.instagram)) {
      errors.instagram = "Use handle like @username";
    }
    if (socials.linkedin && !isHttpUrl(socials.linkedin) && !isLinkedInHandle(socials.linkedin)) {
      errors.linkedin = "Use full URL or @handle";
    }
    if (typeof body.bio === 'string' && body.bio.length > 1000) {
      errors.bio = "Bio is too long";
    }

    if (Object.keys(errors).length) {
      return res.status(422).json({ errors });
    }

    // Normalize socials (prefix @ for non-URL handles)
    const normalized = { ...socials };
    if (normalized.twitter && !isHttpUrl(normalized.twitter)) normalized.twitter = ensureAt(normalized.twitter);
    if (normalized.instagram && !isHttpUrl(normalized.instagram)) normalized.instagram = ensureAt(normalized.instagram);
    if (normalized.linkedin && !isHttpUrl(normalized.linkedin)) normalized.linkedin = ensureAt(normalized.linkedin);

    const data = { ...body, socials: normalized, updatedAt: new Date() };
    const user = await User.findOneAndUpdate({ _id: req.user.id }, data, { new: true })
      .select("_id fullname username bio website socials profilePic bannerUrl institute city");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ message: "✅ Profile updated", user });
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Upload profile image (type=profile|banner)
router.post("/profile/upload", authenticateToken, requireHost, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Image file required" });
    const type = String(req.query.type || "profile").toLowerCase();
    const url = `/uploads/${req.file.filename}`;
    const update = type === "banner" ? { bannerUrl: url } : { profilePic: url };
    const user = await User.findOneAndUpdate({ _id: req.user.id }, update, { new: true })
      .select("_id fullname username profilePic bannerUrl");
    res.json({ message: "✅ Uploaded", url, user });
  } catch (err) {
    console.error("Profile upload error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Upload event cover image (sets imageUrl)
router.post("/events/:id/cover", authenticateToken, requireHost, upload.single("image"), async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ error: "Image file required" });
    const event = await Event.findOne({ _id: id, hostId: req.user.id });
    if (!event) return res.status(404).json({ error: "Event not found" });
    event.imageUrl = `/uploads/${req.file.filename}`;
    event.updatedAt = new Date();
    await event.save();
    res.json({ message: "✅ Cover updated", imageUrl: event.imageUrl });
  } catch (err) {
    console.error("Event cover upload error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Upload event gallery images (push into images[])
router.post("/events/:id/images", authenticateToken, requireHost, upload.array("images", 6), async (req, res) => {
  try {
    const { id } = req.params;
    const files = req.files || [];
    if (!files.length) return res.status(400).json({ error: "Images required" });
    const event = await Event.findOne({ _id: id, hostId: req.user.id });
    if (!event) return res.status(404).json({ error: "Event not found" });
    const urls = files.map(f => `/uploads/${f.filename}`);
    event.images = Array.isArray(event.images) ? [...event.images, ...urls] : urls;
    event.updatedAt = new Date();
    await event.save();
    res.json({ message: "✅ Images uploaded", images: event.images });
  } catch (err) {
    console.error("Event images upload error:", err);
    res.status(500).json({ error: "Server error" });
  }
})

// Public: get host profile and their published events
router.get("/public/host/:id", optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const host = await User.findOne({ _id: id, role: "host", isDeleted: { $ne: true } })
      .select("_id fullname username email institute city street pincode profilePic website bannerUrl socials bio")
      .lean();
    if (!host) return res.status(404).json({ error: "Host not found" });

    const events = await Event.find({ hostId: id, isPublished: true, isDeleted: { $ne: true } })
      .sort({ date: -1 })
      .lean();

    // Subscribers count (followers): users who have this hostId in subscribedHosts
    const subscribersCount = await User.countDocuments({ subscribedHosts: id });

    res.json({ host: { ...host, subscribersCount }, events });
  } catch (err) {
    console.error("Public host profile error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

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
    }).select("_id title registrations isCompleted date endDate").lean();
    const list = (events || []).map(e => {
      const reg = (e.registrations || []).find(r => String(r.studentId) === String(userId) && r.status === 'registered');
      return { eventId: String(e._id), title: e.title, attended: !!reg?.attended, isCompleted: !!e.isCompleted, date: e.date, endDate: e.endDate };
    });
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
      "title","description","shortDescription","date","endDate","registrationDeadline","location","address","city","state","pincode","capacity","price","currency","category","tags","requirements","agenda","contactEmail","contactPhone","website","imageUrl","isOnline","meetingLink","isCompleted","isPublished"
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

// Toggle attendance for a registration
router.put("/events/:id/registrations/:studentId/attendance", authenticateToken, requireHost, async (req, res) => {
  try {
    const { id, studentId } = req.params;
    const { attended } = req.body || {};
    const event = await Event.findOne({ _id: id, hostId: req.user.id });
    if (!event) return res.status(404).json({ error: "Event not found" });
    const reg = (event.registrations || []).find(r => String(r.studentId) === String(studentId));
    if (!reg) return res.status(404).json({ error: "Registration not found" });
    reg.attended = Boolean(attended);
    event.updatedAt = new Date();
    await event.save();
    res.json({ message: "✅ Attendance updated", registration: reg });
  } catch (err) {
    console.error("Update attendance error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Export registrations (with attendance) as CSV
router.get("/events/:id/registrations.csv", authenticateToken, requireHost, async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findOne({ _id: id, hostId: req.user.id })
      .populate("registrations.studentId", "_id fullname email")
      .select("title registrations");
    if (!event) return res.status(404).json({ error: "Event not found" });
    const headers = ["Event ID","Event Title","Student Name","Email","Registered At","Status","Attended","StudentId"]; 
    const rows = [headers];
    const safe = (v)=> String(v ?? "").replace(/\r|\n/g, " ");
    (event.registrations || []).forEach(r => {
      const sid = r.studentId && (r.studentId._id || r.studentId);
      rows.push([
        String(id),
        safe(event.title || ""),
        safe(r.studentId?.fullname || ""),
        safe(r.studentId?.email || ""),
        r.registeredAt ? new Date(r.registeredAt).toLocaleString() : "",
        safe(r.status || ""),
        r.attended ? "TRUE" : "FALSE",
        sid ? String(sid) : ""
      ]);
    });
    // CSV with CRLF and UTF-8 BOM for Excel compatibility
    const body = rows
      .map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(","))
      .join("\r\n");
    const csv = "\uFEFF" + body;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename=registrations_${id}.csv`);
    res.send(csv);
  } catch (err) {
    console.error("Export CSV error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

function parseCsvSimple(text) {
  const raw = String(text || "");
  const lines = raw.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const header = lines[0].split(",").map(s => s.replace(/^\"|\"$/g, "").trim().toLowerCase());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map(s => s.replace(/^\"|\"$/g, "").trim());
    const obj = {};
    header.forEach((h, idx) => obj[h] = cols[idx]);
    rows.push(obj);
  }
  return rows;
}

async function applyAttendanceUpdates(event, rows, expectedEventId) {
  // Require Event ID column and enforce exact match to the target event
  if (expectedEventId) {
    const hasEventIdCol = rows.length > 0 && (('eventid' in rows[0]) || ('event id' in rows[0]));
    if (!hasEventIdCol) {
      const err = new Error("CSV must include an 'Event ID' column");
      err.code = "CSV_EVENT_ID_REQUIRED";
      throw err;
    }
    const mismatch = rows.some(r => {
      const csvId = String(r.eventid || r["event id"] || "").trim();
      return !csvId || csvId !== String(expectedEventId);
    });
    if (mismatch) {
      const err = new Error("CSV Event ID does not match the selected event");
      err.code = "CSV_EVENT_ID_MISMATCH";
      throw err;
    }
  }
  let updated = 0;
  const byId = new Map();
  const byEmail = new Map();
  (event.registrations || []).forEach(r => {
    byId.set(String(r.studentId), r);
    if (r.studentId?.email) byEmail.set(String(r.studentId.email).toLowerCase(), r);
  });
  for (const row of rows) {
    const attendedRaw = String(row.attended || row.attendance || "").toLowerCase();
    if (!attendedRaw) continue;
    const attended = ["1","true","yes","y"].includes(attendedRaw);
    const sid = row.studentid || row["student id"] || "";
    const email = String(row.email || "").toLowerCase();
    const reg = (sid && byId.get(String(sid))) || (email && byEmail.get(email));
    if (reg) { reg.attended = attended; updated++; }
  }
  if (updated) {
    event.updatedAt = new Date();
    await event.save();
  }
  return updated;
}

// Import registrations attendance from uploaded CSV file
router.post("/events/:id/registrations/import", authenticateToken, requireHost, upload.single("file"), async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ error: "CSV file required" });
    const event = await Event.findOne({ _id: id, hostId: req.user.id }).populate("registrations.studentId", "email");
    if (!event) return res.status(404).json({ error: "Event not found" });
    const txt = fs.readFileSync(req.file.path, "utf8");
    const rows = parseCsvSimple(txt);
    const updated = await applyAttendanceUpdates(event, rows, id);
    res.json({ message: `✅ Attendance updated for ${updated} registrations` });
  } catch (err) {
    console.error("Import CSV error:", err);
    if (err?.code === "CSV_EVENT_ID_MISMATCH" || err?.code === "CSV_EVENT_ID_REQUIRED") {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: "Server error" });
  }
});

// Import registrations attendance from a CSV URL (e.g. Google Sheets published as CSV)
router.post("/events/:id/registrations/import-url", authenticateToken, requireHost, async (req, res) => {
  try {
    const { id } = req.params;
    const { csvUrl } = req.body || {};
    if (!csvUrl) return res.status(400).json({ error: "csvUrl required" });
    const event = await Event.findOne({ _id: id, hostId: req.user.id }).populate("registrations.studentId", "email");
    if (!event) return res.status(404).json({ error: "Event not found" });
    const url = new URL(csvUrl);
    const options = { hostname: url.hostname, path: url.pathname + (url.search || ""), protocol: url.protocol, method: "GET" };
    const rq = https.request(options, (rs) => {
      let body = "";
      rs.on("data", (c) => (body += c));
      rs.on("end", async () => {
        try {
          const rows = parseCsvSimple(body);
          const updated = await applyAttendanceUpdates(event, rows, id);
          return res.json({ message: `✅ Attendance updated for ${updated} registrations` });
        } catch (e) {
          console.error("Import URL parse error:", e);
          if (e?.code === "CSV_EVENT_ID_MISMATCH" || e?.code === "CSV_EVENT_ID_REQUIRED") {
            return res.status(400).json({ error: e.message });
          }
          return res.status(500).json({ error: "Failed to parse CSV" });
        }
      });
    });
    rq.on("error", (e) => {
      console.error("Import URL fetch error:", e);
      res.status(500).json({ error: e.message });
    });
    rq.end();
  } catch (err) {
    console.error("Import URL error:", err);
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

    // Registration deadline check
    if (event.registrationDeadline) {
      const now = new Date();
      const dl = new Date(event.registrationDeadline);
      if (!isNaN(dl.getTime()) && now > dl) {
        return res.status(400).json({ error: "Registration closed (deadline passed)" });
      }
    }

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
