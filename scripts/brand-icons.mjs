// 파비콘 원본(src/app/icon.svg)에서 favicon.ico(16·32·48)와 아이폰 홈 화면 아이콘(apple-icon.png, 180)을 만든다.
// 로고(src/lib/logo.ts)를 바꾸면 icon.svg를 같이 고치고 이 스크립트를 다시 돌린다: node scripts/brand-icons.mjs
import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import sharp from "sharp";

const APP_DIR = resolve(import.meta.dirname, "../src/app");
const svg = await readFile(join(APP_DIR, "icon.svg"), "utf8");
const render = (source, size) =>
  sharp(Buffer.from(source), { density: (72 * size) / 100 }).resize(size, size).png({ compressionLevel: 9 }).toBuffer();

// 아이폰은 아이콘 모서리를 스스로 깎으므로 꽉 찬 정사각형, 투명 없이
const square = svg.replace(/(<rect width="100" height="100") rx="[\d.]+"/, "$1");
const apple = await sharp(await render(square, 180)).flatten({ background: "#1d4ed8" }).png().toBuffer();
await writeFile(join(APP_DIR, "apple-icon.png"), apple);

// ICO: PNG를 그대로 담는 형식(요즘 브라우저는 모두 읽는다). 머리 6바이트 + 그림마다 16바이트 목록 + PNG들
const sizes = [16, 32, 48];
const pngs = await Promise.all(sizes.map((s) => render(svg, s)));
const head = Buffer.alloc(6 + 16 * sizes.length);
head.writeUInt16LE(0, 0);
head.writeUInt16LE(1, 2);
head.writeUInt16LE(sizes.length, 4);
let offset = head.length;
sizes.forEach((s, i) => {
  const at = 6 + 16 * i;
  head.writeUInt8(s, at);
  head.writeUInt8(s, at + 1);
  head.writeUInt16LE(1, at + 4);
  head.writeUInt16LE(32, at + 6);
  head.writeUInt32LE(pngs[i].length, at + 8);
  head.writeUInt32LE(offset, at + 12);
  offset += pngs[i].length;
});
await writeFile(join(APP_DIR, "favicon.ico"), Buffer.concat([head, ...pngs]));
console.log("favicon.ico, apple-icon.png를 만들었다");
