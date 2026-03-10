const parser = require('@babel/parser');
const fs = require('fs');
const code = fs.readFileSync('src/pages/HostDashboard.jsx', 'utf-8');
try {
    parser.parse(code, { sourceType: 'module', plugins: ['jsx', 'estree'] });
    console.log('Success');
} catch (e) {
    console.log(e.message);
    if (e.loc) {
        console.log('Line:', e.loc.line, 'Col:', e.loc.column);
    }
}
