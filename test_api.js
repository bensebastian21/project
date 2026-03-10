const http = require('http');

const url = "http://localhost:5000/api/host/public/stats";

console.log(`Fetching ${url}...`);

http.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        console.log(`Status Code: ${res.statusCode}`);
        console.log("Response Body:", data);
    });
}).on("error", (err) => {
    console.error("Error:", err.message);
});
