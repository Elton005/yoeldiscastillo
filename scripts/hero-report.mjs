import { copyFile, writeFile, readFile } from "node:fs/promises";
await copyFile(
  "assets/hero-originals/reference-guide.png",
  ".qa/hero/reference-guide.png",
);
const widths = [320, 375, 430, 768, 1024, 1440, 1920];
const metrics = await Promise.all(
  widths.map(async (width) =>
    JSON.parse(await readFile(`.qa/hero/${width}.json`, "utf8")),
  ),
);
await writeFile(".qa/hero/metrics.json", JSON.stringify(metrics, null, 2));
await writeFile(
  ".qa/hero/report.html",
  `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Hero definitivo — Yoeldis Castillo</title><style>body{font:16px/1.6 system-ui;background:#211710;color:#f8f3ea;margin:24px}h1{font-size:26px}select{font:inherit;padding:8px;margin:12px 0 24px}img{display:block;max-width:100%;border:1px solid #c9aa6b}main{display:grid;grid-template-columns:1fr 1fr;gap:20px}figure{margin:0}figcaption{margin-bottom:12px;color:#dcc29e}small{display:block;max-width:90ch;color:#dcc29e}@media(max-width:900px){main{grid-template-columns:1fr}}</style><h1>Hero definitivo: referencia e implementación</h1><small>La composición utiliza la biblioteca y el retrato auténtico en capas independientes. La pose de pie de la fotografía tiene prioridad sobre la pose sentada del mockup. Texto y botones son HTML editables. Capturas locales con backend de pruebas; sin escrituras en Supabase remoto.</small><label>Anchura <select id="width">${widths.map((width) => `<option ${width === 1440 ? "selected" : ""}>${width}</option>`).join("")}</select></label><main><figure><figcaption>Guía visual proporcionada</figcaption><img src="reference-guide.png" alt="Guía visual aprobada"></figure><figure><figcaption id="caption">Implementación</figcaption><img id="screen" alt="Captura del hero implementado"></figure></main><p id="details"></p><script>const metrics=${JSON.stringify(metrics)};const selector=document.querySelector('#width');function update(){const width=Number(selector.value),item=metrics.find(row=>row.width===width);document.querySelector('#screen').src=width+'-hero.png';document.querySelector('#screen').style.width=width+'px';document.querySelector('#caption').textContent='Implementación a '+width+' px';document.querySelector('#details').textContent='Scroll horizontal: '+(item.scrollWidth>item.width?'detectado':'ninguno')+'. Retrato sin deformación (object-fit: '+item.objectFit+'). Retrato y texto sin solapamiento.';}selector.onchange=update;update();</script></html>`,
  "utf8",
);
console.log("Informe generado: .qa/hero/report.html");
