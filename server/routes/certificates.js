const express = require('express');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const Event = require('../models/Event');
const User = require('../models/User');
const Certificate = require('../models/Certificate');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const router = express.Router();

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

// Ensure certificates directory exists
const CERT_DIR = path.join(__dirname, '..', 'uploads', 'certificates');
if (!fs.existsSync(CERT_DIR)) {
  fs.mkdirSync(CERT_DIR, { recursive: true });
}

// Helper to resolve local file path for an /uploads/... URL
function localPathFromUploadUrl(url) {
  try {
    if (!url) return null;
    if (!url.startsWith('/uploads/')) return null;
    return path.join(__dirname, '..', url.replace('/uploads/', 'uploads/'));
  } catch (_) { return null; }
}

router.post('/events/:eventId', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const studentId = req.user.id;

    const event = await Event.findById(eventId).lean();
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (!event.isCompleted) return res.status(400).json({ error: 'Certificate available after event completion' });

    const reg = (event.registrations || []).find(r => String(r.studentId) === String(studentId) && r.status === 'registered');
    if (!reg) return res.status(403).json({ error: 'Only registered attendees can download certificate' });
    if (!reg.attended) return res.status(403).json({ error: 'Certificate available only for attendees marked as present' });

    const host = await User.findById(event.hostId).select('_id fullname username institute profilePic bannerUrl').lean();
    const student = await User.findById(studentId).select('_id fullname username').lean();

    // Pre-allocate certificate ID so we can embed a verify URL QR into the PDF
    const certId = new mongoose.Types.ObjectId();
    const filename = `certificate_${eventId}_${studentId}_${certId.toString()}.pdf`;
    const filepath = path.join(CERT_DIR, filename);

    // Create PDF
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    // Background
    doc.rect(0, 0, doc.page.width, doc.page.height).fill('#F8FAFC');

    // Header with host banner or profile
    const bannerLocal = localPathFromUploadUrl(host?.bannerUrl);
    const profileLocal = localPathFromUploadUrl(host?.profilePic);
    try {
      if (bannerLocal && fs.existsSync(bannerLocal)) {
        doc.image(bannerLocal, 0, 0, { width: doc.page.width, height: 120, align: 'center' });
      }
    } catch (_) {}

    // Title
    doc.fillColor('#0F172A').fontSize(28).font('Helvetica-Bold').text('Certificate of Participation', { align: 'center', moveDown: 0.5 });
    doc.fillColor('#334155').fontSize(14).font('Helvetica').text('This is to certify that', { align: 'center' }).moveDown(0.5);

    // Student name
    const studentName = student?.fullname || student?.username || 'Participant';
    doc.fillColor('#0F172A').fontSize(24).font('Helvetica-Bold').text(studentName, { align: 'center' }).moveDown(0.5);

    // Event line
    const eventTitle = event.title || 'the event';
    doc.fillColor('#334155').fontSize(14).font('Helvetica').text('has successfully participated in', { align: 'center' }).moveDown(0.2);
    doc.fillColor('#1D4ED8').fontSize(18).font('Helvetica-Bold').text(eventTitle, { align: 'center' }).moveDown(0.5);

    // Date
    const dateText = new Date(event.endDate || event.date || Date.now()).toLocaleDateString();
    doc.fillColor('#475569').fontSize(12).font('Helvetica').text(`Date: ${dateText}`, { align: 'center' }).moveDown(1);

    // Host and institute
    const hostName = host?.fullname || host?.username || 'Organizer';
    const institute = host?.institute || '';
    doc.fillColor('#0F172A').fontSize(12).font('Helvetica-Bold').text(hostName, { align: 'center' });
    if (institute) doc.fillColor('#64748B').fontSize(11).font('Helvetica').text(institute, { align: 'center' });

    // Signature line and profile image as seal
    const y = doc.y + 40;
    doc.moveTo(150, y).lineTo(doc.page.width - 150, y).lineWidth(1).stroke('#94A3B8');
    doc.font('Helvetica').fontSize(10).fillColor('#475569').text('Organizer Signature', 0, y + 5, { align: 'center' });

    try {
      if (profileLocal && fs.existsSync(profileLocal)) {
        doc.circle(80, y - 20, 24).stroke('#94A3B8');
        doc.image(profileLocal, 56, y - 44, { width: 48, height: 48, fit: [48, 48] });
      }
    } catch (_) {}

    // QR Code (verification)
    const origin = process.env.CLIENT_ORIGIN || `http://localhost:3000`;
    const verifyUrl = `${origin.replace(/\/$/, '')}/certificate/${certId.toString()}`;
    try {
      const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 200 });
      const base64 = qrDataUrl.split(',')[1];
      const buf = Buffer.from(base64, 'base64');
      // Place QR and caption
      const qrX = doc.page.width / 2 - 60;
      const qrY = y + 60;
      doc.image(buf, qrX, qrY, { width: 120, height: 120 });
      doc.font('Helvetica').fontSize(10).fillColor('#475569').text('Scan to verify', 0, qrY + 130, { align: 'center' });
      doc.font('Helvetica').fontSize(8).fillColor('#64748B').text(verifyUrl, { align: 'center' });
    } catch (_) {
      // Ignore QR errors, still produce certificate
    }

    // Finish PDF
    doc.end();

    stream.on('finish', async () => {
      try {
        // Create certificate DB entry
        const cert = await Certificate.create({
          _id: certId,
          eventId: event._id,
          hostId: event.hostId,
          studentId,
          title: eventTitle,
          studentName,
          hostName,
          institute,
          url: `/uploads/certificates/${filename}`,
          filename
        });

        // Now generate a QR PNG data URL for the verify link and append to PDF (reopen+append not trivial).
        // Simpler: generate verify URL and include as separate JSON field; future enhancement: pre-generate QR, but PDF already closed.
        // For now, return URL; next iteration we can embed QR before doc.end by precomputing.

        return res.json({ url: cert.url, certificateId: String(cert._id) });
      } catch (e) {
        return res.status(500).json({ error: 'Failed to persist certificate' });
      }
    });

    stream.on('error', () => res.status(500).json({ error: 'Failed to write certificate' }));

  } catch (err) {
    console.error('Generate certificate error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/verify/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const cert = await Certificate.findById(id).populate('eventId', 'title date endDate').populate('hostId', 'fullname username institute').populate('studentId', 'fullname username').lean();
    if (!cert) return res.json({ valid: false });
    res.json({
      valid: true,
      certificateId: String(cert._id),
      url: cert.url,
      issuedAt: cert.issuedAt,
      event: cert.eventId ? { title: cert.eventId.title, date: cert.eventId.date, endDate: cert.eventId.endDate } : null,
      host: cert.hostId ? { name: cert.hostId.fullname || cert.hostId.username, institute: cert.hostId.institute || '' } : null,
      student: cert.studentId ? { name: cert.studentId.fullname || cert.studentId.username } : null
    });
  } catch (err) {
    res.json({ valid: false });
  }
});

module.exports = router;
