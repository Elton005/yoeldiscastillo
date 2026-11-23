# Seguridad: implementado, probado y pendiente

## Hallazgos y medidas

| Riesgo                                                     | Medida local                                                                                  | Evidencia / límite                                                                            |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Datos y HTML en innerHTML sin sanitizar                    | React escapa texto; sanitize-html con allowlist en lectura, vista previa y contenido editado  | Tests de scripts, handlers, SVG, iframe y protocolos; no certifica todo posible payload       |
| Permisos administrativos comprobados solo por correo en JS | getUser remoto, RPC de rol y RLS basada en membresías privadas                                | PostgreSQL local ejecuta políticas y rechaza anónimo/lector; esquema real pendiente           |
| Alta/baja directa en administradores                       | Tabla legacy privada; RPC SECURITY DEFINER con search_path vacío y grants mínimos             | Tests negativos, editor sin acceso a roles, guardia del último administrador activo           |
| Escalada mediante rol editable                             | Fuente de rol independiente de user_metadata                                                  | Prueba de servicio con metadatos falsos y pruebas SQL de autopromoción                        |
| Carga sin validación                                       | Cliente + Edge verifican MIME, bytes iniciales, 5 MB, identidad y rol; rutas UUID por usuario | Firma binaria compartida probada; Edge completa pendiente de runtime Supabase                 |
| Escritura directa a Storage                                | Fence bloquea INSERT/UPDATE/DELETE de clientes en bucket conocido                             | SQL local con políticas legacy permisivas                                                     |
| Reordenamiento parcial sin detectar fallos                 | Campo orden validado y guardado con la publicación                                            | CRUD UI y SQL; no hay ordenación drag-and-drop                                                |
| Errores SQL y datos internos expuestos                     | Mensajes genéricos, sin claves ni errores de proveedor en UI                                  | Pruebas de red y revisión de código                                                           |
| Dependencias de procesamiento de imágenes                  | Sharp y versiones fijadas en package-lock.json                                                | Revisar actualizaciones con npm audit; las pruebas funcionales no certifican las dependencias |

## Credenciales y sesiones

VITE*\* es público. El cliente admite clave `sb_publishable*\*` o JWT cuyo payload declara rol anon; Supabase sigue validando la clave real. Se rechazan claves secretas o JWT privilegiados en configuración. El escáner de build detecta sb_secret y JWT no anon en los resultados; no es un detector universal de contraseñas o todos los tipos de secretos.

El código activo no contiene claves de conexión embebidas; la URL y clave pública se configuran por entorno. No se encontró service_role/credencial privilegiada en el árbol auditado. No se ha certificado todo el historial Git ni las configuraciones remotas. No se rotó ninguna credencial. Si una revisión posterior encuentra un secreto privilegiado, inventariar usos, sustituirlo en servidor, validar, revocar el anterior y limpiar historial de manera coordinada.

Auth usa PKCE, callback de origen actual y redirección posterior limitada a rutas internas permitidas, incluido el panel protegido. No acepta next externo. La autenticación se verifica mediante getUser y los roles provienen de PostgreSQL. El SSR es anónimo y nunca hidrata datos privados. Al cambiar identidad o cerrar sesión se limpia la caché administrativa. La renovación del mismo usuario se verifica sin desmontar el editor; una verificación obsoleta no restaura privilegios después del logout. El token del navegador lo gestiona Supabase en su almacenamiento normal; la reducción de XSS es esencial y no equivale a cookies HttpOnly.

## RLS y RPC

La migración añade políticas permisivas mínimas y fences **restrictivos**, sin eliminar políticas previas. Así una política antigua demasiado amplia no vuelve a permitir escrituras a lectores. Los fences separados de UPDATE/DELETE son necesarios porque USING de ALL también permite leer filas públicas. Se revocan privilegios de tablas conocidas antes de conceder lectura y CRUD preciso; no se concede TRUNCATE.

Las membresías y auditorías no tienen acceso directo para clientes. `current_editor_role()` devuelve solo el rol del usuario verificado por auth.uid. `list_editor_memberships` y `manage_editor_membership` exigen administrador. Las asignaciones requieren cuenta confirmada no eliminada ni suspendida. Cambios de roles se serializan con advisory transaction lock; el último administrador activo no puede retirarse/degradarse por RPC. La auditoría limita a diez cambios exitosos por minuto y actor. Las cargas se limitan a treinta reservas por hora y usuario mediante operación atómica de PostgreSQL. Los intentos inválidos de Auth dependen además de los rate limits/CAPTCHA configurados en Supabase, no de un contador de React.

No se han ejecutado pruebas de concurrencia entre conexiones PostgreSQL remotas. El test local verifica el guardia lógico; revisar también hooks y operaciones privilegiadas ajenas a estas RPC que puedan modificar miembros o suspender cuentas.

## Multimedia

La función Edge valida el Bearer mediante Auth, el rol mediante RPC, origen permitido, método, tipo, longitud efectiva y firma inicial. Recibe el cuerpo por streaming con límite. La clave privilegiada se lee de variables del runtime Edge y solo se usa allí para crear una ruta nueva `user-id/uuid.ext`; no se envía al navegador. Los permisos del bucket impiden saltarse esta función mediante Storage API con una cuenta común o editor.

La firma inicial ayuda a detectar archivos de tipo falso; no es antivirus ni un decodificador completo de imágenes. No se aceptan SVG ni HTML. Las portadas sustituidas y los objetos de publicaciones eliminadas se conservan para no borrar imágenes compartidas. No se añadió borrado automático de objetos: el sistema anterior tampoco lo tenía. Para limpieza, inventariar referencias en imagen_url, contenido HTML y otros consumidores, respaldar, revisar permisos y borrar mediante Storage API en un proceso autorizado; nunca eliminar solo filas de storage.objects.

No cambiar automáticamente el carácter público del bucket: sus URLs existentes deben seguir funcionando. No cargar documentos confidenciales en este bucket. El login de lector previo a una APK preserva el flujo original; para descargas privadas se necesitaría un destino privado con autorización real y enlaces firmados, que el código original no proporciona.

## Cabeceras y CSP

`vercel.json` limita scripts al mismo origen, conexiones a Supabase, fuentes a Google Fonts; bloquea objetos, framing y base externa. Añade nosniff, HSTS, Referrer-Policy y Permissions-Policy. `unsafe-inline` solo se permite para estilos por compatibilidad con el editor; no para scripts. Imágenes HTTPS externas se admiten por compatibilidad con el catálogo. Reducir esa allowlist solo tras inspeccionar dominios reales.

Las cabeceras propuestas no se han validado sobre Vercel remoto. Probarlas en preview autorizado, especialmente OAuth, fuentes, editor, imágenes y el endpoint de la Edge Function. No introducir un comodín de script-src para resolver un bloqueo.

## Referencias técnicas consultadas

[RLS de Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security), [Storage access control](https://supabase.com/docs/guides/storage/security/access-control), [SSR de Vite](https://vite.dev/guide/ssr), [configuración Vercel](https://vercel.com/docs/project-configuration/vercel-json) y [rewrites](https://vercel.com/docs/routing/rewrites). La aplicación concreta debe verificarse en el proyecto autorizado; consultar documentación no demuestra que su configuración remota sea segura.

## Publicación de ajustes

La migración `202611220004_site_settings.sql` revoca escritura directa en ajustes y expone una RPC con rol verificado, validación de campos y revisión esperada bajo bloqueo de fila. Conserva historial privado de versiones/actor, legible solo por administradores, y limita publicaciones por usuario. Los textos se muestran como texto escapado, sin HTML ejecutable; imágenes y enlaces usan las validaciones de URL y la función Edge existente. La evidencia SQL local y los límites de verificación se describen en `TESTING.md`.
