import sharp from "sharp";
import { mkdir } from "node:fs/promises";
await mkdir("public/img/optimized", { recursive: true });
await sharp("public/img/logo-cerebro.jpg")
  .resize({ width: 64, height: 64, fit: "contain", background: "#2a1f1a" })
  .png()
  .toFile("public/img/favicon.png");
for (const width of [360, 674])
  await sharp("public/img/autor.jpg")
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 85 })
    .toFile(`public/img/optimized/autor-${width}.webp`);
console.log("Variantes técnicas generadas; originales intactos.");
