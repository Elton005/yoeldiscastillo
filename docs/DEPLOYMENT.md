# Despliegue React + Vite

## Diagnóstico comprobado

GitHub Pages estaba sirviendo el `index.html` fuente, con `<script src="/src/main.tsx">`, mediante el workflow automático de publicación desde rama. No ejecutaba Vite. Un navegador no puede ejecutar ese TSX como la aplicación compilada.

Vercel informó construcción exitosa para `c11007f`, pero `/api/render?path=/` y `/contacto.html` respondían 500 `FUNCTION_INVOCATION_FAILED`; `/` respondía 404. El fichero declaraba `framework: null` y enviaba las páginas a esa función. Se comprobó el fallo de ejecución, sin acceso a los logs privados para determinar la excepción de arranque exacta.

El usuario eligió publicación estática React + Vite. Se elimina el adaptador de Vercel, se declara Vite explícitamente y se conserva `dist/index.html`. El contenido se carga desde Supabase en el navegador. La auditoría añadió prerender durante el build: las páginas conocidas llevan contenido, metadatos y sitemap sin necesidad de un servidor de renderizado en producción.

## Vercel

- Repositorio: `Elton005/yoeldiscastillo`, rama de producción `main`.
- Framework: **Vite**, directorio raíz: raíz del repositorio.
- Instalación: `npm ci`; build: `npm run build:deploy`; salida: `dist`.
- Node: 24.x.
- Cada ruta conocida tiene un documento generado. Las rutas nuevas/desconocidas usan `/404.html` como shell React, sin snapshot de otra página; los recursos se sirven como archivos.

`vercel.json` conserva estos valores en el código. Revisar cualquier configuración antigua del panel y redeplegar el commit nuevo. No publicar la raíz del repositorio como contenido estático.

En **Settings → Environment Variables**, definir para Production (y Preview si se usa):

```text
VITE_SUPABASE_URL=https://<proyecto>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<clave publicable o anon>
VITE_SITE_URL=https://www.yoeldiscastillo.com
```

Los valores VITE son públicos y quedan incorporados al JavaScript durante el build. Nunca usar `service_role` ni claves secretas. `build:deploy` falla con un mensaje explícito si falta la conexión o el formato de la clave no es público; esto no verifica credenciales contra Supabase. Cambiar las variables requiere compilar/desplegar de nuevo.

## GitHub Pages

1. En **Settings → Pages → Build and deployment → Source**, seleccionar **GitHub Actions**. No usar publicación directa de la rama.
2. En **Settings → Secrets and variables → Actions → Variables**, crear `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` y `VITE_SITE_URL`. Son valores públicos; deben pertenecer al proyecto real.
3. Para la URL `https://elton005.github.io/yoeldiscastillo/`, usar `VITE_SITE_URL=https://elton005.github.io/yoeldiscastillo` y el prefijo predeterminado `/yoeldiscastillo/`.
4. Si se usa dominio propio en Pages, definir `PAGES_BASE_PATH=/` y el dominio real en `VITE_SITE_URL`.
5. Subir el commit a `main` o ejecutar **Actions → Deploy React to GitHub Pages → Run workflow**. Se sube únicamente `dist-pages/`.

Las rutas públicas `.html`, detalles publicados durante la compilación, acceso, administración y callback cuentan con HTML específico. Las rutas dinámicas creadas después del build se abren mediante el fallback `404.html`; al entrar directamente pueden mantener estado HTTP 404 aunque la interfaz cargue. Para URLs dinámicas con respuesta HTTP 200 y mejores posibilidades de indexación, usar Vercel.

## Auth y backend

Permitir en Supabase las URLs exactas de callback de los dominios publicados:

- Vercel/dominio: `https://www.yoeldiscastillo.com/auth/callback`.
- Pages: `https://elton005.github.io/yoeldiscastillo/auth/callback` (también la variante con `/` final si la plataforma redirige a ella).

Incluir los origins publicados en `ALLOWED_ORIGINS` de la función Edge para subir imágenes. Migraciones, roles, RLS y Storage se preparan según [SUPABASE_SETUP.md](SUPABASE_SETUP.md). Este cambio no aplica migraciones ni modifica el backend remoto.

## Comprobación reproducible

```powershell
npm test
npm run build
npm run build:pages
npm run test:deployment
```

`test:deployment` compila artefactos aislados con un backend local de prueba y los sirve como archivos estáticos, sin Vite dev ni SSR. Comprueba ambos prefijos, navegación, imágenes, catálogo y detalle. No configura cuentas remotas ni sustituye la prueba final en las plataformas.

Después de publicar, verificar `/`, `/libros.html`, `/admin.html`, recarga directa y un recurso `/assets/*.js` con MIME JavaScript. En Pages, incluir el prefijo del repositorio. Confirmar que el HTML publicado contiene `/assets/…js` y nunca `/src/main.tsx`.

Referencias: [Vite en Vercel](https://vercel.com/docs/frameworks/frontend/vite), [Vite en GitHub Pages](https://vite.dev/guide/static-deploy#github-pages).

## SEO de la publicación estática

El build obtiene únicamente ajustes y colecciones públicas con un cliente anónimo, genera las páginas y sitemap, y conserva el estado público para hidratar React. Los datos se vuelven a consultar al abrir la página. Si Supabase está configurado y falla la lectura, el build falla y no debe sustituir el despliegue funcional. El build local sin variables genera metadatos y páginas base sin inventar registros.

La edición desde el panel sigue visible al navegador tras actualizar consultas. Para renovar el HTML que reciben bots sin JavaScript, el sitemap y las copias de publicaciones retiradas, ejecutar un nuevo build/despliegue autorizado. No hay webhook de publicación automática ni cambios de infraestructura remota en esta auditoría. Las rutas privadas llevan noindex.
