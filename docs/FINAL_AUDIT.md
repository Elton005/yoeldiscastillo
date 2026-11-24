# Auditoría integral — Yoeldis Castillo Quiala

Fecha de cierre: 24 de noviembre de 2026. Cambios locales; no se publicó ni se modificó el backend remoto.

## Fuente y punto de retorno

La inspección inicial confirmó el commit `02d259fe98aee2de77706ce43a6da7ffef27ac0d` tanto en el repositorio como en el despliegue Production de Vercel. La página respondía 200 y cargaba dos libros, dos artículos y dos destacados desde el backend público, sin excepciones JavaScript. GitHub Pages tenía un despliegue fallido independiente; no se cambiaron sus variables ni sus ajustes.

Se trabaja en `audit/perfeccionamiento-20261123`, con `return/pre-audit-20261123` como punto de retorno. Se conserva la aplicación React/Vite estática; no hay migración de framework ni función SSR en producción.

## Hallazgos y correcciones

| Nivel | Hallazgo comprobado                                                                     | Resultado                                                                                                              |
| ----- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Alto  | HTML inicial sin título, metadatos ni contenido; `/sitemap.xml` devolvía HTML de Inicio | Prerender durante el build, metadatos por ruta, JSON-LD, sitemap XML real y robots coherente                           |
| Alto  | LCP de laboratorio superior al objetivo de referencia                                   | Fuentes locales, prioridad del fondo LCP, variante de retrato adecuada y saneador diferido; mediciones completas abajo |
| Medio | Panel con 47 px de desbordamiento a 768 px                                              | Pestañas flexibles, controles y contenido con anchos mínimos corregidos                                                |
| Medio | Etiquetas del editor ocultas y errores sin asociación a campos                          | Etiquetas visibles y `aria-invalid`/`aria-describedby` en publicaciones, personalización, miembros y acceso            |
| Medio | Borradores perdidos al recargar/cerrar sesión sin aviso                                 | Guardia compartida de cambios sin guardar, confirmación antes del logout y pruebas de cancelación/conservación         |
| Medio | Menú de pantallas intermedias y ventanas cortas poco robusto                            | Breakpoint coherente, altura basada en el header real, scroll interno, foco al abrir y Escape con retorno del foco     |
| Medio | Trampa de foco de modales ignoraba select/textarea y dejaba el fondo interactivo        | Controles incluidos; ramas de fondo inert y restauración al cerrar                                                     |
| Medio | El saneador añadía lazy loading, pero su allowlist lo eliminaba                         | `loading=lazy` y `decoding=async` conservados, sin permitir handlers ni protocolos ejecutables                         |
| Medio | Retrato de 561 px descargaba variante de 840 px                                         | Nueva variante de 576 px desde el mismo original: 85.452 B frente a 160.448 B                                          |
| Medio | Inicio cargaba el saneador HTML sin mostrar contenido enriquecido                       | Renderizador, extractos HTML y saneado al guardar se cargan cuando hacen falta; se mantiene el mismo saneador          |
| Medio | Prueba de permisos exigía la columna opcional `libros.visible`                          | Detección de compatibilidad; sigue probando el contrato cuando la columna no existe                                    |
| Bajo  | Tarjetas sin imagen reservaban una columna vacía                                        | Variante de texto a ancho completo; portadas promocionales de libros con `contain`                                     |
| Bajo  | Contacto en plural, perfiles vacíos y crédito administrativo inconsistente              | Valor inicial «Contacta conmigo», perfiles sin URL omitidos, crédito sobrio y año dinámico                             |
| Bajo  | Canonical apuntaba al alias que redirige a www                                          | Normalización del alias conocido; dominios de Pages y otros prefijos se conservan                                      |

No se identificó un bypass crítico en el código y las políticas locales revisadas. Esto no certifica la configuración de la instancia de producción.

## Identidad y contenido

Se mantienen biblioteca cálida, marrones/dorados, logotipo YC, fotografías y composición aprobada: autor sentado desde 1366 px, retrato vertical antes del texto en pantallas menores. No se editaron rasgos, biografía, títulos de las obras, contactos ni contenidos remotos. Los originales y las variantes existentes conservan sus píxeles; la nueva variante de imagen es únicamente una reducción del mismo recurso.

Cinzel y Montserrat se conservan como familias variables locales. Se comparten tokens de espaciado, radios y bordes; la lectura extensa usa un ancho limitado y jerarquía editorial. Junior Osmany Coronel Durán conserva su sección y contenido propios. Los botones y el menú mantienen las rutas históricas. La firma es «Desarrollado por Elton Olivares» tanto en el sitio como en el panel.

## Responsive y evidencia visual

Se ejecutaron Inicio, Libros, Artículos, Biografía, Contacto, libro individual, artículo individual y panel en:

| Pantalla    | Resultado  |
| ----------- | ---------- |
| 320 × 700   | Comprobada |
| 360 × 800   | Comprobada |
| 375 × 812   | Comprobada |
| 390 × 844   | Comprobada |
| 430 × 932   | Comprobada |
| 768 × 1024  | Comprobada |
| 820 × 1180  | Comprobada |
| 1024 × 768  | Comprobada |
| 1280 × 800  | Comprobada |
| 1366 × 768  | Comprobada |
| 1440 × 900  | Comprobada |
| 1920 × 1080 | Comprobada |

También se ejecutaron horizontal 844 × 390, altura reducida 320 × 256, texto ampliado al 200 % y anchos CSS equivalentes a reflow de 200 %/400 %. No se presentan estos últimos como pruebas del control de zoom nativo de todos los navegadores.

La matriz posterior registra 152 casos, sin desbordamientos, controles recortados, excepciones JavaScript ni infracciones de axe en la muestra analizada. Hay 123 capturas iniciales y 158 posteriores, más 10 capturas de lectura de la producción original. Los estados adicionales incluyen menú, acceso inválido/válido, editor, carga, vacíos, títulos largos y artículo extenso. Los dos enlaces externos de Junior respondieron 200, con redirección a su dominio www. El contacto usa mailto; no se envió correo ni se simuló una confirmación de envío.

Comparador: [antes/después](../.qa/final-audit/report.html). Evidencia por fase, resolución y página en `../.qa/final-audit/before/` y `after/`. Estos artefactos están ignorados por Git para no llenar el repositorio de imágenes de prueba.

## Accesibilidad

Se revisaron foco visible, salto al contenido, Escape, retorno de foco, aislamiento de modales, nombres de controles, errores asociados, imágenes, tamaños táctiles y reflow. Axe ejecutó 16 análisis por fase sobre siete rutas públicas y el panel a 375/1440 px. La muestra final no registra infracciones de las reglas WCAG 2 A/AA, 2.1 AA y 2.2 AA seleccionadas.

Lighthouse y axe son comprobaciones automáticas parciales: no constituyen una certificación WCAG completa ni reemplazan una evaluación con lectores de pantalla y dispositivos reales. Las imágenes de HTML heredado sin descripción se tratan como decorativas mediante `alt` vacío; los autores deben aportar textos alternativos significativos cuando la imagen transmite información.

## Calidad, seguridad y panel

- ESLint real configurado: sin errores.
- TypeScript estricto y arquitectura: 36 módulos usados, sin ciclos ni imports rotos.
- Unitarias/SQL: 64 pruebas aprobadas en 12 archivos, incluida la validación del nombre antes de asignar permisos.
- E2E: **33 pruebas aprobadas en la última ejecución completa**, escritorio/tablet/móvil, incluido conservar/descartar borradores al cerrar sesión. Se ejecutaron sin retries globales.
- Builds: React/Vite y Pages compilados; artefactos aislados con snapshot público de prueba verificados en navegador, sin errores de hidratación.
- Permisos: PostgreSQL local/PGlite ejecuta políticas y roles de prueba. El backend HTTP simula UI, no RLS.
- Dependencias: `npm audit --json`, cero vulnerabilidades reportadas; informe íntegro en `.qa/final-audit/npm-audit.json`.
- El escáner de bundles no detectó claves Supabase privilegiadas; no es un detector universal de secretos.

Se comprobaron CRUD de libros/artículos/destacados, publicación, preview, imágenes, recarga, errores, personalización y conflictos de revisión en el entorno local. La nueva workflow `quality.yml` prepara lint, unitarias, build y pruebas de navegador para pull requests/manual; no despliega y no se ejecutó remotamente durante esta auditoría.

## SEO y publicación estática

Los documentos conocidos incluyen HTML público, título, descripción, canonical, Open Graph y JSON-LD antes de ejecutar JavaScript. El sitemap contiene rutas base e identificadores públicos verificados; las rutas privadas llevan noindex. No se inventan autor ni fecha de publicación para libros sin esos campos.

El build lee únicamente con el cliente público y falla si la conexión configurada no puede entregar un snapshot válido. React hidrata y vuelve a consultar datos al abrir la página. No se añadió una función de renderizado en producción.

El HTML sin JavaScript, las copias de publicaciones y el sitemap son una instantánea del build: **tras altas, retiradas o cambios editoriales relevantes hay que reconstruir/desplegar para renovarlos**. El navegador sí recibe las actualizaciones de Supabase. Las rutas posteriores al build usan fallback CSR; pueden ser soft-404 en Vercel o mantener 404 en Pages. Estos límites se explican en [DEPLOYMENT.md](DEPLOYMENT.md).

La auditoría detectó y corrigió también un fallo del servidor local de preview: devolvía el snapshot de Inicio para detalles sin slash final. `serve-static.mjs` resuelve índices de directorio y MIME/compresión correctamente.

## Rendimiento medido

La tabla definitiva se genera con tres muestras intercaladas por versión/perfil, Chrome nuevo por muestra, mismo backend de prueba y compresión gzip como la observada en Vercel. Móvil usa el preset móvil de Lighthouse y escritorio su preset oficial. Los JSON/HTML de cada muestra quedan en `.qa/final-audit/performance/`; el informe enlaza la muestra con LCP mediano.

| Perfil     | Performance | LCP mediano   | CLS           | TBT         | Rango LCP antes / después |
| ---------- | ----------- | ------------- | ------------- | ----------- | ------------------------- |
| Móvil      | 82 → 88     | 4.40 → 3.96 s | 0.000 → 0.014 | 162 → 64 ms | 4.39–4.43 / 3.95–3.99 s   |
| Escritorio | 98 → 100    | 1.00 → 0.78 s | 0.006 → 0.007 | 0 → 0 ms    | 0.99–1.00 / 0.78–0.82 s   |

Los valores de score, CLS y TBT corresponden a la muestra seleccionada por mediana LCP; los doce informes originales se conservan. Accesibilidad, buenas prácticas y SEO: 100 en la portada en los dos perfiles, sin implicar certificación global. Lighthouse ejecuta JavaScript: ese 100 de SEO no detectaba por sí solo el sitemap defectuoso ni sustituye la inspección HTTP del HTML inicial.

**El objetivo móvil LCP ≤ 2,5 s no se alcanzó en esta simulación.** CLS permanece por debajo de 0,1. Las mejoras son medibles, pero no se declara cumplido un presupuesto que sigue pendiente. El siguiente trabajo justificado por el perfil es reducir la fuente de iconos y separar las validaciones administrativas/SDK y las consultas resumidas del catálogo; hacerlo requiere conservar funcionalidad y medir de nuevo, sin sustituir el saneado por una solución insegura.

Queda como trabajo de rendimiento pendiente reducir el JavaScript inicial y el conjunto de iconos, priorizados por los informes de descarga/código no utilizado. No se certifica INP de usuarios reales: no hubo una campaña RUM/CrUX con datos suficientes. TBT es una métrica de laboratorio distinta de INP. Las cifras locales no garantizan Core Web Vitals de todos los usuarios.

## Pendiente y autorización necesaria

1. **Medio — concurrencia del catálogo:** dos editores pueden sobrescribir el mismo registro. Requiere revisión optimista y RPC transaccional, diseño documentado en [AUDIT_PENDING.md](AUDIT_PENDING.md), seguido de migración autorizada y pruebas de staging.
2. **Staging:** no hay cuentas/configuración dedicadas disponibles. No se probaron OAuth/SMTP, membresías reales, cuotas, RLS, Edge Function ni Storage remotos. No se aplicaron migraciones ni se ejecutaron pruebas intrusivas en producción.
3. **Navegación de borradores:** recarga/cierre, logout y cambios de pestaña del panel tienen avisos. El historial Atrás/Adelante de navegación SPA no incorpora un bloqueador global; su ampliación debe preservar Router y SSR de build.
4. **Contenido multimedia:** la firma inicial de imágenes no equivale a antivirus ni decodificación completa. Los enlaces APK públicos conservan la puerta UI original; una descarga realmente privada necesita almacenamiento privado y autorización de servidor.
5. **Publicación:** revisar el diff, validar las integraciones en staging y autorizar el merge/despliegue. Esta auditoría no hizo push ni cambió el sitio público.

## Reproducción

```powershell
npm ci
npm run lint
npm test
npm run build
npm run test:deployment
npm run test:e2e
$env:AUDIT_PHASE='after'
$env:AUDIT_SKIP_LIGHTHOUSE='1'
npm run audit:ui
npm run audit:performance
node scripts/audit-report.mjs
```

Las suites que usan el backend 54329 se ejecutan secuencialmente. El benchmark reconstruye `02d259f` dentro de `.qa/` para comparar fuentes equivalentes, sin modificar la rama ni instalar otra versión activa del sitio.

Referencias: [WCAG 2.2](https://www.w3.org/TR/WCAG22/), [reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow), [métricas de campo y laboratorio](https://web.dev/articles/vitals), [prerender/hosting Vite](https://vite.dev/guide/static-deploy).
