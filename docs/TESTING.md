# Pruebas y criterios de aceptación

Fecha: 22 de noviembre de 2026. Validación local, sin peticiones de escritura ni pruebas intrusivas contra producción.

## Comandos

```powershell
npm ci
npm run typecheck
npm test
npm run test:e2e
npm run test:visual
node scripts/visual-report.mjs
npm run build
npm audit
npm run test:permissions
```

Playwright inicia automáticamente un backend de fixtures solo en loopback, Vite y una compilación SSR aislada en `.qa/`. El backend de fixtures **no demuestra RLS**; solo prueba la experiencia de usuario y los contratos HTTP. Los datos de prueba no se importan en la aplicación ni se incluyen en `dist/`. Los binarios Chromium utilizados pertenecen a Playwright; si no están instalados, ejecutar `npx playwright install chromium` en la máquina de pruebas.

`npm test` ejecuta PostgreSQL real embebido mediante PGlite sobre una base vacía con tablas de contrato inferido. Ejecuta la migración íntegra, cambia a roles anon/authenticated y comprueba los permisos de PostgreSQL, incluso con políticas legacy inicialmente abiertas. No reemplaza el PostgreSQL de Supabase ni conecta con producción. No verifica Auth/PostgREST/Storage reales ni concurrencia entre varias conexiones remotas.

## Cobertura

| Criterio | Verificación local | Verificación adicional necesaria |
| --- | --- | --- |
| Rutas públicas y responsive | Playwright a 1440, 820 y 390 px, sin desbordamiento horizontal | Safari/Firefox y dispositivos reales |
| Identidad y contenido existente | CSS y originales preservados; 24 pares visuales antes/después, etapa final con contenido público real | Revisión del propietario y futuros registros |
| Lectura pública y borradores | Lectura real anónima mediante servicios React: 2 libros, 2 artículos y 2 destacados; tests SQL anon/lector y SSR | Borradores y permisos con cuentas de staging |
| Login/logout | Flujo de contraseña con test double y protección de rutas | Google OAuth, SMTP, registro, expiración/refresh reales |
| Libros/artículos/destacados | Crear, vista previa, editar, recargar, upload, orden y eliminar en tres viewports; cambios reflejados en otra pestaña pública; SQL autorizado | CRUD persistido en PostgreSQL de staging |
| Roles | SQL rechaza autopromoción y editor, protege último admin activo incluido respaldo suspendido | Concurrencia, importación verificada de miembros y UI con cuentas reales |
| Portadas | UI invoca upload y muestra imagen; firma binaria compartida; SQL bloquea escritura directa | Ejecutar función Edge real, cuota, CORS y Storage real |
| HTML antiguo y XSS | Texto/tablas permitidas, scripts/handlers/iframe/SVG retirados; modal con Escape/foco; HTML publicado real inspeccionado | Nuevas publicaciones y formatos no observados |
| Errores y vacíos | Respuesta 503 del test double y reintento, lista vacía explícita | Corte de red y timeouts reales |
| SEO | HTML SSR, título/canonical, sitemap dinámico, 404, redirección, lectura sin JS | Search Console, crawler y preview Vercel autorizado |
| Accesibilidad básica | Landmarks, labels, foco visible, skip link por teclado y menú móvil | Auditoría WCAG completa con lector de pantalla |
| Seguridad de bundle | Escáner de cliente y servidor, sin claves privilegiadas detectadas | Revisión de secretos del historial y del entorno de hosting |
| Cabeceras Vercel | Configuración preparada y revisión estática | Comprobar cabeceras efectivas y CSP en preview remoto |

## Resultados de la última ejecución

| Comprobación | Resultado |
| --- | --- |
| `npm run typecheck` | Correcto |
| `npm test` | 43/43 pruebas en siete archivos: incluye compatibilidad del hero, conservación del borrador, ajustes, RPC ampliada, revisiones, historial privado y personalización SSR, además de políticas PostgreSQL, esquema original sin visible, orden y sesiones |
| `npm run test:e2e` | 30/30 casos aprobados en Chromium: diez por resolución, con CRUD y personalización |
| Comparación de fidelidad anterior (`npm run test:visual`) | 24/24 comparaciones original/React en la corrección anterior; precede al cambio de logotipo compacto solicitado después |
| Hero definitivo (`playwright.hero.config.ts`) | 7/7 anchuras: 320, 375, 430, 768, 1024, 1440 y 1920 px, con capturas y navegación por ambos CTA |
| Servicios React contra API pública real | Lectura GET correcta de 2 libros, 2 artículos y 2 destacados; ausencia de libros.visible detectada correctamente; sin operaciones privilegiadas |
| `npm run build` | Cliente y SSR compilados; escáner de ambos bundles correcto |
| `npm audit` | Cero vulnerabilidades conocidas en el árbol instalado |
| `deno check --no-config --no-lock supabase/functions/upload-editorial-image/index.ts` | Correcto mediante Deno ejecutado con npm exec; sin desplegar ni ejecutar la función contra Supabase |
| SHA-256 de originales | 10/10 imágenes originales idénticas al commit base |
| `git diff --check` | Sin errores de whitespace; aviso de normalización LF/CRLF de Git en Windows |
| `npm run test:permissions` | NO EJECUTADO: falta configuración autorizada de staging; salida no exitosa esperada |

Las capturas funcionales se guardan en `test-results/` y las visuales en `.qa/visual/`, ambos ignorados por Git. El informe `.qa/visual/report.html` permite comparar las ocho escenas en las tres resoluciones; las páginas públicas también cuentan con capturas completas. La etapa previa usa fixtures, mientras que la etapa final usa un snapshot de contenido real obtenido por lectura pública. El panel y su autenticación en estas capturas siguen utilizando el backend local aislado. Las medidas de píxeles son diagnósticos de las capturas, no una certificación automática de fidelidad. Se espera la carga de imágenes y se neutraliza el puntero antes de capturar.

Se corrigió una regresión detectada por el CRUD entre pestañas: la renovación de sesión del mismo usuario desmontaba el panel y perdía la sección/formulario. Las pruebas ahora comprueban que conserva el estado, vuelve a validar permisos y descarta verificaciones obsoletas después del logout. La compilación puede mostrar avisos de comentarios de anotación de Zod; el build y el escáner de claves terminan correctamente.

La prueba de staging se ha invocado sin credenciales y se detuvo con estado **NO EJECUTADO**, devolviendo código de error. No se contabiliza como una prueba pasada. Configurar las variables locales seguras según `SUPABASE_SETUP.md` y repetirla en el entorno autorizado.

En la etapa de corrección anterior se repitieron la compilación y las 33 pruebas unitarias después del ajuste de destinos de enlaces. Tras recolocar el cierre del modal móvil se repitieron la compilación y seis comparaciones de acceso público/administrativo: 6/6 correctas. Las fotografías originales no se editaron; sus diez hashes SHA-256 coinciden con el inventario del commit base, comprobados de nuevo en esta actualización.

## Actualización: panel de personalización y logotipo compacto

La suite incorpora dos recorridos por resolución: editar/subir/previsualizar/guardar ajustes y verlos en la página pública/SSR tras recarga; y rechazar una revisión obsoleta sin perder el borrador, conservando el contenido inicial cuando falta la tabla. Las nuevas pruebas SQL verifican permisos directos/RPC, editor autorizado, datos inválidos, historial privado y control de revisiones. Los tests unitarios también verifican que permisos/red no se confunden con una tabla ausente y que textos editables no inyectan scripts en SSR.

Se revisaron visualmente inicio compacto y formulario en escritorio, tableta y móvil. `node scripts/customization-report.mjs` reúne las capturas nuevas y el inicio anterior en `.qa/customization/report.html`. Los ejemplos editados solo se guardaron en el backend local de tests. El informe de fidelidad anterior se conserva como evidencia histórica, sin presentarlo como una captura de la última variante del logotipo.

La primera ejecución ampliada terminó 29/30: un recorrido móvil perdió la sección activa mientras se formateaban módulos de React con el servidor Vite abierto. La repetición completa con las fuentes estables terminó **30/30**, incluido ese CRUD. La compilación de cliente/SSR y el escáner de claves también terminaron correctamente.

Después de reducir la altura del marco y ajustar la recarga desde servidor se repitieron los nueve casos de personalización/navegación: **9/9** en las tres resoluciones. Se añadieron dos pruebas de componente para conservar el formulario si falla la recarga y para cancelar el descarte sin perder texto; la suite unitaria/SQL final terminó **42/42**. El último control de tipos corrigió dos opciones de selector exclusivas de Playwright utilizadas por error en esos tests de Testing Library; no afectaban al runtime.

## Última intervención: hero definitivo

Se repitieron 43 pruebas unitarias/SQL y los 30 casos funcionales completos después de incorporar el retrato auténtico, la biblioteca, los campos nuevos y la ampliación de la RPC. Las siete anchuras del hero pasan con imágenes cargadas, rostro por debajo de la cabecera, proporción intacta, columnas sin solapamiento, título/CTA completos y enlaces funcionales. Se corrigió el solapamiento de la cabecera a 1024 px, detectado por revisión visual. El informe actual es `.qa/hero/report.html`; los informes de logotipo compacto y fidelidad anterior permanecen como etapas históricas.

El puerto 5173 estaba ocupado por una vista previa ajena a las pruebas y se conservó. El entorno de QA se ejecutó en 5177; el primer intento funcional se interrumpió por CORS del fixture local, se habilitó ese origen exacto en el doble de pruebas y la repetición completa terminó 30/30. No se modificó CORS remoto. Tras el ajuste tipográfico final de CTA se repitieron las siete anchuras y la compilación; los dos tests del editor también pasaron con sus etiquetas de imagen actualizadas.

## Última actualización: refinamiento editorial y footer

Se capturó antes/después Inicio, Libros, Artículos, Biografía y Contacto en ocho anchuras (320, 375, 430, 768, 1024, 1366, 1440, 1920): 40 pares de página completa, más ocho pares del hero. La matriz final pasa 8/8 casos y comprueba no solapamiento/desbordamiento, título de dos líneas, proporciones, año/firma/contacto del footer y ausencia de descarga de ambas familias de retratos. El informe actual está en `.qa/refinement/report.html`; los anteriores son históricos.

`npm test` conserva 43/43 pruebas aprobadas. `npm run build` finaliza con TypeScript estricto, SSR y escáner de claves correctos. El proyecto no dispone de script/configuración de lint; no se presenta esa comprobación como ejecutada. La repetición completa de administración, personalización, navegación, seguridad de HTML y SSR terminó **30/30** con el backend local aislado. El resultado final figura en `VISUAL_REFINEMENT.md`.

## Aceptación pendiente del propietario antes de publicar

Comparar esquema y políticas reales con `inspection.sql`; respaldar datos/configuración; probar migración y reversión en staging; importar solo miembros legítimos; desplegar Edge allí; probar carga válida y rechazos; recorrer catálogo y HTML antiguos; confirmar Google/SMTP; probar persistencia y permisos por API; revisar privacidad del bucket y destinos APK; probar Vercel SSR/rewrites/CSP con su función empaquetada. Solo entonces coordinar el corte y solicitar autorización para producción.
