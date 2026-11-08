const fs = require('node:fs');
const s = fs.readFileSync('prisma/seed-data/catalog.ts', 'utf8');
const matches = [...s.matchAll(/sku: 'EL-SEN-007'/g)];
for (const m of matches) {
  const chunk = s.slice(Math.max(0, m.index - 400), m.index + 20);
  const slug = [...chunk.matchAll(/slug: '([^']+)'/g)].pop();
  console.log('EL-SEN-007 at', m.index, '-> product slug:', slug && slug[1]);
}
