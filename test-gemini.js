const https = require('https');

const data = JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: "Hello" }] }],
});

const req = https.request('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?key=FAKE_KEY&alt=sse', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    }
}, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => console.log('Status:', res.statusCode, 'Body:', body));
});

req.on('error', console.error);
req.write(data);
req.end();
