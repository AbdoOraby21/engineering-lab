const fs = require('node:fs');
const s = fs.readFileSync('prisma/seed-data/catalog.ts', 'utf8');
for (const slug of ['leds-displays', 'power-supplies', 'motors-actuators', 'cables-connectors', 'breadboards-prototyping']) {
  const i = s.indexOf(`slug: '${slug}'`);
  console.log('=====', slug);
  console.log(s.slice(i, i + 560));
}
