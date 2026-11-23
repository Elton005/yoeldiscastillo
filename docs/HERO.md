# Hero definitivo de Yoeldis Castillo

Esta página documenta la primera implementación por capas. La petición posterior del autor sentado, el umbral responsive de 1366 px y el footer nuevo se documentan en [VISUAL_REFINEMENT.md](VISUAL_REFINEMENT.md). Esos cambios posteriores sustituyen la composición de escritorio descrita aquí; el retrato de pie se conserva para tableta/móvil.

Implementación local del diseño seleccionado el 22 de noviembre de 2026, sobre la misma rama de migración. No se publicaron cambios ni se escribieron datos/políticas en Supabase remoto.

## Referencias y autenticidad

Se utilizan la biblioteca vacía y la fotografía formal auténtica proporcionadas. La guía y el retrato sentado se conservan como referencias de composición, sin convertirlos en fotografía real del autor ni usar una captura del hero como fondo. La foto auténtica mide **1141 × 1379 px**: conserva su pose de pie, gafas, traje, expresión y proporciones; no se inventan manos, libro o postura sentada.

Los cuatro archivos entregados están copiados intactos en `assets/hero-originals/`. También permanecen intactas las fotografías originales previas del repositorio. El respaldo de la versión anterior del hero está en `backups/hero-before-20261122/`, fuera de Git.

Se ensayó una extracción de fondo con la herramienta integrada de imágenes. Su salida se conserva como `assets/hero-originals/extraction-reference.png`, **fuera del producto publicado**. Para garantizar que ningún píxel de rostro/cuerpo generado sustituya la foto real, el recurso final se construye con los RGB originales y una máscara técnica del fondo blanco contiguo, con suavizado de alfa. `scripts/prepare-hero.mjs` comprueba **cero componentes RGB modificados** en el PNG maestro, antes de la compresión WebP. La compresión de las variantes es técnica, no retoque facial.

El prompt de esa extracción de referencia fue:

> Use case: background-extraction. Edit target: the supplied authentic portrait photograph, 1142 by 1380 pixels. Remove ONLY the white background to transparent alpha. Keep the entire person exactly as in the original: exact framing, size, pixel geometry, face, wrinkles, hair, eyeglasses, expression, skin texture, suit, white shirt, blue tie, torso and pose. Do not redraw, retouch, beautify, recolor, relight, move or resize the subject. Do not invent any body parts or seated pose, hand, chair or book. Preserve portrait canvas and silhouette alignment to the source, with clean soft antialiased hair edges and actual transparent background. No background, no text, no shadow. This is precision photographic background removal for a website, identity and original pixel geometry must remain unchanged.

La estimación inicial de dimensiones en ese prompt se corrigió al inspeccionar los metadatos reales. No se utiliza la salida generada para representar al autor en la web.

## Capas y adaptación

`src/components/HomeHero.tsx` combina un `<picture>` de biblioteca, el retrato transparente, degradados CSS, título y descripción reales, y enlaces funcionales. `src/styles/hero.css` contiene únicamente reglas del hero, sin reinterpretar libros, artículos, contacto o administración.

- Escritorio: Grid 48/52, rostro a la izquierda y contenido sobre el lado derecho oscurecido. La altura crece si el contenido lo requiere.
- Tableta: dos columnas a 1024 px; una columna a 768 px cuando el texto y la foto ya no caben con la anchura legible elegida. La consulta de contenedor usa el espacio efectivo, también dentro de la vista previa del panel.
- Móvil: retrato, etiqueta, título, descripción y botones en columna. Los CTA ocupan el ancho disponible y tienen al menos 48 px de altura.
- La cabecera conserva su diseño; un `ResizeObserver` comunica su altura real al hero para que el retrato no quede detrás cuando la navegación ocupa dos líneas.

La fotografía usa `object-fit: contain`, sin recortar el rostro ni deformarlo. La máscara inferior integra el borde del torso con el escenario. No se añaden animaciones de entrada que oculten el LCP; se conserva el soporte global de movimiento reducido.

## Recursos y rendimiento

`public/img/hero/` contiene el PNG maestro con transparencia y variantes WebP del retrato a 480, 768 y 1141 px. Las variantes pesan aproximadamente **28, 53 y 77 KB**. La biblioteca tiene versiones de 1024/1672 px y encuadres móviles de 640/960 px, aproximadamente **31–68 KB** según el archivo.

Los `srcset`, `sizes` y fuentes móviles evitan descargar la variante mayor en teléfonos. El retrato es eager y de prioridad alta; biblioteca y retrato llevan dimensiones intrínsecas. Los recortes móviles solo afectan a la biblioteca vacía. El manifiesto técnico está en `public/img/hero/manifest.json`.

## Edición y compatibilidad

Se mantienen los campos y el servicio de ajustes existentes. Se añade edición del fondo y destinos de ambos botones. El tamaño ahora corresponde a la altura de referencia del retrato en escritorio, de 220 a 760 px; móvil ajusta su escala automáticamente. Las variantes anteriores de integración se conservan como opciones, con retrato completo por defecto.

El antiguo valor inicial `/img/logo-cerebro.jpg` se adapta en lectura al retrato aprobado, sin escribir en la base de datos ni sustituir una URL de fotografía personalizada. Si los ajustes todavía no están activados, los valores iniciales del código muestran el nuevo hero.

La migración **`202611220005_hero_settings.sql`**, para revisar y aplicar primero en staging, amplía la validación de la RPC existente: tres URL nuevas y el rango del retrato. No crea tablas/columnas, no cambia políticas ni modifica registros. Conserva autorización, historial, cuota y control de revisiones. Sin esa ampliación en el backend, el nuevo formulario no debe desplegarse para publicar esos campos. No se ha ejecutado remotamente.

## Verificación reproducible

```powershell
node scripts/prepare-hero.mjs
npx playwright test --config playwright.hero.config.ts
node scripts/hero-report.mjs
$env:QA_VITE_PORT='5177' # Si la vista previa del usuario ocupa 5173.
npm run test:e2e
npm test
npm run build
```

Las capturas de **320, 375, 430, 768, 1024, 1440 y 1920 px** se guardan en `.qa/hero/`. El informe `.qa/hero/report.html` muestra la referencia y la implementación por anchura. Las medidas comprueban imágenes cargadas, proporción, rostro bajo la cabecera, no solapamiento entre columnas, título y CTA completos, anchura táctil y ausencia de scroll horizontal. También se navega por ambos botones. La revisión humana de capturas complementa esas aserciones: no equivale a una certificación de coincidencia píxel a píxel, especialmente por la prioridad de la fotografía auténtica.

Los recorridos de administración, publicación y SSR utilizan el backend local aislado. La lectura/escritura administrativa y OAuth/Storage reales siguen pendientes de staging autorizado; esta intervención no los certifica ni los activa en producción.

Resultados: **43/43 pruebas unitarias/SQL, 30/30 casos E2E en tres resoluciones y 7/7 anchuras del hero**. Build de cliente/SSR y escáner de claves correctos. La primera ejecución funcional se interrumpió al detectar que el backend de pruebas todavía rechazaba por CORS el puerto alternativo 5177; se añadió únicamente ese origen local al fixture y la repetición completa pasó. No se modificó CORS de producción.
