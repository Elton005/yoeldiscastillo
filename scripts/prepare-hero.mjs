import sharp from "sharp";
import { mkdir } from "node:fs/promises";
const folder = "public/img/hero";
await mkdir(folder, { recursive: true });
// Technical matte refinement of the original white backdrop. Keep original RGB
// throughout: no generated facial/body pixels enter the published photograph.
const source = await sharp("assets/source/author-standing.png")
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const { width, height } = source.info;
const mask = new Uint8Array(width * height);
const queue = new Int32Array(width * height);
let head = 0,
  tail = 0;
function enqueue(index) {
  if (mask[index]) return;
  const pos = index * 3;
  if (
    Math.min(source.data[pos], source.data[pos + 1], source.data[pos + 2]) < 242
  )
    return;
  mask[index] = 1;
  queue[tail++] = index;
}
for (let x = 0; x < width; x++) {
  enqueue(x);
  enqueue((height - 1) * width + x);
}
for (let y = 0; y < height; y++) {
  enqueue(y * width);
  enqueue(y * width + width - 1);
}
while (head < tail) {
  const index = queue[head++],
    x = index % width,
    y = Math.floor(index / width);
  if (x) enqueue(index - 1);
  if (x < width - 1) enqueue(index + 1);
  if (y) enqueue(index - width);
  if (y < height - 1) enqueue(index + width);
}
const rgba = Buffer.alloc(width * height * 4);
for (let i = 0; i < mask.length; i++) {
  source.data.copy(rgba, i * 4, i * 3, i * 3 + 3);
  rgba[i * 4 + 3] = mask[i] ? 0 : 255;
}
// Soften the edge only; keep the interior, including face, hair and suit, intact.
const alpha = await sharp(rgba, { raw: { width, height, channels: 4 } })
  .extractChannel(3)
  .blur(0.45)
  .toBuffer();
const cutout = await sharp(source.data, { raw: { width, height, channels: 3 } })
  .joinChannel(alpha, { raw: { width, height, channels: 1 } })
  .raw()
  .toBuffer();
for (const size of [480, 768, 1141])
  await sharp(cutout, { raw: { width, height, channels: 4 } })
    .resize({ width: size, withoutEnlargement: true })
    .webp({ quality: 88, alphaQuality: 100 })
    .toFile(`${folder}/author-${size}.webp`);
for (const size of [1024, 1672])
  await sharp("assets/source/library.png")
    .resize({ width: size, withoutEnlargement: true })
    .webp({ quality: 83 })
    .toFile(`${folder}/library-${size}.webp`);
// Crop the empty library for phones only; the photograph is never cropped.
for (const size of [640, 960])
  await sharp("assets/source/library.png")
    .extract({ left: 0, top: 0, width: 1000, height: 941 })
    .resize({ width: size })
    .webp({ quality: 82 })
    .toFile(`${folder}/library-mobile-${size}.webp`);
let changedRGB = 0;
for (let i = 0; i < mask.length; i++)
  for (let channel = 0; channel < 3; channel++)
    if (cutout[i * 4 + channel] !== source.data[i * 3 + channel]) changedRGB++;
if (changedRGB)
  throw new Error("The original photograph RGB must remain unchanged.");
console.log(
  JSON.stringify({ width, height, changedRGB, transparentPixels: tail }),
);
