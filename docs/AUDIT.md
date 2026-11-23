# Auditoría previa — 22 de noviembre de 2026

Base: `0f6ab9b` en `main`, árbol limpio. Rama: `migration/react-editorial-security`.
Respaldo local: `backups/baseline-0f6ab9b.zip` (ignorado por Git). El commit base permite restaurar todos los archivos. No se ha desplegado ni escrito en Supabase.

## Inventario

Los 30 archivos versionados están enumerados con tamaño y SHA-256 en `baseline-inventory.json`. Se revisaron los seis HTML, seis JS, dos CSS, JSON, sitemap, robots, licencia y notas; las diez imágenes originales se conservan intactas. No hay package.json, pruebas, migraciones SQL, configuración Vercel ni esquema de base de datos versionado.

| Área | Implementado | Problemas / pendiente |
| --- | --- | --- |
| Público | Inicio, biografía, catálogo, artículos en modal, contacto por correo | Enlaces sociales `#`, OG apunta a imagen inexistente, sitemap fechado en 2024, sin URL individual de artículos |
| Auth | Google, contraseña y registro, logout | Clientes duplicados, autorización administrativa por correo en JS, getSession sin verificación remota |
| Libros | CRUD, prólogo, subtítulo, estado, imagen, Amazon, APK, fecha, orden | Sin visibilidad independiente; reordenamiento parcial no atómico; consultas públicas select(*) |
| Artículos | CRUD, categoría, resumen, HTML TinyMCE, imagen, publicado, orden | HTML sin sanitización; lectura individual no filtra publicado |
| Destacados | CRUD, cuatro tipos, título/subtítulo/descripción, imagen, CTA, badge, activo y orden | Inicio limitado a dos; asociación exclusivamente mediante URL; interpolación de datos en onclick |
| Administradores | Lista, alta por correo/nombre, baja | Escritura directa desde navegador, validación débil, evita autobaja solo en JS; sin bloqueo del último administrador en servidor |
| Storage | Upload al bucket `libros-imagenes`, URL pública | Sin MIME/tamaño/firma; carga antes de guardar genera huérfanos; catch usa btn fuera de scope; no hay borrado de objetos implementado |
| Contenido adicional | Junior Osmany Coronel Durán y enlaces a lahuellaescrita.com | Conservar promoción y catálogo completo, sin filtrar por autor |

## Contrato deducido, NO esquema comprobado

- `libros`: id, titulo, subtitulo, descripcion, prologo, imagen_url, estado (`publicado`, `proximamente`, `agotado`), amazon_url, apk_url, fecha_publicacion, orden, creado_en.
- `articulos`: id, titulo, categoria, resumen, contenido (HTML), imagen_url, publicado (boolean), orden, creado_en.
- `destacados`: id, tipo (`libro`, `articulo`, `app`, `personalizado`), titulo, subtitulo, descripcion, imagen_url, texto_boton, url_boton, badge_texto, activo, orden.
- `administradores`: id, email, nombre, creado_en. No se puede asumir que email sea una identidad confiable sin validar Auth y las políticas.
- No se conocen tipos exactos, claves externas, triggers, índices, grants, funciones, otras tablas expuestas ni políticas Storage.

## Seguridad observada

El código contiene una clave JWT de rol **anon** repetida en tres scripts, destinada al navegador; no equivale a service_role. Se retirará del runtime nuevo y se configurará por entorno. No se encontraron claves privilegiadas en el árbol actual; esto no certifica todo el historial o el proyecto remoto. No rotar automáticamente claves públicas. Revisar historial y credenciales del propietario sin imprimirlas.

Riesgos confirmados en código: XSS almacenado mediante innerHTML, URLs y handlers interpolados, errores internos mostrados al usuario, validación insuficiente de archivos y autorizaciones del lado cliente. La posibilidad de escribir directamente sin privilegios depende de RLS y **no está comprobada**. No se realizaron ataques ni escrituras de prueba en producción.

## Decisiones antes de implementar

Preservar rutas `.html` y contenido editorial existente. Añadir rutas individuales de libros/artículos. SSR público con Vite y React para contenido y metadatos indexables en cada petición; Auth y administración solo en cliente. Conservar tablas/bucket y campos existentes; preparar membresías confiables y controles de servidor en migraciones revisables, sin cambiar columnas de contenido. La visibilidad adicional de libros queda como ampliación opcional fuera de las migraciones básicas. Mantener roles legacy como referencia, sin migrar correos automáticamente a privilegios nuevos. Sin secretos de servidor en VITE_*.

## Límites y bloqueo de aceptación

No hay acceso autorizado a staging, SQL, RLS, Auth ni consola Supabase. La web no fue accesible desde la herramienta web; el repositorio es la fuente de contenido examinada. Se entregarán inspección SQL de solo lectura, fixture local, políticas y pruebas negativas. Las pruebas reales de Google, CRUD persistido, Storage y permisos de producción quedan bloqueadas hasta disponer de staging mediante variables locales o gestor de secretos. No enviar credenciales en el chat.

Actualización durante la corrección de fidelidad: una lectura pública normal de la API sí respondió, con dos libros, dos artículos publicados y dos destacados activos. Los campos devueltos de libros confirman que no existe `visible` en esa respuesta, por lo que se eliminó su dependencia obligatoria. Se utiliza un snapshot público local para las comparaciones visuales. No se consultaron usuarios o administradores ni se ejecutaron escrituras. Esta observación no sustituye la inspección SQL de tipos, relaciones, grants, RLS o configuración Auth.
