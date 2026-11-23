import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  defaultSiteSettings,
  settingsGroups,
  settingsLabels,
  siteSettingsSchema,
  type SiteSettings,
} from "../models/siteSettings";
import {
  saveSiteSettings,
  readSiteSettings,
  siteSettingsKey,
  type SiteSettingsRecord,
} from "../services/siteSettings";
import {
  SiteSettingsPreview,
  useSiteSettingsQuery,
} from "../hooks/useSiteSettings";
import { uploadImage } from "../services/media";
import { safeUrl } from "../models/content";
import { About, Articles, Books, Contact } from "../pages/PublicPages";
import { HomeHero } from "../components/HomeHero";
import { Icon } from "../components/Icon";

export default function SiteSettingsEditor({
  onDirtyChange,
}: {
  onDirtyChange: (dirty: boolean) => void;
}) {
  const query = useSiteSettingsQuery();
  if (query.isPending)
    return (
      <p className="notice" role="status">
        Cargando ajustes…
      </p>
    );
  if (query.error && !query.data)
    return (
      <div className="notice" role="alert">
        <p>{query.error.message}</p>
        <button onClick={() => void query.refetch()}>Reintentar</button>
      </div>
    );
  if (!query.data?.available)
    return (
      <div className="notice" role="status">
        <p>
          La personalización todavía no está habilitada en este entorno. La
          página conserva sus textos e imágenes actuales.
        </p>
        <p>
          Falta preparar el almacenamiento de ajustes en Supabase. Consulta la
          guía de configuración del proyecto.
        </p>
      </div>
    );
  return (
    <>
      {query.error && (
        <p className="notice" role="alert">
          No se pudieron actualizar los ajustes. Tu borrador se conserva; puedes
          volver a intentar la recarga.
        </p>
      )}
      <SettingsForm
        initial={query.data}
        latestRevision={query.data.revision}
        onDirtyChange={onDirtyChange}
      />
    </>
  );
}
function SettingsForm({
  initial,
  latestRevision,
  onDirtyChange,
}: {
  initial: SiteSettingsRecord;
  latestRevision: number;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const [base, setBase] = useState(initial);
  const [group, setGroup] = useState(0);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [preview, setPreview] = useState<SiteSettings | null>(null);
  const [previewPage, setPreviewPage] = useState("inicio");
  const cache = useQueryClient();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<SiteSettings>({
    defaultValues: initial.settings,
    resolver: zodResolver(siteSettingsSchema),
  });
  const values = watch();
  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => {
      if (isDirty) event.preventDefault();
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [isDirty]);
  const disabled = isSubmitting || uploading || reloading;
  return (
    <div className="site-editor">
      <p className="site-editor__intro">
        Personaliza la página sin editar código. Los cambios se publican al
        guardar; puedes revisarlos antes en la vista previa.
      </p>
      <div
        className="settings-sections"
        role="group"
        aria-label="Contenido personalizable"
      >
        {settingsGroups.map((section, index) => (
          <button
            key={section.label}
            type="button"
            className={`admin-tab${group === index ? " active" : ""}`}
            aria-pressed={group === index}
            onClick={() => setGroup(index)}
          >
            {section.label}
          </button>
        ))}
      </div>
      <form
        className="editor-panel libro-detalle"
        onSubmit={handleSubmit(
          async (data) => {
            setMessage("");
            try {
              const saved = await saveSiteSettings(data, base.revision);
              setBase(saved);
              reset(saved.settings);
              setPreview(null);
              cache.setQueryData(siteSettingsKey, saved);
              await cache.invalidateQueries({ queryKey: siteSettingsKey });
              setMessage(
                "Página actualizada. Los cambios ya están disponibles en la web.",
              );
            } catch (error) {
              setMessage(
                error instanceof Error ? error.message : "No se pudo guardar.",
              );
            }
          },
          () =>
            setMessage(
              "Revisa los campos marcados en las secciones antes de continuar.",
            ),
        )}
      >
        {settingsGroups.map((section, index) => (
          <fieldset
            key={section.label}
            hidden={group !== index}
            disabled={disabled}
          >
            <legend>{section.label}</legend>
            {section.fields.map((name) => (
              <div className="settings-field" key={name}>
                <label htmlFor={`setting-${name}`}>
                  {settingsLabels[name]}
                </label>
                {name === "homeImageShape" ? (
                  <select
                    id={`setting-${name}`}
                    className="select-input"
                    {...register(name)}
                  >
                    <option value="rounded">Degradado suave</option>
                    <option value="circle">Óvalo</option>
                    <option value="original">Retrato completo</option>
                  </select>
                ) : [
                    "homeDescription",
                    "aboutBody",
                    "contactBody",
                    "footerQuote",
                  ].includes(name) ? (
                  <textarea
                    id={`setting-${name}`}
                    className="admin-input"
                    rows={name === "aboutBody" ? 12 : 4}
                    {...register(name)}
                  />
                ) : (
                  <input
                    id={`setting-${name}`}
                    className="admin-input"
                    type={
                      name === "homeImageSize"
                        ? "number"
                        : name === "contactEmail"
                          ? "email"
                          : "text"
                    }
                    min={name === "homeImageSize" ? 220 : undefined}
                    max={name === "homeImageSize" ? 760 : undefined}
                    {...register(
                      name,
                      name === "homeImageSize" ? { valueAsNumber: true } : {},
                    )}
                  />
                )}
                {errors[name] && (
                  <p className="field-error" role="alert">
                    {errors[name]?.message}
                  </p>
                )}
                {(name === "homeImage" ||
                  name === "aboutImage" ||
                  name === "homeBackground") && (
                  <div className="settings-image">
                    {safeUrl(String(values[name]), true) && (
                      <img
                        src={safeUrl(String(values[name]), true)}
                        alt={
                          name === "homeImage"
                            ? "Imagen de inicio seleccionada"
                            : name === "homeBackground"
                              ? "Fondo de biblioteca seleccionado"
                              : "Fotografía seleccionada"
                        }
                      />
                    )}
                    <label>
                      Subir imagen: {settingsLabels[name]}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/avif"
                        disabled={disabled}
                        onChange={(event) => {
                          const file = event.currentTarget.files?.[0];
                          event.currentTarget.value = "";
                          if (!file) return;
                          setUploading(true);
                          setMessage("");
                          void uploadImage(file)
                            .then((result) => {
                              setValue(name, result.url, {
                                shouldDirty: true,
                                shouldValidate: true,
                              });
                              setMessage(
                                "Imagen subida. Guarda los cambios para publicarla.",
                              );
                            })
                            .catch((error) =>
                              setMessage(
                                error instanceof Error
                                  ? error.message
                                  : "No se pudo subir.",
                              ),
                            )
                            .finally(() => setUploading(false));
                        }}
                      />
                    </label>
                  </div>
                )}
                {["facebook", "instagram", "linkedin"].includes(name) && (
                  <small>Deja vacío para mantener este perfil inactivo.</small>
                )}
              </div>
            ))}
          </fieldset>
        ))}
        {Object.keys(errors).length > 0 && (
          <p className="field-error">
            Campos pendientes:{" "}
            {Object.keys(errors)
              .map((key) => settingsLabels[key as keyof SiteSettings])
              .join(", ")}
          </p>
        )}
        {latestRevision !== base.revision && (
          <p className="notice" role="status">
            Hay una versión más reciente. Recarga los ajustes antes de publicar
            para evitar sobrescribirla.
          </p>
        )}
        <div className="editor-actions">
          <button className="btn btn--solid" disabled={disabled || !isDirty}>
            <Icon name="save" />{" "}
            {isSubmitting ? "Guardando…" : "Guardar página"}
          </button>
          <button
            type="button"
            className="btn btn--outline"
            disabled={disabled}
            onClick={() => {
              const result = siteSettingsSchema.safeParse(values);
              if (result.success) {
                setPreview(result.data);
                setMessage("");
              } else
                setMessage(
                  "Corrige los campos antes de abrir la vista previa.",
                );
            }}
          >
            Vista previa de la página
          </button>
          <button
            type="button"
            className="btn btn--outline"
            disabled={disabled}
            onClick={async () => {
              if (
                isDirty &&
                !window.confirm(
                  "¿Descartar el borrador y recargar los ajustes publicados?",
                )
              )
                return;
              setReloading(true);
              setMessage("");
              try {
                const latest = await cache.fetchQuery({
                  queryKey: siteSettingsKey,
                  queryFn: readSiteSettings,
                  staleTime: 0,
                });
                if (!latest.available)
                  throw new Error(
                    "Los ajustes no están disponibles en este entorno.",
                  );
                setBase(latest);
                reset(latest.settings);
                setPreview(null);
                setMessage("Ajustes publicados recargados.");
              } catch (error) {
                setMessage(
                  error instanceof Error
                    ? error.message
                    : "No se pudieron recargar los ajustes. Tu borrador se conserva.",
                );
              } finally {
                setReloading(false);
              }
            }}
          >
            {reloading ? "Recargando…" : "Descartar / recargar ajustes"}
          </button>
          <button
            type="button"
            className="btn btn--outline"
            disabled={disabled}
            onClick={() => {
              if (
                window.confirm(
                  "¿Preparar los textos, imágenes y formato iniciales? Solo se publicarán si guardas la página.",
                )
              ) {
                for (const key of Object.keys(
                  defaultSiteSettings,
                ) as (keyof SiteSettings)[])
                  setValue(key, defaultSiteSettings[key], {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                setPreview(null);
              }
            }}
          >
            Restaurar valores iniciales
          </button>
        </div>
        <p className="site-editor__hint">
          Revisión publicada: {base.revision}.{" "}
          {uploading
            ? "Subiendo imagen…"
            : isDirty
              ? "Tienes cambios sin guardar."
              : "No hay cambios pendientes."}
        </p>
        {message && (
          <p className="notice" role="status">
            {message}
          </p>
        )}
      </form>
      {preview && (
        <section
          className="settings-preview"
          aria-label="Vista previa sin publicar"
        >
          <div className="settings-preview__tools">
            <label>
              Página de la vista previa
              <select
                className="select-input"
                value={previewPage}
                onChange={(event) => setPreviewPage(event.target.value)}
              >
                <option value="inicio">Inicio</option>
                <option value="sobre-mi">Sobre mí</option>
                <option value="libros">Libros</option>
                <option value="articulos">Artículos</option>
                <option value="contacto">Contacto</option>
              </select>
            </label>
            <button
              type="button"
              className="btn btn--outline"
              onClick={() => setPreview(null)}
            >
              Cerrar vista previa
            </button>
          </div>
          <p className="site-editor__hint">
            Borrador sin publicar. Los enlaces están desactivados en esta vista.
          </p>
          <div
            onClickCapture={(event) => {
              if ((event.target as Element).closest("a"))
                event.preventDefault();
            }}
          >
            <SiteSettingsPreview value={preview}>
              {previewPage === "inicio" ? (
                <HomeHero />
              ) : previewPage === "sobre-mi" ? (
                <About />
              ) : previewPage === "libros" ? (
                <Books />
              ) : previewPage === "articulos" ? (
                <Articles />
              ) : (
                <Contact />
              )}
            </SiteSettingsPreview>
          </div>
          <div className="settings-preview__footer">
            <p>"{preview.footerQuote}"</p>
            <p>{preview.contactEmail}</p>
          </div>
        </section>
      )}
    </div>
  );
}
