import { access, writeFile } from "node:fs/promises";

const widths = [320, 375, 430, 768, 1024, 1366, 1440, 1920];
const scenes = {
  inicio: "Inicio",
  hero: "Hero de inicio",
  libros: "Libros",
  articulos: "Artículos",
  biografia: "Biografía",
  contacto: "Contacto",
};

// Only publish the report after every current screenshot is present.
await Promise.all(
  widths.flatMap((width) =>
    Object.keys(scenes).map((scene) =>
      access(`.qa/visual/${width}/${scene}.png`),
    ),
  ),
);

await writeFile(
  ".qa/visual/report.html",
  `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Revisión visual — Yoeldis Castillo</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font: 16px/1.5 system-ui, sans-serif; color: #f8f3ea; background: #21150e; }
    header { padding: 20px 24px; border-bottom: 1px solid #946d3b; }
    h1 { margin: 0 0 8px; font-size: 24px; }
    p { margin: 0 0 16px; }
    label { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: 0 20px 8px 0; }
    select { font: inherit; padding: 8px; }
    main { overflow: auto; padding: 24px; }
    figure { margin: 0 auto; }
    figcaption { margin-bottom: 12px; }
    img { display: block; max-width: none; height: auto; border: 1px solid #946d3b; }
  </style>
</head>
<body>
  <header>
    <h1>Revisión visual del sitio actual</h1>
    <p>Capturas locales con datos de prueba. Cada imagen conserva el ancho real de su pantalla.</p>
    <label>Página <select id="scene">${Object.entries(scenes)
      .map(([value, label]) => `<option value="${value}">${label}</option>`)
      .join("")}</select></label>
    <label>Ancho <select id="width">${widths.map((width) => `<option value="${width}"${width === 1440 ? " selected" : ""}>${width} px</option>`).join("")}</select></label>
  </header>
  <main>
    <figure>
      <figcaption id="caption" aria-live="polite"></figcaption>
      <img id="capture" alt="">
    </figure>
  </main>
  <script>
    const scene = document.getElementById('scene');
    const width = document.getElementById('width');
    const capture = document.getElementById('capture');
    const caption = document.getElementById('caption');
    function update() {
      const label = scene.selectedOptions[0].textContent + ' · ' + width.value + ' px';
      capture.src = width.value + '/' + scene.value + '.png';
      capture.alt = 'Captura de ' + label;
      caption.textContent = label;
      capture.closest('figure').style.width = width.value + 'px';
    }
    scene.addEventListener('change', update);
    width.addEventListener('change', update);
    update();
  </script>
</body>
</html>`,
  "utf8",
);
console.log(
  "Informe visual actual: .qa/visual/report.html (8 anchos, 5 páginas y hero).",
);
