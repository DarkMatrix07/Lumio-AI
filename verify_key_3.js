const https = require('https');
const fs = require('fs');
const data = JSON.stringify({ contents: [{ role: 'user', parts: [{ text: "Hi" }] }] });
const req = https.request('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyBHM-OgVLuWUGfJyt9gvYDMTZd8nVlhCfs', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
    }
}, (res) => {
    let body = '';
    res.on('data', d => body += d);
    res.on('end', () => {
        fs.writeFileSync('d:\\IET Hackathon\\lumio-ai\\result.txt', `Status: ${res.statusCode}\nBody: ${body}`);
        process.exit(0);
    });
});
req.on('error', (e) => {
    fs.writeFileSync('d:\\IET Hackathon\\lumio-ai\\result.txt', `Error: ${e.message}`);
    process.exit(1);
});
req.write(data);
req.end();
