const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

require('dotenv').config({ path: './server/.env' });

async function test() {
    try {
        const token = jwt.sign({ id: '67bcb02111c1dcca8ff83b28', role: 'admin' }, process.env.JWT_SECRET || 'fallback_secret');
        const fetch = (await import('node-fetch')).default || global.fetch;
        const res = await fetch('http://localhost:5000/api/auth/admin/metrics', {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) {
            console.error('HTTP Error:', res.status, res.statusText);
            const text = await res.text();
            console.error('Response body:', text);
            return;
        }

        const data = await res.json();
        console.log(JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Fetch failed:', err);
    }
}

test();
