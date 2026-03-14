const https = require('https');
const fs = require('fs');

const payload = JSON.stringify({
    contents: [{ parts: [{ text: "Hello" }] }]
});

const req = https.request('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyBHM-OgVLuWUGfJyt9gvYDMTZd8nVlhCfs', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': payload.length
    }
}, (res) => {
    let body = '';
    res.on('data', d => body += d);
    res.on('end', () => {
        fs.writeFileSync('d:\\IET Hackathon\\lumio-ai\\api_response.json', JSON.stringify({ status: res.statusCode, body: body }));
        console.log("Done writing");
    });
});

req.on('error', (e) => {
    fs.writeFileSync('d:\\IET Hackathon\\lumio-ai\\api_response.json', JSON.stringify({ error: e.message }));
    console.log("Done error");
});

req.write(payload);
req.end();
