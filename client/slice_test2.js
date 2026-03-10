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

res['slice_1'] = checkWithReplacement(2195, 2237);
res['slice_2'] = checkWithReplacement(2237, 2270);
res['slice_3'] = checkWithReplacement(2270, 2305);
res['slice_4'] = checkWithReplacement(2305, 2335);

fs.writeFileSync('slice_feedbacks2.json', JSON.stringify(res, null, 2), 'utf-8');
