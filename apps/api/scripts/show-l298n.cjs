const fs = require('node:fs');
const s = fs.readFileSync('prisma/seed-data/catalog.ts', 'utf8');
const i = s.indexOf("slug: 'l298n-motor-driver'");
console.log(JSON.stringify(s.slice(i, i + 650), null, 1));
