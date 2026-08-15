// ==========================================
// CONFIGURACIÓN Y CARGA DE LIBROS PÚBLICOS
// ==========================================
const SUPABASE_URL = 'https://jjbztkljgsdwrqylspeg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqYnp0a2xqZ3Nkd3JxeWxzcGVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2NDE4MjgsImV4cCI6MjEwMjIxNzgyOH0.lDYEuyrbVDRoMyQwfj4nQk-gve84RhZiFnyRAYhGfD4';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function cargarLibrosPublicos() {
  const container = document.getElementById('lista-libros');
  if (!container) return;

  const { data, error } = await sb
    .from('libros')
    .select('*')
    .order('fecha_publicacion', { ascending: false, nullsFirst: false });

  if (error) {
    container.innerHTML = '<p style="color: #ff6b6b; text-align: center;">Error al cargar los libros.</p>';
    console.error('Error Supabase:', error);
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Aún no hay libros publicados en la biblioteca.</p>';
    return;
  }

  // Renderizar cada libro
  container.innerHTML = data.map(libro => generarHTMLLibro(libro)).join('');
}

function generarHTMLLibro(libro) {
  let botonesHTML = '';
  let badgeHTML = '';

  // Lógica según el ESTADO del libro
  if (libro.estado === 'publicado' || !libro.estado) {
    if (libro.amazon_url) {
      botonesHTML += `<a href="${libro.amazon_url}" target="_blank" class="btn-amazon"><i class="fab fa-amazon"></i> Obtener en Amazon</a>`;
    }
    if (libro.apk_url) {
      botonesHTML += `<a href="${libro.apk_url}" target="_blank" class="btn btn--outline" style="margin-top: 1rem;"><i class="fas fa-mobile-alt"></i> Experiencia Interactiva</a>`;
    }
  } 
  else if (libro.estado === 'proximamente') {
    badgeHTML = '<span class="badge-estado badge-proximamente"><i class="fas fa-clock"></i> Próximamente</span>';
    botonesHTML = `<button class="btn btn--outline" disabled style="opacity: 0.6; cursor: not-allowed; margin-top: 1rem;">Disponible muy pronto</button>`;
  } 
  else if (libro.estado === 'agotado') {
    badgeHTML = '<span class="badge-estado badge-agotado"><i class="fas fa-times-circle"></i> Agotado</span>';
    botonesHTML = `<button class="btn btn--outline" disabled style="opacity: 0.6; cursor: not-allowed; margin-top: 1rem;">Actualmente agotado</button>`;
  }

  // Imagen (con fallback si no hay URL)
  const imagenHTML = libro.imagen_url 
    ? `<img src="${libro.imagen_url}" alt="${libro.titulo}" />` 
    : `<div style="width:100%; height:350px; background:var(--bg-tertiary); display:flex; align-items:center; justify-content:center; color:var(--gold-muted); border-radius:6px;"><i class="fas fa-book fa-3x"></i></div>`;

  // Acordeón (solo si hay prólogo)
  const acordeonHTML = libro.prologo ? `
    <div class="acordeon">
      <button class="acordeon__trigger" onclick="toggleAcordeon(this)">
        <i class="fas fa-book-open"></i> DESCUBRE EL CONTENIDO
        <i class="fas fa-chevron-down acordeon__icon"></i>
      </button>
      <div class="acordeon__content">
        <div class="acordeon__inner">
          <h3>PRÓLOGO / EXTRACTO</h3>
          <p>${libro.prologo}</p>
        </div>
      </div>
    </div>` : '';

  return `
    <div class="libro-detalle">
      <div class="libro-detalle__container">
        <div class="libro-detalle__portada">
          ${imagenHTML}
          ${badgeHTML}
        </div>
        <div class="libro-detalle__contenido">
          <h2 class="libro-detalle__titulo">${libro.titulo}</h2>
          <p class="libro-detalle__subtitulo">${libro.subtitulo || ''}</p>
          <p class="libro-detalle__descripcion">${libro.descripcion || ''}</p>
          
          ${acordeonHTML}
          ${botonesHTML}
        </div>
      </div>
    </div>
  `;
}

// Función global para el acordeón (necesaria porque se genera dinámicamente)
window.toggleAcordeon = function(btn) {
  const content = btn.nextElementSibling;
  const icon = btn.querySelector('.acordeon__icon');
  const isExpanded = btn.getAttribute('aria-expanded') === 'true';
  
  btn.setAttribute('aria-expanded', !isExpanded);
  if (!isExpanded) {
    content.style.maxHeight = content.scrollHeight + 'px';
    icon.style.transform = 'rotate(180deg)';
  } else {
    content.style.maxHeight = null;
    icon.style.transform = 'rotate(0deg)';
  }
};

// Ejecutar cuando cargue la página
document.addEventListener('DOMContentLoaded', cargarLibrosPublicos);