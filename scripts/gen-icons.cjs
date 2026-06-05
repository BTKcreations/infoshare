// Generate simple solid-color PNG icons with a centered square (chain-block motif).
// Uses only Node built-ins (zlib, crc32). No native deps.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  const crc = crc32(Buffer.concat([typeBuf, data]));
  crcBuf.writeUInt32BE(crc, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function makePng(size, maskable = false) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const bg = [15, 23, 42];
  const fg = [6, 182, 212];
  const inner = [10, 15, 30];
  const ring = [34, 211, 238];

  const innerPad = maskable ? Math.floor(size * 0.1) : Math.floor(size * 0.12);
  const squareSize = size - 2 * innerPad;
  const innerSquareSize = Math.floor(squareSize * 0.34);
  const innerSquareOffset = innerPad + Math.floor((squareSize - innerSquareSize) / 2);
  const ringInset = Math.floor(size * 0.05);
  const ringW = Math.max(2, Math.floor(size * 0.025));

  const px = (x, y) => {
    const inSquare = x >= innerPad && x < innerPad + squareSize && y >= innerPad && y < innerPad + squareSize;
    const inInner = x >= innerSquareOffset && x < innerSquareOffset + innerSquareSize && y >= innerSquareOffset && y < innerSquareOffset + innerSquareSize;
    const onRing =
      (x >= ringInset && x < ringInset + ringW && y >= ringInset && y < size - ringInset) ||
      (x >= size - ringInset - ringW && x < size - ringInset && y >= ringInset && y < size - ringInset) ||
      (y >= ringInset && y < ringInset + ringW && x >= ringInset && x < size - ringInset) ||
      (y >= size - ringInset - ringW && y < size - ringInset && x >= ringInset && x < size - ringInset);
    if (maskable) {
      if (inInner) return inner;
      if (inSquare) return fg;
      return bg;
    } else {
      if (onRing) return ring;
      if (inInner) return inner;
      if (inSquare) return fg;
      return bg;
    }
  };

  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(size * 4 + 1);
    row[0] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b] = px(x, y);
      const o = 1 + x * 4;
      row[o] = r;
      row[o + 1] = g;
      row[o + 2] = b;
      row[o + 3] = 255;
    }
    rows.push(row);
  }
  const raw = Buffer.concat(rows);
  const idat = zlib.deflateSync(raw);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

const outDir = process.argv[2] || '.';
fs.writeFileSync(path.join(outDir, 'icon-192.png'), makePng(192, false));
fs.writeFileSync(path.join(outDir, 'icon-512.png'), makePng(512, false));
fs.writeFileSync(path.join(outDir, 'icon-maskable.png'), makePng(512, true));
console.log('Wrote icons to', outDir);
