async function run() {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?key=invalid&alt=sse`;
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
            generationConfig: { maxOutputTokens: 8192 },
        })
    });
    console.log('Status', res.status);
    console.log('Body', await res.text());
}
run();
