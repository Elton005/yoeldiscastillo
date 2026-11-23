# Migraciones de datos

Las migraciones SQL son parte del contrato actual del backend; no son copias de la web. Se conservan versionadas y no deben fusionarse ni eliminarse sin conocer qué archivos ya aplicó cada instancia.

Aplicar en un entorno de desarrollo autorizado, en este orden y después de revisar `supabase/inspection.sql`:

1. `202611220001_editorial_security.sql`: membresías verificadas, RLS, auditoría, cuotas y control de Storage.
2. `202611220002_editorial_order.sql`: reordenamiento autorizado y transaccional.
3. `202611220004_site_settings.sql`: ajustes versionados e historial privado.
4. `202611220005_hero_settings.sql`: validación de fondo, destinos de CTA y tamaño del retrato.

`supabase/optional/202611220003_book_visibility.sql` es una ampliación opcional. La aplicación admite el esquema de libros sin esa columna y solo ofrece su control cuando existe. Los borradores de artículos usan el campo `publicado` existente.

No se renombran ni sustituyen libros, artículos, destacados o recursos de otros autores. Los campos de contenido existentes se conservan. Los cambios de privilegios requieren contrastar esquema, roles, grants, políticas y consumidores actuales antes de aplicarlos.

El código de inspección no constituye un respaldo de datos. La recuperación del backend requiere un respaldo real de estructura/configuración y datos de la instancia; consultar `supabase/rollback/README.md`.
