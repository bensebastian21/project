const parser = require('@babel/parser');
const fs = require('fs');
const code = fs.readFileSync('src/pages/HostDashboard.jsx', 'utf-8');
const lines = code.split('\n');

const res = {};

function checkWithReplacement(start, end) {
    const parts = [];
    parts.push(...lines.slice(0, start));
    parts.push('<div />');
    parts.push(...lines.slice(end, 2786));
    parts.push('        </div>\n      </LayoutGroup>\n    );\n}');

    const testCode = parts.join('\n');
    try {
        parser.parse(testCode, { sourceType: 'module', plugins: ['jsx', 'estree'] });
        return 'SUCCESS';
    } catch (e) {
        return e.message;
    }
}

res['top_half'] = checkWithReplacement(2195, 2335);
res['middle_half'] = checkWithReplacement(2335, 2400);
res['bottom_half'] = checkWithReplacement(2400, 2476);

fs.writeFileSync('slice_feedbacks.json', JSON.stringify(res, null, 2), 'utf-8');
