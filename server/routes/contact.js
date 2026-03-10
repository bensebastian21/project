const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

router.post('/contact', async (req, res) => {
  try {
    const { name, email, message } = req.body;

    if (!message || !email) {
      return res.status(400).json({ error: 'Email and message are required' });
    }

    // Configure Transporter (Use environment variables in production)
    // For now, I'll attempt to use Gmail service. Access token/password would normally be in ENV.
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER, // e.g. bensebastian021@gmail.com
        pass: process.env.EMAIL_PASS, // App Password
      },
    });

    const mailOptions = {
      from: email,
      to: 'bensebastian021@gmail.com', // Send to your email
      subject: `New Contact Form Message from ${name || 'User'}`,
      text: `
        Name: ${name}
        Email: ${email}
        
        Message:
        ${message}
      `,
      html: `
        <h3>New Contact Form Submission</h3>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <br/>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
      `,
    };

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn('⚠️ Email credentials missing in .env. Mocking success response.');
      // Mock success if no credentials, so UI doesn't break for the user testing
      return res.status(200).json({ message: 'Message sent (Mocked)' });
    }

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Message sent successfully' });
  } catch (err) {
    console.error('Email Error:', err);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

module.exports = router;
