const { generatePDFTicket } = require('./services/ticketService');
const fs = require('fs');

const run = async () => {
  console.log('--- STARTING PDF DEBUG ---');

  // Mock Data mimicking Mongoose objects
  const event = {
    _id: 'debug_event_123',
    title: 'Debug Gala & Night',
    date: new Date(),
    location: 'Debug Location Hall',
    // Test with missing location
    // location: null
  };

  const user = {
    _id: 'debug_user_456',
    fullname: 'Debug User Name',
    email: 'debug@example.com',
  };

  const regId = 'TKT-DEBUG-001';

  try {
    const pdfBuffer = await generatePDFTicket(event, user, regId);
    fs.writeFileSync('debug_ticket.pdf', pdfBuffer);
    console.log('✅ Success! PDF written to debug_ticket.pdf');
  } catch (err) {
    console.error('❌ PDF GENERATION FAILED:');
    console.error(err);
    // Print stack trace
    console.error(err.stack);
  }
};

run();
