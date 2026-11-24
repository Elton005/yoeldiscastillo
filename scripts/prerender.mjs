import { build } from "vite";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

// Generate HTML during the build. No Node renderer is published or invoked by
// the hosting platform; the output remains a normal React/Vite static site.
export async function prerender(
  outDir = "dist",
  base = "/",
  { requireBackend = false } = {},
) {
  if (!/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(base))
    throw new Error("Base de publicación no válida.");
  const output = resolve(outDir);
  const template = await readFile(resolve(output, "index.html"), "utf8");
  if (!template.includes("<!--page-head-->"))
    throw new Error("El shell compilado no contiene los marcadores de prerender.");
  const temporaryRoot = resolve(".qa/prerender");
  await mkdir(temporaryRoot, { recursive: true });
  const temporary = await mkdtemp(resolve(temporaryRoot, "renderer-"));
  try {
    await build({
      base,
      build: { ssr: "src/entry-server.tsx", outDir: temporary, emptyOutDir: true },
    });
    const { render, loadPublicSnapshot } = await import(
      pathToFileURL(resolve(temporary, "entry-server.js")).href
    );
    const snapshot = await loadPublicSnapshot();
    if (requireBackend && !snapshot)
      throw new Error("La publicación requiere una conexión pública de Supabase.");
    const options = snapshot ? { snapshot } : { offline: true };
    const routes = [
      "/",
      "/sobre-mi.html",
      "/libros.html",
      "/articulos.html",
      "/contacto.html",
      "/admin.html",
      "/admin",
      "/acceso",
      "/auth/callback",
    ];
    for (const table of ["libros", "articulos"])
      for (const item of snapshot?.collections[table] ?? []) {
        if (!/^[a-zA-Z0-9_-]+$/.test(String(item.id)))
          throw new Error("Identificador de publicación incompatible con la ruta estática.");
        routes.push(`/${table}/${item.id}`);
      }
    const artifacts = [];
    for (const route of routes) {
      const page = await render(route, template, options);
      if (page.status !== 200)
        throw new Error(`No se puede generar ${route}: estado ${page.status}.`);
      artifacts.push([
        route === "/"
          ? "index.html"
          : route.endsWith(".html")
            ? route.slice(1)
            : `${route.slice(1)}/index.html`,
        page.html,
      ]);
    }
    const sitemap = await render("/sitemap.xml", template, options);
    if (sitemap.status !== 200)
      throw new Error("No se pudo generar un sitemap de publicaciones verificadas.");
    artifacts.push(["sitemap.xml", sitemap.html]);
    const home = artifacts.find(([file]) => file === "index.html")[1];
    const canonical = home.match(/<link rel="canonical" href="([^"]+)"/)[1];
    artifacts.push([
      "robots.txt",
      `User-agent: *\nAllow: ${base}\nDisallow: ${base}admin\nDisallow: ${base}acceso\nDisallow: ${base}auth/\nSitemap: ${canonical.replace(/\/$/, "")}/sitemap.xml\n`,
    ]);
    // A newly created publication can still load from Supabase through the SPA
    // fallback. It has no prerendered markup/state until the next build.
    const missing = await render("/404.html", template, { offline: true });
    const missingHead = missing.html.match(/<head>([\s\S]*?)<\/head>/)?.[1];
    if (!missingHead) throw new Error("No se pudo preparar el fallback estático.");
    artifacts.push([
      "404.html",
      template.replace(/<head>[\s\S]*?<\/head>/, `<head>${missingHead}</head>`),
    ]);
    // Do not replace any output until every public page and sitemap succeeded.
    for (const [file, html] of artifacts) {
      const target = resolve(output, file);
      if (!target.startsWith(output + sep))
        throw new Error("El destino estático sale del directorio de publicación.");
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, html);
    }
    console.log(
      snapshot
        ? `Prerender estático: ${routes.length} rutas con contenido público verificado y sitemap XML.`
        : `Prerender local: ${routes.length} rutas con metadatos; catálogo sin precargar porque falta Supabase.`,
    );
  } finally {
    // The resolved temporary directory is created under this fixed workspace root.
    if (!temporary.startsWith(temporaryRoot + sep))
      throw new Error("Directorio temporal fuera del área de prerender.");
    await rm(temporary, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  await prerender(process.argv[2] || "dist", process.env.PAGES_BASE_PATH || "/", {
    requireBackend: process.argv.includes("--require-backend"),
  });
