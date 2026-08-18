// ==========================================
// 1. CONFIGURACIÓN DE SUPABASE (Global)
// ==========================================
const SUPABASE_URL = 'https://jjbztkljgsdwrqylspeg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqYnp0a2xqZ3Nkd3JxeWxzcGVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2NDE4MjgsImV4cCI6MjEwMjIxNzgyOH0.lDYEuyrbVDRoMyQwfj4nQk-gve84RhZiFnyRAYhGfD4';

// Inicializar cliente solo si la librería cargó en el HTML
const sb = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
window.sb = sb; // Hacer sb accesible globalmente para otros scripts

// ==========================================
// 2. MENÚ HAMBURGUESA
// ==========================================
function initMenu() {
  const navToggle = document.getElementById('navToggle');
  const nav = document.getElementById('nav');

  if (!navToggle || !nav) return;

  navToggle.addEventListener('click', () => {
    nav.classList.toggle('active');
    const icon = navToggle.querySelector('i');
    if (nav.classList.contains('active')) {
      icon.classList.remove('fa-bars');
      icon.classList.add('fa-times');
    } else {
      icon.classList.remove('fa-times');
      icon.classList.add('fa-bars');
    }
  });

  // Cerrar menú al hacer click en un link
  document.querySelectorAll('.nav__link').forEach(link => {
    link.addEventListener('click', () => {
      nav.classList.remove('active');
      navToggle.querySelector('i').classList.remove('fa-times');
      navToggle.querySelector('i').classList.add('fa-bars');
    });
  });
}

// ==========================================
// 3. SISTEMA DE AUTENTICACIÓN (LOGIN)
// ==========================================
function actualizarUIAuth(session) {
  const btnDesktop = document.getElementById('btnLoginUsuarioDesktop');
  const btnMobile = document.getElementById('btnLoginUsuarioMobile');
  
  const nombreUsuario = session ? (session.user.email ? session.user.email.split('@')[0] : 'Usuario') : 'Iniciar Sesión';
  const icono = session ? 'fa-user-check' : 'fa-user';

  // Actualizar botón Desktop
  if (btnDesktop) {
    btnDesktop.innerHTML = `<i class="fas ${icono}"></i> ${nombreUsuario}`;
    btnDesktop.onclick = session ? cerrarSesion : abrirModalAuth;
  }
  
  // Actualizar botón Mobile
  if (btnMobile) {
    btnMobile.innerHTML = `<i class="fas ${icono}"></i> ${session ? 'Cerrar Sesión' : 'Iniciar Sesión'}`;
    btnMobile.onclick = session ? cerrarSesion : abrirModalAuth;
    
    // Cambiar estilo si está logueado para que parezca botón de salir
    if (session) {
      btnMobile.classList.remove('btn--solid');
      btnMobile.classList.add('btn--outline');
    } else {
      btnMobile.classList.remove('btn--outline');
      btnMobile.classList.add('btn--solid');
    }
  }
}

async function cerrarSesion() {
  if (confirm('¿Deseas cerrar sesión?')) {
    await sb.auth.signOut();
    window.location.reload();
  }
}

function abrirModalAuth() {
  const modal = document.getElementById('modalAuth');
  if (modal) {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    // Cerrar menú móvil si está abierto
    const nav = document.getElementById('nav');
    if (nav && nav.classList.contains('active')) {
      nav.classList.remove('active');
      const toggleIcon = document.getElementById('navToggle').querySelector('i');
      if (toggleIcon) {
        toggleIcon.classList.replace('fa-times', 'fa-bars');
      }
    }
  }
}

window.cerrarModalAuth = function() {
  const modal = document.getElementById('modalAuth');
  if (modal) {
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }
};

window.cambiarTab = function(tab) {
  const tabs = document.querySelectorAll('.modal-auth__tab');
  const formLogin = document.getElementById('formLogin');
  const formRegistro = document.getElementById('formRegistro');
  
  if (tab === 'login') {
    tabs[0].classList.add('active');
    tabs[1].classList.remove('active');
    formLogin.style.display = 'block';
    formRegistro.style.display = 'none';
  } else {
    tabs[0].classList.remove('active');
    tabs[1].classList.add('active');
    formLogin.style.display = 'none';
    formRegistro.style.display = 'block';
  }
};

window.loginConGoogle = async function() {
  if (!sb) return;
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.href }
  });
  if (error) alert('Error: ' + error.message);
};

// ==========================================
// 4. INICIALIZACIÓN AL CARGAR LA PÁGINA
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Iniciar menú
  initMenu();

  // 2. Iniciar sistema de login si Supabase está disponible
  if (sb) {
    // Verificar sesión actual
    const { data: { session } } = await sb.auth.getSession();
    actualizarUIAuth(session);

    
    // Escuchar cambios de sesión (login/logout en tiempo real)
    sb.auth.onAuthStateChange((event, session) => {
      actualizarUIAuth(session);
      if (event === 'SIGNED_IN') {
        cerrarModalAuth();
        // COMENTAR O ELIMINAR ESTA LÍNEA:
        // setTimeout(() => alert('¡Bienvenido!'), 100);
      }
    });

    // Manejar formulario de Login
    const formLogin = document.getElementById('formLogin');
    if (formLogin) {
      formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) alert('Error: ' + error.message);
      });
    }

    // Manejar formulario de Registro
    const formRegistro = document.getElementById('formRegistro');
    if (formRegistro) {
      formRegistro.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('registroEmail').value;
        const password = document.getElementById('registroPassword').value;
        const nombre = document.getElementById('registroNombre').value;
        
        const { error } = await sb.auth.signUp({
          email,
          password,
          options: { data: { nombre } }
        });
        
        if (error) {
          alert('Error: ' + error.message);
        } else {
          alert('¡Registro exitoso! Revisa tu correo para confirmar tu cuenta.');
          cambiarTab('login');
        }
      });
    }
  }

  // 3. Cerrar modal al hacer clic fuera de él
  const modalAuth = document.getElementById('modalAuth');
  if (modalAuth) {
    modalAuth.addEventListener('click', (e) => {
      if (e.target === modalAuth) {
        cerrarModalAuth();
      }
    });
  }
});

// ==========================================
// SISTEMA DE TOASTS (CARTeles DE NOTIFICACIÓN)
// ==========================================
window.mostrarToast = function(mensaje, tipo = 'info', titulo = '', duracion = 5000) {
  // Crear contenedor si no existe
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  
  // Crear el toast
  const toast = document.createElement('div');
  toast.className = `toast toast--${tipo}`;
  
  // Iconos según tipo
  const iconos = {
    'info': 'fa-info-circle',
    'error': 'fa-exclamation-circle',
    'success': 'fa-check-circle',
    'warning': 'fa-lock'
  };
  
  const tituloDefault = {
    'info': 'Información',
    'error': 'Error',
    'success': '¡Éxito!',
    'warning': 'Acción requerida'
  };
  
  toast.innerHTML = `
    <i class="fas ${iconos[tipo] || 'fa-info-circle'} toast__icon"></i>
    <div class="toast__content">
      <div class="toast__title">${titulo || tituloDefault[tipo]}</div>
      <div class="toast__message">${mensaje}</div>
      <div class="toast__actions" id="toastActions"></div>
    </div>
    <button class="toast__close" onclick="cerrarToast(this.parentElement)">
      <i class="fas fa-times"></i>
    </button>
  `;
  
  container.appendChild(toast);
  
  // Auto-cerrar después de la duración
  if (duracion > 0) {
    setTimeout(() => cerrarToast(toast), duracion);
  }
  
  return toast; // Retornar para poder agregar botones personalizados
};

window.cerrarToast = function(toast) {
  if (!toast) return;
  toast.classList.add('toast-hiding');
  setTimeout(() => toast.remove(), 300);
};