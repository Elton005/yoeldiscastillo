import { Link } from "react-router-dom";
import { useSiteSettings } from "../hooks/useSiteSettings";
import { safeUrl } from "../models/content";
const links = [
  ["/", "Inicio"],
  ["/sobre-mi.html", "Sobre mí"],
  ["/libros.html", "Libros"],
  ["/articulos.html", "Artículos"],
  ["/contacto.html", "Contacto"],
];
export function SiteFooter({ showQuote = false }: { showQuote?: boolean }) {
  const settings = useSiteSettings();
  const social = [
    ["Facebook", "facebook-f", settings.facebook],
    ["Instagram", "instagram", settings.instagram],
    ["LinkedIn", "linkedin-in", settings.linkedin],
  ].filter(([, , url]) => Boolean(safeUrl(url)));
  return (
    <footer className="site-footer">
      <div className="container">
        {showQuote && (
          <blockquote className="site-footer__quote">
            “{settings.footerQuote}”
          </blockquote>
        )}
        <div className="site-footer__grid">
          <section
            className="site-footer__identity"
            aria-labelledby="footer-author"
          >
            <p className="site-footer__eyebrow">
              Literatura y autoconocimiento
            </p>
            <h2 id="footer-author">Yoeldis Castillo Quiala</h2>
            <p className="site-footer__profession">
              Escritor | Psicología y desarrollo personal
            </p>
            <p className="site-footer__description">
              {settings.homeDescription}
            </p>
          </section>
          <nav
            className="site-footer__navigation"
            aria-label="Navegación del pie de página"
          >
            <h3>Explora</h3>
            <ul>
              {links.map(([to, label]) => (
                <li key={to}>
                  <Link to={to}>{label}</Link>
                </li>
              ))}
            </ul>
          </nav>
          <section
            className="site-footer__contact"
            aria-labelledby="footer-contact"
          >
            <h3 id="footer-contact">Sigamos en contacto</h3>
            <p>Libros, ideas y conversaciones que nos acercan.</p>
            <a
              className="site-footer__email"
              href={`mailto:${settings.contactEmail}`}
              aria-label="Enviar correo al autor"
            >
              {settings.contactEmail}
            </a>
            {social.length > 0 && (
              <ul className="site-footer__social" aria-label="Redes sociales">
                {social.map(([label, icon, url]) => (
                  <li key={label}>
                    <a
                      href={safeUrl(url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                    >
                      <i className={`fab fa-${icon}`} aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
        <div className="site-footer__bottom">
          <p>
            © {new Date().getFullYear()} Yoeldis Castillo Quiala · Todos los
            derechos reservados.
          </p>
          <p className="site-footer__credit">
            Desarrollado por <span>Elton Olivares</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
