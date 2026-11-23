// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
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
import { render, jsonForHtml } from "../src/entry-server";
import { defaultSiteSettings } from "../src/models/siteSettings";
const template =
  '<html><head><!--page-head--></head><body><div id="root"><!--app-html--></div><!--app-state--></body></html>';
beforeEach(() => {
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
  expect(page.html).toContain("https://yoeldiscastillo.com/articulos/7");
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
