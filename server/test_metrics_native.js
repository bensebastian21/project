const jwt = require('jsonwebtoken');
require('dotenv').config();

async function test() {
  try {
    const token = jwt.sign(
      { id: 'admin', role: 'admin' },
      process.env.JWT_SECRET || 'fallback_secret',
    );
    const res = await fetch('http://localhost:5000/api/auth/admin/metrics', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    console.log('Keys in response:', Object.keys(data));
    console.log('Value of analytics:', data.analytics);
  } catch (err) {
    console.error('Fetch failed:', err);
  }
}

test();
