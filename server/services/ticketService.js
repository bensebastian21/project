const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

/**
 * Generates a stylish PDF ticket for an event registration.
 * @param {Object} event - The event details (title, date, location, etc.)
 * @param {Object} user - The user details (fullname, email)
 * @param {String} registrationId - The unique registration ID to encode in QR
 * @returns {Promise<Buffer>} - The PDF buffer
 */
const generatePDFTicket = async (event, user, registrationId) => {
  return new Promise(async (resolve, reject) => {
    try {
      // A5 size: 419.53 x 595.28 points
      const doc = new PDFDocument({ size: 'A5', margin: 0 });
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      // --- Theme Constants ---
      const colors = {
        bg: '#0F172A', // Slate 900 (Dark background)
        cardBg: '#1E293B', // Slate 800 (Card background)
        accent: '#F59E0B', // Amber 500
        textMain: '#F8FAFC', // Slate 50
        textMuted: '#94A3B8', // Slate 400
        black: '#000000',
        white: '#FFFFFF',
      };

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;

      // 1. Background Fill
      doc.rect(0, 0, pageWidth, pageHeight).fill(colors.bg);

      // 2. Decorative Top Band
      doc.rect(0, 0, pageWidth, 12).fill(colors.accent);

      // 3. Event Header (Title & Date)
      doc.moveDown(2);

      // "OFFICIAL EVENT PASS" Label
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor(colors.accent)
        .text('OFFICIAL EVENT PASS', 0, 40, { align: 'center', characterSpacing: 2 });

      // Event Title (Wrapped & Centered)
      doc.moveDown(0.5);
      doc
        .font('Helvetica-Bold')
        .fontSize(22)
        .fillColor(colors.textMain)
        .text(event.title, 30, doc.y, { align: 'center', width: pageWidth - 60 });

      // Date & Location
      doc.moveDown(0.5);
      const dateStr = new Date(event.date).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      doc
        .font('Helvetica')
        .fontSize(11)
        .fillColor(colors.textMuted)
        .text(`${dateStr}  •  ${event.location || 'Online Event'}`, { align: 'center' });

      // 4. Ticket Card (Central Box)
      const cardY = doc.y + 20;
      const cardHeight = 350;
      const cardWidth = pageWidth - 60;
      const cardX = 30;

      // Card Background (Rounded logic simulated by rect)
      doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 10).fill(colors.cardBg);

      // Card Border (Accent)
      doc
        .roundedRect(cardX, cardY, cardWidth, cardHeight, 10)
        .strokeColor(colors.accent)
        .lineWidth(2)
        .stroke();

      // --- Content Inside Card ---
      let innerY = cardY + 25;

      // Label: "ADMIT ONE"
      doc
        .font('Helvetica-Bold')
        .fontSize(14)
        .fillColor(colors.white)
        .text('ADMIT ONE', cardX, innerY, {
          align: 'center',
          width: cardWidth,
          characterSpacing: 4,
        });

      innerY += 30;

      // Attendee Name
      const displayName = user.fullname || user.username || user.name || 'Attendee';
      doc
        .font('Helvetica-Bold')
        .fontSize(18)
        .fillColor(colors.accent)
        .text(displayName.toUpperCase(), cardX, innerY, { align: 'center', width: cardWidth });

      innerY += 25;

      // Attendee Email
      const displayEmail = user.email || 'No Email Provided';
      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor(colors.textMuted)
        .text(displayEmail, cardX, innerY, { align: 'center', width: cardWidth });

      innerY += 30;

      // Divider Line (Dashed)
      doc
        .moveTo(cardX + 20, innerY)
        .lineTo(cardX + cardWidth - 20, innerY)
        .strokeColor(colors.textMuted)
        .lineWidth(1)
        .dash(4, { space: 4 })
        .stroke();

      doc.undash();
      innerY += 20;

      // QR Code
      const qrData = JSON.stringify({
        registrationId,
        eventId: event._id,
        userId: user._id,
        type: 'event-ticket',
      });
      // QR Code with white background for readability
      const qrImage = await QRCode.toDataURL(qrData, {
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' },
      });
      const qrSize = 130;
      const qrX = (pageWidth - qrSize) / 2;

      doc.roundedRect(qrX - 5, innerY - 5, qrSize + 10, qrSize + 10, 4).fill(colors.white);
      doc.image(qrImage, qrX, innerY, { width: qrSize });

      innerY += qrSize + 15;

      // Registration ID
      doc
        .font('Courier')
        .fontSize(10)
        .fillColor(colors.textMuted)
        .text(`ID: ${registrationId}`, cardX, innerY, { align: 'center', width: cardWidth });

      // 5. Footer
      const footerY = pageHeight - 40;
      doc
        .fontSize(8)
        .fillColor(colors.textMuted)
        .text('Please present this QR code at the entrance for verification.', 30, footerY - 15, {
          align: 'center',
          width: pageWidth - 60,
        });

      doc
        .fontSize(9)
        .fillColor(colors.accent)
        .text('Powered by Evenite', 0, footerY, { align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = { generatePDFTicket };
