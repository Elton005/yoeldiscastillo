// ==========================================
// CARGA DE DESTACADOS EN INDEX
// ==========================================
async function cargarDestacados() {
  const container = document.getElementById('gridDestacados');
  if (!container) return;

  try {
    const { data, error } = await sb
      .from('destacados')
      .select('*')
      .eq('activo', true)
      .order('orden', { ascending: true })
      .limit(2); // Solo los 2 primeros

    if (error) throw error;

    if (!data || data.length === 0) {
      container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 3rem; grid-column: 1 / -1;">Próximamente más contenido.</p>';
      return;
    }

    container.innerHTML = data.map(destacado => generarCardDestacado(destacado)).join('');
    
  } catch (err) {
    console.error('Error al cargar destacados:', err);
    container.innerHTML = '<p style="text-align: center; color: #ff6b6b; padding: 3rem; grid-column: 1 / -1;">Error al cargar el contenido.</p>';
  }
}

function generarCardDestacado(d) {
  // Determinar ícono según tipo
  const iconos = {
    'app': 'fa-mobile-alt',
    'articulo': 'fa-feather-alt',
    'libro': 'fa-book',
    'personalizado': 'fa-star'
  };
  const icono = iconos[d.tipo] || 'fa-star';
  
  // Determinar si el botón requiere login (solo para tipo 'app')
  const requiereLogin = d.tipo === 'app';
  const onclickAttr = requiereLogin 
    ? `onclick="verificarLoginYAccederAPK('${d.url_boton}')"` 
    : '';
  const hrefAttr = !requiereLogin ? `href="${d.url_boton || '#'}"` : '';
  const tag = requiereLogin ? 'button' : 'a';

  const badgeHTML = d.badge_texto 
    ? `<div class="promo-card__badge"><i class="fas fa-${icono}"></i> ${d.badge_texto}</div>` 
    : '';

  const imagenHTML = d.imagen_url 
    ? `<div class="promo-card__image"><img src="${d.imagen_url}" alt="${d.titulo}" loading="lazy" /></div>` 
    : '';

  return `
    <article class="promo-card promo-card--${d.tipo}">
      ${badgeHTML}
      <div class="promo-card__content">
        <div class="promo-card__icon">
          <i class="fas ${icono}"></i>
        </div>
        <h3 class="promo-card__title">${d.titulo}</h3>
        <p class="promo-card__subtitle">${d.subtitulo || ''}</p>
        <p class="promo-card__text">${d.descripcion || ''}</p>
        <${tag} ${hrefAttr} ${onclickAttr} class="promo-card__btn">
          <i class="fas fa-${requiereLogin ? 'play-circle' : 'arrow-right'}"></i> ${d.texto_boton || 'Ver más'}
        </${tag}>
      </div>
      ${imagenHTML}
    </article>
  `;
}

// Cargar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', cargarDestacados);