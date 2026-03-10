const { generatePDFTicket } = require('./services/ticketService');
const fs = require('fs');

const run = async () => {
  const event = {
    _id: 'event123',
    title: 'Grand Gala Night 2026',
    date: new Date(),
    location: 'Main Auditorium, Campus Center',
  };
  const user = {
    _id: 'user456',
    fullname: 'John Doe',
    email: 'john.doe@example.com',
  };
  const regId = 'REG-7890';

  console.log('Generating ticket...');
  try {
    const pdfBuffer = await generatePDFTicket(event, user, regId);
    fs.writeFileSync('test_ticket.pdf', pdfBuffer);
    console.log('Ticket generated: test_ticket.pdf');
  } catch (err) {
    console.error('Error generating ticket:', err);
  }
};

run();
