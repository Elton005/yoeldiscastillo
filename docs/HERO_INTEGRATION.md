# Integración fotográfica del hero de escritorio

24 de noviembre de 2026. Corrección local sobre `a9fdb9e`, sin publicación.

## Diagnóstico

Las capturas del usuario se corresponden con dos problemas combinados. `assets/source/author-seated.png` contiene un recorte transparente cuyo sillón termina en el borde izquierdo del lienzo. `assets/source/library.png` también contiene un sillón, además de la lámpara y la mesa. Superponerlos con distintas posiciones y escalas mostraba dos respaldos a 1920 px.

El CSS agravaba la unión: la máscara lateral del retrato disolvía el cuero y el traje sobre el fondo, haciendo que la lámpara pareciera atravesarlos. La máscara inferior dejaba reaparecer el sillón de la biblioteca entre las piernas y el borde inferior. No era un problema de `object-fit`: el retrato ya usaba `contain`, pero la biblioteca usaba una escala `cover` diferente.

## Corrección aplicada

Se conserva el mismo retrato y la misma biblioteca. La composición predeterminada utiliza tres capas: biblioteca, autor/sillón opacos y una copia del fondo enmascarada únicamente por el contorno de la lámpara, los libros y la mesa. La máscara vectorial comparte exactamente `cover` y posición central con la biblioteca para que los objetos del primer plano coincidan con su origen.

El retrato se ancla al borde izquierdo del hero y se ajusta su escala, conservando la relación 1122/1402. El borde cortado del sillón coincide así con el límite del encuadre. El recorte inferior continúa fuera de la sección, sin transparencia sobre el traje. `sizes` corresponde al nuevo ancho para que el navegador elija la variante de 840 px en las dos capturas de escritorio a DPR 1. No se usan filtros fotográficos ni sombras artificiales sobre el autor.

La única suavización nueva es de 0,65 px en el contorno de la máscara de primer plano, para antialiasing; no desenfoca los recursos fotográficos ni afecta al rostro. El primer plano recibe el mismo gradiente horizontal de iluminación de la biblioteca. Sus imágenes comparten las URL y los tamaños responsive del fondo para reutilizar el recurso descargado.

Los PNG originales y los WebP existentes permanecen intactos. No se generaron rasgos, rellenos fotográficos ni una identidad alternativa. La corrección fue posible con composición HTML/CSS y una máscara SVG; no hizo falta sustituir la fotografía.

El cambio se limita a contenedores de al menos 1366 px, al par de imágenes incorporadas y al formato original. Fotografías personalizadas, otros formatos y la composición vertical conservan sus reglas. No hay modificaciones en cabecera, textos, botones, administración ni servicios de Supabase.

## Evidencia

[Comparador antes/después con detalles ampliables](../.qa/hero-integration/report.html).

- Capturas a 1366 × 768 y 1920 × 1080, DPR 1, con fondos y fuentes cargados. Se incluyen composición completa, hombros/respaldo, lámpara y borde inferior.
- Hero a 375, 768 y 1280 px: idéntico píxel a píxel antes y después.
- Columna de texto en las dos medidas de escritorio: idéntica píxel a píxel; geometría y contenido iguales.
- Sin desbordamientos ni excepciones JavaScript en las cinco medidas.
- TypeScript y arquitectura correctos; 64 pruebas aprobadas en 12 archivos.
- Build estático de Pages correcto; URL de máscara verificada con el prefijo `/yoeldiscastillo/`.

Los JSON de medidas, comprobaciones y SHA-256 se guardan junto al comparador en `.qa/hero-integration/`. Las capturas y herramientas de esta inspección son artefactos locales ignorados por Git. Se usó exclusivamente el backend de prueba local para evitar escrituras o cambios en producción.
