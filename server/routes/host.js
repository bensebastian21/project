const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const User = require('../models/User');
const Squad = require('../models/Squad');
const CertificateTemplate = require('../models/CertificateTemplate');
const gamificationController = require('../controllers/gamificationController');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { storage, profileStorage, bannerStorage } = require('../utils/cloudinary');
const FraudDetector = require('../services/fraudDetector');
const { generatePDFTicket } = require('../services/ticketService');
const { sendTicketEmail } = require('../utils/email');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Transaction = require('../models/Transaction');
// Polyfill fetch for Node < 18 if not globally available
if (typeof fetch === 'undefined') {
  global.fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
}
let ExcelJS;

// Optional auth: decode JWT if provided, ignore if missing/invalid
const optionalAuth = (req, _res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return next();
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (!err) req.user = user;
    next();
  });
};

// ---------- Uploads (profile & events) ----------
// Use Cloudinary storage for uploads
const uploadProfile = multer({ storage: profileStorage });
const uploadBanner = multer({ storage: bannerStorage });
const uploadEvent = multer({ storage });

// Legacy local storage for XLSX import only
const multerStorage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: function (_req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase();
    cb(null, `img_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const upload = multer({ storage: multerStorage });

// Import registrations attendance from uploaded XLSX file
router.post(
  '/events/:id/registrations/import-xlsx',
  authenticateToken,
  requireHost,
  upload.single('file'),
  async (req, res) => {
    try {
      const { id } = req.params;
      if (!req.file) return res.status(400).json({ error: 'XLSX file required' });
      const event = await Event.findOne({
        _id: id,
        $or: [{ hostId: req.user.id }, { coHosts: req.user.id }]
      }).populate(
        'registrations.studentId',
        'email',
      );
      if (!event) return res.status(404).json({ error: 'Event not found' });
      if (!ExcelJS) {
        try {
          ExcelJS = require('exceljs');
        } catch (e) {
          return res.status(500).json({ error: 'exceljs not installed on server' });
        }
      }
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.readFile(req.file.path);
      const ws = wb.worksheets[0];
      if (!ws) return res.status(400).json({ error: 'No worksheet found in XLSX' });
      // Read header row case-insensitively
      const headerRow = ws.getRow(1);
      const headers = [];
      headerRow.eachCell(
        (cell, col) =>
        (headers[col] = String(cell.value || '')
          .toLowerCase()
          .trim()),
      );
      const idx = (name) => headers.findIndex((h) => h === String(name).toLowerCase());
      const iEventId = idx('event id');
      const iEmail = idx('email');
      const iStudentId = idx('studentid');
      const iAttended = idx('attended') >= 0 ? idx('attended') : idx('attendance');
      if (iAttended < 1) return res.status(400).json({ error: 'Missing Attended column' });

      // Optional Event ID safety check if present
      if (iEventId > 0) {
        for (let r = 2; r <= ws.rowCount; r++) {
          const val = String(ws.getRow(r).getCell(iEventId).value || '').trim();
          if (val && val !== String(id)) {
            return res
              .status(400)
              .json({ error: 'XLSX Event ID does not match the selected event' });
          }
        }
      }

      // Build maps for quick lookup
      const byId = new Map();
      const byEmail = new Map();
      (event.registrations || []).forEach((r) => {
        byId.set(String(r.studentId), r);
        if (r.studentId?.email) byEmail.set(String(r.studentId.email).toLowerCase(), r);
      });

      let updated = 0;
      for (let r = 2; r <= ws.rowCount; r++) {
        const row = ws.getRow(r);
        const attendedRaw = String(row.getCell(iAttended).value || '').toLowerCase();
        if (!attendedRaw) continue;
        const attended = ['1', 'true', 'yes', 'y'].includes(attendedRaw);
        let reg = null;
        if (iStudentId > 0) {
          const sid = String(row.getCell(iStudentId).value || '').trim();
          if (sid) reg = byId.get(sid);
        }
        if (!reg && iEmail > 0) {
          const email = String(row.getCell(iEmail).value || '')
            .toLowerCase()
            .trim();
          if (email) reg = byEmail.get(email);
        }
        if (reg) {
          reg.attended = attended;
          updated++;
        }
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
  },
);

// Export registrations (with attendance) as XLSX with Yes/No dropdown for Attended
router.get('/events/:id/registrations.xlsx', authenticateToken, requireHost, async (req, res) => {
  try {
    const { id } = req.params;
    // Lazy load exceljs to avoid cost if unused
    if (!ExcelJS) {
      try {
        ExcelJS = require('exceljs');
      } catch (e) {
        return res.status(500).json({ error: 'exceljs not installed on server' });
      }
    }
    const event = await Event.findOne({ _id: id, hostId: req.user.id })
      .populate('registrations.studentId', '_id fullname email')
      .select('title registrations');
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Registrations');

    const headers = [
      'Event ID',
      'Event Title',
      'Student Name',
      'Email',
      'Registered At',
      'Status',
      'Attended',
      'StudentId',
    ];
    ws.addRow(headers);

    const safe = (v) => String(v ?? '').replace(/\r|\n/g, ' ');
    (event.registrations || []).forEach((r) => {
      const sid = r.studentId && (r.studentId._id || r.studentId);
      ws.addRow([
        String(id),
        safe(event.title || ''),
        safe(r.studentId?.fullname || ''),
        safe(r.studentId?.email || ''),
        r.registeredAt ? new Date(r.registeredAt).toLocaleString() : '',
        safe(r.status || ''),
        r.attended ? 'Yes' : 'No',
        sid ? String(sid) : '',
      ]);
    });

    // Data validation: Attended column (G) rows 2..N
    const lastRow = ws.rowCount;
    if (lastRow >= 2) {
      ws.dataValidations.add(`G2:G${lastRow}`, {
        type: 'list',
        allowBlank: true,
        formulae: ['"Yes,No"'],
      });
    }

    // Set a reasonable column width
    const widths = [18, 30, 24, 28, 22, 14, 12, 34];
    ws.columns.forEach((col, i) => {
      col.width = widths[i] || 16;
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename=registrations_${id}.xlsx`);
    const buffer = await wb.xlsx.writeBuffer();
    return res.end(Buffer.from(buffer));
  } catch (err) {
    console.error('Export XLSX error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a gallery image by URL
router.delete('/events/:id/images', authenticateToken, requireHost, async (req, res) => {
  try {
    const { id } = req.params;
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'Missing image url' });
    const event = await Event.findOne({ _id: id, hostId: req.user.id });
    if (!event) return res.status(404).json({ error: 'Event not found' });
    event.images = (event.images || []).filter((u) => String(u) !== String(url));
    event.updatedAt = new Date();
    await event.save();
    res.json({ message: '✅ Image removed', images: event.images });
  } catch (err) {
    console.error('Event image delete error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------- Custom Certificates ----------

// Get Certificate Template for an Event
router.get('/events/:eventId/certificate', authenticateToken, requireHost, async (req, res) => {
  try {
    const { eventId } = req.params;

    // Ensure event belongs to host or co-host
    const event = await Event.findOne({
      _id: eventId,
      $or: [{ hostId: req.user.id }, { coHosts: req.user.id }]
    });
    if (!event) return res.status(404).json({ error: 'Event not found' });

    let template = await CertificateTemplate.findOne({ eventId, hostId: req.user.id });
    if (!template) {
      // Return empty default state if not created yet
      return res.json({ message: 'No template found', template: null });
    }

    res.json(template);
  } catch (err) {
    console.error('Error fetching certificate template:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create or Update Certificate Template
router.post('/events/:eventId/certificate', authenticateToken, requireHost, async (req, res) => {
  try {
    const { eventId } = req.params;
    const updateData = req.body;

    const event = await Event.findOne({
      _id: eventId,
      $or: [{ hostId: req.user.id }, { coHosts: req.user.id }]
    });
    if (!event) return res.status(404).json({ error: 'Event not found' });

    let template = await CertificateTemplate.findOne({ eventId, hostId: req.user.id });

    if (template) {
      Object.assign(template, updateData);
      template.updatedAt = new Date();
      await template.save();
    } else {
      template = new CertificateTemplate({
        eventId,
        hostId: req.user.id,
        ...updateData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await template.save();
    }

    res.json({ message: 'Certificate template saved successfully', template });
  } catch (err) {
    console.error('Error saving certificate template:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Upload Certificate Background/Signature
router.post(
  '/events/:eventId/certificate/upload',
  authenticateToken,
  requireHost,
  uploadEvent.single('file'),
  async (req, res) => {
    try {
      const { eventId } = req.params;

      const event = await Event.findOne({
        _id: eventId,
        $or: [{ hostId: req.user.id }, { coHosts: req.user.id }]
      });
      if (!event) return res.status(404).json({ error: 'Event not found' });

      if (!req.file) return res.status(400).json({ error: 'No file provided' });

      res.json({ url: req.file.path });
    } catch (err) {
      console.error('Error uploading certificate asset:', err);
      res.status(500).json({ error: 'Server error' });
    }
  },
);

// ---- Host profile validation helpers ----
const isHttpUrl = (v) => /^(https?:)\/\/.+/.test(String(v || '').trim());
const isHandle = (v) => /^@?\w{1,30}$/.test(String(v || '').trim());
const isLinkedInHandle = (v) => /^@?[-\w.]{1,100}$/.test(String(v || '').trim());
const ensureAt = (v) => {
  const s = String(v || '').trim();
  if (!s) return '';
  return s.startsWith('@') ? s : '@' + s.replace(/^@+/, '');
};

// Update host presentation fields (bio, website, socials)
router.put('/profile', authenticateToken, requireHost, async (req, res) => {
  try {
    const allowed = [
      'bio',
      'website',
      'socials',
      'bannerUrl',
      'profilePic',
      'fullname',
      'username',
    ];
    const body = {};
    Object.keys(req.body || {}).forEach((k) => {
      if (allowed.includes(k)) body[k] = req.body[k];
    });

    const errors = {};
    // Validate website
    if (body.website && !isHttpUrl(body.website)) {
      errors.website = 'Website must start with http:// or https://';
    }
    const socials = body.socials || {};
    // Validate socials: allow URL or @handle
    if (socials.twitter && !isHttpUrl(socials.twitter) && !isHandle(socials.twitter)) {
      errors.twitter = 'Use handle like @username';
    }
    if (socials.instagram && !isHttpUrl(socials.instagram) && !isHandle(socials.instagram)) {
      errors.instagram = 'Use handle like @username';
    }
    if (socials.linkedin && !isHttpUrl(socials.linkedin) && !isLinkedInHandle(socials.linkedin)) {
      errors.linkedin = 'Use full URL or @handle';
    }
    if (typeof body.bio === 'string' && body.bio.length > 1000) {
      errors.bio = 'Bio is too long';
    }

    if (Object.keys(errors).length) {
      return res.status(422).json({ errors });
    }

    // Normalize socials (prefix @ for non-URL handles)
    const normalized = { ...socials };
    if (normalized.twitter && !isHttpUrl(normalized.twitter))
      normalized.twitter = ensureAt(normalized.twitter);
    if (normalized.instagram && !isHttpUrl(normalized.instagram))
      normalized.instagram = ensureAt(normalized.instagram);
    if (normalized.linkedin && !isHttpUrl(normalized.linkedin))
      normalized.linkedin = ensureAt(normalized.linkedin);

    const data = { ...body, socials: normalized, updatedAt: new Date() };
    const user = await User.findOneAndUpdate({ _id: req.user.id }, data, { new: true }).select(
      '_id fullname username bio website socials profilePic bannerUrl institute city',
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ message: '✅ Profile updated', user });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Upload profile image (type=profile|banner) - Using Cloudinary
router.post(
  '/profile/upload',
  authenticateToken,
  requireHost,
  (req, res, next) => {
    const type = String(req.query.type || 'profile').toLowerCase();
    const uploader = type === 'banner' ? uploadBanner : uploadProfile;
    uploader.single('image')(req, res, next);
  },
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'Image file required' });
      const type = String(req.query.type || 'profile').toLowerCase();

      // Store Cloudinary URL
      const url = req.file.path; // Cloudinary URL
      const update = type === 'banner' ? { bannerUrl: url } : { profilePic: url };
      const user = await User.findOneAndUpdate({ _id: req.user.id }, update, { new: true }).select(
        '_id fullname username profilePic bannerUrl',
      );
      res.json({ message: '✅ Uploaded', url, user });
    } catch (err) {
      console.error('Profile upload error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  },
);

// Upload event cover image (sets imageUrl) - Using Cloudinary
router.post(
  '/events/:id/cover',
  authenticateToken,
  requireHost,
  uploadEvent.single('image'),
  async (req, res) => {
    try {
      const { id } = req.params;
      if (!req.file) return res.status(400).json({ error: 'Image file required' });
      const event = await Event.findOne({
        _id: id,
        $or: [{ hostId: req.user.id }, { coHosts: req.user.id }]
      });
      if (!event) return res.status(404).json({ error: 'Event not found' });

      // Store Cloudinary URL
      event.imageUrl = req.file.path; // Cloudinary URL
      event.updatedAt = new Date();
      await event.save();
      res.json({ message: '✅ Cover updated', imageUrl: event.imageUrl });
    } catch (err) {
      console.error('Event cover upload error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  },
);

// Upload event gallery images (push into images[]) - Using Cloudinary
router.post(
  '/events/:id/images',
  authenticateToken,
  requireHost,
  uploadEvent.array('images', 6),
  async (req, res) => {
    try {
      const { id } = req.params;
      const files = req.files || [];
      if (!files.length) return res.status(400).json({ error: 'Images required' });
      const event = await Event.findOne({
        _id: id,
        $or: [{ hostId: req.user.id }, { coHosts: req.user.id }]
      });
      if (!event) return res.status(404).json({ error: 'Event not found' });

      // Store Cloudinary URLs
      const urls = files.map((f) => f.path); // Cloudinary URLs
      event.images = Array.isArray(event.images) ? [...event.images, ...urls] : urls;
      event.updatedAt = new Date();
      await event.save();
      res.json({ message: '✅ Images uploaded', images: event.images });
    } catch (err) {
      console.error('Event images upload error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  },
);

// Public: get host profile and their published events
router.get('/public/host/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const host = await User.findOne({ _id: id, role: 'host', isDeleted: { $ne: true } })
      .select(
        '_id fullname username email institute city street pincode profilePic website bannerUrl socials bio',
      )
      .lean();
    if (!host) return res.status(404).json({ error: 'Host not found' });

    const events = await Event.find({ hostId: id, isPublished: true, isDeleted: { $ne: true } })
      .sort({ date: -1 })
      .lean();

    // Subscribers count (followers): users who have this hostId in subscribedHosts
    const subscribersCount = await User.countDocuments({ subscribedHosts: id });

    res.json({ host: { ...host, subscribersCount }, events });
  } catch (err) {
    console.error('Public host profile error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Public: list published events regardless of host (excluding soft-deleted), can exclude self if auth provided
router.get('/public/events', optionalAuth, async (req, res) => {
  try {
    const filter = { isPublished: true, isDeleted: { $ne: true } };
    const excludeSelf = String(req.query.excludeSelf || 'false').toLowerCase() === 'true';
    if (excludeSelf && req.user?.id) {
      filter.hostId = { $ne: req.user.id };
    }
    const events = await Event.find(filter)
      .sort({ date: -1 })
      .populate('hostId', 'fullname username profilePic institute')
      .lean();

    // Add active registration count to each event for the frontend to check capacity
    const eventsWithCount = events.map(event => ({
      ...event,
      activeRegistrationCount: (event.registrations || []).filter(r => r.status === 'registered').length
    }));

    res.json(eventsWithCount);
  } catch (err) {
    console.error('Public events error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Public: Get platform stats for landing page
router.get('/public/stats', async (req, res) => {
  try {
    const totalStudents = await User.countDocuments({ role: 'student', isDeleted: { $ne: true } });
    const totalHosts = await User.countDocuments({ role: 'host', isDeleted: { $ne: true } });
    const totalEvents = await Event.countDocuments({ isPublished: true, isDeleted: { $ne: true } });
    // Distinct institutes (rough "Campuses" count)
    const distinctInstitutes = await User.distinct('institute', {
      institute: { $nin: ['', null] },
    });

    res.json({
      students: totalStudents,
      hosts: totalHosts,
      events: totalEvents,
      campuses: distinctInstitutes.length,
    });
  } catch (err) {
    console.error('Public stats error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Public: list events the current user is registered for or on the waiting list (server source of truth)
router.get('/public/my-registrations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    // Find events where user is either registered or on the waiting list
    const events = await Event.find({
      isDeleted: { $ne: true },
      $or: [
        { registrations: { $elemMatch: { studentId: userId, status: 'registered' } } },
        { waitingList: { $elemMatch: { studentId: userId } } },
      ],
    })
      .select('_id title registrations waitingList isCompleted date endDate hostId')
      .populate('hostId', 'fullname username profilePic institute')
      .lean();

    const list = (events || []).map((e) => {
      const reg = (e.registrations || []).find(
        (r) => String(r.studentId) === String(userId) && r.status === 'registered',
      );
      const waitlisted = (e.waitingList || []).find((w) => String(w.studentId) === String(userId));

      return {
        eventId: String(e._id),
        title: e.title,
        status: reg ? 'registered' : (waitlisted ? 'waitlisted' : 'none'),
        attended: !!reg?.attended,
        isCompleted: !!e.isCompleted,
        date: e.date,
        endDate: e.endDate,
        host: e.hostId,
      };
    });
    res.json(list);
  } catch (err) {
    console.error('List my registrations error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Public: Get Live Engagement State (Q&A/Polls)
router.get('/public/events/:id/live', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findOne({ _id: id, isDeleted: { $ne: true } }).select('liveEngagement hostId coHosts');
    if (!event) return res.status(404).json({ error: 'Event not found' });

    // Sort Q&A by upvotes to ensure order
    if (event.liveEngagement && event.liveEngagement.qaList) {
      event.liveEngagement.qaList.sort((a, b) => b.upvotes - a.upvotes);
    }

    res.json({ liveEngagement: event.liveEngagement || { isQaActive: false, qaList: [], polls: [] } });
  } catch (err) {
    console.error('Get live engagement error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Public: Get Live Engagement State (Q&A/Polls)
router.get('/public/events/:id/live', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findOne({ _id: id, isDeleted: { $ne: true } }).select('liveEngagement hostId coHosts');
    if (!event) return res.status(404).json({ error: 'Event not found' });

    // Sort Q&A by upvotes to ensure order
    if (event.liveEngagement && event.liveEngagement.qaList) {
      event.liveEngagement.qaList.sort((a, b) => b.upvotes - a.upvotes);
    }

    res.json({ liveEngagement: event.liveEngagement || { isQaActive: false, qaList: [], polls: [] } });
  } catch (err) {
    console.error('Get live engagement error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Public: Get QR Code ticket for a registered event
router.get('/public/events/:id/ticket', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const event = await Event.findOne({ _id: id, isDeleted: { $ne: true } });
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const reg = (event.registrations || []).find(
      (r) => String(r.studentId) === String(userId) && r.status === 'registered',
    );
    if (!reg) return res.status(403).json({ error: 'Not registered for this event' });

    const qrData = JSON.stringify({
      eventId: id,
      studentId: userId,
      timestamp: Date.now(),
    });

    const QRCode = require('qrcode');
    const qrImage = await QRCode.toDataURL(qrData);

    let squadName = null;
    if (reg.squadId) {
      const squad = await Squad.findById(reg.squadId);
      if (squad) squadName = squad.name;
    }

    res.json({
      qrCodeUrl: qrImage,
      eventTitle: event.title,
      eventDate: event.date,
      studentName: req.user.fullname,
      squadName: squadName
    });
  } catch (err) {
    console.error('Generate ticket error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Public: list all upcoming event tickets for the current user
router.get('/public/my-tickets', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();

    // Find all future events where user is registered
    const events = await Event.find({
      isDeleted: { $ne: true },
      date: { $gte: now },
      registrations: { $elemMatch: { studentId: userId, status: 'registered' } }
    })
      .select('_id title date location registrations hostId')
      .populate('hostId', 'fullname username')
      .lean();

    const QRCode = require('qrcode');

    const tickets = await Promise.all(events.map(async (event) => {
      const reg = event.registrations.find(r => String(r.studentId) === String(userId) && r.status === 'registered');

      const qrData = JSON.stringify({
        eventId: String(event._id),
        studentId: userId,
        timestamp: Date.now(),
      });

      const qrImage = await QRCode.toDataURL(qrData);

      let squadName = null;
      if (reg.squadId) {
        const squad = await Squad.findById(reg.squadId);
        if (squad) squadName = squad.name;
      }

      return {
        eventId: String(event._id),
        title: event.title,
        date: event.date,
        location: event.location,
        qrCodeUrl: qrImage,
        studentName: req.user.fullname,
        squadName: squadName,
        hostName: event.hostId?.fullname || event.hostId?.username || 'Host'
      };
    }));

    res.json(tickets);
  } catch (err) {
    console.error('List my tickets error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Public: Download PDF Ticket
router.get('/public/events/:id/ticket/pdf', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Fetch Event
    const event = await Event.findOne({ _id: id, isDeleted: { $ne: true } });
    if (!event) return res.status(404).json({ error: 'Event not found' });

    // Check registration
    const reg = (event.registrations || []).find(
      (r) => String(r.studentId) === String(userId) && r.status === 'registered',
    );
    if (!reg) return res.status(403).json({ error: 'Not registered for this event' });

    // Fetch Full User (to ensure we have fullname/email even if token is stale or limited)
    const fullUser = await User.findById(userId).lean();
    if (!fullUser) return res.status(404).json({ error: 'User not found' });

    const { generatePDFTicket } = require('../services/ticketService');
    // Generate unique ticket ID if not stored
    const regId = `TKT-${event._id.toString().slice(-4)}-${userId.toString().slice(-4)}`;

    console.log(`Generating PDF for ${fullUser.email} - Event: ${event.title}`); // Debug log

    const pdfBuffer = await generatePDFTicket(event, fullUser, regId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=Ticket-${event.title.replace(/[^a-z0-9]/gi, '_')}.pdf`,
    );
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Download PDF ticket error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Host: Verify QR Ticket & Mark Attendance
router.post('/verify-qr', authenticateToken, async (req, res) => {
  try {
    const { qrData } = req.body;
    if (!qrData) return res.status(400).json({ error: 'No QR data provided' });

    let data;
    try {
      data = typeof qrData === 'string' ? JSON.parse(qrData) : qrData;
    } catch (e) {
      return res.status(400).json({ error: 'Invalid QR format' });
    }

    const { eventId, studentId, timestamp } = data;

    // Check timestamp (optional expiration, e.g., 24h)
    // if (Date.now() - timestamp > 24 * 60 * 60 * 1000) return res.status(400).json({ error: "Ticket expired" });

    const event = await Event.findOne({ _id: eventId, isDeleted: { $ne: true } });
    if (!event) return res.status(404).json({ error: 'Event not found' });

    // Verify current user is the host or a co-host
    const isPrimaryHost = String(event.hostId) === String(req.user.id);
    const isCoHost = (event.coHosts || []).some(ch => String(ch) === String(req.user.id));

    if (!isPrimaryHost && !isCoHost) {
      return res.status(403).json({ error: 'Unauthorized: You are not a host of this event' });
    }

    const regIndex = event.registrations.findIndex(
      (r) => String(r.studentId) === String(studentId) && r.status === 'registered',
    );
    if (regIndex === -1)
      return res.status(404).json({ error: 'Valid registration not found for this student' });

    const registration = event.registrations[regIndex];

    if (registration.attended) {
      return res.status(400).json({ error: 'Already marked as attended' });
    }

    // Mark as attended
    registration.attended = true;
    event.registrations[regIndex] = registration; // Access by index to ensure update
    await event.save();

    // Fetch student name for response
    const User = require('../models/User');
    const student = await User.findById(studentId).select('fullname username');

    res.json({
      success: true,
      message: 'Verified Successfully',
      student: { name: student?.fullname || student?.username || 'Unknown', id: studentId },
      event: { title: event.title },
    });
  } catch (err) {
    console.error('Verify QR error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Search for other hosts to add as co-hosts
router.get('/search-hosts', authenticateToken, async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) return res.json([]);

    // Find users with role 'host', not deleted, and matching query
    const hosts = await User.find({
      role: 'host',
      isDeleted: { $ne: true },
      _id: { $ne: req.user.id }, // Exclude self
      $or: [
        { fullname: { $regex: q, $options: 'i' } },
        { username: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } }
      ]
    })
      .select('_id fullname username email profilePic institute')
      .limit(10)
      .lean();

    res.json(hosts);
  } catch (err) {
    console.error('Search hosts error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Payments config (public-safe: only exposes key id)
router.get('/payments/config', async (_req, res) => {
  try {
    res.json({ keyId: process.env.RAZORPAY_KEY_ID || null });
  } catch (err) {
    res.status(500).json({ keyId: null });
  }
});

// Create Razorpay order
router.post('/payments/create-order', authenticateToken, async (req, res) => {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      console.error('Razorpay not configured - missing environment variables');
      return res.status(500).json({ error: 'Payment is not configured' });
    }

    const { amount, currency = 'INR', receipt, squadSize } = req.body || {};
    console.log('Payment request:', { amount, currency, receipt, squadSize });

    const baseAmt = parseInt(amount, 10);
    if (!baseAmt || baseAmt <= 0) {
      console.error('Invalid amount:', amount);
      return res.status(400).json({ error: 'Invalid amount' });
    }

    // Multiply the amount by the number of squad members (for team events), else default to 1
    const multiplier = squadSize && !isNaN(squadSize) && squadSize > 0 ? parseInt(squadSize, 10) : 1;
    const totalAmt = baseAmt * multiplier;

    const payload = JSON.stringify({
      amount: totalAmt,
      currency,
      receipt: receipt || `rcpt_${Date.now()}`,
      notes: {
        source: 'student-event-portal',
        squadSize: multiplier
      },
    });
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const options = {
      hostname: 'api.razorpay.com',
      path: '/v1/orders',
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    console.log('Making Razorpay request with payload:', payload);

    const rq = https.request(options, (rs) => {
      let body = '';
      rs.on('data', (chunk) => (body += chunk));
      rs.on('end', () => {
        console.log('Razorpay response status:', rs.statusCode);
        console.log('Razorpay response body:', body);
        try {
          const data = JSON.parse(body || '{}');
          if (rs.statusCode >= 200 && rs.statusCode < 300) return res.json(data);
          return res
            .status(rs.statusCode || 500)
            .json({ error: data.error?.description || 'Order create failed' });
        } catch (e) {
          console.error('Failed to parse Razorpay response:', e);
          return res.status(500).json({ error: 'Invalid response from payment gateway' });
        }
      });
    });
    rq.on('error', (e) => {
      console.error('Razorpay request error:', e);
      res.status(500).json({ error: e.message });
    });
    rq.write(payload);
    rq.end();
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Verify Razorpay payment signature
router.post('/payments/verify', authenticateToken, async (req, res) => {
  try {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) return res.status(500).json({ error: 'Payment is not configured' });
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment params' });
    }
    const generated = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');
    const valid = generated === razorpay_signature;
    if (!valid) return res.status(400).json({ error: 'Invalid payment signature' });
    res.json({ success: true });
  } catch (err) {
    console.error('Verify payment error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Public: list published events occurring on a given date (YYYY-MM-DD), optional exclude self
router.get('/public/events-by-date', optionalAuth, async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'Missing date (YYYY-MM-DD)' });
    const day = new Date(date);
    if (isNaN(day.getTime())) return res.status(400).json({ error: 'Invalid date' });
    const start = new Date(
      Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 0, 0, 0),
    );
    const end = new Date(
      Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 23, 59, 59, 999),
    );

    const filter = {
      isPublished: true,
      isDeleted: { $ne: true },
      date: { $gte: start, $lte: end },
    };
    const excludeSelf = String(req.query.excludeSelf || 'false').toLowerCase() === 'true';
    if (excludeSelf && req.user?.id) {
      filter.hostId = { $ne: req.user.id };
    }
    const events = await Event.find(filter)
      .sort({ date: 1 })
      .populate('hostId', 'fullname username profilePic institute');
    res.json(events);
  } catch (err) {
    console.error('Public events-by-date error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Public: list published events near a location (lat, lng, dist in km)
router.get('/public/events-nearby', optionalAuth, async (req, res) => {
  try {
    const { lat, lng, dist } = req.query;
    if (!lat || !lng) return res.status(400).json({ error: 'Missing lat/lng' });

    const distanceInMeters = (parseFloat(dist) || 10) * 1000;

    const events = await Event.find({
      isPublished: true,
      isDeleted: { $ne: true },
      coordinates: {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: distanceInMeters,
        },
      },
    })
      .limit(20)
      .populate('hostId', 'fullname username profilePic institute');

    res.json(events);
  } catch (err) {
    console.error('Public events-nearby error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

function requireHost(req, res, next) {
  if (req.user.role !== 'host' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Host access required' });
  }
  next();
}

// Search users with role 'host' for co-hosting
router.get('/search-hosts', authenticateToken, async (req, res) => {
  try {
    const query = req.query.q || '';
    if (query.length < 2) return res.json([]);

    const hosts = await User.find({
      role: 'host',
      _id: { $ne: req.user.id },
      $or: [
        { fullname: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { username: { $regex: query, $options: 'i' } },
      ],
    })
      .select('_id fullname email username profilePic')
      .limit(10)
      .lean();

    res.json(hosts);
  } catch (err) {
    console.error('Search hosts error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create Event
router.post('/events', authenticateToken, requireHost, async (req, res) => {
  try {
    const allowed = [
      'title',
      'description',
      'shortDescription',
      'date',
      'endDate',
      'registrationDeadline',
      'location',
      'address',
      'city',
      'state',
      'pincode',
      'capacity',
      'price',
      'currency',
      'category',
      'tags',
      'requirements',
      'agenda',
      'contactEmail',
      'contactPhone',
      'website',
      'imageUrl',
      'isOnline',
      'meetingLink',
      'platform',
      'isCompleted',
      'isPublished',
      'coordinates',
      'isTeamEvent',
      'minTeamSize',
      'maxTeamSize',
      'ai',
      'gamificationRewards',
      'metrics',
      'coHosts',
    ];
    const data = { hostId: req.user.id };
    Object.keys(req.body || {}).forEach((k) => {
      if (allowed.includes(k)) data[k] = req.body[k];
    });

    // Coerce some types
    if (typeof data.capacity !== 'undefined') data.capacity = parseInt(data.capacity) || 0;
    if (typeof data.price !== 'undefined') data.price = parseFloat(data.price) || 0;
    if (typeof data.isTeamEvent !== 'undefined') data.isTeamEvent = Boolean(data.isTeamEvent);
    if (typeof data.minTeamSize !== 'undefined') data.minTeamSize = parseInt(data.minTeamSize, 10) || 1;
    if (typeof data.maxTeamSize !== 'undefined') data.maxTeamSize = parseInt(data.maxTeamSize, 10) || 4;
    if (typeof data.tags === 'string')
      data.tags = data.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

    // Validation
    if (data.price < 0 || data.price > 50000)
      return res.status(400).json({ error: 'Price must be between 0 and 50,000' });
    if (data.capacity < 1)
      return res.status(400).json({ error: 'Capacity is required and must be greater than 0' });
    if (!data.shortDescription || data.shortDescription.trim().length === 0)
      return res.status(400).json({ error: 'Short description is required' });
    if (!data.contactEmail || data.contactEmail.trim().length === 0)
      return res.status(400).json({ error: 'Contact email is required' });
    if (!data.contactPhone || data.contactPhone.trim().length === 0)
      return res.status(400).json({ error: 'Contact phone is required' });

    const event = new Event(data);
    await event.save();

    // Automated Fraud Detection
    FraudDetector.analyzeEvent(event).catch(err => console.error('Fraud analysis error:', err));

    res.status(201).json({ message: '✅ Event created successfully', event });
  } catch (err) {
    console.error('Create event error:', err);
    if (err.name === 'ValidationError') {
      // Surface first validation error to the client
      const firstKey = Object.keys(err.errors)[0];
      const msg = firstKey ? err.errors[firstKey].message : 'Validation error';
      return res.status(400).json({ error: msg });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Edit Event
router.put('/events/:id', authenticateToken, requireHost, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body, updatedAt: new Date() };

    // Coerce some types
    if (typeof updateData.capacity !== 'undefined')
      updateData.capacity = parseInt(updateData.capacity) || 0;
    if (typeof updateData.price !== 'undefined')
      updateData.price = parseFloat(updateData.price) || 0;
    if (typeof updateData.isTeamEvent !== 'undefined')
      updateData.isTeamEvent = Boolean(updateData.isTeamEvent);
    if (typeof updateData.minTeamSize !== 'undefined')
      updateData.minTeamSize = parseInt(updateData.minTeamSize, 10) || 1;
    if (typeof updateData.maxTeamSize !== 'undefined')
      updateData.maxTeamSize = parseInt(updateData.maxTeamSize, 10) || 4;

    // Validation
    if (updateData.price < 0 || updateData.price > 50000)
      return res.status(400).json({ error: 'Price must be between 0 and 50,000' });
    if (updateData.capacity < 1)
      return res.status(400).json({ error: 'Capacity is required and must be greater than 0' });
    if (
      updateData.shortDescription !== undefined &&
      (!updateData.shortDescription || updateData.shortDescription.trim().length === 0)
    )
      return res.status(400).json({ error: 'Short description is required' });
    if (
      updateData.contactEmail !== undefined &&
      (!updateData.contactEmail || updateData.contactEmail.trim().length === 0)
    )
      return res.status(400).json({ error: 'Contact email is required' });
    if (
      updateData.contactPhone !== undefined &&
      (!updateData.contactPhone || updateData.contactPhone.trim().length === 0)
    )
      return res.status(400).json({ error: 'Contact phone is required' });

    const event = await Event.findOneAndUpdate(
      {
        _id: id,
        $or: [{ hostId: req.user.id }, { coHosts: req.user.id }]
      },
      updateData,
      { new: true }
    );
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json({ message: '✅ Event updated', event });
  } catch (err) {
    console.error('Update event error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Soft Delete Event
router.delete('/events/:id', authenticateToken, requireHost, async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findOne({
      _id: id,
      $or: [{ hostId: req.user.id }, { coHosts: req.user.id }]
    });
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (event.isDeleted) return res.json({ message: '✅ Event already deleted' });
    event.isDeleted = true;
    event.isPublished = false; // hide from public
    event.deletedAt = new Date();
    event.updatedAt = new Date();
    await event.save();
    res.json({ message: '✅ Event deleted (soft)', eventId: event._id });
  } catch (err) {
    console.error('Soft delete event error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// List Events (owned by host), include both active and soft-deleted if requested
router.get('/events', authenticateToken, requireHost, async (req, res) => {
  try {
    const { includeDeleted } = req.query; // optional flag
    const filter = {
      $or: [{ hostId: req.user.id }, { coHosts: req.user.id }]
    };
    if (!includeDeleted) filter.isDeleted = { $ne: true };
    const events = await Event.find(filter).sort({ date: -1 });
    res.json(events);
  } catch (err) {
    console.error('List events error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Host metrics (counts & recent)
router.get('/metrics', authenticateToken, requireHost, async (req, res) => {
  try {
    const hostId = req.user.id;
    const filter = { $or: [{ hostId }, { coHosts: hostId }] };
    const totalEvents = await Event.countDocuments(filter);
    const publishedEvents = await Event.countDocuments({ ...filter, isPublished: true });
    const completedEvents = await Event.countDocuments({ ...filter, isCompleted: true });

    const registrationsAgg = await Event.aggregate([
      {
        $match: {
          $or: [
            { hostId: require('mongoose').Types.ObjectId(hostId) },
            { coHosts: require('mongoose').Types.ObjectId(hostId) }
          ]
        }
      },
      {
        $project: {
          regs: {
            $filter: {
              input: { $ifNull: ['$registrations', []] },
              as: 'r',
              cond: { $eq: ['$$r.status', 'registered'] },
            },
          },
        },
      },
      { $project: { count: { $size: '$regs' } } },
      { $group: { _id: null, total: { $sum: '$count' } } },
    ]);
    const totalRegistrations = registrationsAgg?.[0]?.total || 0;

    res.json({
      events: { total: totalEvents, published: publishedEvents, completed: completedEvents },
      registrations: { total: totalRegistrations },
    });
  } catch (err) {
    console.error('Host metrics error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update registration status for an event
router.put(
  '/events/:id/registrations/:studentId',
  authenticateToken,
  requireHost,
  async (req, res) => {
    try {
      const { id, studentId } = req.params;
      const { status } = req.body; // 'registered' | 'cancelled'
      if (!['registered', 'cancelled'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      const event = await Event.findOne({
        _id: id,
        $or: [{ hostId: req.user.id }, { coHosts: req.user.id }]
      });
      if (!event) return res.status(404).json({ error: 'Event not found' });
      const reg = (event.registrations || []).find(
        (r) => String(r.studentId) === String(studentId),
      );
      if (!reg) return res.status(404).json({ error: 'Registration not found' });
      reg.status = status;
      event.updatedAt = new Date();
      await event.save();
      res.json({ message: '✅ Registration updated', registration: reg });
    } catch (err) {
      console.error('Update registration error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  },
);

// View Registrations for an event
router.get('/events/:id/registrations', authenticateToken, requireHost, async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findOne({
      _id: id,
      $or: [{ hostId: req.user.id }, { coHosts: req.user.id }]
    })
      .populate('registrations.studentId', 'fullname email')
      .populate('registrations.squadId', 'name');
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json(event.registrations || []);
  } catch (err) {
    console.error('Registrations fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Toggle attendance for a registration
router.put(
  '/events/:id/registrations/:studentId/attendance',
  authenticateToken,
  requireHost,
  async (req, res) => {
    try {
      const { id, studentId } = req.params;
      const { attended } = req.body || {};
      const event = await Event.findOne({
        _id: id,
        $or: [{ hostId: req.user.id }, { coHosts: req.user.id }]
      });
      if (!event) return res.status(404).json({ error: 'Event not found' });
      const reg = (event.registrations || []).find(
        (r) => String(r.studentId) === String(studentId),
      );
      if (!reg) return res.status(404).json({ error: 'Registration not found' });
      reg.attended = Boolean(attended);
      event.updatedAt = new Date();
      await event.save();

      // Gamification: Award points if marked attended
      if (reg.attended) {
        // We pass the student ID derived from the registration
        const sid = reg.studentId && (reg.studentId._id || reg.studentId);
        if (sid) await gamificationController.awardPoints(sid, 'ATTEND_EVENT');
      }

      res.json({ message: '✅ Attendance updated', registration: reg });
    } catch (err) {
      console.error('Update attendance error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  },
);

// Export registrations (with attendance) as CSV
router.get('/events/:id/registrations.csv', authenticateToken, requireHost, async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findOne({
      _id: id,
      $or: [{ hostId: req.user.id }, { coHosts: req.user.id }]
    })
      .populate('registrations.studentId', '_id fullname email')
      .select('title registrations');
    if (!event) return res.status(404).json({ error: 'Event not found' });
    const headers = [
      'Event ID',
      'Event Title',
      'Student Name',
      'Email',
      'Registered At',
      'Status',
      'Attended',
      'StudentId',
    ];
    const rows = [headers];
    const safe = (v) => String(v ?? '').replace(/\r|\n/g, ' ');
    (event.registrations || []).forEach((r) => {
      const sid = r.studentId && (r.studentId._id || r.studentId);
      rows.push([
        String(id),
        safe(event.title || ''),
        safe(r.studentId?.fullname || ''),
        safe(r.studentId?.email || ''),
        r.registeredAt ? new Date(r.registeredAt).toLocaleString() : '',
        safe(r.status || ''),
        r.attended ? 'TRUE' : 'FALSE',
        sid ? String(sid) : '',
      ]);
    });
    // CSV with CRLF and UTF-8 BOM for Excel compatibility
    const body = rows
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    const csv = '\uFEFF' + body;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=registrations_${id}.csv`);
    res.send(csv);
  } catch (err) {
    console.error('Export CSV error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

function parseCsvSimple(text) {
  const raw = String(text || '');
  const lines = raw
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter(Boolean);
  if (!lines.length) return [];
  const header = lines[0].split(',').map((s) =>
    s
      .replace(/^\"|\"$/g, '')
      .trim()
      .toLowerCase(),
  );
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((s) => s.replace(/^\"|\"$/g, '').trim());
    const obj = {};
    header.forEach((h, idx) => (obj[h] = cols[idx]));
    rows.push(obj);
  }
  return rows;
}

async function applyAttendanceUpdates(event, rows, expectedEventId) {
  // Require Event ID column and enforce exact match to the target event
  if (expectedEventId) {
    const hasEventIdCol = rows.length > 0 && ('eventid' in rows[0] || 'event id' in rows[0]);
    if (!hasEventIdCol) {
      const err = new Error("CSV must include an 'Event ID' column");
      err.code = 'CSV_EVENT_ID_REQUIRED';
      throw err;
    }
    const mismatch = rows.some((r) => {
      const csvId = String(r.eventid || r['event id'] || '').trim();
      return !csvId || csvId !== String(expectedEventId);
    });
    if (mismatch) {
      const err = new Error('CSV Event ID does not match the selected event');
      err.code = 'CSV_EVENT_ID_MISMATCH';
      throw err;
    }
  }
  let updated = 0;
  const byId = new Map();
  const byEmail = new Map();
  (event.registrations || []).forEach((r) => {
    byId.set(String(r.studentId), r);
    if (r.studentId?.email) byEmail.set(String(r.studentId.email).toLowerCase(), r);
  });
  for (const row of rows) {
    const attendedRaw = String(row.attended || row.attendance || '').toLowerCase();
    if (!attendedRaw) continue;
    const attended = ['1', 'true', 'yes', 'y'].includes(attendedRaw);
    const sid = row.studentid || row['student id'] || '';
    const email = String(row.email || '').toLowerCase();
    const reg = (sid && byId.get(String(sid))) || (email && byEmail.get(email));
    if (reg) {
      reg.attended = attended;
      updated++;
    }
  }
  if (updated) {
    event.updatedAt = new Date();
    await event.save();
  }
  return updated;
}

// Import registrations attendance from uploaded CSV file
router.post(
  '/events/:id/registrations/import',
  authenticateToken,
  requireHost,
  upload.single('file'),
  async (req, res) => {
    try {
      const { id } = req.params;
      if (!req.file) return res.status(400).json({ error: 'CSV file required' });
      const event = await Event.findOne({
        _id: id,
        $or: [{ hostId: req.user.id }, { coHosts: req.user.id }]
      }).populate(
        'registrations.studentId',
        'email',
      );
      if (!event) return res.status(404).json({ error: 'Event not found' });
      const txt = fs.readFileSync(req.file.path, 'utf8');
      const rows = parseCsvSimple(txt);
      const updated = await applyAttendanceUpdates(event, rows, id);
      res.json({ message: `✅ Attendance updated for ${updated} registrations` });
    } catch (err) {
      console.error('Import CSV error:', err);
      if (err?.code === 'CSV_EVENT_ID_MISMATCH' || err?.code === 'CSV_EVENT_ID_REQUIRED') {
        return res.status(400).json({ error: err.message });
      }
      res.status(500).json({ error: 'Server error' });
    }
  },
);

// Import registrations attendance from a CSV URL (e.g. Google Sheets published as CSV)
router.post(
  '/events/:id/registrations/import-url',
  authenticateToken,
  requireHost,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { csvUrl } = req.body || {};
      if (!csvUrl) return res.status(400).json({ error: 'csvUrl required' });
      const event = await Event.findOne({
        _id: id,
        $or: [{ hostId: req.user.id }, { coHosts: req.user.id }]
      }).populate(
        'registrations.studentId',
        'email',
      );
      if (!event) return res.status(404).json({ error: 'Event not found' });
      const url = new URL(csvUrl);
      const options = {
        hostname: url.hostname,
        path: url.pathname + (url.search || ''),
        protocol: url.protocol,
        method: 'GET',
      };
      const rq = https.request(options, (rs) => {
        let body = '';
        rs.on('data', (c) => (body += c));
        rs.on('end', async () => {
          try {
            const rows = parseCsvSimple(body);
            const updated = await applyAttendanceUpdates(event, rows, id);
            return res.json({ message: `✅ Attendance updated for ${updated} registrations` });
          } catch (e) {
            console.error('Import URL parse error:', e);
            if (e?.code === 'CSV_EVENT_ID_MISMATCH' || e?.code === 'CSV_EVENT_ID_REQUIRED') {
              return res.status(400).json({ error: e.message });
            }
            return res.status(500).json({ error: 'Failed to parse CSV' });
          }
        });
      });
      rq.on('error', (e) => {
        console.error('Import URL fetch error:', e);
        res.status(500).json({ error: e.message });
      });
      rq.end();
    } catch (err) {
      console.error('Import URL error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  },
);

// Mark Event as completed
router.post('/events/:id/complete', authenticateToken, requireHost, async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findOneAndUpdate(
      {
        _id: id,
        $or: [{ hostId: req.user.id }, { coHosts: req.user.id }]
      },
      { isCompleted: true, updatedAt: new Date() },
      { new: true },
    );
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json({ message: '✅ Marked as completed', event });
  } catch (err) {
    console.error('Complete event error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// View feedback and ratings
router.get('/events/:id/feedbacks', authenticateToken, requireHost, async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findOne({
      _id: id,
      $or: [{ hostId: req.user.id }, { coHosts: req.user.id }]
    }).populate(
      'feedbacks.studentId',
      'fullname email',
    );
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json(event.feedbacks || []);
  } catch (err) {
    console.error('Feedback fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Notifications placeholder: later integrate with real-time system
router.get('/notifications', authenticateToken, requireHost, async (req, res) => {
  try {
    const Notification = require('../models/Notification');

    // Fetch actual db notifications for this host
    const dbNotifications = await Notification.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const systemNotifs = dbNotifications.map((n) => ({
      _id: n._id,
      type: n.type || 'System',
      title: n.title,
      message: n.message,
      fullContent: n.message,
      at: n.createdAt,
      read: n.read,
    }));

    // For now, return basic derived notifications based on recent registrations
    const recent = await Event.find({
      $or: [{ hostId: req.user.id }, { coHosts: req.user.id }],
      'registrations.0': { $exists: true }
    })
      .select('title registrations')
      .limit(10);
    const registrationNotifs = [];
    recent.forEach((e) => {
      (e.registrations || []).slice(-3).forEach((r) => {
        registrationNotifs.push({
          type: 'registration',
          title: 'New Registration',
          message: `New registration for ${e.title}`,
          eventId: e._id,
          at: r.registeredAt,
        });
      });
    });

    const combined = [...systemNotifs, ...registrationNotifs]
      .sort((a, b) => new Date(b.at) - new Date(a.at))
      .slice(0, 30);

    res.json(combined);
  } catch (err) {
    console.error('Notifications error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Public: join the waiting list for an event
router.post('/public/events/:id/waiting-list', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[WAITING-LIST] User ${req.user.id} joining event ${id}`);
    const event = await Event.findOne({ _id: id, isPublished: true, isDeleted: { $ne: true } });
    if (!event) {
      console.warn(`[WAITING-LIST] Event ${id} not found or not published`);
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check if registration is still open (deadline)
    if (event.registrationDeadline) {
      if (new Date() > new Date(event.registrationDeadline)) {
        return res.status(400).json({ error: 'Registration deadline has passed' });
      }
    }

    // Already registered check
    const isRegistered = (event.registrations || []).some(
      (r) => String(r.studentId) === String(req.user.id) && r.status === 'registered',
    );
    if (isRegistered) return res.status(400).json({ error: 'Already registered' });

    // Already on waiting list check
    const isOnWaitingList = (event.waitingList || []).some(
      (w) => String(w.studentId) === String(req.user.id),
    );
    if (isOnWaitingList) return res.json({ message: 'Already on waiting list' });

    // Check if event is actually full
    const current = (event.registrations || []).filter((r) => r.status === 'registered').length;
    if (event.capacity && event.capacity > 0 && current < event.capacity) {
      return res.status(400).json({ error: 'Event is not full yet. Please register directly.' });
    }

    event.waitingList = event.waitingList || [];
    event.waitingList.push({ studentId: req.user.id, addedAt: new Date() });
    await event.save();

    res.json({ message: '✅ Added to waiting list' });
  } catch (err) {
    console.error('Public waiting-list error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Public: cancel registration for an event
router.post('/public/events/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[CANCEL] User ${req.user.id} cancelling event ${id}`);
    const event = await Event.findOne({ _id: id, isDeleted: { $ne: true } });
    if (!event) {
      console.warn(`[CANCEL] Event ${id} not found`);
      return res.status(404).json({ error: 'Event not found' });
    }

    const regIndex = (event.registrations || []).findIndex(
      (r) => String(r.studentId) === String(req.user.id) && r.status === 'registered',
    );

    const waitlistedIndex = (event.waitingList || []).findIndex(
      (w) => String(w.studentId) === String(req.user.id),
    );

    if (regIndex === -1 && waitlistedIndex === -1) {
      return res.status(404).json({ error: 'Registration not found' });
    }

    if (regIndex !== -1) {
      // Cancel registration
      event.registrations[regIndex].status = 'cancelled';
      event.updatedAt = new Date();

      // Check for auto-promotion from waiting list
      if (event.waitingList && event.waitingList.length > 0) {
        const nextInLine = event.waitingList.shift(); // Remove first person
        event.registrations.push({ studentId: nextInLine.studentId, status: 'registered' });

        // Trigger ticket generation for nextInLine asynchronously
        (async () => {
          try {
            const promotedUser = await User.findById(nextInLine.studentId).lean();
            if (promotedUser) {
              const regId = `TKT-${event._id.toString().slice(-4)}-${promotedUser._id
                .toString()
                .slice(-4)}`;
              const pdfBuffer = await generatePDFTicket(event, promotedUser, regId);
              await sendTicketEmail(promotedUser, event, pdfBuffer);
              console.log(`Auto-promotion ticket sent to ${promotedUser.email}`);
            }
          } catch (promotionErr) {
            console.error('Auto-promotion error:', promotionErr);
          }
        })();
      }
    } else if (waitlistedIndex !== -1) {
      // Remove from waiting list
      event.waitingList.splice(waitlistedIndex, 1);
    }

    await event.save();
    res.json({ message: '✅ Successfully cancelled' });
  } catch (err) {
    console.error('Public cancel registration error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Public: register for an event (only active, not soft-deleted)
router.post('/public/events/:id/register', authenticateToken, async (req, res) => {
  try {
    // Enforce verification
    const u = await User.findById(req.user.id).lean();
    if (!u) return res.status(401).json({ error: 'User not found' });
    if (!u.emailVerified || !u.phoneVerified) {
      return res
        .status(403)
        .json({ error: 'Please verify your email and phone to register for events' });
    }
    const { id } = req.params;
    const { squadId } = req.body || {};

    const event = await Event.findOne({ _id: id, isPublished: true, isDeleted: { $ne: true } });
    if (!event) return res.status(404).json({ error: 'Event not found' });

    // Registration deadline check
    if (event.registrationDeadline) {
      const now = new Date();
      const dl = new Date(event.registrationDeadline);
      if (!isNaN(dl.getTime()) && now > dl) {
        return res.status(400).json({ error: 'Registration closed (deadline passed)' });
      }
    }

    const currentRegistrations = (event.registrations || []).filter((r) => r.status === 'registered').length;
    let studentsToRegister = [req.user.id];

    // Handle Squad Registration
    if (event.isTeamEvent) {
      if (!squadId) {
        return res.status(400).json({ error: 'This is a team event. A squad is required to register.' });
      }

      const squad = await Squad.findById(squadId);

      if (!squad) return res.status(404).json({ error: 'Squad not found' });

      // Verify caller is squad leader
      if (squad.leaderId.toString() !== req.user.id) {
        return res.status(403).json({ error: 'Only the Squad Leader can register the team for an event.' });
      }

      // Verify squad size matches event constraints
      const membersCount = squad.members.length;
      if (membersCount < event.minTeamSize || membersCount > event.maxTeamSize) {
        return res.status(400).json({ error: `Squad size (${membersCount}) does not meet event requirements (${event.minTeamSize}-${event.maxTeamSize} members).` });
      }

      studentsToRegister = squad.members.map(m => m.toString());
    } else {
      // It's a solo event, but if they sent a squad context, reject it
      if (squadId) {
        return res.status(400).json({ error: 'This is a solo event. Squad registrations are not allowed.' });
      }
    }

    // Capacity check
    if (event.capacity && event.capacity > 0) {
      if ((currentRegistrations + studentsToRegister.length) > event.capacity) {
        return res.status(400).json({ error: `Event does not have enough capacity for ${studentsToRegister.length} people.` });
      }
    }

    event.registrations = event.registrations || [];
    let registeredCount = 0;

    for (const studentId of studentsToRegister) {
      // Already registered check
      const already = event.registrations.some(
        (r) => String(r.studentId) === String(studentId) && r.status === 'registered',
      );

      if (!already) {
        event.registrations.push({
          studentId,
          status: 'registered',
          squadId: squadId || null
        });
        registeredCount++;

        // Generate Ticket & Email it (async, don't block response)
        (async () => {
          try {
            const studentObj = await User.findById(studentId);
            if (studentObj) {
              const regId = `TKT-${event._id.toString().slice(-4)}-${studentId.slice(-4)}`;
              const pdfBuffer = await generatePDFTicket(event, studentObj, regId);
              await sendTicketEmail(studentObj, event, pdfBuffer);
              console.log(`Ticket sent to ${studentObj.email}`);
            }
          } catch (err) {
            console.error(`Failed to send ticket email to ${studentId}:`, err);
          }
        })();

        // RECORD FINANCIAL TRANSACTION
        (async () => {
          try {
            const price = event.price || 0;
            const fee = Math.round(price * 0.10); // 10% platform fee
            const earnings = price - fee;

            const tx = new Transaction({
              eventId: event._id,
              hostId: event.hostId,
              studentId: studentId,
              amount: price,
              currency: event.currency || 'INR',
              platformFee: fee,
              hostEarnings: earnings,
              type: 'TicketSale',
              status: 'Completed',
              paymentId: `REG-${event._id.toString().slice(-4)}-${studentId.slice(-4)}-${Date.now().toString().slice(-4)}`,
              metadata: {
                method: price > 0 ? (squadId ? 'Squad/Bulk' : 'Direct') : 'Free',
                registrationSource: 'portal'
              }
            });

            await tx.save();
            console.log(`Financial record created for student ${studentId} on event ${event._id}`);
          } catch (err) {
            console.error(`Failed to create financial record for student ${studentId}:`, err);
          }
        })();
      }
    }

    event.updatedAt = new Date();
    await event.save();

    // Gamification: Award points to the caller (if solo, caller gets it. If squad, leader gets it for registering)
    await gamificationController.awardPoints(req.user.id, 'REGISTER_EVENT', event.category);

    res.json({
      message: `✅ Registered ${registeredCount} members successfully.`,
      registration: { eventId: id, squadId: squadId || null }
    });
  } catch (err) {
    console.error('Public register error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/host/events/:id/classify
 * Automatically categorize an event using Bayesian classification
 */
router.post('/events/:id/classify', authenticateToken, requireHost, async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findOne({ _id: id, hostId: req.user.id });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Classify the event
    const classification = event.classifyCategory();

    // Update the event category
    event.category = classification.category;
    event.updatedAt = new Date();
    await event.save();

    res.json({
      message: '✅ Event categorized successfully',
      category: classification.category,
      confidence: classification.confidence,
    });
  } catch (err) {
    console.error('Event classification error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/host/events/:id/categories
 * Get top categories for an event using Bayesian classification
 */
router.get('/events/:id/categories', authenticateToken, requireHost, async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findOne({ _id: id, hostId: req.user.id });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Get top categories
    const categories = event.getTopCategories(5);

    res.json({
      categories,
    });
  } catch (err) {
    console.error('Event category prediction error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/host/events/train-classifier
 * Train the Bayesian classifier with existing events
 */
router.post('/events/train-classifier', authenticateToken, requireHost, async (req, res) => {
  try {
    // Get all events for this host that have categories
    const events = await Event.find({
      hostId: req.user.id,
      category: { $exists: true, $ne: '' },
      $or: [
        { title: { $exists: true, $ne: '' } },
        { description: { $exists: true, $ne: '' } },
        { tags: { $exists: true, $ne: [] } },
      ],
    });

    if (events.length === 0) {
      return res.status(400).json({ error: 'No categorized events found for training' });
    }

    // Train the classifier
    const classifier = Event.trainClassifier(events);

    res.json({
      message: `✅ Classifier trained with ${events.length} events`,
      categories: classifier.categories,
    });
  } catch (err) {
    console.error('Classifier training error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// TF-IDF & Cosine Similarity Algorithm for Semantic Ranking
function getCosineSimilarity(textA, textB) {
  if (!textA || !textB) return 0;

  const getTerms = (str) => {
    return str.toLowerCase()
      .replace(/[^\w\s]/g, ' ') // remove punct
      .split(/\s+/)
      .filter(w => w.length > 2); // basic stopword filter
  };

  const termsA = getTerms(textA);
  const termsB = getTerms(textB);

  if (!termsA.length || !termsB.length) return 0;

  const vocabulary = new Set([...termsA, ...termsB]);
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  vocabulary.forEach(term => {
    const countA = termsA.filter(w => w === term).length;
    const countB = termsB.filter(w => w === term).length;
    dotProduct += (countA * countB);
    normA += (countA * countA);
    normB += (countB * countB);
  });

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * POST /api/host/public/smart-search
 * Public endpoint to search events using Natural Language via API
 */
router.post('/public/smart-search', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'Query is required' });

    const groqKey = process.env.GROQ_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    let parsed = null;

    // 1. Try Groq (OpenAI-compatible)
    if (groqKey) {
      try {
        const MODEL = 'llama-3.3-70b-versatile';
        const url = `https://api.groq.com/openai/v1/chat/completions`;

        const prompt = `
You are an event search assistant. Extract search parameters from the following user query:
"${query}"

Respond ONLY with a valid JSON object matching this exact structure (use null if not mentioned):
{
  "keywords": ["string", "string"], // key topics/terms, exclude filler words
  "category": "string", // best matching event category
  "location": "string", // city, place, or venue
  "isFree": boolean, // true if strictly free, false if paid, null if unspecified
  "dateFilter": "string" // one of: "today", "tomorrow", "weekend", "this_week", "next_week", "this_month", or null
}
        `;

        const response = await fetch(url, {
          method: 'POST', // Added missing POST method
          headers: {
            'Authorization': `Bearer ${groqKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: MODEL,
            messages: [{ role: 'user', content: prompt }]
          })
        });

        const data = await response.json();
        if (response.ok && data?.choices?.[0]?.message?.content) {
          const text = data.choices[0].message.content.trim();
          const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
          parsed = JSON.parse(cleanJson);
        }
      } catch (e) {
        console.warn('Groq NLP failed:', e.message);
      }
    }

    // 2. Fallback to Gemini
    if (!parsed && geminiKey) {
      try {
        const genAI = new (require('@google/generative-ai').GoogleGenerativeAI)(geminiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
Extract event search parameters from: "${query}"
Output ONLY JSON:
{
  "keywords": ["string"],
  "category": "string",
  "location": "string",
  "isFree": boolean,
  "dateFilter": "today"|"tomorrow"|"weekend"|"this_week"|"next_week"|"this_month"|null
}
        `;

        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();
        const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
        parsed = JSON.parse(cleanJson);
      } catch (e) {
        console.warn('Gemini NLP failed:', e.message);
      }
    }

    // 3. Robust Fallback: Local Python NLP Engine
    if (!parsed) {
      try {
        const { spawn } = require('child_process');
        const scriptPath = path.join(__dirname, '..', 'nlp_engine.py');

        const output = await new Promise((resolve, reject) => {
          const python = spawn('python', [scriptPath, 'no-key', query]);
          let result = '';
          python.stdout.on('data', (d) => result += d.toString());
          python.stderr.on('data', (d) => console.error('Python Error:', d.toString()));
          python.on('close', (code) => code === 0 ? resolve(result) : reject(new Error(`Python exit ${code}`)));
        });

        parsed = JSON.parse(output);
        console.log('✅ Fallback to Local NLP Engine used');
      } catch (e) {
        console.error('All NLP services failed:', e.message);
        return res.status(500).json({ error: 'Search parsing failed across all engines.' });
      }
    }

    // 4. Broad Fetch & Semantic Scoring
    // Fetch all published events or use $text if query keywords are strong enough
    let candidateEvents = [];
    
    // First try a MongoDB text search if we have keywords (fastest)
    if (parsed.keywords && parsed.keywords.length > 0) {
      const tsQuery = parsed.keywords.join(' ');
      candidateEvents = await Event.find({ 
        isPublished: true, 
        isDeleted: { $ne: true },
        $text: { $search: tsQuery }
      }).limit(100).lean();
    }
    
    // If text search returned nothing or not enough, fallback to fetching all recent published
    // to guarantee we can run cosine similarity locally
    if (candidateEvents.length < 5) {
      const backupEvents = await Event.find({ 
        isPublished: true, 
        isDeleted: { $ne: true },
        date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // don't fetch too old
      }).limit(200).lean();
      
      // Merge unique
      const existingIds = new Set(candidateEvents.map(e => String(e._id)));
      for (const ev of backupEvents) {
        if (!existingIds.has(String(ev._id))) {
          candidateEvents.push(ev);
        }
      }
    }

    // Combine original user query + Groq extracted keywords to form the semantic target
    const targetSemanticString = `${query} ${(parsed.keywords || []).join(' ')} ${parsed.category || ''}`;

    // Apply strict filtering first (dates, free/paid)
    let filteredCandidates = candidateEvents.filter(ev => {
      // Free filter
      if (parsed.isFree === true && ev.price > 0) return false;
      if (parsed.isFree === false && ev.price === 0) return false;
      return true;
    });

    // Score all candidates
    const scoredEvents = filteredCandidates.map(ev => {
      // Build document semantic string
      const docString = [
        ev.title,
        ev.category,
        ev.shortDescription,
        ev.description,
        ...(ev.tags || []),
        ev.location,
        ev.city
      ].filter(Boolean).join(' ');

      const similarity_score = getCosineSimilarity(targetSemanticString, docString);
      return { ...ev, similarity_score };
    });

    // Sort descending by score
    scoredEvents.sort((a, b) => b.similarity_score - a.similarity_score);
    
    // Filter out absolutely irrelevant items (score too low) unless the pool is tiny
    let finalEvents = scoredEvents.filter(ev => ev.similarity_score >= 0.05).slice(0, 15);
    if (finalEvents.length === 0) finalEvents = scoredEvents.slice(0, 5);

    // Format output exactly as requested with fixed similarity scores
    const formattedEvents = finalEvents.map(e => ({
      ...e,
      similarity_score: parseFloat(e.similarity_score.toFixed(2)),
      keywords: e.tags || []
    }));

    res.json({ events: formattedEvents, parsedQuery: parsed });
  } catch (err) {
    console.error('Smart Search error:', err);
    res.status(500).json({ error: 'Server error during AI semantic search', details: err.message });
  }
});


/**
 * GET /api/host/analytics
 * Private endpoint for hosts to get their analytics data
 */
router.get('/analytics', authenticateToken, requireHost, async (req, res) => {
  try {
    const hostId = req.user.id;
    const events = await Event.find({ hostId, isDeleted: { $ne: true } }).lean();

    const totalEvents = events.length;
    let totalRegistrations = 0;
    let totalBookmarks = 0;
    let pastEvents = 0;
    let upcomingEvents = 0;
    let totalAttended = 0;
    let pastEventsWithRegs = 0;

    const now = new Date();

    const eventsWithStats = events.map((event) => {
      const isPast = event.endDate ? new Date(event.endDate) < now : new Date(event.date) < now;
      const regCount = Array.isArray(event.registrations) ? event.registrations.length : 0;
      const bmCount = Array.isArray(event.bookmarks) ? event.bookmarks.length : 0;

      let attendedCount = 0;
      if (isPast) {
        pastEvents++;
        if (regCount > 0) pastEventsWithRegs++;
        if (Array.isArray(event.registrations)) {
          attendedCount = event.registrations.filter((r) => r.attended).length;
          totalAttended += attendedCount;
        }
      } else {
        upcomingEvents++;
      }

      totalRegistrations += regCount;
      totalBookmarks += bmCount;

      return {
        _id: event._id,
        title: event.title,
        date: event.date,
        isPast,
        registrations: regCount,
        bookmarks: bmCount,
        attended: attendedCount,
      };
    });

    // Calculate Average Attendance Rate for past events
    // (Total Attended in Past Events) / (Total Registrations in those Past Events)
    let avgAttendanceRate = 0;
    if (pastEventsWithRegs > 0) {
      const pastRegs = eventsWithStats
        .filter((e) => e.isPast)
        .reduce((acc, e) => acc + e.registrations, 0);
      if (pastRegs > 0) {
        avgAttendanceRate = Math.round((totalAttended / pastRegs) * 100);
      }
    }

    // Top 5 performing events (by registrations)
    const topPerformingEvents = [...eventsWithStats]
      .sort((a, b) => b.registrations - a.registrations)
      .slice(0, 5);

    res.json({
      summary: {
        totalEvents,
        totalRegistrations,
        totalBookmarks,
        avgAttendanceRate,
        pastEvents,
        upcomingEvents,
      },
      events: eventsWithStats.sort((a, b) => new Date(b.date) - new Date(a.date)),
      topEvents: topPerformingEvents,
    });
  } catch (err) {
    console.error('Fetch host analytics error:', err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// ========== Certificate Template Routes ==========

// GET: Fetch saved template for an event
router.get('/events/:eventId/certificate', authenticateToken, async (req, res) => {
  try {
    const template = await CertificateTemplate.findOne({ eventId: req.params.eventId }).lean();
    if (!template) return res.json({});
    res.json(template);
  } catch (err) {
    console.error('Fetch certificate template error:', err);
    res.status(500).json({ error: 'Failed to fetch certificate template' });
  }
});

// POST: Save/update template for an event
router.post('/events/:eventId/certificate', authenticateToken, async (req, res) => {
  try {
    const hostId = req.user.id;
    const { eventId } = req.params;
    const update = { ...req.body, hostId, updatedAt: new Date() };
    const template = await CertificateTemplate.findOneAndUpdate(
      { eventId },
      { $set: update },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    res.json(template);
  } catch (err) {
    console.error('Save certificate template error:', err);
    res.status(500).json({ error: 'Failed to save certificate template' });
  }
});

// POST: Upload background/signature image for certificate template
const multerLib = require('multer');
const certUpload = multerLib({ storage });

router.post(
  '/events/:eventId/certificate/upload',
  authenticateToken,
  certUpload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
      res.json({ url: req.file.path || req.file.secure_url });
    } catch (err) {
      console.error('Certificate upload error:', err);
      res.status(500).json({ error: 'Upload failed' });
    }
  },
);

module.exports = router;
