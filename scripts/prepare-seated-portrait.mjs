import sharp from "sharp";
import { writeFile } from "node:fs/promises";
const input = "assets/refinement-originals/author-seated.png";
const metadata = await sharp(input).metadata();
const { data, info } = await sharp(input)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
let transparent = 0,
  partial = 0,
  opaque = 0;
for (let i = 3; i < data.length; i += 4) {
  if (data[i] === 0) transparent++;
  else if (data[i] === 255) opaque++;
  else partial++;
}
if (!metadata.hasAlpha || !transparent || !opaque)
  throw new Error(
    "The supplied seated portrait must have real transparency and an opaque subject.",
  );
const variants = [];
for (const width of [560, 840, 1122]) {
  const path = `public/img/hero/seated-${width}.webp`;
  const output = await sharp(input)
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 90, alphaQuality: 100 })
    .toFile(path);
  variants.push({
    path,
    width: output.width,
    height: output.height,
    bytes: output.size,
  });
}
await writeFile(
  "public/img/hero/seated-manifest.json",
  JSON.stringify(
    {
      original: input,
      width: info.width,
      height: info.height,
      hasAlpha: metadata.hasAlpha,
      transparent,
      partial,
      opaque,
      method:
        "Direct responsive WebP encoding of supplied seated cutout; no generative edits or changes to pose/face.",
      variants,
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify({
    width: info.width,
    height: info.height,
    transparent,
    partial,
    opaque,
    variants,
  }),
);
