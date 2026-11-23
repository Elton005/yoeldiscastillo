# Verificación del proyecto

## Comandos

```powershell
npm run check:architecture
npm run typecheck
npm test
npm run test:e2e
npm run test:visual
npm run build
npm run preview
```

Si el puerto 5173 está ocupado, definir `QA_VITE_PORT=5177` para E2E. El visual usa 5177. Las suites de navegador comparten el backend de pruebas 54329 y se ejecutan secuencialmente. Instalar Chromium de Playwright con `npx playwright install chromium` si falta.

## Cobertura

- Arquitectura: imports resueltos, límites entre capas, módulos usados y ausencia de ciclos.
- Unitarias/SQL: validación de datos/URLs, HTML seguro, sesiones, servicios, SSR, roles, RLS, orden y revisiones de ajustes.
- E2E: navegación, login/logout, denegación administrativa, CRUD de las tres colecciones, imágenes, preview, persistencia, personalización, red, teclado y SSR sin JavaScript.
- Visual: Inicio, Libros, Artículos, Biografía y Contacto a 320, 375, 430, 768, 1024, 1366, 1440 y 1920 px; retrato correcto, título, proporción, no solapamiento, no scroll horizontal y footer.
- Build: tipos, recursos del navegador, renderer SSR y búsqueda de claves privilegiadas.

Las capturas visuales actuales y el informe se generan en `.qa/visual/`, sin conservar versiones anteriores. Las trazas solo se mantienen ante fallos; los resultados funcionales están en `test-results/`. Todos son artefactos locales ignorados por Git.

## Resultado local actual

Verificado el 23 de noviembre de 2026:

- Arquitectura: 33 módulos utilizados, sin ciclos ni imports rotos; TypeScript sin errores.
- Unitarias y SQL: 43 pruebas aprobadas en 7 archivos.
- E2E: 30 pruebas aprobadas en escritorio, tablet y móvil.
- Visual: 8 pruebas aprobadas; cinco páginas y hero por ancho, sin desbordamiento horizontal.
- Compilación cliente y SSR: correcta; el escáner no detectó claves Supabase privilegiadas.
- Vista previa: favicon PNG con respuesta 200 y tipo `image/png`.

El informe visual actual se genera en `.qa/visual/report.html`. Estos resultados corresponden a pruebas locales; los límites de integración se detallan a continuación.

## Alcance de la evidencia

El backend HTTP de `tests/fixtures` se limita a loopback y prueba la interfaz; no demuestra RLS. PGlite ejecuta PostgreSQL local con roles y políticas reales sobre tablas de contrato de prueba. Esos datos no se importan en el producto ni se envían a Supabase remoto.

Auth/OAuth/SMTP, persistencia remota, RLS de la instancia, Edge Function y Storage reales requieren un entorno autorizado y cuentas dedicadas. `npm run test:permissions` exige esa configuración y no informa éxito cuando falta. Una compilación correcta no certifica esas integraciones.

No hay linter configurado en el proyecto. TypeScript estricto y el control de arquitectura son comprobaciones distintas y no se presentan como lint.
