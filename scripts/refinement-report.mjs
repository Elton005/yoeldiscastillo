import { copyFile, writeFile } from "node:fs/promises";
await copyFile(
  "assets/refinement-originals/responsive-reference.png",
  ".qa/refinement/responsive-reference.png",
);
await copyFile(
  "assets/refinement-originals/desktop-reference.png",
  ".qa/refinement/desktop-reference.png",
);
const widths = [320, 375, 430, 768, 1024, 1366, 1440, 1920];
const pages = [
  ["hero", "Hero"],
  ["inicio", "Inicio completo y footer"],
  ["libros", "Libros"],
  ["articulos", "Artículos"],
  ["biografia", "Biografía"],
  ["contacto", "Contacto"],
];
await writeFile(
  ".qa/refinement/report.html",
  `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Refinamiento visual — Yoeldis Castillo</title><style>body{font:16px/1.6 system-ui;background:#211710;color:#f8f3ea;margin:24px}h1{font:32px Georgia,serif;color:#dcc29e}label{display:inline-block;margin-right:24px}select{font:inherit;padding:8px;margin:8px 0 20px}main{display:grid;grid-template-columns:1fr 1fr;gap:20px}figure{margin:0;min-width:0}figcaption{margin-bottom:12px;color:#dcc29e}.viewport{max-height:80vh;overflow:auto;border:1px solid #997554;background:#2a1f1a}img{display:block;width:100%;height:auto}small{display:block;color:#dcc29e;max-width:100ch;margin-bottom:20px}details{margin-top:32px}details img{max-width:1200px;margin:20px auto}a{color:#dcc29e}@media(max-width:800px){main{grid-template-columns:1fr}}</style><h1>Refinamiento visual de Yoeldis Castillo</h1><small>Autor sentado desde 1366 px; foto de pie y estructura vertical hasta 1365 px. Tipografía, botones, tarjetas y footer refinados. Comparación con los mismos datos públicos de referencia en ambas etapas. Capturas locales; sin escrituras en Supabase remoto.</small><label>Anchura <select id="width">${widths.map((width) => `<option ${width === 1440 ? "selected" : ""}>${width}</option>`).join("")}</select></label><label>Página <select id="page">${pages.map(([value, label]) => `<option value="${value}">${label}</option>`).join("")}</select></label><main>${["before", "after"].map((stage) => `<figure><figcaption>${stage === "before" ? "Antes" : "Después"} · <a id="link-${stage}" target="_blank">Abrir captura</a></figcaption><div class="viewport"><img id="${stage}" alt="Captura ${stage === "before" ? "anterior" : "posterior"}"></div></figure>`).join("")}</main><details><summary>Referencias proporcionadas</summary><img src="responsive-reference.png" alt="Guía responsive proporcionada"><img src="desktop-reference.png" alt="Referencia de escritorio proporcionada"></details><script>const width=document.querySelector('#width'),page=document.querySelector('#page');function update(){for(const stage of ['before','after']){const url=stage+'/'+width.value+'/'+page.value+'.png';document.querySelector('#'+stage).src=url;document.querySelector('#link-'+stage).href=url;}document.querySelectorAll('.viewport').forEach(el=>el.scrollTop=0);}width.onchange=page.onchange=update;update();</script></html>`,
  "utf8",
);
console.log("Informe generado en .qa/refinement/report.html");
