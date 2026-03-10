const acorn = require('acorn');
const jsx = require('acorn-jsx');
const fs = require('fs');

const Parser = acorn.Parser.extend(jsx());
const code = fs.readFileSync('src/pages/HostDashboard.jsx', 'utf-8');

const brackets = {
    '(': ')',
    '{': '}',
    '[': ']',
    '${': '}'
};
const stack = [];
const result = {};

try {
    for (let token of Parser.tokenizer(code, { sourceType: 'module', ecmaVersion: 2020 })) {
        const val = token.type.label;
        if (val === '(' || val === '{' || val === '[' || val === '${') {
            stack.push({ char: val, line: token.loc.start.line });
        } else if (val === ')' || val === '}' || val === ']') {
            if (stack.length > 0) {
                const top = stack[stack.length - 1];
                if (brackets[top.char] === val) {
                    stack.pop();
                } else {
                    result.mismatch = `Found ${val} at line ${token.loc.start.line}, but expected ${brackets[top.char]} to close ${top.char} from line ${top.line}`;
                    break;
                }
            } else {
                result.extra = `Found extra closing ${val} at line ${token.loc.start.line}`;
                break;
            }
        }
    }
    result.stack = stack;
} catch (e) {
    result.error = e.message;
    result.stack = stack;
}

fs.writeFileSync('token_results.json', JSON.stringify(result, null, 2), 'utf-8');
