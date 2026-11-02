const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPng(width, height) {
  const rawData = [];
  const cx = width / 2;
  const cy = height / 2;
  const rOuter = width * 0.45;
  const rMid = width * 0.32;
  const rCore = width * 0.15;

  for (let y = 0; y < height; y++) {
    rawData.push(0); // filter type none
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > rOuter) {
        rawData.push(0, 0, 0, 0);
      } else if (dist > rOuter - 4) {
        rawData.push(244, 63, 94, 255); // Crimson outer
      } else if (dist > rMid) {
        rawData.push(9, 13, 22, 255); // Dark chassis
      } else if (dist > rMid - 4) {
        rawData.push(6, 182, 212, 255); // Cyan ring
      } else if (dist > rCore) {
        rawData.push(15, 23, 42, 255); // Inner chassis
      } else if (dist > rCore - 4) {
        rawData.push(225, 29, 72, 255); // Core border
      } else {
        const glow = Math.floor(255 * (1 - dist / rCore));
        rawData.push(255, Math.min(255, 60 + glow), Math.min(255, 100 + glow), 255);
      }
    }
  }

  function crc32(buf) {
    let crc = 0 ^ -1;
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
    }
    return (crc ^ -1) >>> 0;
  }

  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const tag = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(Buffer.concat([tag, data])), 0);
    return Buffer.concat([len, tag, data, crcBuf]);
  }

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // bit depth
  ihdrData.writeUInt8(6, 9); // RGBA
  ihdrData.writeUInt8(0, 10); // compression
  ihdrData.writeUInt8(0, 11); // filter
  ihdrData.writeUInt8(0, 12); // interlace

  const ihdr = chunk('IHDR', ihdrData);
  const idat = chunk('IDAT', zlib.deflateSync(Buffer.from(rawData), { level: 9 }));
  const iend = chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

function createIco(pngBuffer, width, height) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2); // 1 = ICO
  header.writeUInt16LE(1, 4); // count = 1

  const entry = Buffer.alloc(16);
  entry.writeUInt8(width >= 256 ? 0 : width, 0);
  entry.writeUInt8(height >= 256 ? 0 : height, 1);
  entry.writeUInt8(0, 2); // palette
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // planes
  entry.writeUInt16LE(32, 6); // bit depth
  entry.writeUInt32LE(pngBuffer.length, 8); // size
  entry.writeUInt32LE(6 + 16, 12); // offset

  return Buffer.concat([header, entry, pngBuffer]);
}

const publicDir = path.join(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const png256 = createPng(256, 256);
fs.writeFileSync(path.join(publicDir, 'icon.png'), png256);
const ico256 = createIco(png256, 256, 256);
fs.writeFileSync(path.join(publicDir, 'icon.ico'), ico256);

console.log('[Icon Generator] Successfully created public/icon.png and public/icon.ico');
