// server/utils/sms.js
const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_FROM_NUMBER || process.env.TWILIO_FROM;

async function sendSmsTwilio(to, body) {
  try {
    if (!accountSid || !authToken || !fromNumber) {
      console.warn('Twilio env not configured, skipping SMS send');
      return false;
    }
    const client = twilio(accountSid, authToken);
    await client.messages.create({ from: fromNumber, to, body });
    return true;
  } catch (e) {
    console.error('Twilio SMS error:', e?.message || e);
    return false;
  }
}

module.exports = { sendSmsTwilio };
