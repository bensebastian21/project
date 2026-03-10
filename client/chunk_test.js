const parser = require('@babel/parser');
const fs = require('fs');
const code = fs.readFileSync('src/pages/HostDashboard.jsx', 'utf-8');
const lines = code.split('\n');

for (let i = 1300; i < 3388; i += 20) {
    const parts = [];
    parts.push(...lines.slice(0, i));
    parts.push('{null}');
    parts.push(...lines.slice(i + 20));

    const testCode = parts.join('\n');
    try {
        parser.parse(testCode, { sourceType: 'module', plugins: ['jsx', 'estree'] });
        console.log(`BINGO! Removing lines ${i + 1} to ${i + 21} fixed the parsing!`);
    } catch (e) {
        if (!e.message.includes('EOF') && !e.message.includes('Unexpected token, expected ","')) {
            // Something changed!
        }
    }
}
console.log("Done checking in 20-line chunks.");
