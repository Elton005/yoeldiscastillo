import { z } from "zod";
import { db } from "../lib/supabase";
import {
  recordSchema,
  schemas,
  type Content,
  type ContentForm,
  type Table,
} from "../models/content";
export const columns = {
  libros:
    "id,titulo,subtitulo,descripcion,prologo,imagen_url,estado,amazon_url,apk_url,fecha_publicacion,orden,creado_en",
  articulos:
    "id,titulo,categoria,resumen,contenido,imagen_url,publicado,orden,creado_en",
  destacados:
    "id,tipo,titulo,subtitulo,descripcion,imagen_url,texto_boton,url_boton,badge_texto,activo,orden",
} satisfies Record<Table, string>;
let bookVisibilitySupported: boolean | null = null;
export const getBookVisibilitySupport = () => bookVisibilitySupported;
function missingVisibility(error: { code?: string; message?: string } | null) {
  return Boolean(
    error &&
    ["42703", "PGRST204"].includes(error.code || "") &&
    /\bvisible\b/i.test(error.message || ""),
  );
}
export async function listContent(table: Table, admin = false) {
  if (admin) await requireEditor();
  const fetchRows = (visibility: boolean) => {
    let query = db()
      .from(table)
      .select(
        columns[table] + (table === "libros" && visibility ? ",visible" : ""),
      )
      .order("orden", { ascending: true })
      .order("id", { ascending: true });
    if (!admin && (table !== "libros" || visibility))
      query = query.eq(
        table === "libros"
          ? "visible"
          : table === "articulos"
            ? "publicado"
            : "activo",
        true,
      );
    return query;
  };
  let result = await fetchRows(bookVisibilitySupported !== false);
  if (table === "libros" && missingVisibility(result.error)) {
    bookVisibilitySupported = false;
    result = await fetchRows(false);
  } else if (
    table === "libros" &&
    !result.error &&
    bookVisibilitySupported !== false
  )
    bookVisibilitySupported = true;
  const { data, error } = result;
  if (error)
    throw new Error("No pudimos cargar el contenido. Vuelve a intentarlo.");
  const parsed = z.array(recordSchema).safeParse(data);
  if (!parsed.success)
    throw new Error(
      "El formato del contenido no es compatible. Contacta con la administración.",
    );
  return parsed.data;
}
export async function requireEditor(adminOnly = false) {
  const client = db();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error)
    throw new Error("No se pudo validar la sesión. Reintenta la operación.");
  if (!user) throw new Error("Inicia sesión con una cuenta autorizada.");
  const result = await client.rpc("current_editor_role");
  if (
    result.error ||
    (result.data !== null && !["admin", "editor"].includes(result.data))
  )
    throw new Error(
      "No se pudieron verificar los permisos. Reintenta la operación.",
    );
  if (
    !["admin", "editor"].includes(result.data) ||
    (adminOnly && result.data !== "admin")
  )
    throw new Error("Tu cuenta no tiene autorización para esta operación.");
  return user;
}
export async function saveContent(
  table: Table,
  values: ContentForm,
  id?: string | number,
  original?: Content,
) {
  await requireEditor();
  const payload: Record<string, unknown> = schemas[table].parse(values);
  if (table === "articulos") {
    if (original && values.contenido === original.contenido)
      delete payload.contenido;
    else {
      const { sanitizeRichHtml } = await import("../lib/sanitize");
      payload.contenido = sanitizeRichHtml(String(payload.contenido));
    }
  }
  if (table === "libros" && !payload.fecha_publicacion)
    payload.fecha_publicacion = null;
  if (table === "libros" && bookVisibilitySupported === false)
    delete payload.visible;
  const mutate = () => {
    const query =
      id !== undefined
        ? db().from(table).update(payload).eq("id", id)
        : db().from(table).insert(payload);
    return query.select("id").single();
  };
  let result = await mutate();
  if (table === "libros" && missingVisibility(result.error)) {
    bookVisibilitySupported = false;
    delete payload.visible;
    result = await mutate();
  }
  const { data, error } = result;
  if (error || !data)
    throw new Error(
      "No se pudo guardar. Revisa tus permisos y los datos del formulario.",
    );
  return data;
}
export async function reorderContent(
  table: Table,
  id: string | number,
  direction: "up" | "down",
) {
  await requireEditor();
  const { error } = await db().rpc("reorder_editorial_content", {
    table_name: table,
    record_id: String(id),
    direction,
  });
  if (error)
    throw new Error(
      "No se pudo cambiar el orden. Revisa los permisos y la configuración del panel.",
    );
}
export async function deleteContent(table: Table, id: string | number) {
  await requireEditor();
  const { data, error } = await db()
    .from(table)
    .delete()
    .eq("id", id)
    .select("id")
    .single();
  if (error || !data)
    throw new Error(
      "No se pudo eliminar. El contenido puede estar relacionado con otro registro.",
    );
}
export const contentKey = (table: Table, admin = false) =>
  [table, admin ? "admin" : "public"] as const;
