// Reverses the accidental double-transcoding: original UTF-8 bytes -> decoded as Win-1252 -> re-encoded as UTF-8.
// This script maps each current char back to its original byte using the inverse Win-1252 table,
// then decodes the resulting byte sequence as UTF-8.
const fs = require('node:fs');

const cp1252High = {
  0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85,
  0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a,
  0x2039: 0x8b, 0x0152: 0x8c, 0x0081: 0x81, 0x017d: 0x8e, 0x008d: 0x8d,
  0x008f: 0x8f, 0x0090: 0x90, 0x2018: 0x91, 0x2019: 0x92, 0x201c: 0x93,
  0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x02dc: 0x98,
  0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c, 0x009d: 0x9d,
  0x017e: 0x9e, 0x0178: 0x9f,
};

function charToByte(code) {
  if (code < 0x80) return code;
  if (code >= 0xa0 && code <= 0xff) return code;
  const mapped = cp1252High[code];
  return mapped === undefined ? null : mapped;
}

const file = process.argv[2];
let current = fs.readFileSync(file, 'utf8');
if (current.charCodeAt(0) === 0xfeff) {
  current = current.slice(1);
  console.log('stripped leading BOM (added by Set-Content)');
}
const bytes = [];
for (const char of current) {
  const byte = charToByte(char.codePointAt(0));
  if (byte === null) {
    console.error('FAIL: char U+' + char.codePointAt(0).toString(16) + ' is not representable in Win-1252');
    process.exit(1);
  }
  bytes.push(byte);
}
const restored = Buffer.from(bytes).toString('utf8');
fs.writeFileSync(file, Buffer.from(restored, 'utf8'));
console.log('restored. arabic present:', /[\u0600-\u06FF]/.test(restored));
