// ==========================================
// CONFIGURACIÓN Y CARGA DE ARTÍCULOS PÚBLICOS
// ==========================================
const SUPABASE_URL = 'https://jjbztkljgsdwrqylspeg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqYnp0a2xqZ3Nkd3JxeWxzcGVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2NDE4MjgsImV4cCI6MjEwMjIxNzgyOH0.lDYEuyrbVDRoMyQwfj4nQk-gve84RhZiFnyRAYhGfD4';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function cargarArticulosPublicos() {
  const container = document.getElementById('lista-articulos');
  if (!container) return;

  // Solo traer artículos publicados
  const { data, error } = await sb
    .from('articulos')
    .select('*')
    .eq('publicado', true)
    .order('creado_en', { ascending: false });

  if (error) {
    container.innerHTML = '<p style="color: #ff6b6b; text-align: center; grid-column: 1 / -1;">Error al cargar los artículos.</p>';
    console.error('Error Supabase:', error);
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 3rem; grid-column: 1 / -1;">Aún no hay artículos publicados. ¡Vuelve pronto!</p>';
    return;
  }

  // Renderizar cada artículo
  container.innerHTML = data.map(art => generarHTMLArticulo(art)).join('');
}

function generarHTMLArticulo(art) {
  // Imagen de portada (con fallback)
  const imagenHTML = art.imagen_url 
    ? `<div class="articulo-card__img-wrapper"><img src="${art.imagen_url}" alt="${art.titulo}" class="articulo-card__img" /></div>` 
    : `<div class="articulo-card__img-wrapper"><div class="articulo-card__img-placeholder"><i class="fas fa-newspaper fa-3x"></i></div></div>`;

  // Categoría (si existe)
  const categoriaHTML = art.categoria 
    ? `<span class="articulo-card__categoria"><i class="fas fa-tag"></i> ${art.categoria}</span>` 
    : '';

  // Resumen o extracto del contenido (primeros 150 caracteres)
  let resumen = art.resumen || '';
  if (!resumen && art.contenido) {
    // Si no hay resumen, extraer del contenido (quitando tags HTML)
    const textoLimpio = art.contenido.replace(/<[^>]*>/g, '');
    resumen = textoLimpio.substring(0, 150) + (textoLimpio.length > 150 ? '...' : '');
  }

  return `
    <article class="articulo-card">
      ${imagenHTML}
      <div class="articulo-card__contenido">
        ${categoriaHTML}
        <h3 class="articulo-card__titulo">${art.titulo}</h3>
        <p class="articulo-card__resumen">${resumen}</p>
        <button class="btn btn--outline btn-leer-mas" onclick="abrirArticulo(${art.id})">
          <i class="fas fa-book-open"></i> Leer artículo
        </button>
      </div>
    </article>
  `;
}

// Función para abrir un artículo (modal o página dedicada)
window.abrirArticulo = function(id) {
  // Por ahora, mostramos un alert con el contenido completo
  // En el futuro podemos crear una página dinámica articulo.html?id=X
  sb.from('articulos').select('*').eq('id', id).single().then(({ data, error }) => {
    if (error) {
      alert('Error al cargar el artículo');
      return;
    }
    
    // Crear un modal simple para mostrar el contenido
    const modal = document.createElement('div');
    modal.className = 'articulo-modal';
    modal.innerHTML = `
      <div class="articulo-modal__content">
        <button class="articulo-modal__close" onclick="cerrarModal()"><i class="fas fa-times"></i></button>
        <h2 class="articulo-modal__titulo">${data.titulo}</h2>
        ${data.categoria ? `<span class="articulo-modal__categoria">${data.categoria}</span>` : ''}
        <div class="articulo-modal__body">${data.contenido}</div>
      </div>
    `;
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
  });
};

window.cerrarModal = function() {
  const modal = document.querySelector('.articulo-modal');
  if (modal) {
    modal.remove();
    document.body.style.overflow = '';
  }
};

// Cerrar modal al hacer clic fuera
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('articulo-modal')) {
    cerrarModal();
  }
});

// Ejecutar cuando cargue la página
document.addEventListener('DOMContentLoaded', cargarArticulosPublicos);