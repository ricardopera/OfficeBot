import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

const resourcesDir = join(process.cwd(), 'resources');
const iconPngPath = join(resourcesDir, 'icon.png');
const iconIcoPath = join(resourcesDir, 'icon.ico');

const svgIcon = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0EA5E9"/>
      <stop offset="100%" stop-color="#1E40AF"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="512" height="512" rx="96" fill="url(#bg)"/>
  <circle cx="192" cy="200" r="36" fill="#fff"/>
  <circle cx="320" cy="200" r="36" fill="#fff"/>
  <rect x="152" y="286" width="208" height="40" rx="20" fill="#fff"/>
</svg>
`;

const pngBuffer = await sharp(Buffer.from(svgIcon)).resize(256, 256).png().toBuffer();

const icoHeader = Buffer.alloc(6);
icoHeader.writeUInt16LE(0, 0); // reserved
icoHeader.writeUInt16LE(1, 2); // type: icon
icoHeader.writeUInt16LE(1, 4); // image count

const icoDirectoryEntry = Buffer.alloc(16);
icoDirectoryEntry.writeUInt8(0, 0); // width 256 -> 0
icoDirectoryEntry.writeUInt8(0, 1); // height 256 -> 0
icoDirectoryEntry.writeUInt8(0, 2); // color count
icoDirectoryEntry.writeUInt8(0, 3); // reserved
icoDirectoryEntry.writeUInt16LE(1, 4); // color planes
icoDirectoryEntry.writeUInt16LE(32, 6); // bits per pixel
icoDirectoryEntry.writeUInt32LE(pngBuffer.length, 8); // image size
icoDirectoryEntry.writeUInt32LE(22, 12); // image offset (6 + 16)

const icoBuffer = Buffer.concat([icoHeader, icoDirectoryEntry, pngBuffer]);

await mkdir(resourcesDir, { recursive: true });
await writeFile(iconPngPath, pngBuffer);
await writeFile(iconIcoPath, icoBuffer);

console.log(`Generated ${iconPngPath} and ${iconIcoPath}`);
