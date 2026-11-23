# Refinamiento visual definitivo

Petición del 22 de noviembre de 2026. Trabajo sobre la implementación React existente y la misma rama de migración, sin publicar ni modificar Supabase remoto. Esta intervención sustituye la presentación de escritorio de la etapa anterior; su evidencia sigue disponible en `HERO.md` como contexto histórico.

## Retrato y composición

Se utiliza el **nuevo recurso sentado suministrado por el usuario**, con sillón y libro, a partir de 1366 px. Se conserva exactamente su pose y contenido, sin generación ni retoque facial adicional. Tableta y móvil mantienen la fotografía de pie anterior y el orden foto → etiqueta → título → descripción → botones. La guía proporcionada define tableta hasta 1365 px; se amplió a ese umbral la composición vertical que ya existía.

El PNG sentado mide **1122 × 1402 px**, tiene canal alfa real y **430.295 píxeles totalmente transparentes**. No se elimina un supuesto fondo negro: el negro visible en ciertos visores representa transparencia. Se conserva el original intacto en `assets/refinement-originals/author-seated.png`, junto a las dos referencias.

`scripts/prepare-seated-portrait.mjs` exporta WebP a 560, 840 y 1122 px, aproximadamente 81, 160 y 250 KB. El manifiesto está en `public/img/hero/seated-manifest.json`. El `<picture>` selecciona una sola variante adecuada: escritorio descarga la imagen sentada; tableta/móvil descargan la imagen de pie. La prueba de navegador comprueba que no se solicitan ambas familias de retratos en la misma carga.

Biblioteca, retrato, máscaras, textos y CTA siguen siendo capas independientes. La distribución horizontal conserva 48/52. El retrato se alinea abajo, mantiene la cabeza bajo la cabecera y no invade el texto. Se retiró la sombra artificial de la imagen en escritorio y se suavizó mediante CSS el borde izquierdo del sillón que alcanzaba el límite del lienzo original. No se modificaron los píxeles del rostro para corregir esa integración.

## Sistema visual

Se conservan Cinzel, Montserrat, Georgia y la paleta marrón/dorada existente. Los títulos públicos tienen peso, tracking e interlineado coherentes; los párrafos reducen densidad visual y mejoran su interlineado. El título inicial conserva dos líneas en las ocho anchuras verificadas, incluidos 320 px. No se sustituyen fuentes por otra biblioteca ni se agregan dependencias.

`src/styles/refinements.css` se limita a `.site-public-shell`: contornos de 1 px, radios compartidos de 8 px en tarjetas, padding consistente, sombras moderadas, zoom/hover discretos y botones con áreas táctiles de al menos 44 px. Los controles administrativos y modales de autenticación mantienen su presentación. Se conserva el foco visible y se anulan transformaciones de las tarjetas cuando se solicita movimiento reducido.

La cabecera mantiene YC, nombre, navegación, redes, login y menú móvil. Solo se afinan su contorno y espaciado de enlaces; la medición de altura existente sigue evitando solapamientos del hero.

## Footer

`src/components/SiteFooter.tsx` reemplaza el pie público anterior por una composición de identidad del autor, navegación y contacto. La descripción procede de `homeDescription`; la cita, el correo y las redes mantienen sus ajustes administrables. Solo aparecen perfiles sociales con URL válida configurada. El correo conserva el destino real existente, y las cinco rutas del pie corresponden a páginas del proyecto.

El pie inferior muestra **© [año generado en cada render] Yoeldis Castillo Quiala · Todos los derechos reservados.** y **Desarrollado por Elton Olivares**. No se añadió enlace al desarrollador porque no hay un portafolio confirmado. La firma es texto legible y discreto, sin emojis ni un logotipo que compita con el autor. El panel conserva su pie administrativo anterior.

## Compatibilidad de datos

No se añadieron campos, tablas, migraciones, políticas, usuarios ni llamadas administrativas nuevas. Los servicios de Supabase, permisos y CRUD no cambian. La alternancia del recurso sentado se aplica al retrato inicial incluido con la web; si el administrador configura otra URL en «Retrato de inicio», se respeta su recurso personalizado en ambas presentaciones. Textos, fondo, destinos de CTA, tamaño e integración siguen consumiendo los ajustes actuales.

La activación remota del panel y las migraciones preparadas en etapas previas siguen pendientes de staging autorizado. Esta intervención visual no certifica Auth, Storage o RLS reales.

## Capturas y pruebas

Antes de modificar la interfaz se capturaron Inicio, Libros, Artículos, Biografía y Contacto en **320, 375, 430, 768, 1024, 1366, 1440 y 1920 px**. Se repite la misma matriz después del cambio: **40 pares de páginas completas**, además de ocho pares centrados en el hero. Ambas etapas usan los mismos registros públicos de referencia, servidos por un backend local aislado. Las pruebas CRUD se ejecutan por separado con fixtures locales; no escriben en producción.

```powershell
node scripts/prepare-seated-portrait.mjs
npx playwright test --config playwright.refinement.config.ts
node scripts/refinement-report.mjs
$env:QA_VITE_PORT='5177'
npm run test:e2e
npm test
npm run build
```

Para capturar el estado inicial en una copia anterior al cambio, establecer `REFINEMENT_PHASE=before` antes del comando visual. El informe interactivo está en `.qa/refinement/report.html`: permite seleccionar página y resolución y abrir cada captura completa. El informe compara también las referencias proporcionadas. Se revisan rostro completo, proporción, fuentes cargadas, separación entre imagen y texto, título de dos líneas, imágenes cargadas, rutas, footer, contacto, año y ausencia de scroll horizontal.

El proyecto no tiene script de lint ni configuración de linter; no se añadió uno por un ajuste visual. Se ejecuta TypeScript estricto con el build y se mantienen las pruebas disponibles. Los originales recibidos y las imágenes anteriores permanecen intactos. Los resultados finales se consignan en `TESTING.md`.

Resultados finales: **43/43 pruebas unitarias/SQL**, **30/30 casos E2E** y **8/8 recorridos visuales** (cinco páginas por anchura, 40 pares antes/después). La compilación de cliente/SSR y el escáner de claves terminaron correctamente. Se verificó SHA-256 idéntico para las tres nuevas imágenes recibidas y las diez imágenes originales del inventario base. No hubo escrituras remotas ni despliegue.
