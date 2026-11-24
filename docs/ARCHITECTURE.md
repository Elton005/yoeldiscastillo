# Arquitectura actual

## Entradas y publicación

El despliegue principal elegido es React + Vite estático. `index.html` es la plantilla fuente; `src/main.tsx` monta React y BrowserRouter. Vercel declara `framework: vite`, compila a `dist/` y sirve los documentos generados para cada ruta y usa `404.html` como fallback de React. No hay función SSR en `api/` que pueda impedir abrir la página.

GitHub Pages usa el workflow `.github/workflows/pages.yml`: compila a `dist-pages/`, configura el prefijo `/yoeldiscastillo/` y publica únicamente ese artefacto. Las entradas públicas, detalles conocidos, acceso y callback tienen HTML y metadatos propios generados al compilar; `404.html` permite montar Router para detalles dinámicos. Los detalles creados después de compilar pueden conservar estado HTTP 404 al recargar en Pages, plataforma sin rewrites. Vercel sí responde 200 en esas rutas.

`publicAsset` adapta las imágenes internas y srcset al prefijo; BrowserRouter usa `BASE_URL`. Los callbacks de Auth también respetan ese prefijo. Las páginas públicas incluyen contenido legible sin JavaScript cuando se construyen con conexión pública disponible. React hidrata ese snapshot y reconsulta el backend; navegación interactiva, sesión y panel necesitan JavaScript.

`scripts/prerender.mjs` usa `src/entry-server.tsx` únicamente durante el build y retira el renderer temporal. No publica funciones Node. Los artefactos son HTML, XML, CSS, JS e imágenes. `scripts/serve.mjs` y `scripts/finalize-build.mjs` mantienen las comprobaciones SSR locales opcionales. Ver [despliegue](DEPLOYMENT.md).

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

Las fuentes Cinzel/Montserrat variables se sirven localmente. `polish.css` comparte espaciado, accesibilidad, menús y ajustes del panel. El saneador HTML y el renderizador de contenido rico se cargan de forma diferida; la portada no los necesita.
