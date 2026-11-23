import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Controller, useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  defaults,
  formSchema,
  safeUrl,
  type Content,
  type ContentForm,
  type Table,
} from "../models/content";
import { saveContent } from "../services/content";
import { uploadImage } from "../services/media";
import { RichText } from "../components/RichText";
import { Icon } from "../components/Layout";
const RichEditor = lazy(() => import("./RichEditor"));
export default function ContentEditor({
  table,
  item,
  related,
  onSaved,
  onClose,
  onDirtyChange,
  bookVisibilityEnabled = true,
}: {
  table: Table;
  item?: Content;
  related: Record<"libro" | "articulo", Content[]>;
  onSaved: () => Promise<void>;
  onClose: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  bookVisibilityEnabled?: boolean;
}) {
  const [preview, setPreview] = useState(false);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState<{ url: string; path: string }[]>([]);
  const [imageTarget, setImageTarget] = useState<"cover" | "inline">("cover");
  const fileInput = useRef<HTMLInputElement>(null);
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ContentForm>({
    defaultValues: defaults(item),
    resolver: zodResolver(formSchema),
  });
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);
  const values = watch();
  const disabled = isSubmitting || uploading;
  const noun =
    table === "libros"
      ? "Libro"
      : table === "articulos"
        ? "Artículo"
        : "Destacado";
  function field(
    name: FieldPath<ContentForm>,
    label: string,
    placeholder = label,
    multiline = false,
    type = "text",
    rows = 2,
  ) {
    const id = `${table}-${name}`;
    return (
      <div className="form-field">
        <label className="visually-hidden" htmlFor={id}>
          {label}
        </label>
        {multiline ? (
          <textarea
            id={id}
            className="admin-input"
            placeholder={placeholder}
            rows={rows}
            {...register(name)}
          />
        ) : (
          <input
            id={id}
            className="admin-input"
            placeholder={placeholder}
            type={type}
            {...register(
              name,
              type === "number" ? { valueAsNumber: true } : {},
            )}
          />
        )}{" "}
        {errors[name] && <p className="field-error">{errors[name]?.message}</p>}
      </div>
    );
  }
  const imageInput = (
    <div className="upload-block">
      <label className="upload-label" htmlFor={`${table}-file`}>
        <Icon name="image" />{" "}
        {table === "libros" ? "Imagen del libro" : "Imagen de portada"}
      </label>
      <div className="upload-row">
        <input
          ref={fileInput}
          id={`${table}-file`}
          aria-label="Archivo de imagen"
          className="admin-input"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          disabled={disabled}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            setUploading(true);
            setMessage("");
            void uploadImage(file)
              .then((result) => {
                setUploaded((previous) => [...previous, result]);
                if (imageTarget === "cover")
                  setValue("imagen_url", result.url, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                else
                  setValue(
                    "contenido",
                    `${values.contenido}<p><img src="${result.url}" alt="Imagen del artículo" /></p>`,
                    { shouldDirty: true },
                  );
              })
              .catch(() =>
                setMessage(
                  "No se pudo subir. Usa JPEG, PNG, WebP o AVIF hasta 5 MB y verifica tus permisos.",
                ),
              )
              .finally(() => {
                setUploading(false);
                setImageTarget("cover");
                if (fileInput.current) fileInput.current.value = "";
              });
          }}
        />
        {safeUrl(values.imagen_url, true) && (
          <img
            className="upload-preview"
            src={safeUrl(values.imagen_url, true)}
            alt="Vista previa de la imagen"
          />
        )}
      </div>
      <small>
        <Icon name="info-circle" />{" "}
        {uploading ? "Subiendo…" : "Sube una imagen o pega una URL"}
      </small>
      {field(
        "imagen_url",
        table === "articulos" ? "URL de portada" : "URL de imagen",
        "O pega una URL de imagen",
      )}
    </div>
  );
  return (
    <section
      className="libro-detalle editor-panel"
      aria-label="Editor de contenido"
    >
      <h3 className="editor-panel__heading">
        <Icon name="plus-circle" /> {item ? "Actualizar" : "Agregar Nuevo"}{" "}
        {noun}
      </h3>
      <form
        className="admin-form"
        onSubmit={handleSubmit(async (data) => {
          setMessage("");
          try {
            await saveContent(table, data, item?.id, item);
            await onSaved();
          } catch (error) {
            setMessage(
              error instanceof Error ? error.message : "No se pudo guardar.",
            );
          }
        })}
      >
        {field(
          "titulo",
          "Título *",
          table === "libros"
            ? "Título del libro *"
            : table === "articulos"
              ? "Título del artículo *"
              : "Título principal *",
        )}
        {table === "libros" && (
          <>
            {field("subtitulo", "Subtítulo")}
            <div>
              <label htmlFor="libro-estado" className="visually-hidden">
                Estado
              </label>
              <select
                id="libro-estado"
                className="select-input"
                {...register("estado")}
              >
                <option value="publicado">Publicado</option>
                <option value="proximamente">Próximamente</option>
                <option value="agotado">Agotado</option>
              </select>
            </div>
            {field("descripcion", "Descripción", "Descripción corta", true)}
            {field(
              "prologo",
              "Prólogo / extracto",
              "Prólogo o contenido destacado",
              true,
              "text",
              3,
            )}
            {imageInput}
            {field("amazon_url", "Enlace a Amazon")}
            {field(
              "apk_url",
              "Enlace a experiencia interactiva",
              "Enlace a APK (opcional)",
            )}
            {field(
              "fecha_publicacion",
              "Fecha de publicación",
              "",
              false,
              "date",
            )}
          </>
        )}
        {table === "articulos" && (
          <>
            {field("categoria", "Categoría")}
            {field("resumen", "Resumen", "Resumen corto", true)}
            <label className="visually-hidden" id="article-content-label">
              Contenido del artículo
            </label>
            <Suspense fallback={<p role="status">Cargando editor…</p>}>
              <Controller
                name="contenido"
                control={control}
                render={({ field: editorField }) => (
                  <RichEditor
                    value={editorField.value}
                    onChange={editorField.onChange}
                    addImage={() => {
                      setImageTarget("inline");
                      fileInput.current?.click();
                    }}
                  />
                )}
              />
            </Suspense>
            {errors.contenido && (
              <p className="field-error">{errors.contenido.message}</p>
            )}
            {imageInput}
            <label className="custom-checkbox">
              <input type="checkbox" {...register("publicado")} />
              Publicado (desmarcar para guardar borrador)
            </label>
            <details>
              <summary>HTML original y formato avanzado</summary>
              <p>
                El HTML antiguo se conserva mientras no lo edites. Al guardar
                contenido editado se eliminan elementos inseguros.
              </p>
              {field(
                "contenido",
                "Código HTML del artículo",
                "Contenido completo...",
                true,
                "text",
                8,
              )}
            </details>
          </>
        )}
        {table === "destacados" && (
          <>
            <div className="editor-pair">
              <label className="visually-hidden" htmlFor="destacado-tipo">
                Tipo
              </label>
              <select
                id="destacado-tipo"
                className="select-input"
                {...register("tipo")}
              >
                <option value="app">App Interactiva</option>
                <option value="articulo">Artículo</option>
                <option value="libro">Libro</option>
                <option value="personalizado">Personalizado</option>
              </select>
              {field(
                "badge_texto",
                "Etiqueta",
                "Texto del badge (ej: GRATIS, NUEVO)",
              )}
            </div>
            {field("subtitulo", "Subtítulo", "Subtítulo o categoría")}
            {field(
              "descripcion",
              "Descripción",
              "Descripción corta del contenido",
              true,
              "text",
              3,
            )}
            <div className="editor-pair">
              {field(
                "texto_boton",
                "Texto del botón",
                "Texto del botón (ej: Leer más)",
              )}
              {field(
                "url_boton",
                "Destino del botón",
                "URL de destino (ej: articulos.html o link APK)",
              )}
            </div>
            {imageInput}
            <label className="custom-checkbox">
              <input type="checkbox" {...register("activo")} />
              Mostrar en la página de inicio
            </label>
            {(values.tipo === "libro" || values.tipo === "articulo") && (
              <label className="editor-label">
                Asociar publicación
                <select
                  className="select-input"
                  defaultValue=""
                  onChange={(event) => {
                    if (event.target.value)
                      setValue(
                        "url_boton",
                        `/${values.tipo === "libro" ? "libros" : "articulos"}/${event.target.value}`,
                        { shouldDirty: true },
                      );
                  }}
                >
                  <option value="">
                    Selecciona una publicación o usa una URL
                  </option>
                  {related[values.tipo].map((record) => (
                    <option key={record.id} value={record.id}>
                      {record.titulo}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </>
        )}
        <details className="publication-options">
          <summary>Más opciones de publicación</summary>
          {table === "libros" && bookVisibilityEnabled && (
            <label className="custom-checkbox">
              <input type="checkbox" {...register("visible")} />
              Visible en la web pública
            </label>
          )}
          <label className="editor-label">
            Orden de aparición
            <input
              className="admin-input"
              type="number"
              {...register("orden", { valueAsNumber: true })}
            />
          </label>
          {uploaded.length > 0 && (
            <>
              <p>
                Las imágenes sustituidas se conservan para proteger recursos
                compartidos.
              </p>
              {uploaded.map((upload) => (
                <div className="media-row" key={upload.path}>
                  <a
                    href={upload.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Ver imagen subida
                  </a>
                </div>
              ))}
            </>
          )}
        </details>
        <div className="editor-actions">
          <button
            aria-label="Guardar cambios"
            type="submit"
            className="btn btn--solid"
            disabled={disabled}
          >
            <Icon name="save" />
            {isSubmitting
              ? "Guardando…"
              : `${item ? "Actualizar" : "Guardar"} ${noun}`}
          </button>
          {item && (
            <button
              type="button"
              className="btn btn--outline"
              disabled={disabled}
              onClick={() => {
                if (
                  !isDirty ||
                  window.confirm("¿Descartar los cambios sin guardar?")
                )
                  onClose();
              }}
            >
              <Icon name="times" /> Cancelar
            </button>
          )}
          <button
            type="button"
            className="btn btn--outline"
            onClick={() => setPreview(!preview)}
          >
            {preview ? "Ocultar vista previa" : "Vista previa"}
          </button>
        </div>
        {Object.keys(errors).length > 0 && (
          <p role="alert" className="field-error">
            Revisa los campos señalados antes de guardar.
          </p>
        )}
        {message && (
          <p role="status" className="notice">
            {message}
          </p>
        )}
      </form>
      {preview && (
        <article className="publication-preview">
          <p>VISTA PREVIA · SIN GUARDAR</p>
          {safeUrl(values.imagen_url, true) && (
            <img
              className="upload-preview"
              alt="Portada"
              src={safeUrl(values.imagen_url, true)}
            />
          )}
          <h2>{values.titulo}</h2>
          <p>{values.subtitulo}</p>
          <p className="preserve-lines">
            {values.descripcion || values.resumen}
          </p>
          {table === "articulos" ? (
            <RichText html={values.contenido} />
          ) : (
            <p className="preserve-lines">{values.prologo}</p>
          )}
        </article>
      )}
    </section>
  );
}
