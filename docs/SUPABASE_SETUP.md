# Supabase: preparación segura

## Acceso necesario

Se necesita un entorno de desarrollo/staging autorizado con esquema y datos representativos. Configurar URL y clave pública en `.env.local` o un gestor de secretos local; cuentas dedicadas de pruebas en `.env.staging.local`. No compartir service_role, contraseña PostgreSQL, tokens OAuth o contraseñas en el chat. El frontend nunca necesita una clave administrativa.

La consola o un operador autorizado debe ejecutar `inspection.sql` y proporcionar un informe de **estructura y políticas**, sin filas personales ni credenciales. Revisar también los schemas expuestos de Data API, vistas, funciones SECURITY DEFINER, Auth, triggers, Storage y permisos de otros consumidores.

## Contraste de esquema y migración

El contrato inferido está en `AUDIT.md`. Confirmar tipos/defaults de id y orden, nombres de campos, fecha_publicacion, creado_en, publicado/activo y cualquier visible preexistente. La migración requiere las cuatro tablas conocidas y el bucket existente; fallará si faltan y no los recreará suponiendo datos. Las referencias a auth.users usan el esquema estándar confirmado, banned_until y deleted_at: comprobarlo en la instancia destino.

Aplicar `migrations/202611220001_editorial_security.sql` y `migrations/202611220002_editorial_order.sql` primero a staging. Cada archivo es transaccional y no añade columnas al catálogo original. La ampliación en `optional/202611220003_book_visibility.sql` requiere una decisión separada y no es necesaria para esta migración. No ejecutar `test-fixture.sql` fuera de una base vacía de pruebas: sus políticas deliberadamente abiertas sirven para probar que los fences las restringen. No importar ese fixture a un proyecto real.

Para activar la pestaña **Página web**, aplicar después `migrations/202611220004_site_settings.sql` en staging. Crea únicamente ajustes públicos versionados e historial privado; no cambia las tablas del catálogo. Requiere las funciones de autorización del núcleo. Probar guardado con admin/editor, rechazo de lector/anon, conflicto de revisión y lectura pública/SSR. La guía [CUSTOMIZATION.md](CUSTOMIZATION.md) describe los campos y su recuperación.

El hero definitivo requiere también `migrations/202611220005_hero_settings.sql`: admite fondo de biblioteca, destinos de CTA y retrato de hasta 760 px en el JSON de ajustes. Conserva los controles de la RPC y no altera tablas, políticas o filas. Probar primero esa ampliación con los campos nuevos en staging; no se aplicó remotamente.

Después de revisar identidades confirmadas, un operador de confianza inicializa el primer administrador usando parámetros en su cliente SQL seguro:

```sql
-- Sustituir el parámetro desde un cliente autorizado; verificar la identidad antes.
insert into public.editor_memberships(user_id,role)
select id,'admin' from auth.users
where id = :verified_user_id
  and email_confirmed_at is not null and deleted_at is null
  and (banned_until is null or banned_until<=now());
```

No usar correos del navegador o metadatos de usuario como autoridad. Revisar `administradores` con el propietario para conservar todos los accesos legítimos; asignar explícitamente cada UUID confirmado. Las nuevas RPC conservan la gestión de usuarios desde el panel, diferenciando editor y administrador.

## Edge Function para imágenes

Configurar `ALLOWED_ORIGINS` en secrets del runtime Edge con una lista separada por comas de origins exactos de desarrollo/staging. Supabase proporciona SUPABASE_URL, SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY en su runtime; comprobar esa disponibilidad sin imprimir valores. No poner esas claves de servidor en VITE_* ni en archivos versionados.

Un operador autorizado despliega `supabase/functions/upload-editorial-image/` al proyecto de staging mediante Supabase CLI. `config.toml` desactiva la verificación JWT del gateway para esta función porque ella verifica explícitamente el token de usuario con getUser, compatible con la clave publicable. Revisar esta configuración junto con el código; no aplicar verify_jwt=false a otras funciones sin comprobación propia.

La migración conserva `libros-imagenes`, fija 5 MB y los MIME JPEG/PNG/WebP/AVIF y bloquea escrituras directas del cliente. Edge crea rutas por UUID del usuario y del archivo. Verificar subida válida, MIME falso, SVG, exceso de tamaño, lector sin rol, origen no autorizado, reserva 31 y sesión caducada. Las pruebas locales del frontend interceptan esta función: no sustituyen este ensayo real.

## Auth

Mantener Google y contraseña/registro existentes. Configurar Site URL y redirect allowlist exacta para `/auth/callback` de cada origen autorizado. Revisar Google OAuth consent/client, URLs del proveedor y SMTP/confirmaciones. Evitar wildcards en producción. Revisar protección de cambios de correo, MFA de administradores, rate limits y CAPTCHA cuando proceda desde la configuración del proyecto; nada de esto fue cambiado automáticamente.

## Permisos verificados contra staging

Copiar únicamente las variables STAGING_* de `.env.example` a `.env.staging.local`, con un administrador y un lector **dedicados**, y activar STAGING_TESTS_AUTHORIZED=true. Ese opt-in autoriza crear y borrar fixtures temporales en staging. Ejecutar `npm run test:permissions`. El script bloquea el host de producción identificado en el repo. Una instancia distinta también debe ser confirmada como staging por el propietario.

El script devuelve código distinto de cero cuando faltan credenciales o hay fallos; no informa éxito por omisión. Comprueba lectura de registros públicos, ocultación de borradores, denegación CRUD, privacidad de administradores/membresías, RPC y Storage. Intenta limpiar sus propios registros temporales con el administrador; revisar manualmente si falla la limpieza.
