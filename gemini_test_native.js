const https = require('https');
const fs = require('fs');

const payload = JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
});

const req = https.request('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyBHM-OgVLuWUGfJyt9gvYDMTZd8nVlhCfs', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
    }
}, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
        fs.writeFileSync('C:\\Users\\divye\\gemini_api_test.txt', `Status: ${res.statusCode}\nBody: ${body}`);
    });
});

req.on('error', (e) => {
    fs.writeFileSync('C:\\Users\\divye\\gemini_api_test.txt', `Error: ${e.message}`);
});

req.write(payload);
req.end();
