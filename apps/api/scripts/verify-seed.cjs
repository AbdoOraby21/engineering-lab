const fs = require('node:fs');
const s = fs.readFileSync('prisma/seed-data/catalog.ts', 'utf8');
console.log('FFFD count:', (s.match(/�/g) || []).length);
console.log('arabic chars:', (s.match(/[\u0600-\u06FF]/g) || []).length);
const i = s.indexOf("slug: 'tools-accessories'");
console.log(s.slice(i, i + 400));
const j = s.indexOf("slug: 'breadboards-prototyping'");
console.log('======');
console.log(s.slice(j, j + 300));
