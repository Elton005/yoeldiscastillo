# Recuperación del acceso administrativo

24 de noviembre de 2026. Correcciones locales; no se desplegó ni se modificaron usuarios, permisos o ajustes remotos.

## Causa comprobada y límites del diagnóstico

La API pública configurada en el JavaScript publicado devuelve **404 / PGRST202** al llamar a `current_editor_role()` sin argumentos. El mensaje indica que esa función no está disponible en la caché de esquema. Esto prueba que el contrato de autorización usado por React no está disponible mediante PostgREST; no demuestra por sí solo si la función está ausente en PostgreSQL, no está expuesta o requiere actualizar la caché tras una migración.

El código anterior convertía tanto un error de esa RPC como un resultado legítimo sin rol en `role: null`. El panel ofrecía de nuevo Google en ambos casos, incluso con un usuario ya autenticado. Un fallo de sesión/red también se convertía silenciosamente en estado anónimo. Esto explica la repetición de login sin acceso y ocultaba el problema de integración.

La versión vanilla (`74adcfb`) consultaba `public.administradores` por correo. React usa la RPC del servidor, que enlaza el UUID de `auth.uid()` con `editor_memberships` y una identidad confirmada/no bloqueada de `auth.users`. No se añadió un fallback al mecanismo antiguo ni se atribuyen privilegios mediante correo o metadatos del navegador.

Google está habilitado según `/auth/v1/settings`. El 24/11 se comprobaron `/admin.html` y `/auth/callback` con respuesta 200 en www. Las mismas rutas del dominio sin www redirigieron 308 al equivalente canónico. Las rutas y los rewrites permiten cargar la SPA; no se encontró una redirección HTTP del panel a Inicio. No se dispone de la cuenta del usuario ni de configuración privada de Supabase: el origen del retorno particular a `/` requiere verificar la allowlist/Site URL y una ejecución de Google autorizada.

Evidencia sin credenciales: `.qa/auth-loop/production-routes.json` y `public-backend.json`. La comprobación de la RPC utilizó exclusivamente el cliente público anónimo y una función de lectura, sin cambios en producción.

## Cambios de código

- `src/auth/AuthProvider.tsx`: estados explícitos inicializando/autenticado/anónimo/error; errores de sesión y permisos separados; usuario verificado conservado si falla la consulta de rol; respuestas antiguas invalidadas tras logout/cambio de identidad; listeners y timers cancelados al desmontar.
- `src/auth/session.ts`: espera explícita de inicialización, recuperación de sesión y validación con `getUser()`. El SDK conserva la propiedad del intercambio PKCE automático. No hay una segunda llamada a `exchangeCodeForSession` ni registro de códigos/tokens.
- `src/auth/actions.ts`: destino limitado a rutas internas conocidas; callback canónico www para el alias del dominio; conservación de staging/localhost y prefijo Pages; destino por pestaña más respaldo local con caducidad de 30 minutos. Se almacena una intención de navegación, nunca un permiso.
- `src/lib/supabase.ts` y `src/App.tsx`: detección inicial del retorno y recuperación de aterrizajes en Inicio o rutas antiguas. El salto al callback se ejecuta una sola vez después de hidratar, sin ciclos al navegar después al panel.
- `src/pages/Access.tsx`: callback espera una identidad válida, conserva el destino para reintentar y limpia parámetros sensibles. El acceso general termina en Mi cuenta; el solicitado desde el panel vuelve a `/admin.html`.
- `src/auth/AuthForm.tsx` y `src/admin/Admin.tsx`: progreso durante inicialización; error y reintento explícitos; denegación para lector sin volver a ofrecer Google; el error de RPC no se presenta como falta de rol.
- `src/services/content.ts`: la revalidación antes de leer/escribir contenido privado también distingue un fallo de sesión/RPC de una denegación real y bloquea las operaciones en los tres casos.

Los permisos de cada operación siguen revalidándose en el servidor y en los servicios de contenido. RLS y migraciones existentes no se cambiaron. El diseño público y los cambios fotográficos previos se conservan.

## Configuración necesaria en Supabase

En **Authentication → URL Configuration**:

```text
Site URL: https://www.yoeldiscastillo.com

Redirect URLs:
https://www.yoeldiscastillo.com/auth/callback
https://www.yoeldiscastillo.com/auth/callback/
https://www.yoeldiscastillo.com/admin.html
https://www.yoeldiscastillo.com/admin
https://www.yoeldiscastillo.com/admin/
```

El nuevo flujo utiliza `/auth/callback`, sin parámetros de destino en la URL de allowlist. Los destinos administrativos adicionales conservan compatibilidad con enlaces antiguos. Añadir por separado los callbacks exactos del staging autorizado y, si se utiliza Pages, `https://elton005.github.io/yoeldiscastillo/auth/callback` y su variante con slash final. No redirigir un login de staging a producción: el verificador PKCE pertenece al navegador y origen donde empezó el flujo. No usar comodines amplios para producción.

En Google Cloud, la URI de retorno del proveedor es la indicada por Supabase (`https://<proyecto>.supabase.co/auth/v1/callback`), no la ruta React. Revisar que Google y Vercel utilicen el mismo proyecto Supabase. No se accedió ni se modificó esa configuración privada.

## Recuperar roles sin elevar privilegios automáticamente

1. Un operador autorizado ejecuta [inspection-auth.sql](../supabase/inspection-auth.sql), de solo lectura, para identificar tablas, RPC, grants y RLS disponibles. La evidencia HTTP no sustituye este inventario.
2. Si la función ya existe pero no está expuesta, revisar esquema público, firma sin argumentos, `EXECUTE` para `authenticated` y caché de PostgREST. No abrir las tablas de membresías al navegador ni crear una función que siempre devuelva admin.
3. Si el backend sigue en el esquema vanilla, exportar el esquema/datos y revisar primero en staging las migraciones `202611220001_editorial_security.sql` y `202611220002_editorial_order.sql`; para personalización también `202611220004_site_settings.sql` y `202611220005_hero_settings.sql`. **No ejecutar toda la carpeta a ciegas ni duplicar migraciones ya aplicadas.** La migración principal exige inspección previa y coordinación con el panel antiguo.
4. Verificar manualmente qué cuenta Google confirmada corresponde a cada administrador legítimo de la tabla anterior. Reconciliar cada UUID explícitamente con `editor_memberships` mediante el procedimiento de [SUPABASE_SETUP.md](SUPABASE_SETUP.md). El script de migración no promueve automáticamente a los correos existentes ni al usuario que acaba de entrar.
5. Probar administrador, editor, lector, anónimo, revocación y RLS en staging. Solo después autorizar la migración/configuración en producción y un nuevo despliegue del frontend.

**Un nuevo despliegue de React por sí solo no restaura el acceso si sigue faltando la RPC o la membresía legítima.** La corrección muestra ese fallo y evita repetir login; la restauración del contrato de roles requiere intervención autorizada en el backend.

## Verificación

Las pruebas de navegador usan el SDK Supabase instalado y un proveedor de loopback que comprueba desafío/verificador PKCE y códigos de un solo uso. No contactan Google ni certifican OAuth, roles o persistencia remotos.

ESLint, TypeScript y `npm run build` correctos; arquitectura con 37 módulos usados, sin ciclos. **74 pruebas unitarias/SQL aprobadas en 13 archivos.** La suite completa de navegador pasó **51 pruebas** en escritorio/tablet/móvil, incluidas 18 del flujo OAuth simulado. Después del ajuste final del enlace de reintento hidratado, se aprobaron de nuevo las **18 pruebas de OAuth** y las comprobaciones de los dos builds estáticos (raíz Vercel y prefijo Pages), incluido el callback con destino persistido. Los resultados se conservan en `.qa/auth-loop/oauth-final.log` y `deployment-final.log`.

Los casos cubren sesión inicial pendiente/anónima, Google desde el administrador, validación del desafío PKCE, un solo intercambio por login, retorno al panel, recarga, logout y nuevo login, lector sin permisos, RPC ausente con reintento sin otro login, fallback a Inicio, código sin verificador y rechazo del proveedor. La prueba compilada conserva un destino administrativo en sessionStorage antes de abrir el callback prerenderizado y comprueba ausencia de discrepancias de hidratación, tanto en raíz como con el prefijo Pages.

La URL pública de www se abrió también en un contexto anónimo de Chromium: mostró acceso restringido e inicio de Google, conservó `/admin.html` y no produjo excepciones JavaScript. No se pulsó Google en producción. No hay `.env.staging.local`, cuentas de staging ni una sesión Google del usuario disponibles; **no se certificó el login real ni la membresía de la cuenta afectada**.

```powershell
npm run lint
npm test
npm run build
$env:QA_VITE_PORT='5177'
npm run test:e2e
npm run test:deployment
```

Las suites de navegador comparten el backend local 54329: ejecutarlas secuencialmente. Los artefactos locales están en `test-results/`; la evidencia de inspección y los logs de validación están en `.qa/auth-loop/`. El escáner del build comprueba que no se incluyan claves Supabase privilegiadas. Ninguna configuración remota fue cambiada; para publicar esta corrección hace falta un nuevo despliegue autorizado, además de resolver el contrato de roles del backend.

Referencias: [URLs de retorno](https://supabase.com/docs/guides/auth/redirect-urls), [PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow).
