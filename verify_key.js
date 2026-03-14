const https = require('https');
const fs = require('fs');

const data = JSON.stringify({
    contents: [{ parts: [{ text: "Respond confirming you are online." }] }]
});

const options = {
    hostname: 'generativelanguage.googleapis.com',
    path: '/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyBHM-OgVLuWUGfJyt9gvYDMTZd8nVlhCfs',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = https.request(options, (res) => {
    let body = '';
    res.on('data', (d) => {
        body += d;
    });
    res.on('end', () => {
        fs.writeFileSync('api_response.log', `Status: ${res.statusCode}\nBody: ${body}`);
    });
});

req.on('error', (error) => {
    fs.writeFileSync('api_response.log', `Request Error: ${error}`);
});

req.write(data);
req.end();
