const parser = require('@babel/parser');
const fs = require('fs');
const code = fs.readFileSync('src/pages/HostDashboard.jsx', 'utf-8');

const lines = code.split('\n');

function checkPreReturn() {
    const testCode = lines.slice(0, 1305).join('\n') + '\n}';
    try {
        parser.parse(testCode, { sourceType: 'module', plugins: ['jsx', 'estree'] });
        return 'SUCCESS';
    } catch (e) {
        return e.message;
    }
}

console.log(checkPreReturn());
