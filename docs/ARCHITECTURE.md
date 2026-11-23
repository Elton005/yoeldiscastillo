# Arquitectura

## Capas

| Ubicación | Responsabilidad |
| --- | --- |
| `src/pages` | Páginas públicas y acceso |
| `src/components` | Layout, estados, retrato, SEO y HTML seguro |
| `src/auth` | Sesión verificada con Auth; rol obtenido de RPC confiable |
| `src/admin` | Dashboard, formularios y gestión de personas |
| `src/services` | Consultas, mutaciones y cargas multimedia |
| `src/models` | Modelos y esquemas Zod compartidos por formularios y servicios |
| `src/lib` | Cliente Supabase, metadatos y sanitización |
| `src/entry-server.tsx` | Prefetch público, HTML SSR, estados HTTP, sitemap y JSON seguro |
| `api/render.mjs` | Adaptador de lectura para Vercel; no usa credenciales privilegiadas |
| `supabase` | Inspección, migración, fixture y función Edge de subida |
| `tests` | Unitarias, componentes, PostgreSQL embebido y Playwright |

CSS reutiliza los estilos originales y administrativos de `src/styles/`, en el mismo orden de cascada, y añade una capa pequeña de compatibilidad y accesibilidad. Se conservan Cinzel/Montserrat, Font Awesome 6.5.1, paleta roble/dorado, fondos, máscaras y transiciones. Los originales fotográficos permanecen intactos; Sharp produce variantes técnicas sin ampliar resolución. Ver `VISUAL_FIDELITY.md` para las comparaciones.

## SSR y navegación

Vite genera dos bundles. El servidor consulta con la **misma clave pública** y sin sesión, prefiere contenido público y renderiza React con StaticRouter y TanStack Query. Cada petición utiliza un QueryClient nuevo. No acepta tokens de visitantes para SSR, por lo que no incluye registros administrativos en HTML ni en el estado hidratado. Se escapa `<` y separadores Unicode al serializar JSON.

La plantilla compilada vive en `server/template.html`, fuera de los recursos estáticos. Así se evita que Vercel sirva un index vacío antes de procesar el rewrite. El navegador hidrata el estado de consultas y sigue navegando con React Router. El desarrollo con Vite utiliza createRoot, no hidrata el comentario de la plantilla.

Se conservan `/sobre-mi.html`, `/libros.html`, `/articulos.html`, `/contacto.html` y `/admin.html`. `/index.html` tiene redirección 301 en el servidor local y permanente en Vercel. Las nuevas fichas usan identificadores existentes, sin modificar slugs ni columnas. Las URLs de los antiguos artículos eran modales sin identificador en URL; no existe una URL individual previa que redirigir.

Los metadatos individuales y el contenido llegan en HTML incluso sin JS. El sitemap se consulta en cada petición e incluye únicamente registros públicos. Ante fallo del backend se devuelve 503, no un sitemap incompleto con estado 200. Las fichas ausentes devuelven 404; acceso y administración llevan noindex. Schema Person reutiliza los datos existentes; Book omite autor porque el esquema no demuestra que todos los libros sean de Yoeldis.

La caché pública se actualiza al recuperar foco y cada 30 segundos; las mutaciones invalidan las consultas relacionadas. En SSR se utiliza `no-store`, lo que prioriza consistencia editorial; valorar una caché breve solo tras medir tráfico y costos. El panel y el acceso se cargan de forma diferida. Los cambios en PostgreSQL se reflejan sin recompilar React.

## Formularios y conservación

React Hook Form y Zod validan los datos. Los payloads contienen solo campos conocidos; no sustituyen registros completos ni sobrescriben columnas desconocidas. Una edición de metadatos de artículo omite `contenido` si su HTML no cambió. El editor visual incluye encabezados, listas, enlaces, tablas e imágenes; también se ofrece fuente HTML y vista previa sanitizada. Al editar contenido se guarda únicamente HTML permitido. CSS inline y elementos ejecutables se eliminan del renderizado.

El orden se conserva mediante flechas que llaman a una RPC transaccional con tablas permitidas y autorización en servidor; también se puede editar como número. Las consultas desempatan por id. Las asociaciones de destacados se guardan en `url_boton`, igual que el sistema anterior, apuntando a la ficha de la publicación elegida. No se inventan claves externas.

## Límites

No se ha certificado la integración Vercel hospedada, OAuth real, Auth SMTP, límites del proyecto ni esquema/RLS reales. Las imágenes de Storage existentes son públicas; los borradores de texto están protegidos por RLS, pero este bucket no es un almacén de archivos confidenciales. Las aplicaciones APK enlazadas públicamente conservan su acceso de lector en UI; una URL pública externa no se vuelve privada por pedir login en React.

## Ajustes de la página

`models/siteSettings.ts` define los campos editables y sus valores iniciales; `services/siteSettings.ts` carga/publica con revisión esperada y `hooks/useSiteSettings.tsx` comparte la consulta pública y los borradores de preview. HomeHero, biografía, cabeceras de catálogo/artículos, contacto y redes consumen los ajustes. El SSR precarga esa misma consulta antes de serializar el estado hidratado. `admin/SiteSettingsEditor.tsx` ofrece edición por secciones, upload, preview, descarte y restauración. La migración `202611220004_site_settings.sql` conserva un singleton público y un historial privado; las escrituras solo pasan por la RPC autorizada y validada. Los detalles están en `CUSTOMIZATION.md`.

## Hero aprobado

`HomeHero` utiliza biblioteca, retrato transparente, superposiciones CSS y contenido HTML en capas independientes. `styles/hero.css` limita los cambios a esa sección y usa Grid/consultas de contenedor para la composición. La cabecera comunica su altura real al hero sin cambiar su diseño. Los recursos originales están fuera de public en `assets/hero-originals`; WebP y PNG técnico en `public/img/hero`. Los ajustes agregan fondo y destinos seguros de CTA mediante el contrato JSON existente, cuya RPC se amplía en la migración 0005. Ver `HERO.md`.

## Refinamiento visual posterior

`HomeHero` añade un source WebP sentado desde 1366 px solo para el retrato inicial incluido; los retratos personalizados conservan su URL. `styles/refinements.css` se limita a `site-public-shell`, manteniendo los controles administrativos. `SiteFooter` reutiliza descripción/cita/contacto/redes de los ajustes y genera el año al renderizar. La arquitectura de servicios, modelos y SQL no cambia. Ver `VISUAL_REFINEMENT.md`.
