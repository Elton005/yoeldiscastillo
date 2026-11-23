# Yoeldis Castillo Quiala

Migración fiel de la web original y su panel administrativo con React, TypeScript estricto, Vite, React Router, TanStack Query y Supabase JS v2. El frontend anterior se conserva en `legacy/` como referencia, fuera del despliegue. **No se ha publicado ni modificado Supabase remoto.**

El panel incorpora **Página web** para editar textos, fotografías, contacto y redes, con vista previa y publicación versionada. El último refinamiento utiliza el recurso sentado del autor en escritorio y conserva el retrato de pie en tableta/móvil, con un footer editorial nuevo. Implementación y capturas en [VISUAL_REFINEMENT.md](docs/VISUAL_REFINEMENT.md); preparación anterior de recursos en [HERO.md](docs/HERO.md); activación y uso del panel en [CUSTOMIZATION.md](docs/CUSTOMIZATION.md).

Se conserva la identidad roble/dorado, las fuentes Cinzel/Montserrat, los fondos, textos, tarjetas y modales originales. Consulta la [comparación visual y la corrección de dirección](docs/VISUAL_FIDELITY.md).

## Arranque local

Requiere Node 22.12 o posterior; validado con Node 24.

```powershell
npm ci
Copy-Item .env.example .env.local
# Configurar únicamente URL y clave pública de un Supabase de desarrollo autorizado.
npm run dev
```

La ausencia de configuración se muestra de forma explícita. No se usan datos ficticios como respaldo del catálogo. Las pruebas tienen su propio backend local, aislado de la aplicación y de producción.

```powershell
npm test
npm run test:e2e
npm run build
npm run preview
```

`build` comprueba tipos, genera cliente y SSR y examina credenciales Supabase en ambos resultados. `preview` sirve el resultado SSR en `http://127.0.0.1:4173`. `dist/` contiene recursos estáticos; `server/` contiene renderer y plantilla. No publicar `dist/` como una SPA: necesita la función `api/render.mjs` y `vercel.json`. La plantilla se aparta del directorio estático para que la raíz alcance SSR.

## Funcionalidad

- Rutas públicas antiguas, nuevas fichas `/libros/:id` y `/articulos/:id`, biografía y promoción del autor invitado conservadas.
- Google y correo/contraseña, registro, cierre de sesión y verificación de usuario y membresía. Google necesita URLs autorizadas en Supabase.
- Panel `/admin.html` con cabecera y pestañas originales: CRUD, búsqueda, filtros, orden por flechas y número, borradores, vista previa, portadas y editor enriquecido. La visibilidad independiente de libros es opcional y no exige añadir columnas al esquema original.
- Membresías de editor y administrador mediante RPC; el último administrador activo no puede retirarse o degradarse por esa operación.
- Cargas mediante Edge Function con límites y validación de firma/MIME/tamaño. Requiere instalar esa función en staging.
- SSR público, metadatos y sitemap dinámico, HTML saneado, rutas y estados HTTP coherentes.

## Antes de cualquier despliegue

Leer [auditoría](docs/AUDIT.md), [migración](docs/MIGRATION.md), [configuración Supabase](docs/SUPABASE_SETUP.md), [seguridad](docs/SECURITY.md) y [resultados de pruebas](docs/TESTING.md). El contrato SQL procede del JavaScript antiguo y está probado sobre un fixture de PostgreSQL; **todavía no está contrastado con el esquema real**. No aplicar la migración a producción durante la convivencia con el panel antiguo.

Las credenciales de staging se configuran en `.env.staging.local` ignorado por Git o en un gestor de secretos. Nunca pegarlas en chats, informes, commits o capturas. `npm run test:permissions` requiere autorización explícita mediante esa configuración y bloquea el identificador del proyecto original.

Documentación adicional: [arquitectura](docs/ARCHITECTURE.md), [reversión](supabase/rollback/README.md) y [entrega](docs/DELIVERY.md).
