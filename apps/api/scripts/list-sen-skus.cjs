const fs = require('node:fs');
const s = fs.readFileSync('prisma/seed-data/catalog.ts', 'utf8');
for (const m of s.matchAll(/sku: '(EL-SEN-[0-9]+)'/g)) {
  const chunk = s.slice(Math.max(0, m.index - 500), m.index + 20);
  const slug = [...chunk.matchAll(/slug: '([^']+)'/g)].pop();
  console.log(m[1], '->', slug && slug[1]);
}
