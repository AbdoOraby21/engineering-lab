const fs = require('node:fs');
const file = process.argv[2];
const content = process.argv[3];
fs.writeFileSync(file, Buffer.from(content, 'utf8'));
const head = [...fs.readFileSync(file).subarray(0, 4)];
console.log('first bytes:', head);
