const fs = require('node:fs');
const s = fs.readFileSync('prisma/seed-data/catalog.ts', 'utf8');
for (const slug of ['raspberry-pi-5-4gb', 'arduino-uno-r4-wifi', 'esp32-devkit-v1']) {
  const i = s.indexOf(`slug: '${slug}'`);
  console.log('======', slug);
  console.log(s.slice(i, i + 400));
}
