# Verificación del proyecto

## Comandos

```powershell
npm run check:architecture
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run test:visual
npm run build
npm run build:pages
npm run test:deployment
npm run preview
```

Si el puerto 5173 está ocupado, definir `QA_VITE_PORT=5177` para E2E. El visual usa 5177. Las suites de navegador comparten el backend de pruebas 54329 y se ejecutan secuencialmente. Instalar Chromium de Playwright con `npx playwright install chromium` si falta.

## Cobertura

- Arquitectura: imports resueltos, límites entre capas, módulos usados y ausencia de ciclos.
- Unitarias/SQL: validación de datos/URLs, HTML seguro, sesiones, servicios, SSR, roles, RLS, orden y revisiones de ajustes.
- E2E: navegación, login/logout, denegación administrativa, CRUD de las tres colecciones, imágenes, preview, persistencia, personalización, red, teclado y SSR sin JavaScript.
- Visual: Inicio, Libros, Artículos, Biografía y Contacto a 320, 375, 430, 768, 1024, 1366, 1440 y 1920 px; retrato correcto, título, proporción, no solapamiento, no scroll horizontal y footer.
- Build: tipos, recursos del navegador y búsqueda de claves privilegiadas. SSR queda como comprobación opcional local.
- Despliegue: dos builds estáticos aislados y pruebas en navegador de rutas, imágenes, navegación, catálogo y detalle.

Las capturas visuales actuales y el informe se generan en `.qa/visual/`, sin conservar versiones anteriores. Las trazas solo se mantienen ante fallos; los resultados funcionales están en `test-results/`. Todos son artefactos locales ignorados por Git.

## Resultado local actual

Cierre de auditoría: 24 de noviembre de 2026.

- ESLint y TypeScript: sin errores; arquitectura con 36 módulos usados y sin ciclos.
- Unitarias/SQL: 64 pruebas aprobadas en 12 archivos.
- E2E: 33 pruebas aprobadas en la última ejecución completa en escritorio, tablet y móvil.
- Build React/Vite: correcto, con generación de metadatos/HTML/sitemap estáticos y escáner de claves.
- Builds de Vercel/Pages aislados: ambas salidas verificadas en navegador, siete entradas por plataforma, navegación y detalle; sin errores de hidratación.
- Auditoría visual: las doce resoluciones solicitadas, horizontal, altura reducida, texto al 200 % y reflow equivalente; 152 casos registrados, 123 capturas antes y 158 después. Sin geometría desbordada ni excepciones JS. Axe: 16 análisis de la muestra posterior sin infracciones detectadas.
- Lighthouse: tres muestras por versión/perfil, Chrome nuevo y gzip; LCP mediano móvil 4,40 → 3,96 s y escritorio 1,00 → 0,78 s. El objetivo móvil de 2,5 s sigue pendiente. INP de campo no medido.
- `npm audit --json`: 0 vulnerabilidades reportadas.

Informe completo, riesgos y comparador: [FINAL_AUDIT.md](FINAL_AUDIT.md). Reproducción de capturas con `npm run audit:ui`, comparación de rendimiento con `npm run audit:performance`, informe con `node scripts/audit-report.mjs`. Las suites comparten el backend 54329 y deben ejecutarse secuencialmente.

## Alcance de la evidencia

El backend HTTP de `tests/fixtures` se limita a loopback y prueba la interfaz; no demuestra RLS. PGlite ejecuta PostgreSQL local con roles y políticas reales sobre tablas de contrato de prueba. Esos datos no se importan en el producto ni se envían a Supabase remoto.

Auth/OAuth/SMTP, persistencia remota, RLS de la instancia, Edge Function y Storage reales requieren un entorno autorizado y cuentas dedicadas. `npm run test:permissions` exige esa configuración y no informa éxito cuando falta. Una compilación correcta no certifica esas integraciones.

ESLint está configurado mediante `eslint.config.mjs` y reglas recomendadas de TypeScript. TypeScript estricto y el control de arquitectura son comprobaciones adicionales distintas.
