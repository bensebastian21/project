const http = require('http');

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/host/public/events/69a6834b116d7fd29f640cb2/waiting-list',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    }
};

const req = http.request(options, (res) => {
    console.log('STATUS:', res.statusCode);
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
        console.log('BODY:', body);
    });
});

req.on('error', (e) => {
    console.error('ERROR:', e.message);
});

req.end();
