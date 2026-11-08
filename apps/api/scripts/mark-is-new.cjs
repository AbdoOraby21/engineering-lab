const fs = require('node:fs');
const file = 'prisma/seed-data/catalog.ts';
let s = fs.readFileSync(file, 'utf8');
for (const slug of ['raspberry-pi-5-4gb', 'arduino-uno-r4-wifi', 'esp32-devkit-v1']) {
  const marker = `slug: '${slug}',`;
  const i = s.indexOf(marker);
  if (i === -1) throw new Error(`slug not found: ${slug}`);
  const insertAt = i + marker.length;
  s = s.slice(0, insertAt) + '\n    isNew: true,' + s.slice(insertAt);
}
fs.writeFileSync(file, s);
console.log('done');
