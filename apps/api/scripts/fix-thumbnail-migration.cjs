const fs = require('node:fs');
const sql = 'ALTER TABLE "ProductImage" ADD COLUMN "thumbnailUrl" TEXT;\n';
fs.writeFileSync(process.argv[2], Buffer.from(sql, 'utf8'));
console.log('written', process.argv[2], [...fs.readFileSync(process.argv[2]).subarray(0, 20)]);
