const fs = require('node:fs');
const file = process.argv[2];
const chunks = [];
process.stdin.on('data', (chunk) => chunks.push(chunk));
process.stdin.on('end', () => {
  fs.writeFileSync(file, Buffer.from(chunks.join(''), 'utf8'));
  const head = [...fs.readFileSync(file).subarray(0, 8)];
  console.log('written', file, 'first bytes:', head);
});
