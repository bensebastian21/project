const express = require('express');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const Event = require('../models/Event');
const User = require('../models/User');
const Certificate = require('../models/Certificate');
const CertificateTemplate = require('../models/CertificateTemplate');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const axios = require('axios');

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
  } catch (_) {
    return null;
  }
}

router.post('/events/:eventId', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const studentId = req.user.id;

    const event = await Event.findById(eventId).lean();
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (!event.isCompleted)
      return res.status(400).json({ error: 'Certificate available after event completion' });

    const reg = (event.registrations || []).find(
      (r) => String(r.studentId) === String(studentId) && r.status === 'registered',
    );
    if (!reg)
      return res.status(403).json({ error: 'Only registered attendees can download certificate' });
    if (!reg.attended)
      return res
        .status(403)
        .json({ error: 'Certificate available only for attendees marked as present' });

    const host = await User.findById(event.hostId)
      .select('_id fullname username institute profilePic bannerUrl')
      .lean();
    const student = await User.findById(studentId).select('_id fullname username').lean();

    // Pre-allocate certificate ID so we can embed a verify URL QR into the PDF
    const certId = new mongoose.Types.ObjectId();
    const filename = `certificate_${eventId}_${studentId}_${certId.toString()}.pdf`;
    const filepath = path.join(CERT_DIR, filename);

    // Create PDF — 16:9 landscape certificate
    const W = 960,
      H = 540;
    const doc = new PDFDocument({ size: [W, H], margin: 0 });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    // Hoist shared variables used by both custom + fallback rendering and by stream.on('finish')
    const studentName = student?.fullname || student?.username || 'Participant';
    const eventTitle = event.title || 'the event';
    const hostName = host?.fullname || host?.username || 'Organizer';
    const institute = host?.institute || '';

    // Check for custom template
    const template = await CertificateTemplate.findOne({ eventId }).lean();

    if (template && (template.backgroundUrl || template.studentName?.visible)) {
      // Dynamic Custom Certificate Rendering

      // Background
      if (template.backgroundUrl) {
        try {
          // Fetch Cloudinary image buffer
          const response = await axios.get(template.backgroundUrl, { responseType: 'arraybuffer' });
          const imgBuffer = Buffer.from(response.data);
          doc.image(imgBuffer, 0, 0, { width: doc.page.width, height: doc.page.height });
        } catch (err) {
          console.error('Failed to load Cloudinary background in PDF:', err);
          doc.rect(0, 0, doc.page.width, doc.page.height).fill('#F8FAFC'); // Fallback
        }
      } else {
        doc.rect(0, 0, doc.page.width, doc.page.height).fill('#F8FAFC');
      }

      // Helper function to map percentage coordinates to absolute PDF points safely
      const convertCoords = (el) => {
        const safeX = typeof el?.x === 'number' ? el.x : 50;
        const safeY = typeof el?.y === 'number' ? el.y : 50;
        return {
          x: (safeX / 100) * doc.page.width,
          y: (safeY / 100) * doc.page.height,
        };
      };

      // Student Name
      if (template.studentName?.visible) {
        const { x, y } = convertCoords(template.studentName);
        const studentName = student?.fullname || student?.username || 'Participant';
        doc
          .fillColor(template.studentName.color || '#000000')
          .fontSize(template.studentName.fontSize || 32)
          .font('Helvetica-Bold')
          .text(studentName, 0, y, { align: 'center', width: doc.page.width }); // Assuming x is centered visually, adjusting y only for doc.text
      }

      // Event Name
      if (template.eventName?.visible) {
        const { x, y } = convertCoords(template.eventName);
        const eventTitle = event.title || 'the event';
        doc
          .fillColor(template.eventName.color || '#000000')
          .fontSize(template.eventName.fontSize || 24)
          .font('Helvetica-Bold')
          .text(eventTitle, 0, y, { align: 'center', width: doc.page.width });
      }

      // Date
      if (template.date?.visible) {
        const { x, y } = convertCoords(template.date);
        const dateText = new Date(event.endDate || event.date || Date.now()).toLocaleDateString();
        doc
          .fillColor(template.date.color || '#000000')
          .fontSize(template.date.fontSize || 18)
          .font('Helvetica-Bold')
          .text(dateText, 0, y, { align: 'center', width: doc.page.width });
      }

      // Signature
      if (template.signature?.visible && template.signatureUrl) {
        const { x, y } = convertCoords(template.signature);
        const width = template.signature.fontSize || 100; // Using fontSize as width for images
        const height = width / 2; // Approximate aspect ratio
        try {
          const response = await axios.get(template.signatureUrl, { responseType: 'arraybuffer' });
          const imgBuffer = Buffer.from(response.data);
          // center drawing point
          doc.image(imgBuffer, x - width / 2, y - height / 2, { width, height });
        } catch (err) {
          console.error('Failed to load Cloudinary signature in PDF:', err);
        }
      }

      // QR Code
      if (template.qrCode?.visible) {
        const origin = process.env.CLIENT_ORIGIN || `http://localhost:3000`;
        const verifyUrl = `${origin.replace(/\/$/, '')}/certificate/${certId.toString()}`;
        try {
          const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 200 });
          const base64 = qrDataUrl.split(',')[1];
          const buf = Buffer.from(base64, 'base64');

          const { x, y } = convertCoords(template.qrCode);
          const size = template.qrCode.fontSize || 100;

          doc.image(buf, x - size / 2, y - size / 2, { width: size, height: size });
        } catch (err) {
          console.error('Failed to generate custom position QR:', err);
        }
      }
    } else {
      // ==== Premium 16:9 Default Certificate Design ====
      const W = doc.page.width;
      const H = doc.page.height;
      const m = 40; // margin

      // --- Deep navy background ---
      doc.rect(0, 0, W, H).fill('#0B1437');

      // --- Gold accent border (outer) ---
      doc
        .rect(18, 18, W - 36, H - 36)
        .lineWidth(2)
        .stroke('#C9A84C');
      // --- Thin inner border ---
      doc
        .rect(26, 26, W - 52, H - 52)
        .lineWidth(0.5)
        .stroke('#C9A84C');

      // --- Decorative corner ornaments ---
      const corners = [
        [m, m],
        [W - m, m],
        [m, H - m],
        [W - m, H - m],
      ];
      corners.forEach(([cx, cy]) => {
        doc.circle(cx, cy, 4).fill('#C9A84C');
      });

      // --- Left gold accent bar ---
      doc.rect(0, 0, 8, H).fill('#C9A84C');

      // --- Gold star/diamond decorative divider ---
      const midX = W / 2;
      doc
        .moveTo(midX - 60, 90)
        .lineTo(midX - 12, 90)
        .lineWidth(0.8)
        .stroke('#C9A84C');
      doc.circle(midX, 90, 4).fill('#C9A84C');
      doc
        .moveTo(midX + 12, 90)
        .lineTo(midX + 60, 90)
        .lineWidth(0.8)
        .stroke('#C9A84C');

      // --- "CERTIFICATE OF PARTICIPATION" header label ---
      doc
        .fillColor('#C9A84C')
        .fontSize(11)
        .font('Helvetica')
        .text('C E R T I F I C A T E   O F   P A R T I C I P A T I O N', 0, 55, {
          align: 'center',
          width: W,
        });

      // --- "This certifies that" sub-label ---
      doc
        .fillColor('#A0AEC0')
        .fontSize(12)
        .font('Helvetica')
        .text('This is to certify that', 0, 110, { align: 'center', width: W });

      // --- Student Name (hero) ---
      doc
        .fillColor('#FFFFFF')
        .fontSize(36)
        .font('Helvetica-Bold')
        .text(studentName, 0, 135, { align: 'center', width: W });

      // --- Underline below name ---
      const nameY = 185;
      doc
        .moveTo(midX - 140, nameY)
        .lineTo(midX + 140, nameY)
        .lineWidth(1)
        .stroke('#C9A84C');

      // --- "has successfully participated in" ---
      doc
        .fillColor('#CBD5E0')
        .fontSize(11)
        .font('Helvetica')
        .text('has successfully participated in', 0, 200, { align: 'center', width: W });

      // --- Event Title ---
      doc
        .fillColor('#F6E05E')
        .fontSize(20)
        .font('Helvetica-Bold')
        .text(eventTitle, 60, 225, { align: 'center', width: W - 120 });

      // --- Date + host section ---
      const dateText = new Date(event.endDate || event.date || Date.now()).toLocaleDateString(
        'en-IN',
        { day: 'numeric', month: 'long', year: 'numeric' },
      );
      doc
        .fillColor('#A0AEC0')
        .fontSize(10)
        .font('Helvetica')
        .text(`Date: ${dateText}`, 0, 285, { align: 'center', width: W });

      // --- Divider ---
      doc
        .moveTo(m + 40, 315)
        .lineTo(W - m - 40, 315)
        .lineWidth(0.5)
        .stroke('#2D3748');

      // --- Signature block (left) ---
      const sigX = m + 60;
      const sigY = 340;
      const bannerLocal = localPathFromUploadUrl(host?.bannerUrl);
      const profileLocal = localPathFromUploadUrl(host?.profilePic);
      doc
        .moveTo(sigX, sigY)
        .lineTo(sigX + 160, sigY)
        .lineWidth(0.8)
        .stroke('#C9A84C');
      doc
        .fillColor('#FFFFFF')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text(hostName, sigX, sigY + 8, { width: 180 });
      if (institute)
        doc
          .fillColor('#A0AEC0')
          .fontSize(9)
          .font('Helvetica')
          .text(institute, sigX, sigY + 24, { width: 180 });
      doc
        .fillColor('#718096')
        .fontSize(8)
        .font('Helvetica')
        .text('Authorized Signatory', sigX, sigY + 40, { width: 180 });

      // Profile pic seal (small circular stamp feel)
      try {
        if (profileLocal && fs.existsSync(profileLocal)) {
          doc.image(profileLocal, sigX + 170, sigY - 20, { width: 44, height: 44 });
        }
      } catch (_) {}

      // --- QR Code (right side) ---
      const origin = process.env.CLIENT_ORIGIN || 'http://localhost:3000';
      const verifyUrl = `${origin.replace(/\/$/, '')}/certificate/${certId.toString()}`;
      try {
        const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
          margin: 1,
          width: 120,
          color: { dark: '#FFFFFF', light: '#0B1437' },
        });
        const base64 = qrDataUrl.split(',')[1];
        const buf = Buffer.from(base64, 'base64');
        const qrSize = 90;
        const qrX = W - m - qrSize - 10;
        const qrY = sigY - 16;
        doc.image(buf, qrX, qrY, { width: qrSize, height: qrSize });
        doc
          .fillColor('#718096')
          .fontSize(7)
          .font('Helvetica')
          .text('Scan to Verify', qrX, qrY + qrSize + 3, { width: qrSize, align: 'center' });
      } catch (_) {}

      // --- Institute / event category badge ---
      if (event.category) {
        doc.rect(W - 130, 52, 100, 20).fill('#1A2E5A');
        doc
          .fillColor('#C9A84C')
          .fontSize(8)
          .font('Helvetica-Bold')
          .text(event.category.toUpperCase(), W - 126, 58, { width: 92, align: 'center' });
      }
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
          filename,
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
    fs.writeFileSync(path.join(__dirname, '..', 'err_log.txt'), String(err.stack));
    console.error('Generate certificate error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/verify/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const cert = await Certificate.findById(id)
      .populate('eventId', 'title date endDate')
      .populate('hostId', 'fullname username institute')
      .populate('studentId', 'fullname username')
      .lean();
    if (!cert) return res.json({ valid: false });
    res.json({
      valid: true,
      certificateId: String(cert._id),
      url: cert.url,
      issuedAt: cert.issuedAt,
      event: cert.eventId
        ? { title: cert.eventId.title, date: cert.eventId.date, endDate: cert.eventId.endDate }
        : null,
      host: cert.hostId
        ? {
            name: cert.hostId.fullname || cert.hostId.username,
            institute: cert.hostId.institute || '',
          }
        : null,
      student: cert.studentId ? { name: cert.studentId.fullname || cert.studentId.username } : null,
    });
  } catch (err) {
    res.json({ valid: false });
  }
});

module.exports = router;
