# Arquitectura actual

## Entradas y renderizado

- `index.html`: única plantilla fuente, consumida por Vite.
- `src/main.tsx`: navegador, Router, Query y Auth; hidrata el HTML cuando existe estado SSR.
- `src/entry-server.tsx`: precarga contenido público y ajustes, genera HTML, metadatos, sitemap y estado de hidratación.
- `scripts/serve.mjs`: servidor de comprobación local de la compilación.
- `api/render.mjs`: adaptador HTTP independiente de la presentación.

La compilación separa recursos estáticos en `dist/` y renderer/plantilla en `server/`. No se sirve el HTML fuente de Vite como documento compilado. Estas carpetas se regeneran y no se versionan.

## Capas

`App` define las rutas. `pages` compone componentes y consume consultas. `components` contiene piezas reutilizables y no importa páginas ni paneles. `auth` contiene el formulario de acceso y el proveedor de sesión; los diálogos cargan ese formulario directamente. `admin` agrupa formularios y gestión protegida.

`services` realiza operaciones de datos y multimedia; `models` valida campos y URLs; `lib` configura Supabase, SEO y saneado; `hooks` comparte consultas, previews y comportamiento de modales. Los servicios no importan interfaz, y los modelos no dependen de servicios o pantallas.

`Icon` y `ResourceLink` son componentes independientes. `AuthForm` vive en `auth`, mientras `pages/Access` solo compone la ruta de acceso y su callback. Esto evita ciclos entre Layout, páginas y autenticación. `npm run check:architecture` valida imports estáticos y dinámicos, ausencia de ciclos y uso de todos los módulos de `src`.

## Datos y autorización

TanStack Query separa claves públicas y administrativas. La autorización se verifica mediante `getUser` y `current_editor_role`; cada mutación vuelve a verificar permisos. La base de datos conserva la autoridad final mediante RLS/RPC. Logout o cambio de identidad retira caché privada; refrescar la misma sesión mantiene los formularios.

`site_settings` publica un JSON versionado. El editor conserva el borrador durante errores y rechaza revisiones obsoletas. El SSR hidrata únicamente datos públicos. Los fixtures se usan en tests y no se importan desde `src`.

## Presentación y recursos

`styles.css` ordena los estilos compartidos y de accesibilidad. `styles/public.css` contiene el tema público; `admin.css`, el administrativo; `hero.css`, el hero responsive; `refinements.css`, tarjetas y footer públicos. Se eliminaron los bloques de los heroes que ya no tienen componentes.

El hero usa biblioteca, retrato, degradados y HTML separados. Desde 1366 px se elige el recurso sentado; debajo se conserva la composición vertical de pie. Una fotografía personalizada mantiene su URL. Cabecera y footer conservan enlaces reales y ajustes compartidos.

`public/img` mantiene una sola copia de los originales con URL pública, incluidas imágenes referenciadas por contenido remoto. `assets/source` conserva únicamente las tres fuentes necesarias del hero. Los generadores producen las variantes WebP activas; el recorte intermedio se procesa en memoria.
