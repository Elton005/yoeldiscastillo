// ==========================================
// CARGAR ARTÍCULOS
// ==========================================
async function cargarArticulosPublicos() {
  const container = document.getElementById('lista-articulos');
  if (!container) return;

  const { data, error } = await sb
    .from('articulos')
    .select('*')
    .eq('publicado', true)
    .order('creado_en', { ascending: false });

  if (error) {
    console.error('Error al cargar artículos:', error);
    container.innerHTML = '<p style="color: #ff6b6b; text-align: center; grid-column: 1 / -1;">Error al cargar los artículos.</p>';
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 3rem; grid-column: 1 / -1;">Próximamente nuevos artículos. ¡Vuelve pronto!</p>';
    return;
  }

  container.innerHTML = data.map(art => generarHTMLArticulo(art)).join('');
  console.log(`✅ ${data.length} artículos cargados correctamente`);
}

function generarHTMLArticulo(art) {
  const imagenHTML = art.imagen_url 
    ? `<div class="articulo-card__img-wrapper"><img src="${art.imagen_url}" alt="${art.titulo}" class="articulo-card__img" loading="lazy" /></div>` 
    : `<div class="articulo-card__img-wrapper"><div class="articulo-card__img-placeholder"><i class="fas fa-newspaper fa-3x"></i></div></div>`;

  const categoriaHTML = art.categoria 
    ? `<span class="articulo-card__categoria"><i class="fas fa-tag"></i> ${art.categoria}</span>` 
    : '';

  let resumen = art.resumen || '';
  if (!resumen && art.contenido) {
    const textoLimpio = art.contenido.replace(/<[^>]*>/g, '');
    resumen = textoLimpio.substring(0, 120) + (textoLimpio.length > 120 ? '...' : '');
  }

  return `
    <article class="articulo-card" data-id="${art.id}">
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

// ==========================================
// ABRIR ARTÍCULO (MODAL)
// ==========================================
window.abrirArticulo = async function(id) {
  console.log(' Abriendo artículo ID:', id);
  
  try {
    const { data: art, error } = await sb
      .from('articulos')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !art) {
      console.error('Error al cargar artículo:', error);
      alert('Error al cargar el artículo');
      return;
    }
    
    // Formatear fecha
    const fecha = new Date(art.creado_en).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    // Crear modal
    const modal = document.createElement('div');
    modal.className = 'articulo-modal';
    modal.id = 'modalArticuloActivo';
    
    modal.innerHTML = `
      <div class="articulo-modal__content">
        <button class="articulo-modal__close" onclick="cerrarModal()"><i class="fas fa-times"></i></button>
        
        ${art.imagen_url ? `
          <div class="articulo-modal__header-img">
            <img src="${art.imagen_url}" alt="${art.titulo}" />
            <div class="articulo-modal__overlay"></div>
          </div>
        ` : ''}
        
        <div class="articulo-modal__body">
          ${art.categoria ? `<span class="articulo-modal__categoria">${art.categoria}</span>` : ''}
          <h1 class="articulo-modal__titulo">${art.titulo}</h1>
          
          <div class="articulo-modal__meta">
            <span><i class="far fa-calendar"></i> ${fecha}</span>
            <span><i class="far fa-user"></i> Yoeldis Castillo Quiala</span>
          </div>
          
          ${art.resumen ? `<p class="articulo-modal__resumen">${art.resumen}</p>` : ''}
          
          <div class="articulo-modal__texto">
            ${art.contenido}
          </div>
          
          <div class="articulo-modal__footer">
            <div class="articulo-modal__compartir">
              <span>Compartir:</span>
              <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}" target="_blank" class="btn-compartir" title="Facebook"><i class="fab fa-facebook-f"></i></a>
              <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(art.titulo)}&url=${encodeURIComponent(window.location.href)}" target="_blank" class="btn-compartir" title="Twitter"><i class="fab fa-twitter"></i></a>
              <a href="https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(window.location.href)}" target="_blank" class="btn-compartir" title="LinkedIn"><i class="fab fa-linkedin-in"></i></a>
              <button onclick="copiarEnlace()" class="btn-compartir" title="Copiar enlace"><i class="fas fa-link"></i></button>
            </div>
          </div>
          
          <div class="articulo-modal__cerrar-final">
            <button onclick="cerrarModal()" class="btn btn--solid">
              <i class="fas fa-times"></i> Cerrar artículo
            </button>
          </div>
          
          <div class="articulo-modal__autor">
            <div class="autor-info">
              <h3>Yoeldis Castillo Quiala</h3>
              <p>Escritor, Psicólogo y Profesor especializado en desarrollo personal y comportamiento humano.</p>
              <a href="sobre-mi.html" class="btn btn--outline">Conoce más sobre mí</a>
            </div>

          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    
    // Animación de entrada
    setTimeout(() => {
      modal.style.opacity = '1';
      const content = modal.querySelector('.articulo-modal__content');
      if (content) {
        content.style.transform = 'translateY(0) scale(1)';
      }
    }, 10);
    
    console.log('✅ Modal abierto correctamente');
    
  } catch (err) {
    console.error('Error inesperado:', err);
    alert('Error al cargar el artículo');
  }
};

// ==========================================
// CERRAR MODAL
// ==========================================
window.cerrarModal = function() {
  const modal = document.getElementById('modalArticuloActivo');
  if (modal) {
    modal.style.opacity = '0';
    const content = modal.querySelector('.articulo-modal__content');
    if (content) {
      content.style.transform = 'translateY(20px) scale(0.95)';
    }
    setTimeout(() => {
      modal.remove();
      document.body.style.overflow = '';
    }, 300);
    console.log('🔒 Modal cerrado');
  }
};

// ==========================================
// COPIAR ENLACE
// ==========================================
window.copiarEnlace = function() {
  navigator.clipboard.writeText(window.location.href).then(() => {
    alert('¡Enlace copiado al portapapeles!');
  }).catch(err => {
    console.error('Error al copiar:', err);
  });
};

// ==========================================
// EVENTOS GLOBALES
// ==========================================

// Cerrar modal al hacer clic fuera
document.addEventListener('click', (e) => {
  if (e.target && e.target.id === 'modalArticuloActivo') {
    cerrarModal();
  }
});

// Cerrar modal con tecla ESC
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    cerrarModal();
  }
});

// ==========================================
// INICIALIZAR
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  console.log('📰 Iniciando página de artículos...');
  cargarArticulosPublicos();
});