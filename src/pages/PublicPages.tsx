import { lazy, Suspense, useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listContent, contentKey } from "../services/content";
import {
  type Content,
  type Table,
  publicAsset,
  safeUrl,
} from "../models/content";
import { ContentState } from "../components/ContentState";
import { AuthorImage } from "../components/AuthorImage";
import { RichText } from "../components/RichText";
import { Icon } from "../components/Icon";
import { useDialog } from "../hooks/useDialog";
const ArticleSummary = lazy(() => import("../components/ArticleSummary"));
import { siteUrl } from "../lib/seo";
import { useSiteSettings } from "../hooks/useSiteSettings";
import { HomeHero } from "../components/HomeHero";
import { ResourceLink } from "../components/ResourceLink";
export function useContent(table: Table) {
  return useQuery({
    queryKey: contentKey(table),
    queryFn: () => listContent(table),
    staleTime: 30000,
    refetchInterval: 30000,
    retry: 1,
  });
}
function htmlOrText(text: string, className?: string) {
  return /<\/?[a-z][^>]*>/i.test(text) ? (
    <div className={className}>
      <RichText html={text} />
    </div>
  ) : (
    <p className={className}>{text}</p>
  );
}
export function BookCard({
  item,
  detail = false,
}: {
  item: Content;
  detail?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const image = safeUrl(item.imagen_url ?? "", true);
  const title = <Link to={`/libros/${item.id}`}>{item.titulo}</Link>;
  return (
    <article className="libro-detalle">
      <div className="libro-detalle__container">
        <div className="libro-detalle__portada">
          {image ? (
            <img src={image} alt={item.titulo} loading="lazy" />
          ) : (
            <div className="book-placeholder">
              <Icon name="book" />
            </div>
          )}
          {item.estado === "proximamente" && (
            <span className="badge-estado badge-proximamente">
              <Icon name="clock" /> Próximamente
            </span>
          )}
          {item.estado === "agotado" && (
            <span className="badge-estado badge-agotado">
              <Icon name="times-circle" /> Agotado
            </span>
          )}
        </div>
        <div className="libro-detalle__contenido">
          {detail ? (
            <h1 className="libro-detalle__titulo">{item.titulo}</h1>
          ) : (
            <h2 className="libro-detalle__titulo">{title}</h2>
          )}
          <p className="libro-detalle__subtitulo">{item.subtitulo || ""}</p>
          {htmlOrText(item.descripcion || "", "libro-detalle__descripcion")}
          {item.prologo && (
            <div className="acordeon">
              <button
                className="acordeon__trigger"
                aria-expanded={open}
                aria-controls={`extract-${item.id}`}
                onClick={() => setOpen(!open)}
              >
                <Icon name="book-open" /> DESCUBRE EL CONTENIDO
                <Icon name="chevron-down acordeon__icon" />
              </button>
              <div
                id={`extract-${item.id}`}
                className="acordeon__content"
                style={{ maxHeight: open ? "10000px" : "0" }}
                inert={!open}
              >
                <div className="acordeon__inner">
                  <h3>PRÓLOGO / EXTRACTO</h3>
                  {htmlOrText(item.prologo)}
                </div>
              </div>
            </div>
          )}
          {(!item.estado || item.estado === "publicado") && (
            <>
              {item.amazon_url && (
                <ResourceLink
                  className="btn-amazon"
                  url={item.amazon_url}
                  newTab
                >
                  <Icon name="amazon" brand /> Obtener en Amazon
                </ResourceLink>
              )}
              {item.apk_url && (
                <div className="book-app">
                  <ResourceLink url={item.apk_url} requiresLogin>
                    <Icon name="mobile-alt" /> Experiencia Interactiva
                  </ResourceLink>
                </div>
              )}
            </>
          )}
          {item.estado === "proximamente" && (
            <button className="btn btn--outline availability" disabled>
              Disponible muy pronto
            </button>
          )}
          {item.estado === "agotado" && (
            <button className="btn btn--outline availability" disabled>
              Actualmente agotado
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
function FeatureCard({ item }: { item: Content }) {
  const icons: Record<string, string> = {
    app: "mobile-alt",
    articulo: "feather-alt",
    libro: "book",
    personalizado: "star",
  };
  const icon = icons[item.tipo || ""] || "star";
  const image = safeUrl(item.imagen_url ?? "", true);
  return (
    <article
      className={`promo-card promo-card--${item.tipo || "personalizado"}${image ? "" : " promo-card--text"}`}
    >
      {item.badge_texto && (
        <div className="promo-card__badge">
          <Icon name={icon} />
          {item.badge_texto}
        </div>
      )}
      <div className="promo-card__content">
        <div className="promo-card__icon">
          <Icon name={icon} />
        </div>
        <h3 className="promo-card__title">{item.titulo}</h3>
        <p className="promo-card__subtitle">{item.subtitulo || ""}</p>
        <p className="promo-card__text">{item.descripcion || ""}</p>
        <ResourceLink
          className="promo-card__btn"
          url={item.url_boton || ""}
          requiresLogin={item.tipo === "app"}
        >
          <Icon name={item.tipo === "app" ? "play-circle" : "arrow-right"} />
          {item.texto_boton || "Ver más"}
        </ResourceLink>
      </div>
      {image && (
        <div className="promo-card__image">
          <img src={image} alt={item.titulo} loading="lazy" />
        </div>
      )}
    </article>
  );
}
export function Home() {
  const settings = useSiteSettings();
  const query = useContent("destacados");
  return (
    <>
      <HomeHero />
      <section className="sections-grid">
        <div className="container">
          <h2 className="sections-grid__title">
            <span className="sections-grid__divider" />
            {settings.homeHighlightsTitle}
            <span className="sections-grid__divider" />
          </h2>
          <ContentState
            loading={query.isPending}
            error={query.error}
            empty={!query.data?.length}
            retry={query.refetch}
          >
            <div id="gridDestacados" className="grid-2-promo">
              {query.data?.slice(0, 2).map((item) => (
                <FeatureCard item={item} key={item.id} />
              ))}
            </div>
          </ContentState>
        </div>
      </section>
    </>
  );
}
function BiographyText({ text }: { text: string }) {
  const phrases = [
    "Profesor Asistente, Máster en Dirección y Licenciado en Psicología",
    "diferencias individuales, el potencial humano",
    "conocerse mejor, comprender las propias fortalezas y áreas de mejora",
  ];
  const parts = text.split(new RegExp(`(${phrases.join("|")})`));
  return (
    <p>
      {parts.map((part, index) =>
        phrases.includes(part) ? <strong key={index}>{part}</strong> : part,
      )}
    </p>
  );
}
export function About() {
  const settings = useSiteSettings();
  return (
    <section className="autor-page">
      <div className="container">
        <div className="author-heading">
          <h1 className="page__title page__title--left">
            {settings.aboutTitle}
          </h1>
          <div className="section__divider section__divider--left" />
          <p className="section__subtitle">{settings.aboutSubtitle}</p>
        </div>
        <div className="author-biography">
          <div className="author-photo-column">
            {settings.aboutImage === "/img/autor.jpg" ? (
              <AuthorImage />
            ) : (
              <img
                src={safeUrl(settings.aboutImage, true)}
                alt="Retrato de Yoeldis Castillo Quiala"
                loading="lazy"
              />
            )}
          </div>
          <div className="author-content">
            <div className="autor-page__text">
              {settings.aboutBody.split(/\n\s*\n/).map((text, index) => (
                <BiographyText key={index} text={text} />
              ))}
            </div>
            <div className="autor-page__buttons">
              <Link className="btn btn--solid" to="/libros.html">
                <Icon name="book" /> EXPLORAR MIS LIBROS
              </Link>
              <Link className="btn btn--outline" to="/contacto.html">
                CONTACTAR <Icon name="chevron-right" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
export function Books() {
  const settings = useSiteSettings();
  const query = useContent("libros");
  return (
    <>
      <section className="libros-page">
        <div className="container">
          <h1 className="page__title">{settings.booksTitle}</h1>
          <div className="section__divider" />
          <p className="section__subtitle">{settings.booksSubtitle}</p>
          <ContentState
            loading={query.isPending}
            error={query.error}
            empty={!query.data?.length}
            retry={query.refetch}
          >
            <div id="lista-libros" className="libros-grid">
              {query.data?.map((item) => (
                <BookCard item={item} key={item.id} />
              ))}
            </div>
          </ContentState>
        </div>
      </section>
      <section className="escritor-amigo">
        <div className="container">
          <div className="escritor-amigo__header">
            <span className="escritor-amigo__label">
              LETRAS E HISTORIA DESDE 2006
            </span>
            <h2 className="escritor-amigo__titulo">
              Junior Osmany Coronel Durán
            </h2>
            <p className="escritor-amigo__profesion">
              Escritor (Narrador y ensayista) · Licenciado en Derecho
            </p>
          </div>
          <div className="escritor-amigo__container">
            <div className="escritor-amigo__contenido">
              <blockquote className="escritor-amigo__cita">
                "Cada libro deja una huella. La verdadera historia comienza en
                quien la lee."
              </blockquote>
              <div className="escritor-amigo__texto">
                <p>
                  Cada libro nace de una pregunta, una historia o una idea que
                  merece ser explorada. Aunque los géneros cambien, la búsqueda
                  permanece: ofrecer al lector una experiencia que perdure más
                  allá de la última página.
                </p>
              </div>
              <div className="escritor-amigo__acciones">
                <a
                  className="btn btn--solid"
                  href="https://lahuellaescrita.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Icon name="external-link-alt" /> Visitar su página
                </a>
                <a
                  className="btn btn--outline"
                  href="https://lahuellaescrita.com/biblioteca.html"
                >
                  <Icon name="book" /> Ver sus libros
                </a>
              </div>
            </div>
            <div className="escritor-amigo__imagen">
              <img
                src={publicAsset("/img/junior-osmany.jpg")}
                width="1026"
                height="976"
                alt="Junior Osmany Coronel Durán"
                loading="lazy"
              />
              <div className="escritor-amigo__imagen-overlay" />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
function ArticleBody({
  item,
  close,
  standalone = false,
}: {
  item: Content;
  close?: () => void;
  standalone?: boolean;
}) {
  const [message, setMessage] = useState("");
  const image = safeUrl(item.imagen_url ?? "", true);
  const permalink = `${siteUrl}/articulos/${item.id}`;
  const date =
    item.creado_en && Number.isFinite(Date.parse(item.creado_en))
      ? new Intl.DateTimeFormat("es-ES", {
          year: "numeric",
          month: "long",
          day: "numeric",
          timeZone: "UTC",
        }).format(new Date(item.creado_en))
      : "";
  return (
    <div
      className={`articulo-modal__content${standalone ? " standalone-article" : ""}`}
    >
      {close && (
        <button
          className="articulo-modal__close"
          onClick={close}
          aria-label="Cerrar artículo"
        >
          <Icon name="times" />
        </button>
      )}
      {image && (
        <div className="articulo-modal__header-img">
          <img src={image} alt={item.titulo} />
          <div className="articulo-modal__overlay" />
        </div>
      )}
      <div className="articulo-modal__body">
        {item.categoria && (
          <span className="articulo-modal__categoria">{item.categoria}</span>
        )}
        <h1 className="articulo-modal__titulo">{item.titulo}</h1>
        <div className="articulo-modal__meta">
          {date && (
            <span>
              <Icon name="calendar" /> {date}
            </span>
          )}
          <span>
            <Icon name="user" /> Yoeldis Castillo Quiala
          </span>
        </div>
        {item.resumen && (
          <p className="articulo-modal__resumen">{item.resumen}</p>
        )}
        <div className="articulo-modal__texto">
          <RichText html={item.contenido || ""} />
        </div>
        <div className="articulo-modal__footer">
          <div className="articulo-modal__compartir">
            <span>Compartir:</span>
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(permalink)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-compartir"
              aria-label="Compartir en Facebook"
            >
              <Icon name="facebook-f" brand />
            </a>
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(item.titulo)}&url=${encodeURIComponent(permalink)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-compartir"
              aria-label="Compartir en Twitter"
            >
              <Icon name="twitter" brand />
            </a>
            <a
              href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(permalink)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-compartir"
              aria-label="Compartir en LinkedIn"
            >
              <Icon name="linkedin-in" brand />
            </a>
            <button
              className="btn-compartir"
              aria-label="Copiar enlace"
              onClick={() => {
                void navigator.clipboard
                  .writeText(permalink)
                  .then(() => setMessage("Enlace copiado."))
                  .catch(() => setMessage("No se pudo copiar el enlace."));
              }}
            >
              <Icon name="link" />
            </button>
          </div>
          {message && <p role="status">{message}</p>}
        </div>
        <div className="articulo-modal__cerrar-final">
          {close ? (
            <button className="btn btn--solid" onClick={close}>
              <Icon name="times" /> Cerrar artículo
            </button>
          ) : (
            <Link className="btn btn--solid" to="/articulos.html">
              <Icon name="book-open" /> Volver a los artículos
            </Link>
          )}
        </div>
        <div className="articulo-modal__autor">
          <div className="autor-info">
            <h3>Yoeldis Castillo Quiala</h3>
            <p>
              Escritor, Psicólogo y Profesor especializado en desarrollo
              personal y comportamiento humano.
            </p>
            <Link
              to="/sobre-mi.html"
              className="btn btn--outline"
              onClick={close}
            >
              Conoce más sobre mí
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
function ArticleDialog({ item, close }: { item: Content; close: () => void }) {
  const ref = useDialog(close);
  return createPortal(
    <div
      className="articulo-modal"
      role="dialog"
      aria-modal="true"
      aria-label={item.titulo}
      ref={ref}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <ArticleBody item={item} close={close} />
    </div>,
    document.body,
  );
}
export function Articles() {
  const settings = useSiteSettings();
  const query = useContent("articulos");
  const [selected, setSelected] = useState<Content | null>(null);
  const close = useCallback(() => setSelected(null), []);
  return (
    <section className="articulos-page">
      <div className="container">
        <h1 className="page__title">{settings.articlesTitle}</h1>
        <div className="section__divider" />
        <p className="section__subtitle">{settings.articlesSubtitle}</p>
        <ContentState
          loading={query.isPending}
          error={query.error}
          empty={!query.data?.length}
          retry={query.refetch}
        >
          <div id="lista-articulos" className="articulos-grid">
            {query.data?.map((item) => {
              const image = safeUrl(item.imagen_url ?? "", true);
              return (
                <article className="articulo-card" key={item.id}>
                  <div className="articulo-card__img-wrapper">
                    {image ? (
                      <img
                        src={image}
                        alt={item.titulo}
                        className="articulo-card__img"
                        loading="lazy"
                      />
                    ) : (
                      <div className="articulo-card__img-placeholder">
                        <Icon name="newspaper fa-3x" />
                      </div>
                    )}
                  </div>
                  <div className="articulo-card__contenido">
                    {item.categoria && (
                      <span className="articulo-card__categoria">
                        <Icon name="tag" />
                        {item.categoria}
                      </span>
                    )}
                    <h2 className="articulo-card__titulo">
                      <Link to={`/articulos/${item.id}`}>{item.titulo}</Link>
                    </h2>
                    {item.resumen ? (
                      <p className="articulo-card__resumen">{item.resumen}</p>
                    ) : (
                      <Suspense
                        fallback={
                          <p className="articulo-card__resumen" role="status">
                            Cargando extracto…
                          </p>
                        }
                      >
                        <ArticleSummary html={item.contenido || ""} />
                      </Suspense>
                    )}
                    <button
                      className="btn btn--outline btn-leer-mas"
                      onClick={() => setSelected(item)}
                    >
                      <Icon name="book-open" /> Leer artículo
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </ContentState>
      </div>
      {selected && <ArticleDialog item={selected} close={close} />}
    </section>
  );
}
export function Detail({ table }: { table: "libros" | "articulos" }) {
  const { id } = useParams();
  const query = useContent(table);
  const item = query.data?.find((row) => String(row.id) === id);
  if (!query.isPending && !query.error && !item) return <NotFound />;
  return (
    <section className={table === "libros" ? "libros-page" : "articulos-page"}>
      <div className="container">
        <ContentState
          loading={query.isPending}
          error={query.error}
          empty={false}
          retry={query.refetch}
        >
          {item &&
            (table === "libros" ? (
              <>
                <Link
                  className="btn btn--outline detail-back"
                  to="/libros.html"
                >
                  Volver a la biblioteca
                </Link>
                <BookCard item={item} detail />
              </>
            ) : (
              <ArticleBody item={item} standalone />
            ))}
        </ContentState>
      </div>
    </section>
  );
}
export function Contact() {
  const settings = useSiteSettings();
  return (
    <section className="contacto-page">
      <div className="container">
        <div className="contacto-card">
          <i
            className="fas fa-envelope-open-text contacto__icon"
            aria-hidden="true"
          />
          <h1 className="contacto__title">{settings.contactTitle}</h1>
          <p className="contacto__text">
            {settings.contactBody
              .split(/(Estoy aquí para escucharte\.)/)
              .map((part, index) =>
                part === "Estoy aquí para escucharte." ? (
                  <strong key={index}>{part}</strong>
                ) : (
                  <span key={index} className="preserve-lines">
                    {part}
                  </span>
                ),
              )}
          </p>
          <a
            href={`mailto:${settings.contactEmail}`}
            className="contacto__email"
          >
            <Icon name="paper-plane" /> {settings.contactEmail}
          </a>
          <div className="contacto__divider" />
          <Link to="/" className="btn btn--outline">
            <Icon name="home" /> VOLVER AL INICIO
          </Link>
        </div>
      </div>
    </section>
  );
}
export function NotFound() {
  return (
    <section className="contacto-page">
      <div className="container">
        <div className="contacto-card">
          <h1 className="contacto__title">Página no encontrada</h1>
          <p className="contacto__text">
            Esta publicación no está disponible o la dirección ha cambiado.
          </p>
          <Link className="btn btn--solid" to="/">
            Volver al inicio
          </Link>
        </div>
      </div>
    </section>
  );
}
