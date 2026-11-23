# Reversión sin pérdida de datos

No hay un `down.sql` automático: desconocemos las políticas, grants, triggers y límites previos. Invertirlos por suposición podría reabrir una vulnerabilidad. Antes del cambio autorizado guardar `pg_dump --schema-only`, exportación de políticas/grants, configuración del bucket y snapshot de datos del proyecto de destino, fuera de Git.

1. Si la transacción de migración falla, PostgreSQL revierte sus cambios. No continuar desde un error parcial.
2. Si la prueba en staging falla tras `commit`, conservar `editor_memberships`, `editor_role_audit` y `editor_upload_limits` con sus datos. Conservar también `libros.visible` si se aplicó su ampliación opcional; no forma parte de la migración básica. No eliminar tablas ni registros para volver al frontend anterior.
3. En una ventana autorizada, restaurar los grants, flags RLS, políticas y límites del bucket **desde el snapshot revisado**. Quitar solo las políticas `yc_*` y triggers `yc_*` introducidos por esta migración después de verificar que las políticas restauradas son seguras. Las nuevas tablas permanecerán privadas.
4. Revertir la versión de frontend mediante el despliegue anterior o un checkout separado del commit `0f6ab9b`. `legacy/` es referencia auditada con claves públicas retiradas; no es un destino público.
5. Repetir lectura pública, login, CRUD y pruebas negativas. No volver a publicar el panel antiguo si sus permisos permiten escritura sin autorización.

Los archivos originales y el respaldo local permiten recuperar código y recursos; no son un respaldo de PostgreSQL o Storage. No afirmar que se dispone de un respaldo de datos remotos sin haberlo obtenido.

Si se aplicó `202611220004_site_settings.sql`, conservar `site_settings` y su historial privado al revertir el frontend. Para recuperar contenido publicado, revisar una versión histórica con una cuenta administrativa y publicarla mediante `save_site_settings` con la revisión vigente; probar la recuperación primero en staging. No borrar ajustes o historial para volver al diseño anterior.

Si se revierte a un frontend anterior al hero definitivo, restaurar antes una versión de ajustes compatible desde el historial mediante la RPC vigente (sin homeBackground/homePrimaryUrl/homeSecondaryUrl y con el tamaño anterior). El esquema estricto del frontend anterior no conoce esos campos. Ensayar ese orden en staging; no borrar el historial ni restaurar a ciegas la función anterior sobre contenido nuevo.
