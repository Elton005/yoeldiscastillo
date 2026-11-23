import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthProvider";
import { googleLogin } from "../auth/actions";
import {
  contentKey,
  deleteContent,
  listContent,
  getBookVisibilitySupport,
  reorderContent,
} from "../services/content";

import { tables, type Content, type Table, safeUrl } from "../models/content";
import { ContentState } from "../components/ContentState";
import { Icon } from "../components/Icon";
import ContentEditor from "./ContentEditor";
import Memberships from "./Memberships";
import SiteSettingsEditor from "./SiteSettingsEditor";
const labels = {
  libros: "Libros",
  articulos: "Artículos",
  destacados: "Destacados",
};
const icons = { libros: "book", articulos: "newspaper", destacados: "star" };
function Dashboard() {
  const { role } = useAuth();
  const [tab, setTab] = useState<Table | "usuarios" | "pagina">("libros");
  const [editing, setEditing] = useState<Content | "new">("new");
  const [revision, setRevision] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("todos");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const cache = useQueryClient();
  const books = useQuery({
    queryKey: contentKey("libros", true),
    queryFn: () => listContent("libros", true),
  });
  const articles = useQuery({
    queryKey: contentKey("articulos", true),
    queryFn: () => listContent("articulos", true),
  });
  const features = useQuery({
    queryKey: contentKey("destacados", true),
    queryFn: () => listContent("destacados", true),
  });
  const queries = { libros: books, articulos: articles, destacados: features };
  const selected = tab === "usuarios" || tab === "pagina" ? null : tab;
  const query = selected ? queries[selected] : null;
  function resetEditor() {
    setEditing("new");
    setRevision((value) => value + 1);
    setDirty(false);
  }
  function changeTab(value: typeof tab) {
    if (dirty && !window.confirm("¿Descartar los cambios sin guardar?")) return;
    setTab(value);
    resetEditor();
    setSearch("");
    setFilter("todos");
    setMessage("");
  }
  async function invalidate(table: Table) {
    await cache.invalidateQueries({ queryKey: [table] });
  }
  async function move(id: string | number, direction: "up" | "down") {
    if (!selected) return;
    setBusy(true);
    setMessage("");
    try {
      await reorderContent(selected, id, direction);
      await invalidate(selected);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "No se pudo cambiar el orden.",
      );
    } finally {
      setBusy(false);
    }
  }
  const rows = query?.data?.filter(
    (item) =>
      `${item.titulo} ${item.subtitulo || ""}`
        .toLocaleLowerCase("es")
        .includes(search.toLocaleLowerCase("es")) &&
      (filter === "todos" ||
        (filter === "publicos"
          ? selected === "libros"
            ? item.visible !== false
            : selected === "articulos"
              ? item.publicado
              : item.activo
          : selected === "libros"
            ? item.visible === false
            : selected === "articulos"
              ? !item.publicado
              : !item.activo)),
  );
  return (
    <section id="dashboardScreen" className="admin-page">
      <div className="container">
        <nav className="admin-tabs" aria-label="Secciones del panel">
          {tables.map((table) => (
            <button
              key={table}
              className={`admin-tab${tab === table ? " active" : ""}`}
              aria-current={tab === table ? "page" : undefined}
              onClick={() => changeTab(table)}
            >
              <Icon name={icons[table]} />
              {labels[table]}
            </button>
          ))}
          <button
            className={`admin-tab${tab === "pagina" ? " active" : ""}`}
            aria-current={tab === "pagina" ? "page" : undefined}
            onClick={() => changeTab("pagina")}
          >
            <Icon name="sliders-h" /> Página web
          </button>
          {role === "admin" && (
            <button
              className={`admin-tab${tab === "usuarios" ? " active" : ""}`}
              aria-current={tab === "usuarios" ? "page" : undefined}
              onClick={() => changeTab("usuarios")}
            >
              <Icon name="users" />
              Administradores
            </button>
          )}
        </nav>
        <h1 className="page__title page__title--left">
          <Icon
            name={
              selected
                ? icons[selected]
                : tab === "pagina"
                  ? "sliders-h"
                  : "users"
            }
          />{" "}
          {selected
            ? `Gestionar ${labels[selected]}`
            : tab === "pagina"
              ? "Personalizar página web"
              : "Administradores"}
        </h1>
        {tab === "usuarios" && role === "admin" && <Memberships />}
        {tab === "pagina" && <SiteSettingsEditor onDirtyChange={setDirty} />}
        {selected && query && (
          <>
            {selected === "destacados" && (
              <p className="features-admin-description">
                Estas son las tarjetas que aparecen en la página de inicio.
                Modifica el contenido, activa/desactiva o reordena según tus
                necesidades.
              </p>
            )}
            <ContentEditor
              key={`${selected}-${editing === "new" ? "new" : editing.id}-${revision}`}
              table={selected}
              item={editing === "new" ? undefined : editing}
              related={{
                libro: books.data ?? [],
                articulo: articles.data ?? [],
              }}
              onDirtyChange={setDirty}
              bookVisibilityEnabled={getBookVisibilitySupport() === true}
              onClose={resetEditor}
              onSaved={async () => {
                await invalidate(selected);
                resetEditor();
                setMessage("Cambios guardados.");
              }}
            />
            <div className="admin-tools">
              <label>
                Buscar
                <input
                  className="admin-input"
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Título o subtítulo"
                />
              </label>
              <label>
                Visibilidad
                <select
                  className="select-input"
                  value={filter}
                  onChange={(event) => setFilter(event.target.value)}
                >
                  <option value="todos">Todos</option>
                  <option value="publicos">Públicos</option>
                  <option value="ocultos">Ocultos / borradores</option>
                </select>
              </label>
              <button
                className="btn btn--outline"
                onClick={() => {
                  if (
                    !dirty ||
                    window.confirm("¿Descartar los cambios sin guardar?")
                  )
                    resetEditor();
                }}
              >
                Crear{" "}
                {selected === "libros"
                  ? "libro"
                  : selected === "articulos"
                    ? "artículo"
                    : "destacado"}
              </button>
            </div>
            {message && (
              <p role="status" className="notice">
                {message}
              </p>
            )}
            <ContentState
              loading={query.isPending}
              error={query.error}
              empty={!query.data?.length}
              retry={query.refetch}
            >
              <div className="admin-list">
                {rows?.map((item) => {
                  const image = safeUrl(item.imagen_url || "", true);
                  const status =
                    selected === "libros"
                      ? item.visible === false
                        ? "Oculto"
                        : item.estado || "publicado"
                      : selected === "articulos"
                        ? item.publicado
                          ? "Publicado"
                          : "Borrador"
                        : item.activo
                          ? "Activo"
                          : "Inactivo";
                  return (
                    <article key={item.id} className="admin-item">
                      <div className="admin-item-info">
                        <div className="order-buttons">
                          <button
                            className="btn-orden"
                            aria-label={`Subir ${item.titulo}`}
                            disabled={busy || query.data?.[0].id === item.id}
                            onClick={() => {
                              void move(item.id, "up");
                            }}
                          >
                            <Icon name="chevron-up" />
                          </button>
                          <button
                            className="btn-orden"
                            aria-label={`Bajar ${item.titulo}`}
                            disabled={
                              busy || query.data?.at(-1)?.id === item.id
                            }
                            onClick={() => {
                              void move(item.id, "down");
                            }}
                          >
                            <Icon name="chevron-down" />
                          </button>
                        </div>
                        {image && (
                          <img
                            className="admin-thumb"
                            src={image}
                            alt={item.titulo}
                          />
                        )}
                        <div className="admin-item-copy">
                          <h3>{item.titulo}</h3>
                          {selected === "libros" && (
                            <p>{item.subtitulo || "Sin subtítulo"}</p>
                          )}
                          <span
                            className={`status-badge status-${status === "Borrador" ? "draft" : status.toLowerCase()}`}
                          >
                            <Icon
                              name={
                                status === "Borrador" ? "clock" : "check-circle"
                              }
                            />{" "}
                            {status}
                          </span>
                        </div>
                      </div>
                      <div className="admin-actions">
                        <button
                          className="btn-icon"
                          aria-label={`Editar ${item.titulo}`}
                          title="Editar"
                          onClick={() => {
                            if (
                              dirty &&
                              !window.confirm(
                                "¿Descartar los cambios sin guardar?",
                              )
                            )
                              return;
                            setEditing(item);
                            setDirty(false);
                            document
                              .querySelector(".editor-panel")
                              ?.scrollIntoView({
                                behavior: "smooth",
                                block: "start",
                              });
                          }}
                        >
                          <Icon name="edit" />
                        </button>
                        <button
                          className="btn-icon delete"
                          disabled={busy}
                          aria-label={`Eliminar ${item.titulo}`}
                          title="Eliminar"
                          onClick={() => {
                            if (
                              !window.confirm(
                                `¿Eliminar «${item.titulo}»? Esta acción no se puede deshacer.`,
                              )
                            )
                              return;
                            setBusy(true);
                            setMessage("");
                            void deleteContent(selected, item.id)
                              .then(async () => {
                                await invalidate(selected);
                                setMessage(
                                  "Publicación eliminada. Las imágenes se conservan para evitar borrar recursos compartidos.",
                                );
                              })
                              .catch((error) =>
                                setMessage(
                                  error instanceof Error
                                    ? error.message
                                    : "No se pudo eliminar.",
                                ),
                              )
                              .finally(() => setBusy(false));
                          }}
                        >
                          <Icon name="trash-alt" />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
              {!rows?.length && (
                <p className="notice">
                  No hay coincidencias con estos filtros.
                </p>
              )}
            </ContentState>
          </>
        )}
        <details className="admin-supplement">
          <summary>Resumen del contenido</summary>
          <div className="metrics">
            {tables.map((table) => (
              <button key={table} onClick={() => changeTab(table)}>
                <span>{labels[table]}</span>
                <strong>
                  {queries[table].isPending
                    ? "…"
                    : queries[table].error
                      ? "—"
                      : (queries[table].data?.length ?? 0)}
                </strong>
                <small>
                  {queries[table].error
                    ? "No se pudo cargar"
                    : "Registros en el catálogo"}
                </small>
              </button>
            ))}
          </div>
        </details>
      </div>
    </section>
  );
}
export default function Admin() {
  const { loading, user, role } = useAuth();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  if (loading)
    return (
      <section className="contacto-page admin-access">
        <p role="status">Verificando acceso…</p>
      </section>
    );
  if (user && role) return <Dashboard />;
  return (
    <section id="loginScreen" className="contacto-page admin-access">
      <div className="contacto-card">
        <i className="fas fa-lock contacto__icon" aria-hidden="true" />
        <h1 className="contacto__title">Acceso Restringido</h1>
        <p className="contacto__text">
          {user
            ? "Tu cuenta no tiene autorización para administrar este sitio."
            : "Esta área es exclusiva para administradores autorizados."}
        </p>
        <button
          className="btn btn--solid"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void googleLogin("/admin.html").catch(() => {
              setBusy(false);
              setMessage("No se pudo iniciar el acceso con Google.");
            });
          }}
        >
          <Icon name="google" brand />
          Iniciar sesión con Google
        </button>
        <Link className="email-access" to="/acceso?next=%2Fadmin.html">
          Acceder con correo
        </Link>
        {message && (
          <p className="notice" role="alert">
            {message}
          </p>
        )}
      </div>
    </section>
  );
}
