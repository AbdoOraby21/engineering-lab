const fs = require('node:fs');
const s = fs.readFileSync('prisma/seed-data/catalog.ts', 'utf8');
const i = s.indexOf("slug: 'arduino-starter-kit'");
const j = s.indexOf('bundleItems:', i);
console.log(s.slice(j, j + 420));
console.log('====== esp jojd');
const k = s.indexOf("slug: 'sensor-kit-37-in-1'");
console.log(s.slice(k, k + 200));
