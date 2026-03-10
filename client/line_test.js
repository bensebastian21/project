const parser = require('@babel/parser');
const fs = require('fs');
const code = fs.readFileSync('src/pages/HostDashboard.jsx', 'utf-8');
const lines = code.split('\n');

let found = false;
for (let i = 1300; i < 3388; i++) {
    const parts = [...lines];
    parts[i] = '{"REMOVED"}';

    const testCode = parts.join('\n');
    try {
        parser.parse(testCode, { sourceType: 'module', plugins: ['jsx', 'estree'] });
        console.log(`BINGO! Removing line ${i + 1} fixed the error!`);
        found = true;
    } catch (e) {
        // If fixing this line changes the error from EOF/expected "," to something else that is localized, it might be the culprit.
        if (!e.message.includes('EOF') && !e.message.includes('Unexpected token, expected ","')) {
            // It parsed past EOF! It failed somewhere else.
            console.log(`BINGO? Removing line ${i + 1} changed error to: ${e.message}`);
        }
    }
}
if (!found) console.log("Did not find a single line that fixes the parsing entirely.");
