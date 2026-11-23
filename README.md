# Yoeldis Castillo Quiala

Sitio y panel administrativo en React + TypeScript estricto, Vite y Supabase. El repositorio contiene una sola implementación activa; las rutas públicas `.html` pertenecen a React Router, no a archivos HTML independientes.

## Uso local

Node 22.12 o posterior (validado con Node 24).

```powershell
npm ci
Copy-Item .env.example .env.local
# Configurar URL y clave pública de Supabase en .env.local.
npm run dev
```

La configuración del cliente solo admite claves públicas. Sin conexión configurada, el catálogo muestra su estado de error; no se sustituye por datos ficticios. Los datos de prueba viven únicamente en `tests/fixtures`.

## Comprobaciones

```powershell
npm run check:architecture
npm test
npm run test:e2e
npm run test:visual
npm run build
npm run preview
```

`check:architecture` detecta imports relativos rotos, ciclos, módulos sin uso y dependencias entre capas incorrectas. `build` incluye esa comprobación, TypeScript, compilación cliente/SSR y escáner de claves. `preview` sirve el resultado local en el puerto 4173.

## Organización

| Carpeta                                              | Responsabilidad                                           |
| ---------------------------------------------------- | --------------------------------------------------------- |
| `src/pages`                                          | Rutas y composición pública                               |
| `src/components`                                     | Componentes reutilizables, hero, cabecera y footer        |
| `src/auth`                                           | Sesiones, formulario de acceso y diálogos                 |
| `src/admin`                                          | Gestión de contenido, miembros y personalización          |
| `src/services`, `src/models`, `src/hooks`, `src/lib` | Datos, validación y utilidades                            |
| `src/styles`                                         | Tema público, administración, hero y detalles editoriales |
| `public/img`                                         | Recursos públicos y variantes optimizadas                 |
| `assets/source`                                      | Tres imágenes fuente para regenerar el hero               |
| `supabase`                                           | Migraciones, función de imágenes y pruebas de permisos    |
| `tests`, `scripts`                                   | Verificación y herramientas del proyecto                  |

`index.html` es la única plantilla fuente de la aplicación. `src/main.tsx` es la entrada del navegador; `src/entry-server.tsx` genera HTML público. La compilación crea `dist/` y `server/`; son artefactos ignorados, no versiones adicionales del código. El adaptador HTTP se mantiene separado en `api/`.

El hero utiliza el recurso sentado desde 1366 px y el retrato de pie en pantallas menores. Se conserva la estética marrón/dorada y el footer con firma de Elton Olivares. El panel mantiene CRUD, búsquedas, filtros, orden, imágenes, borradores, editor enriquecido, miembros y contenido personalizable.

`npm run images` regenera favicon y WebP a partir de las fuentes conservadas. No se modifica la identidad del autor ni las portadas.

Documentación: [arquitectura](docs/ARCHITECTURE.md), [personalización](docs/CUSTOMIZATION.md), [Supabase](docs/SUPABASE_SETUP.md), [migraciones](docs/MIGRATION.md), [seguridad](docs/SECURITY.md) y [pruebas](docs/TESTING.md).
