import { build } from "vite";
import { prerender } from "./prerender.mjs";
import { buildPages } from "./build-pages.mjs";
import { chromium } from "@playwright/test";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { spawn } from "node:child_process";
import assert from "node:assert/strict";

// Isolated production builds: never write fixture configuration into dist/.
process.env.VITE_SUPABASE_URL = "http://127.0.0.1:54329";
process.env.VITE_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_local_fixture_only";
const backend = spawn(process.execPath, ["tests/fixtures/backend.mjs"], {
  windowsHide: true,
  stdio: "ignore",
});
const servers = [];
let browser;
try {
  for (let attempt = 0; ; attempt++) {
    try {
      if ((await fetch("http://127.0.0.1:54329/rest/v1/libros")).ok) break;
    } catch {}
    if (attempt > 50) throw new Error("Backend de pruebas no disponible");
    await new Promise((done) => setTimeout(done, 100));
  }
  await build({ build: { outDir: ".qa/deployment/vercel" } });
  await prerender(".qa/deployment/vercel", "/", { requireBackend: true });
  await buildPages(".qa/deployment/pages");
  browser = await chromium.launch();
  const types = {
    ".html": "text/html",
    ".xml": "application/xml",
    ".txt": "text/plain",
    ".js": "application/javascript",
    ".css": "text/css",
    ".jpg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".woff2": "font/woff2",
  };
  for (const [name, port, base] of [
    ["vercel", 54330, "/"],
    ["pages", 54331, "/yoeldiscastillo/"],
  ]) {
    const root = resolve(`.qa/deployment/${name}`);
    const server = createServer(async (req, res) => {
      try {
        const path = decodeURIComponent(
          new URL(req.url, "http://localhost").pathname,
        );
        if (!path.startsWith(base)) {
          res.writeHead(404).end();
          return;
        }
        let file = resolve(root, "." + path.slice(base.length - 1));
        if (file !== root && !file.startsWith(root + sep)) {
          res.writeHead(403).end();
          return;
        }
        if ((await stat(file).catch(() => null))?.isDirectory())
          file = resolve(file, "index.html");
        if (!(await stat(file).catch(() => null))?.isFile()) {
          file = resolve(root, "404.html");
          if (name === "pages") res.statusCode = 404;
        }
        res.setHeader(
          "Content-Type",
          types[extname(file)] || "application/octet-stream",
        );
        res.end(await readFile(file));
      } catch {
        res.writeHead(500).end();
      }
    });
    await new Promise((done) => server.listen(port, "127.0.0.1", done));
    servers.push(server);
    const context = await browser.newContext();
    const page = await context.newPage();
    const errors = [],
      badImages = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("response", (r) => {
      if (r.url().includes("/img/") && r.status() !== 200)
        badImages.push(r.url());
    });
    const origin = `http://127.0.0.1:${port}`;
    const html = await (await fetch(origin + base)).text();
    assert(
      !html.includes("/src/main.tsx"),
      "No se debe publicar TypeScript fuente",
    );
    assert.match(html, /assets\/index-.*\.js/);
    assert.match(html, /<h1[^>]*>/);
    const sitemapResponse = await fetch(origin + base + "sitemap.xml");
    assert.match(sitemapResponse.headers.get("content-type"), /xml/);
    const sitemap = await sitemapResponse.text();
    assert.match(sitemap, /<urlset/);
    assert.match(sitemap, /libros\/1/);

    for (const path of [
      "",
      "libros.html",
      "articulos.html",
      "sobre-mi.html",
      "contacto.html",
      "admin.html",
      "auth/callback/",
    ]) {
      const response = await page.goto(origin + base + path);
      assert.equal(response.status(), 200, `${name}: ${path}`);
      await page.locator("h1").first().waitFor();
      if (path === "libros.html")
        await page.locator(".libro-detalle").first().waitFor();
      if (path === "") {
        await page
          .locator(".editorial-hero__portrait img")
          .evaluate((img) => img.decode());
        const src = await page
          .locator(".editorial-hero__portrait img")
          .evaluate((img) => img.currentSrc);
        assert(src.startsWith(origin + base + "img/"));
        await page
          .getByRole("link", { name: "Explorar Libros", exact: true })
          .click();
        assert.equal(new URL(page.url()).pathname, base + "libros.html");
      }
    }
    await page.goto(origin + base + "libros/1");
    await page
      .getByRole("heading", { name: "Conócete", exact: true })
      .waitFor();
    assert.deepEqual(errors, []);
    assert.deepEqual(badImages, []);
    await context.close();
    console.log(
      `${name}: 7 entradas directas, navegación React, imágenes, catálogo y detalle correctos.`,
    );
  }
} finally {
  await browser?.close();
  for (const server of servers) await new Promise((done) => server.close(done));
  backend.kill();
}
