import type { Content, Table } from "../models/content";
import originalMetadata from "../data/original-metadata.json";
const originals: Record<
  string,
  { title: string; description: string; keywords: string }
> = originalMetadata;
export const siteUrl = (
  import.meta.env.VITE_SITE_URL || "https://yoeldiscastillo.com"
).replace(/\/$/, "");
export const pageTitles: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(originals).map(([path, meta]) => [path, meta.title]),
  ),
  "/acceso": "Acceso — Yoeldis Castillo Quiala",
  "/auth/callback": "Verificando acceso — Yoeldis Castillo Quiala",
};
export function metadata(
  path: string,
  collections: Partial<Record<Table, Content[]>> = {},
) {
  const match = path.match(/^\/(libros|articulos)\/([^/]+)$/);
  const item = match
    ? collections[match[1] as Table]?.find((i) => String(i.id) === match[2])
    : undefined;
  const privatePage = /^\/(admin|acceso|auth)/.test(path);
  const known = Boolean(pageTitles[path] || privatePage || item);
  const title = item
    ? `${item.titulo} — Yoeldis Castillo Quiala`
    : (pageTitles[path] ??
      (privatePage
        ? "Administración — Yoeldis Castillo Quiala"
        : "Página no encontrada — Yoeldis Castillo Quiala"));
  const description =
    originals[path]?.description ||
    (
      item?.resumen ||
      item?.descripcion ||
      "Yoeldis Castillo Quiala - Psicología y desarrollo personal."
    ).slice(0, 180);
  return {
    title,
    description,
    keywords: originals[path]?.keywords || "",
    canonical: `${siteUrl}${path}`,
    image: `${siteUrl}/img/autor.jpg`,
    noindex: privatePage || !known,
    known,
  };
}
