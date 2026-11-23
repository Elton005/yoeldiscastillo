# Panel y contenido personalizable

Actualización del 22 de noviembre de 2026. Implementación local en la rama de migración; sin despliegue ni cambios en Supabase de producción.

## Uso

Accede a `/admin.html` con una cuenta autorizada. También puedes entrar desde «Mi cuenta → Entrar al panel» tras iniciar sesión. Se conservan Libros, Artículos, Destacados y Administradores; la pestaña nueva **Página web** permite editar:

| Sección | Contenido editable |
| --- | --- |
| Inicio | Presentación, dos líneas del título, descripción, retrato y texto alternativo, biblioteca de fondo, integración y tamaño del retrato, etiquetas/destinos de los dos botones y título de destacados |
| Sobre mí | Título, subtítulo, biografía en párrafos y fotografía |
| Libros y artículos | Títulos y subtítulos de ambas páginas; las publicaciones se gestionan en sus pestañas existentes |
| Contacto | Título, mensaje y correo; también se actualiza el enlace de correo del pie |
| Redes y pie | Facebook, Instagram, LinkedIn y cita del pie; los perfiles vacíos permanecen inactivos |

Los destinos iniciales de los botones son Libros y Sobre mí; pueden cambiarse a rutas del sitio o URLs HTTPS válidas. La navegación, identidad del autor y créditos del desarrollador permanecen como parte del diseño. La promoción de Junior Osmany se conserva; no se ha convertido en un formulario nuevo.

1. Elige una sección y edita sus campos. Cambiar de sección conserva el borrador.
2. Usa **Vista previa de la página** para revisar Inicio, Sobre mí, Libros, Artículos o Contacto sin publicar. Los enlaces no navegan dentro de la vista previa. Si sigues editando, vuelve a abrirla para actualizar su contenido.
3. **Guardar página** publica todos los campos del formulario en una operación. Una imagen subida solo pasa a mostrarse en la web cuando guardas los ajustes.
4. La página abierta recibe los cambios al recargar, volver a enfocarla o en su consulta periódica de 30 segundos. El servidor carga los ajustes para cada render público; no hace falta recompilar por cambios de contenido.
5. **Descartar / recargar ajustes** recupera la versión publicada conocida; **Restaurar valores iniciales** prepara los valores de esta versión, sin publicarlos hasta guardar.

La petición posterior de **hero definitivo** sustituye el logotipo compacto por la fotografía auténtica suministrada, integrada sobre la biblioteca. La altura del retrato en escritorio admite 220–760 px, con 640 px iniciales; móvil adapta su escala automáticamente. Se conserva la edición del recurso y las opciones de integración anteriores, con retrato completo por defecto. Los originales del autor y portadas permanecen intactos. Ver `HERO.md`.

El último refinamiento añade el recurso sentado suministrado para escritorio (desde 1366 px) y conserva el de pie debajo de ese umbral. No hay nuevos campos: si configuras otra URL en «Retrato de inicio», tu imagen personalizada se utiliza en ambos formatos. La descripción, cita, correo y perfiles existentes también alimentan el nuevo footer público. Ver `VISUAL_REFINEMENT.md`.

## Activación en Supabase

Se requiere el entorno autorizado descrito en `SUPABASE_SETUP.md`, el núcleo de seguridad, cuentas verificadas y la función Edge de imágenes. Aplicar en staging la migración adicional `supabase/migrations/202611220004_site_settings.sql`. No se ejecutó remotamente durante esta implementación.

La migración crea `site_settings` con una única fila y `site_settings_history`. No añade columnas a libros/artículos/destacados ni copia o modifica registros del catálogo. La primera configuración es `{}`: React la completa con los textos e imágenes reales existentes. No se introduce contenido de demostración en el producto.

Para los campos adicionales del hero aplicar después `202611220005_hero_settings.sql` en staging. Amplía la lista de URL y el tamaño admitidos por la RPC existente; no cambia tablas, políticas o registros. Una URL personalizada de fotografía se conserva; únicamente se adapta en lectura el antiguo valor inicial del logotipo cerebral al retrato aprobado.

Si la tabla no existe, la web conserva esos valores y el panel muestra que la personalización aún no está habilitada. Los errores de permisos/red no se interpretan como ausencia de la tabla y el editor ofrece reintentar. Una configuración inválida se rechaza; no se informa un guardado exitoso sin respuesta válida del servidor.

La URL y clave pública de Supabase se configuran por entorno, sin claves privilegiadas en React. El panel nuevo requiere las RPC de roles del núcleo; no reutiliza comprobaciones inseguras del panel antiguo.

## Permisos, conflictos y recuperación

La tabla publicada permite lectura pública y carece de permisos directos de escritura para clientes. `save_site_settings` comprueba el rol verificado en servidor, valida campos/tipos/URLs/tamaños y publica con una revisión esperada. Una edición obsoleta se rechaza y el borrador permanece en el formulario. Los guardados están limitados a 30 por minuto y usuario. Administradores y editores pueden publicar contenido; solo administradores gestionan miembros.

La recarga consulta expresamente la versión del servidor. Si falla la red, el formulario conserva el borrador y permite reintentar; cancelar el descarte tampoco modifica sus campos. No se desmonta el editor por un error de actualización en segundo plano.

Cada publicación conserva la versión anterior y el UUID del actor en un historial privado, legible solo por administradores. No hay una interfaz de historial en esta entrega. Para recuperar una versión histórica, un operador autorizado puede revisar su contenido y publicarlo mediante la misma RPC y revisión vigente en staging antes del corte. No editar ni borrar el historial para revertir el frontend. Los uploads descartados no se borran automáticamente de Storage, para evitar eliminar recursos compartidos.

El patrón de permisos y funciones sigue las referencias oficiales de [RLS de Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security) y [funciones de base de datos](https://supabase.com/docs/guides/database/functions), con `search_path` vacío y grants explícitos. Las pruebas SQL locales no certifican las políticas del proyecto remoto.

## Evidencia

Los tests locales cubren edición, preview sin publicar, subida, guardado, persistencia tras recarga, aparición pública, SSR, conflicto de revisión y fallback sin tabla. Las pruebas SQL comprueban lectura pública, denegación de escritura directa, lector sin permisos, publicación por editor y privacidad del historial. Las capturas del nuevo inicio y formulario están en `test-results/home-*.png`, `custom-home-*.png` y `custom-admin-*.png`.

El informe de fidelidad `.qa/visual/report.html` corresponde a la corrección anterior. El cambio de tamaño/formato del logotipo de esta actualización fue solicitado después de esa comparación. Las capturas nuevas se reúnen en `.qa/customization/report.html`; utilizan el backend local aislado, nunca escrituras en producción.

Falta probar OAuth, roles, persistencia y uploads con cuentas y servicios reales de staging antes de activar el panel en la web publicada.
