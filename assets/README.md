# Fuentes de imagen

`source/` contiene las tres fuentes canónicas necesarias para regenerar el hero:

- `author-standing.png`: retrato original de pie.
- `author-seated.png`: recurso sentado con transparencia real.
- `library.png`: biblioteca de fondo.

Los archivos se conservan sin cambios de píxeles. `scripts/prepare-hero.mjs` y
`scripts/prepare-seated-portrait.mjs` generan únicamente las variantes WebP que
consume la aplicación en `public/img/hero/`. El recorte técnico intermedio del
retrato de pie se procesa y valida en memoria.

Los originales que mantienen URLs públicas existentes están en `public/img/`;
`scripts/optimize-images.mjs` genera el favicon y las variantes responsive del
retrato de biografía a partir de esos archivos. No existe una segunda copia
paralela en la raíz del repositorio.
