import type { Content, Table } from "../models/content";
import { safeUrl } from "../models/content";
import originalMetadata from "../data/original-metadata.json";
const originals: Record<
  string,
  { title: string; description: string; keywords: string }
> = originalMetadata;
export function canonicalSiteUrl(value: string) {
  const url = new URL(value);
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.search || url.hash)
    throw new Error("VITE_SITE_URL debe ser una URL pública sin credenciales, consulta ni fragmento.");
  if (url.protocol === "https:" && url.hostname === "yoeldiscastillo.com")
    url.hostname = "www.yoeldiscastillo.com";
  return url.href.replace(/\/$/, "");
}
export const siteUrl = canonicalSiteUrl(
  import.meta.env.VITE_SITE_URL || "https://www.yoeldiscastillo.com",
);
export const pageTitles: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(originals).map(([path, meta]) => [path, meta.title]),
  ),
  "/acceso": "Acceso — Yoeldis Castillo Quiala",
  "/auth/callback": "Verificando acceso — Yoeldis Castillo Quiala",
};
export const publicPaths = [
  "/",
  "/sobre-mi.html",
  "/libros.html",
  "/articulos.html",
  "/contacto.html",
] as const;
export function canonicalPath(path: string) {
  return path === "/index.html" ? "/" : path.replace(/\/+$/, "") || "/";
}
export function metadata(
  path: string,
  collections: Partial<Record<Table, Content[]>> = {},
) {
  path = canonicalPath(path);
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
    image: (() => {
      const image = safeUrl(item?.imagen_url || "");
      return image.startsWith("/")
        ? `${siteUrl}${image}`
        : image || `${siteUrl}/img/autor.jpg`;
    })(),
    noindex: privatePage || !known,
    known,
  };
}
export function structuredData(
  path: string,
  collections: Partial<Record<Table, Content[]>> = {},
) {
  path = canonicalPath(path);
  const meta = metadata(path, collections);
  if (meta.noindex) return undefined;
  const match = path.match(/^\/(libros|articulos)\/([^/]+)$/);
  const item = match
    ? collections[match[1] as Table]?.find((row) => String(row.id) === match[2])
    : undefined;
  const person = {
    "@type": "Person",
    name: "Yoeldis Castillo Quiala",
    url: siteUrl,
  };
  const publicationDate =
    match?.[1] === "libros" ? item?.fecha_publicacion : item?.creado_en;
  if (item)
    return {
      "@context": "https://schema.org",
      "@type": match![1] === "libros" ? "Book" : "Article",
      name: item.titulo,
      headline: item.titulo,
      description: meta.description,
      url: meta.canonical,
      image: meta.image,
      ...(match![1] === "articulos" ? { author: person } : {}),
      ...(publicationDate && Number.isFinite(Date.parse(publicationDate))
        ? { datePublished: publicationDate }
        : {}),
    };
  if (path === "/sobre-mi.html")
    return {
      "@context": "https://schema.org",
      ...person,
      jobTitle: "Psicólogo y escritor",
      image: meta.image,
    };
  return {
    "@context": "https://schema.org",
    "@type": path === "/" ? "WebSite" : "WebPage",
    name: meta.title,
    description: meta.description,
    url: meta.canonical,
    author: person,
  };
}
