const fs = require('fs');
const content = fs.readFileSync('src/pages/HostDashboard.jsx', 'utf8');

let stack = [];
let lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    for (let j = 0; j < line.length; j++) {
        let char = line[j];
        // Ignore simple strings
        if (char === '"' || char === "'") {
            let quote = char;
            j++;
            while (j < line.length && line[j] !== quote) {
                if (line[j] === '\\') j++;
                j++;
            }
            continue;
        }

        if (char === '(') stack.push({ char, line: i + 1, col: j + 1 });
        else if (char === '{') stack.push({ char, line: i + 1, col: j + 1 });
        else if (char === '[') stack.push({ char, line: i + 1, col: j + 1 });
        else if (char === ')') {
            if (stack.length > 0 && stack[stack.length - 1].char === '(') stack.pop();
            else console.log(`Mismatch ')' at line ${i + 1} col ${j + 1}`);
        }
        else if (char === '}') {
            if (stack.length > 0 && stack[stack.length - 1].char === '{') stack.pop();
            else console.log(`Mismatch '}' at line ${i + 1} col ${j + 1}`);
        }
        else if (char === ']') {
            if (stack.length > 0 && stack[stack.length - 1].char === '[') stack.pop();
            else console.log(`Mismatch ']' at line ${i + 1} col ${j + 1}`);
        }
    }
}

if (stack.length > 0) {
    console.log('Unclosed items remaining in stack:');
    for (let item of stack) {
        console.log(`Unclosed '${item.char}' at line ${item.line} col ${item.col}`);
    }
} else {
    console.log('All matched (heuristic)!');
}
