import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { AuthDialogsProvider, useAuthDialogs } from "../auth/AuthDialogs";
import { db } from "../lib/supabase";
import { useSiteSettings } from "../hooks/useSiteSettings";
import { publicAsset, safeUrl } from "../models/content";
import { SiteFooter } from "./SiteFooter";
import { Icon } from "./Icon";
const navigation = [
  ["/", "INICIO"],
  ["/sobre-mi.html", "SOBRE MÍ"],
  ["/libros.html", "LIBROS"],
  ["/articulos.html", "ARTÍCULOS"],
  ["/contacto.html", "CONTACTO"],
];
function Social() {
  const settings = useSiteSettings();
  return (
    <div className="social social--desktop">
      {[
        ["facebook-f", "Facebook", settings.facebook],
        ["instagram", "Instagram", settings.instagram],
        ["linkedin-in", "LinkedIn", settings.linkedin],
      ].map(([name, label, url]) => (
        <a
          key={name}
          role="link"
          aria-label={label}
          href={safeUrl(url) || undefined}
          target={url ? "_blank" : undefined}
          rel={url ? "noopener noreferrer" : undefined}
          aria-disabled={!url || undefined}
          tabIndex={url ? undefined : -1}
          title={url ? label : "Perfil social pendiente de configurar"}
        >
          <Icon name={name} brand />
        </a>
      ))}
    </div>
  );
}
function Shell() {
  const publicHeader = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const toggle = useRef<HTMLButtonElement>(null);
  const { user } = useAuth();
  const { openAuth } = useAuthDialogs();
  const { pathname } = useLocation();
  const isAdmin = /^\/admin(?:\.html|\/|$)/.test(pathname);
  useEffect(() => {
    const header = publicHeader.current;
    if (!header) return;
    const syncHeight = () =>
      document.documentElement.style.setProperty(
        "--public-header-height",
        `${header.getBoundingClientRect().height}px`,
      );
    syncHeight();
    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(syncHeight)
        : null;
    observer?.observe(header);
    window.addEventListener("resize", syncHeight);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", syncHeight);
      document.documentElement.style.removeProperty("--public-header-height");
    };
  }, [isAdmin]);
  const home =
    pathname === "/" || pathname === "/index.html" || pathname === "/acceso";
  useEffect(() => {
    setOpen(false);
    window.scrollTo(0, 0);
  }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggle.current?.focus();
      }
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [open]);
  async function logout() {
    try {
      const result = await db().auth.signOut();
      if (result.error) throw result.error;
    } catch {
      setError("No se pudo cerrar sesión. Vuelve a intentarlo.");
    }
  }
  const authLabel = user
    ? user.email?.split("@")[0] || "Usuario"
    : "Iniciar Sesión";
  return (
    <div className={isAdmin ? "site-admin-shell" : "site-public-shell"}>
      <a className="skip" href="#contenido">
        Saltar al contenido
      </a>
      {isAdmin ? (
        <header className="header-admin">
          <div className="container header-admin__container">
            <div className="header-admin__brand">
              <Icon name="shield-alt" />
              <div className="header-admin__text">
                <span className="header-admin__title">
                  Panel de Administración
                </span>
                <span className="header-admin__subtitle">YOELDIS CASTILLO</span>
              </div>
            </div>
            <button
              className="btn-logout"
              onClick={() => {
                void logout();
              }}
            >
              <Icon name="sign-out-alt" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </header>
      ) : (
        <header className="header" ref={publicHeader}>
          <div className="container header__container">
            <Link
              to="/"
              className="logo"
              aria-label="Yoeldis Castillo Quiala, inicio"
            >
              <span className="logo__yc">YC</span>
              <span className="logo__text">
                Yoeldis Castillo Quiala
                <br />
                <small>ESCRITOR</small>
              </span>
            </Link>
            <nav
              id="nav"
              className={`nav${open ? " active" : ""}`}
              aria-label="Navegación principal"
            >
              <ul className="nav__list">
                {navigation.map(([to, label]) => (
                  <li key={to}>
                    <NavLink
                      to={to}
                      end={to === "/"}
                      className={({ isActive }) =>
                        `nav__link${isActive ? " nav__link--active" : ""}`
                      }
                    >
                      {label}
                    </NavLink>
                  </li>
                ))}
              </ul>
              <div className="nav__login-mobile">
                <button
                  id="btnLoginUsuarioMobile"
                  className="btn btn--solid"
                  onClick={() => {
                    setOpen(false);
                    openAuth();
                  }}
                >
                  <Icon name={user ? "user-check" : "user"} />
                  {user ? "Mi cuenta" : authLabel}
                </button>
              </div>
            </nav>
            <div className="header__actions">
              <Social />
              <button
                id="btnLoginUsuarioDesktop"
                className="btn btn--outline btn-login"
                onClick={openAuth}
              >
                <Icon name={user ? "user-check" : "user"} />
                {authLabel}
              </button>
            </div>
            <button
              ref={toggle}
              className="nav__toggle"
              aria-label={open ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={open}
              aria-controls="nav"
              onClick={() => setOpen(!open)}
            >
              <Icon name={open ? "times" : "bars"} />
            </button>
          </div>
        </header>
      )}
      <main id="contenido" tabIndex={-1}>
        <Outlet />
      </main>
      {!isAdmin ? (
        <SiteFooter showQuote={home} />
      ) : (
        <footer className="footer">
          <div className="container">
            <p className="footer__pre-text">
              Experiencia interactiva desarrollada por
            </p>
            <div className="footer__brand">
              <img
                src={publicAsset("/img/Eltonlogo.jpg")}
                alt="EO Logo"
                className="footer__logo"
              />
              <h3 className="footer__name">ELTON OLIVARES</h3>
            </div>
            <p className="footer__tagline">INNOVACIÓN • DISEÑO • TECNOLOGÍA</p>
            {error && (
              <p className="notice" role="alert">
                {error}
              </p>
            )}
          </div>
        </footer>
      )}
    </div>
  );
}
export function Layout() {
  return (
    <AuthDialogsProvider>
      <Shell />
    </AuthDialogsProvider>
  );
}
