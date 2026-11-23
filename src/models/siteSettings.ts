import { z } from "zod";
import { safeUrl } from "./content";
import biography from "../data/biography.json";

const text = z.string().trim().min(1, "Escribe un texto.").max(15000);
const shortText = text.max(240);
const image = z
  .string()
  .max(2048)
  .refine(
    (v) => Boolean(safeUrl(v, true)),
    "Usa una imagen HTTPS o una ruta del sitio.",
  );
const social = z
  .string()
  .max(2048)
  .refine(
    (v) => !v || (/^https:\/\//i.test(v) && Boolean(safeUrl(v))),
    "Usa una URL HTTPS o deja el campo vacío.",
  );
export const siteSettingsSchema = z
  .object({
    homeEyebrow: shortText,
    homeTitle: shortText,
    homeEmphasis: shortText,
    homeDescription: text.max(1500),
    homeImage: image,
    homeBackground: image,
    homeImageAlt: shortText,
    homeImageShape: z.enum(["rounded", "circle", "original"]),
    homeImageSize: z.number().int().min(220).max(760),
    homePrimaryLabel: shortText,
    homeSecondaryLabel: shortText,
    homePrimaryUrl: z
      .string()
      .max(2048)
      .refine(
        (v) => Boolean(safeUrl(v)),
        "Usa una URL HTTPS o una ruta del sitio.",
      ),
    homeSecondaryUrl: z
      .string()
      .max(2048)
      .refine(
        (v) => Boolean(safeUrl(v)),
        "Usa una URL HTTPS o una ruta del sitio.",
      ),
    homeHighlightsTitle: shortText,
    aboutTitle: shortText,
    aboutSubtitle: text.max(1000),
    aboutBody: text,
    aboutImage: image,
    booksTitle: shortText,
    booksSubtitle: text.max(1000),
    articlesTitle: shortText,
    articlesSubtitle: text.max(1000),
    contactTitle: shortText,
    contactBody: text.max(2000),
    contactEmail: z.email().max(320),
    facebook: social,
    instagram: social,
    linkedin: social,
    footerQuote: text.max(1500),
  })
  .strict();
export type SiteSettings = z.infer<typeof siteSettingsSchema>;
export const defaultSiteSettings: SiteSettings = {
  homeEyebrow: "Psicología y Desarrollo Personal",
  homeTitle: "Comprende tu mente,",
  homeEmphasis: "transforma tu vida.",
  homeDescription:
    "Traduzco la complejidad del comportamiento humano en herramientas prácticas para que construyas una vida con propósito, claridad y decisiones conscientes.",
  homeImage: "/img/hero/author-1141.webp",
  homeBackground: "/img/hero/library-1672.webp",
  homeImageAlt: "Retrato de Yoeldis Castillo Quiala con gafas y traje",
  homeImageShape: "original",
  homeImageSize: 640,
  homePrimaryLabel: "Explorar Libros",
  homeSecondaryLabel: "Conoce mi trayectoria",
  homePrimaryUrl: "/libros.html",
  homeSecondaryUrl: "/sobre-mi.html",
  homeHighlightsTitle: "Explora y Descubre",
  aboutTitle: "Rigor académico, visión humana.",
  aboutSubtitle:
    "Licenciado en Psicología y Máster en Dirección, dedicado a desbloquear el potencial humano.",
  aboutBody: biography.join("\n\n"),
  aboutImage: "/img/autor.jpg",
  booksTitle: "Tu Viaje Comienza Aquí",
  booksSubtitle:
    "Desarrollo personal, psicología y comportamiento humano al alcance de tu mano.",
  articlesTitle: "Reflexiones y Recursos",
  articlesSubtitle:
    "Ideas, herramientas y análisis para tu crecimiento personal.",
  contactTitle: "Contáctanos",
  contactBody:
    "¿Tienes alguna duda, una consulta sobre mis libros o simplemente quieres compartir cómo este contenido ha impactado tu vida?\nEstoy aquí para escucharte. No dudes en escribirme, responderé a la brevedad posible.",
  contactEmail: "contacto@yoeldisquiala.com",
  facebook: "",
  instagram: "",
  linkedin: "",
  footerQuote:
    "El verdadero viaje de descubrimiento no consiste en buscar nuevos paisajes, sino en tener nuevos ojos.",
};
export function parseSiteSettings(input: unknown): SiteSettings {
  const partial = siteSettingsSchema.partial().parse(input);
  // Upgrade only the previous bundled default, preserving custom photographs.
  // This adapts the displayed settings without writing to the database.
  if (partial.homeImage === "/img/logo-cerebro.jpg") {
    partial.homeImage = defaultSiteSettings.homeImage;
    if (partial.homeImageAlt === "Yoeldis Castillo Quiala - Psicólogo")
      partial.homeImageAlt = defaultSiteSettings.homeImageAlt;
    if (partial.homeImageSize === 320)
      partial.homeImageSize = defaultSiteSettings.homeImageSize;
    if (partial.homeImageShape === "rounded")
      partial.homeImageShape = defaultSiteSettings.homeImageShape;
  }
  return siteSettingsSchema.parse({ ...defaultSiteSettings, ...partial });
}
export const settingsGroups = [
  {
    label: "Inicio",
    fields: [
      "homeEyebrow",
      "homeTitle",
      "homeEmphasis",
      "homeDescription",
      "homeImage",
      "homeBackground",
      "homeImageAlt",
      "homeImageShape",
      "homeImageSize",
      "homePrimaryLabel",
      "homePrimaryUrl",
      "homeSecondaryLabel",
      "homeSecondaryUrl",
      "homeHighlightsTitle",
    ],
  },
  {
    label: "Sobre mí",
    fields: ["aboutTitle", "aboutSubtitle", "aboutBody", "aboutImage"],
  },
  {
    label: "Libros y artículos",
    fields: [
      "booksTitle",
      "booksSubtitle",
      "articlesTitle",
      "articlesSubtitle",
    ],
  },
  {
    label: "Contacto",
    fields: ["contactTitle", "contactBody", "contactEmail"],
  },
  {
    label: "Redes y pie de página",
    fields: ["facebook", "instagram", "linkedin", "footerQuote"],
  },
] as const;
export const settingsLabels: Record<keyof SiteSettings, string> = {
  homeEyebrow: "Presentación breve",
  homeTitle: "Título de inicio",
  homeEmphasis: "Segunda línea del título",
  homeDescription: "Descripción de inicio",
  homeImage: "Retrato de inicio",
  homeBackground: "Fondo de biblioteca",
  homeImageAlt: "Descripción accesible de la imagen",
  homeImageShape: "Integración del retrato",
  homeImageSize: "Altura del retrato en escritorio (px)",
  homePrimaryLabel: "Botón de libros",
  homeSecondaryLabel: "Botón de trayectoria",
  homePrimaryUrl: "Destino del botón de libros",
  homeSecondaryUrl: "Destino del botón de trayectoria",
  homeHighlightsTitle: "Título de destacados",
  aboutTitle: "Título de biografía",
  aboutSubtitle: "Subtítulo de biografía",
  aboutBody: "Biografía (separa párrafos con una línea vacía)",
  aboutImage: "Fotografía del autor",
  booksTitle: "Título del catálogo",
  booksSubtitle: "Subtítulo del catálogo",
  articlesTitle: "Título de artículos",
  articlesSubtitle: "Subtítulo de artículos",
  contactTitle: "Título de contacto",
  contactBody: "Mensaje de contacto",
  contactEmail: "Correo de contacto",
  facebook: "Facebook",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  footerQuote: "Cita del pie de página",
};
