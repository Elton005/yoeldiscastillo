# Corrección de dirección: fidelidad al original

Referencia principal: commit `0f6ab9b`, conservado en `legacy/`. La dirección vigente es migrar la web existente, manteniendo apariencia, contenido, rutas y Supabase. La reinterpretación editorial previa se sustituyó; su código previo a esta corrección está respaldado en `backups/pre-fidelity-react-20261122.zip`, ignorado por Git. No se borraron commits ni se modificó producción.

## Comparación previa

Antes de modificar la interfaz se capturaron original y React a 1440×1000, 820×1180 y 390×844. Se revisaron inicio, sobre mí, libros, artículos, contacto, login público, acceso administrativo y panel autorizado: 24 pares de estados. Las capturas de las rutas diferidas se repitieron esperando su carga completa para no comparar un estado de carga con una página terminada.

Se identificaron desviaciones en paleta, tipografía, disposición del hero, sustitución del logotipo cerebral por el retrato, textos y secciones añadidos, catálogo compacto, tarjetas, pie de página, login separado y navegación lateral del administrador.

## Qué se restauró

- CSS original en `src/styles/original.css`, con su cascada y transiciones intactas; únicamente se adaptaron rutas `../img/` a `/img/` para Vite. CSS administrativo original en `src/styles/original-admin.css`.
- Paleta roble/dorado, Cinzel/Montserrat y Font Awesome 6.5.1, servido localmente desde el bundle.
- Cabecera fija, logotipo YC, cinco enlaces, menú móvil, botones y posiciones originales.
- Inicio con el logotipo cerebral, fondo de biblioteca, texto original, dos destacados y pie con cita y créditos. Se retiraron las secciones y textos añadidos por el rediseño anterior.
- Biografía con énfasis y foto originales, su máscara y encuadre; catálogo detallado con portadas, prólogo desplegable, estados y enlaces; promoción original de Junior Osmany.
- Tarjetas de artículos y lectura en modal, además de conservar las fichas individuales SSR añadidas para indexación y compartir enlaces identificables.
- Contacto con su tarjeta, texto y correo originales; login en ventana modal con Google y formularios de correo/registro.
- Panel oscuro con cabecera y pestañas horizontales, sección inicial de libros, formulario visible, miniaturas y controles de orden. Indicadores y opciones nuevas se mantienen como complementos discretos, sin sustituir la estructura anterior.
- Títulos, descripciones y keywords originales extraídos a `src/data/original-metadata.json`, canonical original sin www por defecto y favicon técnico derivado del logotipo existente.

## Mejoras discretas y compatibilidad

Se mantienen React/TypeScript, Router, Query, formularios validados, HTML sanitizado, Auth verificado, permisos de servidor y pruebas. Se añadió foco visible, confinamiento del foco y Escape en modales, recuperación del foco al cerrar, menú oculto fuera del orden de tabulación y movimiento reducido. Se corrige el desbordamiento del fondo del hero y se conserva el tamaño de los recursos sin deformar imágenes.

En el original móvil ese desbordamiento puede ampliar el viewport de diseño de 390 a 402 px y desplazar el modal, aunque la captura física mida 390 px. React conserva el viewport solicitado y centra el modal en él. Esta pequeña diferencia de posición/tamaño deriva de la corrección responsive; no se añadieron márgenes ni una composición nueva al acceso. El botón de cierre se coloca en la esquina libre del modal móvil para que no quede detrás del botón Google, conservando su icono y estilo.

El panel conserva las funciones de búsqueda, filtros, preview, borradores, portadas y roles. La sesión del mismo usuario se revalida sin desmontar el formulario; logout e identidad cambiada siguen retirando el acceso. El orden por flechas utiliza una RPC transaccional y los permisos se vuelven a comprobar antes de cada mutación. No se ha instalado esa RPC remotamente.

`libros.visible` no pertenece al contrato original observado. La lectura y guardado detectan su ausencia específica y utilizan el contrato anterior; nunca hacen ese fallback ante un error de permisos o de red. La ampliación de visibilidad vive fuera de las migraciones básicas, en `supabase/optional/`, y solo se muestra cuando la columna está disponible. La migración de seguridad básica no cambia columnas de libros, artículos o destacados.

Los enlaces sociales `#` ya eran destinos sin configurar. Se conserva su apariencia y se marcan inactivos, sin inventar perfiles. El acceso administrativo también ofrece correo como alternativa al Google original. El editor enriquecido conserva la implementación moderna con el estilo oscuro existente. Las imágenes sustituidas no se eliminan físicamente de Storage, tal como se documentó en la entrega anterior.

## Datos utilizados y límites

La comparación previa y las pruebas CRUD usan fixtures locales aislados. Después se verificó una lectura anónima normal de contenido real: **2 libros, 2 artículos publicados y 2 destacados activos**, sin consultar usuarios ni realizar escrituras. El snapshot público local en `.qa/visual/public-reference.json` permite comparar ambas interfaces con los mismos registros reales sin que las operaciones del panel lleguen a producción. Los archivos de QA y snapshots no se incluyen en el bundle ni en Git. Las imágenes públicas de Storage pueden descargarse mediante GET al tomar capturas.

También se ejecutó el código real de `listContent` de React contra esa API, con configuración inyectada solo en memoria: devolvió 2/2/2 registros y detectó correctamente que `libros.visible` no está disponible. El resultado sin credenciales está en `.qa/visual/live-services-check.json`. No se creó un archivo de entorno de producción ni se compiló con la clave real.

Esto confirma la lectura pública y los nombres de campos devueltos por esa API; no verifica tipos PostgreSQL, relaciones, grants, políticas RLS reales, usuarios administrativos, OAuth ni la función Edge desplegada. CRUD, roles y pruebas negativas siguen necesitando staging autorizado para certificar la integración completa. No confundir las operaciones de los dobles de prueba con escrituras reales persistidas en Supabase.

## Reproducir la comparación

```powershell
# Opcional: actualizar únicamente el snapshot público, usando la clave anon histórica en memoria.
node scripts/read-public-reference.mjs
npx playwright test --config playwright.visual.config.ts
node scripts/visual-report.mjs
```

El informe interactivo está en `.qa/visual/report.html`. Permite elegir página, resolución y etapa. Capturas y medidas están bajo `.qa/visual/before/` y `.qa/visual/after/`; las páginas públicas también tienen capturas completas. Los resultados de píxeles son medidas de diagnóstico de capturas concretas, no un porcentaje universal de fidelidad ni una certificación de producción. La primera etapa utilizó fixtures y la etapa final utiliza el snapshot público; comparar original y React dentro de cada etapa mantiene los mismos datos.

Los comandos visuales usan puertos locales y redirigen las llamadas del código antiguo al backend de pruebas. El test rechaza llamadas de datos o escrituras a Supabase remoto; únicamente admite GET de imágenes públicas. No se sirve el código legacy como parte del producto.
