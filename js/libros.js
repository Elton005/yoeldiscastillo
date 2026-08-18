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

  // Definir badge y botones según el estado
  if (libro.estado === 'publicado' || !libro.estado) {
    if (libro.amazon_url) {
      botonesHTML += `<a href="${libro.amazon_url}" target="_blank" class="btn-amazon"><i class="fab fa-amazon"></i> Obtener en Amazon</a>`;
    }
    if (libro.apk_url) {
      botonesHTML += `
        <button onclick="verificarLoginYAccederAPK('${libro.apk_url}')" class="btn btn--outline" style="margin-top: 1rem;">
          <i class="fas fa-mobile-alt"></i> Experiencia Interactiva
        </button>
      `;
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

  // Definir imagen HTML (con fallback)
  const imagenHTML = libro.imagen_url 
    ? `<img src="${libro.imagen_url}" alt="${libro.titulo}" />` 
    : `<div style="width:100%; height:350px; background:var(--bg-tertiary); display:flex; align-items:center; justify-content:center; color:var(--gold-muted); border-radius:6px;"><i class="fas fa-book fa-3x"></i></div>`;

  // Definir acordeón (solo si hay prólogo)
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

  // Ahora sí, el return con todo definido
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

// Función para verificar login antes de acceder a la APK
window.verificarLoginYAccederAPK = async function(apkUrl) {
  if (!window.sb) {
    window.open(apkUrl, '_blank');
    return;
  }
  
  const { data: { session } } = await window.sb.auth.getSession();
  
  if (session) {
    // Usuario logueado: abrir APK
    window.open(apkUrl, '_blank');
  } else {
    // Usuario NO logueado: mostrar toast elegante
    const toast = mostrarToast(
      'Debes iniciar sesión para acceder a la experiencia interactiva.',
      'warning',
      'Acceso restringido',
      0 // 0 = no se cierra automáticamente
    );
    
    // Agregar botones personalizados al toast
    const actionsContainer = toast.querySelector('#toastActions');
    if (actionsContainer) {
      actionsContainer.innerHTML = `
        <button class="toast__btn toast__btn--primary" onclick="abrirModalDesdeToast()">
          <i class="fas fa-sign-in-alt"></i> Iniciar Sesión
        </button>
        <button class="toast__btn toast__btn--secondary" onclick="cerrarToast(this.closest('.toast'))">
          Ahora no
        </button>
      `;
    }
  }
};

// Función auxiliar para abrir el modal desde el toast
window.abrirModalDesdeToast = function() {
  // Cerrar todos los toasts primero
  document.querySelectorAll('.toast').forEach(t => cerrarToast(t));
  
  // Abrir modal de login
  const modal = document.getElementById('modalAuth');
  if (modal) {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }
};

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