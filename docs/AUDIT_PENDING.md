# Pendientes de backend identificados en la auditoría

## Medio: edición concurrente del catálogo

`src/services/content.ts`, función `saveContent`, actualiza por `id` sin comparar una revisión. Si dos editores abren la misma publicación, el último guardado puede sobrescribir silenciosamente el primero. El control de revisiones de `site_settings` sí evita este caso, pero no se aplica a libros, artículos ni destacados.

Propuesta para una ampliación revisada en staging: añadir una revisión entera administrada por servidor a esas tres tablas; leerla con cada registro y actualizar mediante una RPC que compare `expected_revision` bajo bloqueo de fila. La actualización, incremento de revisión y devolución del registro deben ser atómicos. Un conflicto debe preservar el borrador y permitir recargar o comparar las versiones, sin sobrescribir automáticamente. Mantener RLS y verificar dos sesiones concurrentes, eliminación concurrente y operaciones de orden.

Esta auditoría no cambia el esquema ni escribe en el backend remoto. Auth/OAuth/SMTP, RLS de la instancia, membresías, Edge Function y Storage reales siguen requiriendo pruebas autorizadas en staging; las pruebas locales no certifican su configuración remota.
