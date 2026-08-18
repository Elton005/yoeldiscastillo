// Configuración de Supabase (misma que antes)
const SUPABASE_URL = 'https://jjbztkljgsdwrqylspeg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqYnp0a2xqZ3Nkd3JxeWxzcGVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2NDE4MjgsImV4cCI6MjEwMjIxNzgyOH0.lDYEuyrbVDRoMyQwfj4nQk-gve84RhZiFnyRAYhGfD4';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Mostrar/ocultar modal
function abrirModalAuth() {
  document.getElementById('modalAuth').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function cerrarModalAuth() {
  document.getElementById('modalAuth').style.display = 'none';
  document.body.style.overflow = '';
}

// Cambiar entre login y registro
function cambiarTab(tab) {
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
}

// Login con email/password
document.getElementById('formLogin')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    alert('Error: ' + error.message);
  } else {
    cerrarModalAuth();
    alert('¡Bienvenido!');
    actualizarUIUsuario();
  }
});

// Registro
document.getElementById('formRegistro')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('registroEmail').value;
  const password = document.getElementById('registroPassword').value;
  const nombre = document.getElementById('registroNombre').value;
  
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: { data: { nombre } }
  });
  
  if (error) {
    alert('Error: ' + error.message);
  } else {
    alert('¡Registro exitoso! Revisa tu correo para confirmar.');
    cambiarTab('login');
  }
});

// Login con Google
async function loginConGoogle() {
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.href }
  });
  if (error) alert('Error: ' + error.message);
}

// Cerrar sesión
async function cerrarSesionUsuario() {
  await sb.auth.signOut();
  actualizarUIUsuario();
}

// Actualizar UI según estado de auth
async function actualizarUIUsuario() {
  const { data: { session } } = await sb.auth.getSession();
  const btnLogin = document.getElementById('btnLoginUsuario');
  
  if (session) {
    btnLogin.innerHTML = `<i class="fas fa-user-circle"></i> ${session.user.email.split('@')[0]}`;
    btnLogin.onclick = () => {
      if (confirm('¿Cerrar sesión?')) cerrarSesionUsuario();
    };
  } else {
    btnLogin.innerHTML = '<i class="fas fa-user"></i> Iniciar Sesión';
    btnLogin.onclick = abrirModalAuth;
  }
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
  actualizarUIUsuario();
  
  // Cerrar modal al hacer clic fuera
  document.getElementById('modalAuth')?.addEventListener('click', (e) => {
    if (e.target.id === 'modalAuth') cerrarModalAuth();
  });
});
