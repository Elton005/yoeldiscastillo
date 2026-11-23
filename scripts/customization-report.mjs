import { mkdir, copyFile, writeFile } from "node:fs/promises";
const folder = ".qa/customization";
await mkdir(folder, { recursive: true });
for (const viewport of ["desktop", "tablet", "mobile"]) {
  for (const scene of ["home", "custom-home", "custom-admin"])
    await copyFile(`test-results/${scene}-${viewport}.png`, `${folder}/${scene}-${viewport}.png`);
  await copyFile(`.qa/visual/after/${viewport}/inicio-react.png`, `${folder}/previous-home-${viewport}.png`);
}
await writeFile(`${folder}/report.html`, `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Panel y logotipo compacto — Yoeldis Castillo</title>
<style>body{font:16px/1.6 system-ui;margin:24px;color:#2a1f1a;background:#faf8f4}h1{font-size:26px}select{font:inherit;padding:8px;margin:8px 16px 16px 0}main{display:grid;grid-template-columns:1fr 1fr;gap:20px}figure{margin:0}img{display:block;max-width:100%;border:1px solid #d4b896}figcaption{font-weight:600;margin-bottom:8px}small{display:block;margin-bottom:20px}@media(max-width:760px){main{grid-template-columns:1fr}}</style>
<h1>Panel y logotipo compacto</h1><p>El logotipo original se conserva completo, con marco compacto de 320 px. El panel permite editar textos, imágenes, formato, contacto y redes, previsualizar y publicar con control de revisiones.</p>
<small>Capturas locales del 22 de noviembre de 2026. Los ejemplos de personalización y login utilizan el backend aislado de pruebas. No se escribieron datos ni políticas en Supabase de producción. La imagen anterior procede de la comparación de fidelidad previa.</small>
<label>Resolución <select id="viewport"><option value="desktop">Escritorio 1440 px</option><option value="tablet">Tableta 820 px</option><option value="mobile">Móvil 390 px</option></select></label>
<label>Vista <select id="scene"><option value="home">Inicio: antes y ahora</option><option value="custom-admin">Panel de personalización</option><option value="custom-home">Ejemplo de edición guardada</option></select></label>
<main><figure id="old"><figcaption>Antes del ajuste solicitado</figcaption><img id="before" alt="Inicio antes del formato compacto"></figure><figure><figcaption id="caption">Inicio actual con valores iniciales</figcaption><img id="current" alt="Captura de la interfaz actual"></figure></main>
<script>const viewport=document.querySelector('#viewport'),scene=document.querySelector('#scene');function show(){document.querySelector('#old').hidden=scene.value!=='home';document.querySelector('main').style.gridTemplateColumns=scene.value==='home'&&innerWidth>760?'1fr 1fr':'1fr';document.querySelector('#before').src='previous-home-'+viewport.value+'.png';document.querySelector('#current').src=scene.value+'-'+viewport.value+'.png';document.querySelector('#caption').textContent=scene.value==='home'?'Inicio actual con valores iniciales':scene.value==='custom-admin'?'Página web: formulario del panel':'Ejemplo de publicación local: título y formato circular de 260 px';}viewport.onchange=scene.onchange=show;show();</script></html>`, "utf8");
console.log("Informe generado en .qa/customization/report.html");
