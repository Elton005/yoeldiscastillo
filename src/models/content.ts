import { z } from "zod";
export const tables = ["libros", "articulos", "destacados"] as const;
export type Table = (typeof tables)[number];
export const safeUrl = (value: string, image = false): string => {
  const input = value.trim();
  if (!input || /[\u0000-\u0020\\]/.test(input)) return "";
  if (
    /^(?:\/[^/]|(?:img\/|libros\.html|articulos\.html|sobre-mi\.html|contacto\.html))/.test(
      input,
    )
  ) {
    return input.startsWith("/") ? input : `/${input}`;
  }
  try {
    const url = new URL(input);
    return url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      (!image || !url.pathname.toLowerCase().endsWith(".svg"))
      ? url.href
      : "";
  } catch {
    return "";
  }
};
const url = z
  .string()
  .max(2048)
  .refine(
    (v) => !v || Boolean(safeUrl(v)),
    "Usa una URL HTTPS o una ruta del sitio.",
  );
const imageUrl = z
  .string()
  .max(2048)
  .refine(
    (v) => !v || Boolean(safeUrl(v, true)),
    "Usa una imagen HTTPS o una ruta del sitio.",
  );
const text = z.string().max(20000);
const title = z.string().trim().min(1, "Escribe un título.").max(240);
const order = z.number().int().min(0).max(1000000);
export const bookSchema = z.object({
  titulo: title,
  subtitulo: z.string().max(500),
  descripcion: text,
  prologo: text,
  estado: z.enum(["publicado", "proximamente", "agotado"]),
  imagen_url: imageUrl,
  amazon_url: url,
  apk_url: url,
  fecha_publicacion: z
    .string()
    .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), "Fecha inválida."),
  visible: z.boolean(),
  orden: order,
});
export const articleSchema = z.object({
  titulo: title,
  categoria: z.string().max(200),
  resumen: text,
  contenido: z.string().max(2000000),
  imagen_url: imageUrl,
  publicado: z.boolean(),
  orden: order,
});
export const featureSchema = z.object({
  titulo: title,
  tipo: z.enum(["libro", "articulo", "app", "personalizado"]),
  subtitulo: z.string().max(500),
  descripcion: text,
  imagen_url: imageUrl,
  texto_boton: z.string().max(100),
  url_boton: url,
  badge_texto: z.string().max(100),
  activo: z.boolean(),
  orden: order,
});
export const schemas = {
  libros: bookSchema,
  articulos: articleSchema,
  destacados: featureSchema,
};
export const formSchema = z.object({
  ...bookSchema.shape,
  ...articleSchema.shape,
  ...featureSchema.shape,
});
export const recordSchema = z.object({
  id: z.union([z.number(), z.string()]),
  titulo: z.string(),
  creado_en: z.string().nullish(),
  orden: z.number().nullish(),
  subtitulo: z.string().nullish(),
  descripcion: z.string().nullish(),
  prologo: z.string().nullish(),
  estado: z.string().nullish(),
  imagen_url: z.string().nullish(),
  amazon_url: z.string().nullish(),
  apk_url: z.string().nullish(),
  fecha_publicacion: z.string().nullish(),
  visible: z.boolean().nullish(),
  categoria: z.string().nullish(),
  resumen: z.string().nullish(),
  contenido: z.string().nullish(),
  publicado: z.boolean().nullish(),
  tipo: z.string().nullish(),
  texto_boton: z.string().nullish(),
  url_boton: z.string().nullish(),
  badge_texto: z.string().nullish(),
  activo: z.boolean().nullish(),
});
export type Content = z.infer<typeof recordSchema>;
export interface ContentForm {
  titulo: string;
  subtitulo: string;
  descripcion: string;
  prologo: string;
  estado: "publicado" | "proximamente" | "agotado";
  imagen_url: string;
  amazon_url: string;
  apk_url: string;
  fecha_publicacion: string;
  visible: boolean;
  orden: number;
  categoria: string;
  resumen: string;
  contenido: string;
  publicado: boolean;
  tipo: "libro" | "articulo" | "app" | "personalizado";
  texto_boton: string;
  url_boton: string;
  badge_texto: string;
  activo: boolean;
}
export function defaults(item?: Content): ContentForm {
  return {
    titulo: item?.titulo ?? "",
    subtitulo: item?.subtitulo ?? "",
    descripcion: item?.descripcion ?? "",
    prologo: item?.prologo ?? "",
    estado: (item?.estado ?? "publicado") as ContentForm["estado"],
    imagen_url: item?.imagen_url ?? "",
    amazon_url: item?.amazon_url ?? "",
    apk_url: item?.apk_url ?? "",
    fecha_publicacion: item?.fecha_publicacion?.slice(0, 10) ?? "",
    visible: item?.visible ?? true,
    orden: item?.orden ?? 0,
    categoria: item?.categoria ?? "",
    resumen: item?.resumen ?? "",
    contenido: item?.contenido ?? "",
    publicado: item?.publicado ?? false,
    tipo: (item?.tipo ?? "personalizado") as ContentForm["tipo"],
    texto_boton: item?.texto_boton ?? "",
    url_boton: item?.url_boton ?? "",
    badge_texto: item?.badge_texto ?? "",
    activo: item?.activo ?? true,
  };
}
