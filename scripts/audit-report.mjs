import { readFile, readdir, writeFile } from "node:fs/promises";
const root = ".qa/final-audit";
const phases = {};
for (const phase of ["before", "after"]) {
  const results = JSON.parse(
    await readFile(`${root}/${phase}/results.json`, "utf8"),
  );
  const files = [];
  for (const entry of await readdir(`${root}/${phase}`, {
    withFileTypes: true,
  })) {
    if (entry.isDirectory())
      for (const name of await readdir(`${root}/${phase}/${entry.name}`))
        if (name.endsWith(".png")) files.push(`${entry.name}/${name}`);
  }
  const metrics = {};
  for (const profile of ["mobile", "desktop"]) {
    const report = JSON.parse(
      await readFile(`${root}/${phase}/lighthouse-${profile}.json`, "utf8"),
    );
    metrics[profile] = {
      scores: Object.fromEntries(
        Object.entries(report.categories).map(([key, value]) => [
          key,
          Math.round(value.score * 100),
        ]),
      ),
      lcp: report.audits["largest-contentful-paint"].numericValue,
      cls: report.audits["cumulative-layout-shift"].numericValue,
      tbt: report.audits["total-blocking-time"].numericValue,
    };
  }
  phases[phase] = { results, files, metrics };
}
const scenes = {
  inicio: "Inicio",
  libros: "Libros",
  articulos: "Artículos",
  biografia: "Biografía",
  contacto: "Contacto",
  libro: "Libro individual",
  articulo: "Artículo individual",
  admin: "Administración",
  menu: "Menú abierto",
  editor: "Editor",
};
const sizes = [...new Set(phases.after.results.map((row) => row.label))];
const metricRows = ["mobile", "desktop"]
  .map((profile) => {
    const a = phases.before.metrics[profile],
      b = phases.after.metrics[profile];
    return `<tr><td>${profile === "mobile" ? "Móvil" : "Pantalla de escritorio"}</td><td>${a.scores.performance} → ${b.scores.performance}</td><td>${(a.lcp / 1000).toFixed(2)} → ${(b.lcp / 1000).toFixed(2)} s</td><td>${a.cls.toFixed(3)} → ${b.cls.toFixed(3)}</td><td>${a.tbt.toFixed(0)} → ${b.tbt.toFixed(0)} ms</td></tr>`;
  })
  .join("");
await writeFile(
  `${root}/summary.json`,
  JSON.stringify(
    {
      sourceCommit: "02d259fe98aee2de77706ce43a6da7ffef27ac0d",
      branch: "audit/perfeccionamiento-20261123",
      screenshots: Object.fromEntries(
        Object.entries(phases).map(([key, value]) => [key, value.files.length]),
      ),
      metrics: Object.fromEntries(
        Object.entries(phases).map(([key, value]) => [key, value.metrics]),
      ),
      issues: phases.after.results.filter(
        (row) =>
          row.scroll > row.width + 1 ||
          row.clipped?.length ||
          row.axe?.length ||
          row.errors?.length,
      ),
    },
    null,
    2,
  ),
);
await writeFile(
  `${root}/report.html`,
  `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Auditoría editorial — Yoeldis Castillo</title><style>*{box-sizing:border-box}body{margin:0;background:#211710;color:#f8f3ea;font:16px/1.6 system-ui}header,section{padding:24px;max-width:1700px;margin:auto}h1{font:32px Georgia;color:#dcc29e}select{font:inherit;padding:8px;margin:0 20px 12px 8px}table{border-collapse:collapse;width:100%}th,td{padding:10px;text-align:left;border-bottom:1px solid #65513d}.table{overflow:auto}main{display:grid;grid-template-columns:1fr 1fr;gap:20px;padding:24px}figure{margin:0;min-width:0}img{width:100%;height:auto;border:1px solid #65513d}figcaption{font:22px Georgia;padding-bottom:12px}a{color:#dcc29e}p{max-width:90ch}li{margin-bottom:8px}@media(max-width:700px){main{grid-template-columns:1fr}header,section,main{padding:16px}}</style><header><h1>Auditoría de Yoeldis Castillo</h1><p>Comparación local de la misma aplicación y fixtures de prueba. Código inicial: 02d259f; cambios en audit/perfeccionamiento-20261123. No contiene modificaciones ni cuentas de producción.</p><label>Página<select id="scene">${Object.entries(
    scenes,
  )
    .map(([value, label]) => `<option value="${value}">${label}</option>`)
    .join(
      "",
    )}</select></label><label>Pantalla<select id="size">${sizes.map((size) => `<option${size === "375x812" ? " selected" : ""}>${size}</option>`).join("")}</select></label></header><main>${["before", "after"].map((phase) => `<figure><figcaption>${phase === "before" ? "Antes" : "Después"}</figcaption><img id="${phase}" alt="Captura ${phase === "before" ? "anterior" : "posterior"}"><p id="${phase}-missing" hidden>Sin captura comparable para este estado.</p></figure>`).join("")}</main><section><h2>Rendimiento de laboratorio</h2><p>Misma máquina y backend local, Lighthouse móvil con ralentización simulada; el perfil de escritorio usa el preset oficial desktop. Se realizaron tres muestras intercaladas por versión y perfil, con Chrome nuevo por muestra; las cifras corresponden a la muestra con LCP mediano. No son métricas de usuarios reales. TBT no equivale a INP. INP no se certificó.</p><div class="table"><table><thead><tr><th>Perfil</th><th>Performance</th><th>LCP</th><th>CLS</th><th>TBT</th></tr></thead><tbody>${metricRows}</tbody></table></div><p>Capturas: ${phases.before.files.length} antes / ${phases.after.files.length} después.</p><p>${["before", "after"].flatMap((phase) => ["mobile", "desktop"].map((profile) => `<a href="${phase}/lighthouse-${profile}.html">Lighthouse ${phase}/${profile}</a>`)).join(" · ")}</p><h2>Estados adicionales</h2><ul>${phases.after.files
    .filter((file) => file.startsWith("states/"))
    .map((file) => `<li><a href="after/${file}">${file.slice(7, -4)}</a></li>`)
    .join(
      "",
    )}</ul><p>text200 amplía el texto al 200 %; reflow200/reflow400 comprueban anchos CSS equivalentes al zoom. No se presentan como una medición del control de zoom nativo de todos los navegadores.</p></section><script>const files=${JSON.stringify(Object.fromEntries(Object.entries(phases).map(([key, value]) => [key, value.files])))};const scene=document.getElementById('scene'),size=document.getElementById('size');function update(){for(const phase of ['before','after']){const img=document.getElementById(phase),file=size.value+'/'+scene.value+'.png',present=files[phase].includes(file);img.hidden=!present;document.getElementById(phase+'-missing').hidden=present;if(present)img.src=phase+'/'+file}}scene.addEventListener('change',update);size.addEventListener('change',update);update();</script></html>`,
  "utf8",
);
console.log("Informe: .qa/final-audit/report.html");
