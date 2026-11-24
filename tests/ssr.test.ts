// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({
  listContent: vi.fn(),
  readSiteSettings: vi.fn(),
}));
vi.mock("../src/services/siteSettings", () => ({
  readSiteSettings: mock.readSiteSettings,
  siteSettingsKey: ["site-settings", "public"],
}));
vi.mock("../src/services/content", () => ({
  listContent: mock.listContent,
  contentKey: (table: string) => [table, "public"],
}));
vi.mock("../src/lib/supabase", () => ({ supabase: {}, db: vi.fn() }));
import { render, jsonForHtml, loadPublicSnapshot, type PublicSnapshot } from "../src/entry-server";
import { defaultSiteSettings } from "../src/models/siteSettings";
import { canonicalSiteUrl } from "../src/lib/seo";
const template =
  '<html><head><!--page-head--></head><body><div id="root"><!--app-html--></div><!--app-state--></body></html>';
beforeEach(() => {
  vi.clearAllMocks();
  mock.readSiteSettings.mockResolvedValue({
    settings: defaultSiteSettings,
    revision: 1,
    available: true,
  });
  mock.listContent.mockImplementation(async (table: string) =>
    table === "articulos"
      ? [
          {
            id: 7,
            titulo: "Artículo de prueba",
            contenido: "<p>Contenido antiguo</p><script>alert(1)</script>",
            publicado: true,
          },
        ]
      : [{ id: 1, titulo: "Conócete", visible: true, activo: true }],
  );
});
afterEach(() => vi.unstubAllEnvs());
it("entrega personalización en SSR sin JavaScript y escapa los textos editables", async () => {
  mock.readSiteSettings.mockResolvedValue({
    settings: {
      ...defaultSiteSettings,
      homeTitle: "Título personalizado <script>alert(1)</script>",
      contactEmail: "autor@example.com",
    },
    revision: 3,
    available: true,
  });
  const home = await render("/", template);
  expect(home.status).toBe(200);
  expect(home.html).toContain("Título personalizado &lt;script&gt;");
  expect(home.html).not.toContain("<script>alert(1)</script>");
  const contact = await render("/contacto.html", template);
  expect(contact.html).toContain('href="mailto:autor@example.com"');
});
it("entrega contenido, canonical y metadatos individuales en HTML sin ejecutar JS", async () => {
  const page = await render("/articulos/7", template);
  expect(page.status).toBe(200);
  expect(page.html).toContain("<title>Artículo de prueba —");
  expect(page.html).toContain("<p>Contenido antiguo</p>");
  expect(page.html).not.toContain("<script>alert(1)</script>");
  expect(page.html).toContain("https://www.yoeldiscastillo.com/articulos/7");
});
it("sitemap incluye rutas legacy y registros dinámicos y excluye administración", async () => {
  const page = await render("/sitemap.xml", template);
  expect(page.status).toBe(200);
  expect(page.html).toContain("/articulos/7");
  expect(page.html).toContain("/libros.html");
  expect(page.html).not.toContain("admin");
});
it("responde 404 para una publicación ausente y no la indexa", async () => {
  const page = await render("/articulos/999", template);
  expect(page.status).toBe(404);
  expect(page.html).toContain("noindex,nofollow");
});
it("responde 503 ante fallo del backend y evita publicar un sitemap vacío", async () => {
  mock.listContent.mockRejectedValue(new Error("Network unavailable"));
  expect((await render("/sitemap.xml", template)).status).toBe(503);
  expect((await render("/libros.html", template)).status).toBe(503);
});
it("escapa estado hidratado para impedir salir de un script JSON", () => {
  expect(
    jsonForHtml({ html: "</script><script>alert(1)</script>" }),
  ).not.toContain("<");
});
it("reutiliza una instantánea pública sin nuevas lecturas y genera metadatos y JSON-LD por ruta", async () => {
  const snapshot: PublicSnapshot = {
    settings: { settings: defaultSiteSettings, available: true, revision: 2 },
    collections: {
      libros: [{ id: 4, titulo: "Libro individual", imagen_url: "/img/libro.jpg" }],
      articulos: [{ id: 7, titulo: "Artículo individual", contenido: "<p>Texto público</p>" }],
      destacados: [],
    },
  };
  const book = await render("/libros/4/", template, { snapshot });
  expect(book.status).toBe(200);
  expect(book.html).toContain("<title>Libro individual —");
  expect(book.html).toContain('"@type":"Book"');
  expect(book.html).toContain('href="https://www.yoeldiscastillo.com/libros/4"');
  expect(book.html).toContain('content="https://www.yoeldiscastillo.com/img/libro.jpg"');
  const bookSchema = JSON.parse(book.html.match(/<script id="structured-data"[^>]*>(.*?)<\/script>/)![1]);
  expect(bookSchema).not.toHaveProperty("author");
  expect(bookSchema).not.toHaveProperty("datePublished");
  const article = await render("/articulos/7", template, { snapshot });
  expect(article.html).toContain('"@type":"Article"');
  expect(article.html).toContain("<p>Texto público</p>");
  const sitemap = await render("/sitemap.xml", template, { snapshot });
  expect(sitemap.html).toContain("/libros/4</loc>");
  expect(sitemap.html).toContain("/articulos/7</loc>");
  const admin = await render("/admin.html", template, { snapshot });
  expect(admin.html).toContain('content="noindex,nofollow"');
  expect(admin.html).not.toContain('id="structured-data"');
  expect(mock.listContent).not.toHaveBeenCalled();
  expect(mock.readSiteSettings).not.toHaveBeenCalled();
});
it("mantiene el prefijo de Pages en los enlaces e imágenes renderizados", async () => {
  vi.stubEnv("BASE_URL", "/yoeldiscastillo/");
  const page = await render("/", template, { offline: true });
  expect(page.html).toContain('href="/yoeldiscastillo/libros.html"');
  expect(page.html).toContain('href="/yoeldiscastillo/sobre-mi.html"');
  expect(page.html).toContain('/yoeldiscastillo/img/hero/');
  expect(page.html).not.toContain('href="/libros.html"');
  const head = page.html.match(/<head>(.*?)<\/head>/s)![1];
  expect(head).toContain('href="/yoeldiscastillo/img/hero/library-mobile-960.webp"');
  expect(head).toContain('imagesrcset="/yoeldiscastillo/img/hero/library-mobile-640.webp 640w, /yoeldiscastillo/img/hero/library-mobile-960.webp 960w"');
  expect(head).not.toContain('href="/img/');
});
it("precarga solo el fondo responsive de inicio antes de los módulos con las mismas fuentes del hero", async () => {
  const shell = template.replace("</head>", '<script type="module" src="/assets/main.js"></script></head>');
  const home = await render("/", shell);
  const head = home.html.match(/<head>(.*?)<\/head>/s)![1];
  const preloads = head.match(/<link rel="preload" as="image"[^>]+>/g)!;
  expect(preloads).toHaveLength(2);
  expect(preloads[0]).toContain('media="(max-width: 767px)"');
  expect(preloads[1]).toContain('media="not all and (max-width: 767px)"');
  for (const preload of preloads) {
    const srcSet = preload.match(/imagesrcset="([^"]+)"/)![1];
    expect(home.html).toContain(`srcSet="${srcSet}"`);
    expect(preload).toContain('imagesizes="100vw"');
    expect(preload).toContain('fetchpriority="high"');
    expect(head.indexOf(preload)).toBeLessThan(head.indexOf('<script type="module"'));
    expect(preload).not.toMatch(/author|seated/);
  }
  expect(home.html).toMatch(/<img[^>]+fetchPriority="auto"[^>]+loading="eager"/);
});
it.each(["https://cdn.example.com/biblioteca.webp?a=1&b=2", "/img/biblioteca-personalizada.webp"])(
  "precarga una sola vez el fondo personalizado respetando la base: %s",
  async (homeBackground) => {
    vi.stubEnv("BASE_URL", "/yoeldiscastillo/");
    mock.readSiteSettings.mockResolvedValue({
      settings: { ...defaultSiteSettings, homeBackground },
      revision: 4,
      available: true,
    });
    const home = await render("/", template);
    const head = home.html.match(/<head>(.*?)<\/head>/s)![1];
    const preloads = head.match(/<link rel="preload" as="image"[^>]+>/g)!;
    expect(preloads).toHaveLength(1);
    const href = (homeBackground.startsWith("/") ? `/yoeldiscastillo${homeBackground}` : homeBackground).replace(/&/g, "&amp;");
    expect(preloads[0]).toContain(`href="${href}"`);
    expect(home.html).toContain(`src="${href}"`);
    expect(preloads[0]).not.toMatch(/imagesrcset|library-mobile/);
  },
);
it.each(["/sobre-mi.html", "/libros.html", "/articulos.html", "/contacto.html", "/acceso", "/admin.html"])(
  "no precarga el hero en una ruta que no lo muestra: %s",
  async (path) => {
    const page = await render(path, template);
    const head = page.html.match(/<head>(.*?)<\/head>/s)![1];
    expect(head).not.toContain('rel="preload" as="image"');
  },
);
it("normaliza solo el alias canónico conocido y conserva otros dominios y prefijos", () => {
  expect(canonicalSiteUrl("https://yoeldiscastillo.com")).toBe("https://www.yoeldiscastillo.com");
  expect(canonicalSiteUrl("https://elton005.github.io/yoeldiscastillo/")).toBe("https://elton005.github.io/yoeldiscastillo");
  expect(canonicalSiteUrl("https://otro.example/")).toBe("https://otro.example");
});
it("el prerender con backend configurado no convierte un fallo de lectura en catálogo vacío", async () => {
  const snapshot = await loadPublicSnapshot();
  expect(snapshot?.collections.articulos[0].id).toBe(7);
  expect(mock.listContent).toHaveBeenCalledTimes(3);
  mock.listContent.mockRejectedValue(new Error("Backend no disponible"));
  await expect(loadPublicSnapshot()).rejects.toThrow("Backend no disponible");
});
it("el build local sin conexión genera metadatos de páginas base sin inventar publicaciones", async () => {
  const home = await render("/", template, { offline: true });
  expect(home.status).toBe(200);
  expect(home.html).toContain("<title>");
  expect(home.html).toContain('id="structured-data"');
  const sitemap = await render("/sitemap.xml", template, { offline: true });
  expect(sitemap.html).toContain("/libros.html</loc>");
  expect(sitemap.html).not.toContain("/libros/1");
  expect(mock.listContent).not.toHaveBeenCalled();
  expect(mock.readSiteSettings).not.toHaveBeenCalled();
});
