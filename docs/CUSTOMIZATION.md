# Personalización desde el panel

Accede a `/admin.html` con una cuenta autorizada, o desde «Mi cuenta → Entrar al panel». Libros, Artículos y Destacados conservan creación, edición, eliminación, orden, preview, publicación e imágenes. Administradores permite gestionar miembros mediante las operaciones protegidas del servidor.

La pestaña **Página web** permite modificar:

| Sección            | Campos                                                                                                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Inicio             | Etiqueta, título de dos líneas, descripción, retrato, biblioteca, texto alternativo, tamaño/integración, etiquetas y destinos de los botones, título de destacados |
| Sobre mí           | Título, subtítulo, biografía y fotografía                                                                                                                          |
| Libros y artículos | Cabeceras; las publicaciones se gestionan en sus pestañas                                                                                                          |
| Contacto           | Título, mensaje y correo                                                                                                                                           |
| Redes y pie        | Perfiles de Facebook/Instagram/LinkedIn y cita                                                                                                                     |

Los valores iniciales utilizan el retrato sentado en escritorio desde 1366 px y el de pie en pantallas menores. Una URL personalizada en «Retrato de inicio» se respeta en ambas composiciones. El tamaño es una referencia de escritorio y se adapta a pantallas menores.

## Flujo de trabajo

1. Edita una sección; cambiar entre secciones conserva el borrador.
2. Abre la vista previa para revisar sin publicar. Los enlaces se desactivan dentro de ella. Vuelve a abrirla si continúas editando.
3. Guarda para publicar todos los ajustes en una operación. Una imagen subida se publica al guardar su URL.
4. La web recibe los cambios al recargar, recuperar el foco o mediante su consulta periódica de 30 segundos. No hace falta recompilar contenido.
5. «Descartar / recargar ajustes» consulta el servidor y solicita confirmación si hay cambios. Un error de red conserva el borrador.
6. «Restaurar valores iniciales» prepara los valores del sitio sin publicarlos hasta guardar.

Una revisión obsoleta no sobrescribe la edición de otra persona. El historial privado conserva la versión anterior; no hay interfaz de restauración histórica. Los recursos sustituidos no se borran de Storage automáticamente para proteger referencias compartidas.

El footer utiliza la descripción, cita, correo y perfiles existentes. Los perfiles sin URL válida se mantienen inactivos en cabecera y se omiten en el pie. La firma del desarrollador no incorpora un enlace inventado; el año se genera al renderizar.

La tabla de ajustes y las funciones de autorización deben estar preparadas según `SUPABASE_SETUP.md`. Si falta la tabla, el sitio mantiene sus valores iniciales y el panel comunica que la personalización aún no está habilitada. No se presenta un error de permisos o de red como un guardado exitoso.
