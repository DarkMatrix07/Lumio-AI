import fs from 'fs';

async function run() {
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?key=invalid&alt=sse`;
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
                generationConfig: { maxOutputTokens: 8192 },
            })
        });
        const text = await res.text();
        fs.writeFileSync('d:\\IET Hackathon\\lumio-ai\\test-out.log', `Status: ${res.status}\nBody: ${text}`);
    } catch (e) {
        fs.writeFileSync('d:\\IET Hackathon\\lumio-ai\\test-out.log', `Error: ${e.message}`);
    }
}
run();
