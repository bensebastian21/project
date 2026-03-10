const nodemailer = require('nodemailer');

function createTransporter() {
  const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.EMAIL_PORT || '587', 10);
  const secure = port === 465; // true for 465, false for 587/25
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    console.warn('Email not configured: EMAIL_USER or EMAIL_PASS missing');
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

/**
 * Sends an email with an optional PDF attachment (ticket).
 * @param {Object} options - { to, subject, html, attachments }
 * @returns {Promise<boolean>}
 */
const sendEmail = async ({ to, subject, html, attachments }) => {
  try {
    const transporter = createTransporter();
    if (!transporter) return false;

    const mailOptions = {
      from: process.env.EMAIL_USER || '"Evenite Support" <noreply@evenite.com>',
      to,
      subject,
      html,
      attachments, // Array of { filename, content: Buffer }
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return true;
  } catch (err) {
    console.error('Email send error:', err);
    return false;
  }
};

const sendTicketEmail = async (user, event, pdfBuffer) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <div style="background-color: #F59E0B; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0;">Your Ticket is Here!</h1>
      </div>
      <div style="padding: 20px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 8px 8px;">
        <p>Hi <strong>${user.fullname}</strong>,</p>
        <p>You are confirmed for <strong>${event.title}</strong>!</p>
        <p><strong>Date:</strong> ${new Date(event.date).toLocaleString()}</p>
        <p><strong>Location:</strong> ${event.location || 'Online'}</p>
        <p>Please find your ticket attached as a PDF. You can show the QR code at the entrance.</p>
        <br>
        <p>See you there,<br>The Evenite Team</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: user.email,
    subject: `Ticket: ${event.title}`,
    html,
    attachments: [
      {
        filename: `Ticket-${event._id}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  });
};

module.exports = { sendEmail, sendTicketEmail };
