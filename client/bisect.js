const parser = require('@babel/parser');
const fs = require('fs');
const code = fs.readFileSync('src/pages/HostDashboard.jsx', 'utf-8');

const lines = code.split('\n');

function check() {
    const testCode = lines.slice(0, 2786).join('\n') +
        '\n        </div>\n      </LayoutGroup>\n    );\n}';
    try {
        parser.parse(testCode, { sourceType: 'module', plugins: ['jsx', 'estree'] });
        return 'SUCCESS';
    } catch (e) {
        return e.message;
    }
}

console.log(check());

const mcode1 = lines.slice(0, 2786).join('\n') + '\n        </div>\n      </LayoutGroup>\n' + lines.slice(2786).join('\n');
fs.writeFileSync('test1.js', mcode1);

