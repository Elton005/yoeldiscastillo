import sharp from "sharp";
import { readFile, writeFile } from "node:fs/promises";
const scenes = [
  "inicio",
  "sobre-mi",
  "libros",
  "articulos",
  "contacto",
  "login",
  "admin-login",
  "admin",
];
const metrics = [];
for (const viewport of ["desktop", "tablet", "mobile"]) {
  const tiles = [];
  const width = viewport === "mobile" ? 270 : 480;
  const height =
    viewport === "mobile" ? 584 : viewport === "tablet" ? 690 : 334;
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const pair = [];
    for (const [col, version] of ["original", "react"].entries()) {
      const filename = `.qa/visual/after/${viewport}/${scene}-${version}.png`;
      const input = await sharp(filename)
        .resize({ width, height, fit: "inside" })
        .toBuffer();
      tiles.push({ input, left: col * width, top: i * (height + 24) + 24 });
      tiles.push({
        input: Buffer.from(
          `<svg width='${width}' height='24'><rect width='100%' height='100%' fill='#eee'/><text x='8' y='17' font-size='14'>${scene} - ${version}</text></svg>`,
        ),
        left: col * width,
        top: i * (height + 24),
      });
      pair.push(await sharp(filename).removeAlpha().raw().toBuffer());
    }
    let total = 0,
      different = 0;
    for (let p = 0; p < pair[0].length; p += 3) {
      let max = 0;
      for (let c = 0; c < 3; c++) {
        const delta = Math.abs(pair[0][p + c] - pair[1][p + c]);
        total += delta;
        max = Math.max(max, delta);
      }
      if (max > 24) different++;
    }
    metrics.push({
      viewport,
      scene,
      meanAbsoluteChannelDifference:
        Math.round((total / pair[0].length) * 100) / 100,
      pixelsAbove24:
        Math.round((different / (pair[0].length / 3)) * 10000) / 100,
      original: JSON.parse(
        await readFile(
          `.qa/visual/after/${viewport}/${scene}-original.json`,
          "utf8",
        ),
      ),
      react: JSON.parse(
        await readFile(
          `.qa/visual/after/${viewport}/${scene}-react.json`,
          "utf8",
        ),
      ),
    });
  }
  await sharp({
    create: {
      width: width * 2,
      height: (height + 24) * scenes.length,
      channels: 3,
      background: "#eee",
    },
  })
    .composite(tiles)
    .png()
    .toFile(`.qa/visual/after/${viewport}-comparison.png`);
}
await writeFile(".qa/visual/metrics.json", JSON.stringify(metrics, null, 2));
await writeFile(
  ".qa/visual/report.html",
  `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Comparación original / React</title><style>body{font:16px system-ui;margin:24px;background:#eee;color:#222}header{position:sticky;top:0;background:#eee;padding:12px;z-index:1}select{font:inherit;padding:8px;margin-right:12px}main{display:grid;grid-template-columns:1fr 1fr;gap:16px}figure{margin:0}img{width:100%;height:auto;border:1px solid #aaa}figcaption{padding:12px 0}</style><header><h1>Fidelidad visual: original / React</h1><p>Referencia: Git 0f6ab9b. Comparación final con un snapshot público de Supabase; sin escrituras remotas. Las sesiones administrativas son locales de prueba. La etapa previa utiliza fixtures.</p><label>Página <select id="scene">${scenes.map((scene) => `<option>${scene}</option>`).join("")}</select></label><label>Resolución <select id="viewport"><option>desktop</option><option>tablet</option><option>mobile</option></select></label><label>Etapa <select id="phase"><option value="after">Después de la corrección</option><option value="before">Antes de la corrección</option></select></label></header><main><figure><figcaption>Original</figcaption><img id="original" alt="Captura del diseño original"></figure><figure><figcaption>React</figcaption><img id="react" alt="Captura de la migración React"></figure></main><script>const update=()=>{for(const version of ['original','react'])document.getElementById(version).src=phase.value+'/'+viewport.value+'/'+scene.value+'-'+version+'.png'};for(const id of ['phase','viewport','scene'])document.getElementById(id).onchange=update;update();</script></html>`,
);
console.log(
  metrics.map(
    ({ viewport, scene, meanAbsoluteChannelDifference, pixelsAbove24 }) => ({
      viewport,
      scene,
      meanAbsoluteChannelDifference,
      pixelsAbove24,
    }),
  ),
);
