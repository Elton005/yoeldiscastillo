console.log("✅ Script admin.js cargado correctamente");

const SUPABASE_URL = 'https://jjbztkljgsdwrqylspeg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqYnp0a2xqZ3Nkd3JxeWxzcGVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2NDE4MjgsImV4cCI6MjEwMjIxNzgyOH0.lDYEuyrbVDRoMyQwfj4nQk-gve84RhZiFnyRAYhGfD4';
const STORAGE_BUCKET = 'libros-imagenes';

if (!window.supabase) {
  console.error("❌ Error: La librería de Supabase no se cargó.");
}

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==========================================
// UTILIDADES
// ==========================================
function getEstadoIcon(estado) {
  const icons = { 'publicado': 'check-circle', 'proximamente': 'clock', 'agotado': 'times-circle' };
  return icons[estado] || 'book';
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function setButtonLoading(btn, isLoading, originalText) {
  if (isLoading) {
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
    btn.disabled = true;
  } else {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

// ==========================================
// NAVEGACIÓN POR TABS
// ==========================================
window.cambiarTab = function(tabName) {
  // Ocultar todos los tabs
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  
  // Desactivar todos los botones
  document.querySelectorAll('.admin-tab').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Mostrar el tab seleccionado
  document.getElementById(`tab-${tabName}`).classList.add('active');
  
  // Activar el botón correspondiente
  event.target.closest('.admin-tab').classList.add('active');
  
  // Cargar datos si es necesario
  if (tabName === 'libros') cargarLibros();
  if (tabName === 'articulos') cargarArticulos();
  if (tabName === 'administradores') cargarAdministradores();
};

// ==========================================
// SUBIDA DE IMÁGENES
// ==========================================
async function subirImagen(file) {
  if (!file) return null;
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
  
  const { data, error } = await sb.storage.from(STORAGE_BUCKET).upload(fileName, file, { cacheControl: '3600', upsert: false });
  if (error) throw error;
  
  const { data: urlData } = sb.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);
  return urlData.publicUrl;
}

function setupImagenPreview() {
  const input = document.getElementById('libroImagenFile');
  const preview = document.getElementById('imagenPreview');
  const hiddenInput = document.getElementById('libroImagen');
  const urlInput = document.getElementById('libroImagenUrl');
  
  if (!input) return;
  
  input.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      preview.src = event.target.result;
      preview.style.display = 'block';
    };
    reader.readAsDataURL(file);
    
    try {
      const btn = input.closest('form').querySelector('button[type="submit"]');
      const originalText = btn.innerHTML;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Subiendo...';
      btn.disabled = true;
      
      const publicUrl = await subirImagen(file);
      hiddenInput.value = publicUrl;
      
      btn.innerHTML = originalText;
      btn.disabled = false;
    } catch (error) {
      alert('Error al subir la imagen: ' + error.message);
      btn.disabled = false;
    }
  });
  
  if (urlInput) {
    urlInput.addEventListener('input', (e) => {
      hiddenInput.value = e.target.value;
      preview.src = e.target.value;
      preview.style.display = e.target.value ? 'block' : 'none';
    });
  }
}

// ==========================================
// ORDENAMIENTO (Función Mejorada)
// ==========================================
window.cambiarOrden = async function(tabla, id, direccion) {
  // Obtener todos los items ordenados correctamente
  const { data: items, error } = await sb
    .from(tabla)
    .select('id, orden')
    .order('orden', { ascending: true, nullsLast: false }); // nulls al inicio
    
  if (error) {
    console.error('Error al obtener items:', error);
    alert('Error al cargar los datos');
    return;
  }

  // Encontrar el índice del item actual
  const currentIndex = items.findIndex(item => item.id === id);
  if (currentIndex === -1) {
    console.error('Item no encontrado:', id);
    return;
  }

  // Calcular nuevo índice
  let newIndex = direccion === 'up' ? currentIndex - 1 : currentIndex + 1;
  
  // Validar límites
  if (newIndex < 0 || newIndex >= items.length) {
    console.log('Límite alcanzado');
    return;
  }

  const currentItem = items[currentIndex];
  const swapItem = items[newIndex];

  // Si ambos tienen orden null o undefined, usar los índices como referencia
  const currentOrden = currentItem.orden ?? currentIndex;
  const swapOrden = swapItem.orden ?? newIndex;

  console.log(`Intercambiando: ${currentItem.id} (orden: ${currentOrden}) <-> ${swapItem.id} (orden: ${swapOrden})`);

  // Actualizar en la base de datos
  const { error: updateError1 } = await sb
    .from(tabla)
    .update({ orden: swapOrden })
    .eq('id', currentItem.id);
    
  if (updateError1) {
    console.error('Error al actualizar primer item:', updateError1);
    alert('Error al guardar el orden');
    return;
  }

  const { error: updateError2 } = await sb
    .from(tabla)
    .update({ orden: currentOrden })
    .eq('id', swapItem.id);
    
  if (updateError2) {
    console.error('Error al actualizar segundo item:', updateError2);
    alert('Error al guardar el orden');
    return;
  }

  console.log('✅ Orden actualizado correctamente');
  
  // Recargar la lista
  if (tabla === 'libros') {
    await cargarLibros();
  } else {
    await cargarArticulos();
  }
};

// ==========================================
// GESTIÓN DE LIBROS
// ==========================================
async function cargarLibros() {
  const { data, error } = await sb
    .from('libros')
    .select('*')
    .order('orden', { ascending: true, nullsFirst: true })
    .order('creado_en', { ascending: false });
  
  const container = document.getElementById('listaLibros');
  if (error) {
    container.innerHTML = `<p style="color: #ff6b6b; text-align: center;"><i class="fas fa-exclamation-triangle"></i> Error: ${error.message}</p>`;
    return;
  }
  if (!data || data.length === 0) {
    container.innerHTML = `<p style="color: var(--text-secondary); text-align: center; padding: 2rem;"><i class="fas fa-inbox"></i> No hay libros registrados.</p>`;
    return;
  }

  container.innerHTML = data.map((libro, index) => `
    <div class="admin-item">
      <div style="flex: 1; display: flex; gap: 1rem; align-items: center;">
        <div style="display: flex; flex-direction: column; gap: 0.2rem;">
          <button onclick="cambiarOrden('libros', ${libro.id}, 'up')" class="btn-orden" ${index === 0 ? 'disabled' : ''}>
            <i class="fas fa-chevron-up"></i>
          </button>
          <button onclick="cambiarOrden('libros', ${libro.id}, 'down')" class="btn-orden" ${index === data.length - 1 ? 'disabled' : ''}>
            <i class="fas fa-chevron-down"></i>
          </button>
        </div>
        ${libro.imagen_url ? `<img src="${libro.imagen_url}" alt="${libro.titulo}" style="width: 50px; height: 75px; object-fit: cover; border-radius: 4px;" />` : ''}
        <div>
          <h4 style="color: var(--gold-primary); font-family: var(--font-heading); font-size: 1.1rem;">${libro.titulo}</h4>
          <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.3rem;">${libro.subtitulo || 'Sin subtítulo'}</p>
          <span class="status-badge status-${libro.estado || 'publicado'}">
            <i class="fas fa-${getEstadoIcon(libro.estado)}"></i> ${capitalizeFirstLetter(libro.estado || 'publicado')}
          </span>
        </div>
      </div>
      <div class="admin-actions">
        <button onclick="editarLibro(${libro.id})" class="btn-icon" title="Editar"><i class="fas fa-edit"></i></button>
        <button onclick="eliminarLibro(${libro.id})" class="btn-icon delete" title="Eliminar"><i class="fas fa-trash-alt"></i></button>
      </div>
    </div>
  `).join('');
}

async function guardarLibro(libroData, id = null) {
  return id 
    ? (await sb.from('libros').update(libroData).eq('id', id)).error
    : (await sb.from('libros').insert([libroData])).error;
}

async function eliminarLibro(id) {
  if (!confirm('¿Estás seguro de eliminar este libro?')) return;
  const { error } = await sb.from('libros').delete().eq('id', id);
  if (error) alert('Error: ' + error.message);
  else cargarLibros();
}

async function editarLibro(id) {
  const { data: libro, error } = await sb.from('libros').select('*').eq('id', id).single();
  if (error) return alert('Error: ' + error.message);
  
  document.getElementById('libroId').value = libro.id;
  document.getElementById('libroTitulo').value = libro.titulo || '';
  document.getElementById('libroSubtitulo').value = libro.subtitulo || '';
  document.getElementById('libroEstado').value = libro.estado || 'publicado';
  document.getElementById('libroDescripcion').value = libro.descripcion || '';
  document.getElementById('libroPrologo').value = libro.prologo || '';
  document.getElementById('libroImagen').value = libro.imagen_url || '';
  document.getElementById('libroImagenUrl').value = libro.imagen_url || '';
  document.getElementById('libroAmazon').value = libro.amazon_url || '';
  document.getElementById('libroApk').value = libro.apk_url || '';
  document.getElementById('libroFecha').value = libro.fecha_publicacion || '';
  
  const preview = document.getElementById('imagenPreview');
  if (libro.imagen_url) { preview.src = libro.imagen_url; preview.style.display = 'block'; }
  
  document.getElementById('btnLibroText').textContent = 'Actualizar Libro';
  document.getElementById('btnCancelarEdicion').style.display = 'inline-flex';
  document.getElementById('formLibro').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function cancelarEdicion() {
  document.getElementById('formLibro').reset();
  document.getElementById('libroId').value = '';
  document.getElementById('btnLibroText').textContent = 'Guardar Libro';
  document.getElementById('btnCancelarEdicion').style.display = 'none';
  document.getElementById('imagenPreview').style.display = 'none';
}

// ==========================================
// GESTIÓN DE ARTÍCULOS
// ==========================================
async function cargarArticulos() {
  const { data, error } = await sb
    .from('articulos')
    .select('*')
    .order('orden', { ascending: true, nullsFirst: true })
    .order('creado_en', { ascending: false });
  
  const container = document.getElementById('listaArticulos');
  if (error) {
    container.innerHTML = `<p style="color: #ff6b6b; text-align: center;"><i class="fas fa-exclamation-triangle"></i> Error: ${error.message}</p>`;
    return;
  }
  if (!data || data.length === 0) {
    container.innerHTML = `<p style="color: var(--text-secondary); text-align: center; padding: 2rem;"><i class="fas fa-inbox"></i> No hay artículos registrados.</p>`;
    return;
  }

  container.innerHTML = data.map((art, index) => `
    <div class="admin-item">
      <div style="flex: 1; display: flex; gap: 1rem; align-items: center;">
        <div style="display: flex; flex-direction: column; gap: 0.2rem;">
          <button onclick="cambiarOrden('articulos', ${art.id}, 'up')" class="btn-orden" ${index === 0 ? 'disabled' : ''}>
            <i class="fas fa-chevron-up"></i>
          </button>
          <button onclick="cambiarOrden('articulos', ${art.id}, 'down')" class="btn-orden" ${index === data.length - 1 ? 'disabled' : ''}>
            <i class="fas fa-chevron-down"></i>
          </button>
        </div>
        <div>
          <h4 style="color: var(--gold-primary); font-family: var(--font-heading); font-size: 1.1rem;">${art.titulo}</h4>
          <span class="status-badge ${art.publicado ? 'status-published' : 'status-draft'}">
            <i class="fas fa-${art.publicado ? 'check-circle' : 'clock'}"></i> ${art.publicado ? 'Publicado' : 'Borrador'}
          </span>
        </div>
      </div>
      <div class="admin-actions">
        <button onclick="editarArticulo(${art.id})" class="btn-icon" title="Editar"><i class="fas fa-edit"></i></button>
        <button onclick="eliminarArticulo(${art.id})" class="btn-icon delete" title="Eliminar"><i class="fas fa-trash-alt"></i></button>
      </div>
    </div>
  `).join('');
}

async function guardarArticulo(articuloData, id = null) {
  return id 
    ? (await sb.from('articulos').update(articuloData).eq('id', id)).error
    : (await sb.from('articulos').insert([articuloData])).error;
}

async function eliminarArticulo(id) {
  if (!confirm('¿Estás seguro de eliminar este artículo?')) return;
  const { error } = await sb.from('articulos').delete().eq('id', id);
  if (error) alert('Error: ' + error.message);
  else cargarArticulos();
}

async function editarArticulo(id) {
  const { data: art, error } = await sb.from('articulos').select('*').eq('id', id).single();
  if (error) return alert('Error: ' + error.message);
  
  document.getElementById('articuloId').value = art.id;
  document.getElementById('articuloTitulo').value = art.titulo || '';
  document.getElementById('articuloCategoria').value = art.categoria || '';
  document.getElementById('articuloResumen').value = art.resumen || '';
  
  if (tinymce.get('articuloContenido')) {
    tinymce.get('articuloContenido').setContent(art.contenido || '');
  }
  
  document.getElementById('articuloImagen').value = art.imagen_url || '';
  document.getElementById('articuloPublicado').checked = art.publicado !== false;
  
  document.getElementById('btnArticuloText').textContent = 'Actualizar Artículo';
  document.getElementById('btnCancelarEdicionArt').style.display = 'inline-flex';
  document.getElementById('formArticulo').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function cancelarEdicionArticulo() {
  document.getElementById('formArticulo').reset();
  document.getElementById('articuloId').value = '';
  document.getElementById('btnArticuloText').textContent = 'Guardar Artículo';
  document.getElementById('btnCancelarEdicionArt').style.display = 'none';
  document.getElementById('articuloPublicado').checked = true;
  if (tinymce.get('articuloContenido')) tinymce.get('articuloContenido').setContent('');
}

// ==========================================
// GESTIÓN DE ADMINISTRADORES
// ==========================================
async function cargarAdministradores() {
  const container = document.getElementById('listaAdministradores');
  
  // Obtener lista de administradores del código
  const adminEmails = [
    'rinchosilva5@gmail.com',
    'eltonaliolivares@gmail.com'
  ];
  
  if (adminEmails.length === 0) {
    container.innerHTML = `<p style="color: var(--text-secondary); text-align: center; padding: 2rem;"><i class="fas fa-inbox"></i> No hay administradores registrados.</p>`;
    return;
  }

  container.innerHTML = adminEmails.map(email => `
    <div class="admin-item-admin">
      <div class="admin-email">
        <i class="fas fa-user-shield"></i>
        <span>${email}</span>
      </div>
      <span class="admin-badge"><i class="fas fa-check"></i> Activo</span>
    </div>
  `).join('');
}

window.agregarAdministrador = async function() {
  const emailInput = document.getElementById('nuevoAdminEmail');
  const email = emailInput.value.trim();
  
  if (!email) {
    alert('Por favor ingresa un correo electrónico');
    return;
  }
  
  if (!email.includes('@')) {
    alert('Por favor ingresa un correo electrónico válido');
    return;
  }
  
  // NOTA: Para agregar un admin realmente, necesitas editar el archivo admin.js
  // y agregar el correo a la lista ADMIN_EMAILS
  alert(`Para agregar "${email}" como administrador:\n\n1. Abre el archivo js/admin.js\n2. Busca la constante ADMIN_EMAILS\n3. Agrega "${email}" a la lista\n4. Guarda y sube los cambios a Vercel`);
  
  emailInput.value = '';
};

// ==========================================
// INICIALIZACIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  console.log("✅ DOM cargado. Inicializando...");

  // 1. Inicializar TinyMCE
  tinymce.init({
    selector: '#articuloContenido',
    height: 400,
    menubar: false,
    plugins: 'anchor autolink charmap codesample emoticons image link lists media searchreplace table visualblocks wordcount',
    toolbar: 'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | link image media table | align lineheight | numlist bullist indent outdent | emoticons charmap | removeformat',
    content_style: 'body { font-family: Montserrat, sans-serif; font-size: 14px; color: #faf6f0; background-color: #2a1f1a; }',
    skin: 'oxide-dark',
    content_css: 'dark',
    branding: false
  });

  // 2. Autenticación
  const btnLogin = document.getElementById('btnLoginGoogle');
  if (btnLogin) {
    btnLogin.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        const { error } = await sb.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: window.location.href }
        });
        if (error) alert('Error: ' + error.message);
      } catch (err) {
        alert('Error inesperado: ' + err.message);
      }
    });
  }

  const btnLogout = document.getElementById('btnLogout');
  if (btnLogout) {
    btnLogout.addEventListener('click', async (e) => {
      e.preventDefault();
      await sb.auth.signOut();
      window.location.reload();
    });
  }

  sb.auth.onAuthStateChange((event, session) => {
    if (session) {
      document.getElementById('loginScreen').style.display = 'none';
      document.getElementById('dashboardScreen').style.display = 'block';
      cargarLibros();
    } else {
      document.getElementById('loginScreen').style.display = 'flex';
      document.getElementById('dashboardScreen').style.display = 'none';
    }
  });

  // 3. Setup de imagen
  setupImagenPreview();

  // 4. Listeners
  document.getElementById('btnCancelarEdicion')?.addEventListener('click', cancelarEdicion);
  document.getElementById('btnCancelarEdicionArt')?.addEventListener('click', cancelarEdicionArticulo);

  document.getElementById('formLibro')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    setButtonLoading(btn, true, originalText);

    const id = document.getElementById('libroId').value;
    const libroData = {
      titulo: document.getElementById('libroTitulo').value,
      subtitulo: document.getElementById('libroSubtitulo').value,
      estado: document.getElementById('libroEstado').value,
      descripcion: document.getElementById('libroDescripcion').value,
      prologo: document.getElementById('libroPrologo').value,
      imagen_url: document.getElementById('libroImagen').value || document.getElementById('libroImagenUrl').value,
      amazon_url: document.getElementById('libroAmazon').value,
      apk_url: document.getElementById('libroApk').value,
      fecha_publicacion: document.getElementById('libroFecha').value
    };

    const error = await guardarLibro(libroData, id ? parseInt(id) : null);
    setButtonLoading(btn, false, originalText);

    if (error) alert('Error: ' + error.message);
    else {
      alert(id ? '¡Libro actualizado!' : '¡Libro guardado!');
      cancelarEdicion();
      cargarLibros();
    }
  });

  document.getElementById('formArticulo')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    setButtonLoading(btn, true, originalText);

    const id = document.getElementById('articuloId').value;
    const articuloData = {
      titulo: document.getElementById('articuloTitulo').value,
      categoria: document.getElementById('articuloCategoria').value,
      resumen: document.getElementById('articuloResumen').value,
      contenido: tinymce.get('articuloContenido').getContent(),
      imagen_url: document.getElementById('articuloImagen').value,
      publicado: document.getElementById('articuloPublicado').checked
    };

    const error = await guardarArticulo(articuloData, id ? parseInt(id) : null);
    setButtonLoading(btn, false, originalText);

    if (error) alert('Error: ' + error.message);
    else {
      alert(id ? '¡Artículo actualizado!' : '¡Artículo guardado!');
      cancelarEdicionArticulo();
      cargarArticulos();
    }
  });
});