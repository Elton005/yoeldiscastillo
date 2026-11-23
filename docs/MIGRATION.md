# Migración y transición

## Estado inicial y respaldo

- Rama base `main`, commit `0f6ab9b`; árbol inicialmente limpio.
- Rama de trabajo `migration/react-editorial-security`.
- Respaldo de código local `backups/baseline-0f6ab9b.zip`, ignorado por Git. Inventario SHA-256 de 30 archivos en `baseline-inventory.json`.
- HTML, JS, CSS y JSON anteriores archivados en `legacy/`, sin copiar sus claves públicas al runtime nuevo. Para restauración exacta usar commit base o ZIP, no publicar el archivo de referencia.
- Imágenes originales en `img/` sin modificar. Recursos servidos en `public/img/` y variantes WebP en `public/img/optimized/`.
- No se respaldaron datos remotos: no hay acceso autorizado a PostgreSQL/Storage. El propietario debe obtener esos respaldos antes de una modificación remota.

## Contrato compatible y diferencias deliberadas

Se conservan `libros`, `articulos`, `destacados`, `administradores`, los campos identificados y el bucket `libros-imagenes`. El catálogo no filtra por autor. La promoción de Junior Osmany Coronel Durán y sus dos enlaces siguen presentes. Contacto conserva `contacto@yoeldisquiala.com`; no hay backend de formulario de contacto, por lo que se utiliza correo sin simular envíos.

La migración básica añade `editor_memberships`, `editor_role_audit` y `editor_upload_limits`, sin cambiar columnas de contenido. `libros.visible` es una ampliación opcional separada en `supabase/optional/`; el frontend detecta su ausencia y conserva el contrato anterior. Los borradores de artículos utilizan el `publicado` existente. Las membresías nuevas usan `auth.users.id`, no metadatos editables ni correos enviados por el navegador como prueba de identidad.

`administradores` permanece como referencia privada. No se importan automáticamente sus correos: un propietario debe verificar las cuentas confirmadas y asignar las membresías iniciales desde SQL de confianza. Las altas posteriores ocurren por RPC autorizado.

El panel anterior **no es compatible con las nuevas políticas de roles y carga directa**. No aplicar estas políticas al proyecto que sigue usando el frontend antiguo. El frontend y el backend se preparan en staging, luego se cambia el acceso administrativo y se realiza un corte coordinado autorizado. El público conserva URLs y contenido.

## Secuencia para staging

1. Crear clon/branch de desarrollo autorizado con respaldos y acceso limitado; revisar costos/configuración con propietario.
2. Ejecutar `supabase/inspection.sql` en modo lectura. Comparar columnas/tipos/defaults, funciones, triggers, permisos, políticas, vistas y todos los schemas expuestos. Ajustar el contrato y la migración si difieren. No asumir que el fixture es la realidad.
3. Identificar otras tablas expuestas, vistas con bypass RLS, funciones SECURITY DEFINER y políticas Storage de otros buckets. El SQL propuesto protege únicamente los objetos conocidos, no certifica todo un proyecto desconocido.
4. Exportar esquema, políticas, grants, configuración Auth/bucket y respaldo de datos. Probar restauración en un entorno aislado.
5. Aplicar las migraciones básicas de seguridad y orden de forma transaccional. No aplicar automáticamente la ampliación opcional de visibilidad. Revisar que los fences no bloqueen políticas restrictivas legítimas antiguas; no se eliminarán automáticamente.
6. Inicializar membresías verificadas y desplegar la función Edge de subida solo en staging. Configurar origins y OAuth con URLs exactas.
7. Configurar `.env.local` con la URL y clave pública de staging. Ejecutar pruebas locales y `test:permissions` con cuentas dedicadas; realizar además la matriz manual de `TESTING.md`.
8. Crear compilación y previsualización privada de Vercel **solo con autorización del propietario**, verificar rewrites, función SSR, CSP, sitemap, cache y OAuth. No basta publicar `dist/` en un hosting estático.

## Corte de producción — pendiente de autorización

Congelar temporalmente las escrituras administrativas, obtener respaldo reciente, contrastar de nuevo el esquema y probar las migraciones con una copia reciente. Preparar una versión privada de frontend que apunte al proyecto correcto y comprobar las URLs OAuth. Aplicar los cambios revisados y habilitar el nuevo panel en una ventana acordada; verificar lectura pública inmediatamente. Retirar el panel anterior y revisar logs sin claves ni datos personales.

Si algo falla, seguir `supabase/rollback/README.md`, conservar los datos añadidos y restaurar la configuración previa desde su snapshot revisado. No hacer rollback con GRANT ALL ni deshabilitando RLS por conveniencia. El despliegue público y las políticas de producción no se han ejecutado durante este trabajo.

## Compatibilidad pendiente de datos reales

Validar enlaces HTTP heredados frente al requisito HTTPS, formatos HTML no estándar, tipos de id/orden/fecha y el campo visible si ya existe. Las URLs inseguras o inválidas se omiten al mostrar y se rechazan al guardar; revisar los registros incompatibles en staging, sin sobrescribirlos masivamente. El HTML original no editado se mantiene en base de datos; comparar visualmente tablas, listas, imágenes y enlaces de artículos antiguos antes del corte.

## Contenido personalizable

Para la petición posterior de edición de la web se añade `202611220004_site_settings.sql`, después del núcleo y orden. Crea ajustes e historial; no cambia tablas del catálogo. Su aplicación remota sigue pendiente de staging autorizado. Sin esa tabla, el sitio conserva el contenido real inicial y el editor informa que falta activar la personalización. Consultar `CUSTOMIZATION.md`.
