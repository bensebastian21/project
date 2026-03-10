const fs = require('fs');
const compiler = require('@babel/core');

try {
    const code = fs.readFileSync('./src/components/EventDetailModal.jsx', 'utf-8');
    compiler.parse(code, {
        presets: ['@babel/preset-react'],
        filename: 'EventDetailModal.jsx'
    });
    console.log("Parse Successful!");
} catch (e) {
    console.error("Syntax Error found:");
    console.error(e.message);
}
