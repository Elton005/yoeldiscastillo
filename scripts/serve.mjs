import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { pathToFileURL } from "node:url";
const { render } = await import(
  pathToFileURL(resolve(process.env.SSR_ENTRY || "server/entry-server.js")).href
);
const root = resolve(process.env.DIST_DIRECTORY || "dist");
const template = await readFile(
  resolve(process.env.SSR_TEMPLATE || "server/template.html"),
  "utf8",
);
const types = {
  ".js": "application/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".txt": "text/plain",
};
http
  .createServer(async (req, res) => {
    try {
      const path = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
      const file = resolve(root, `.${path}`);
      if (
        file.startsWith(root + sep) &&
        path !== "/index.html" &&
        (await stat(file).catch(() => null))?.isFile()
      ) {
        res.setHeader(
          "Content-Type",
          types[extname(file)] || "application/octet-stream",
        );
        res.end(await readFile(file));
        return;
      }
      if (path === "/index.html") {
        res.writeHead(301, { Location: "/" });
        res.end();
        return;
      }
      const page = await render(path, template);
      res.writeHead(page.status, {
        "Content-Type": page.contentType,
        "Cache-Control": "no-store",
      });
      res.end(page.html);
    } catch {
      res.writeHead(503);
      res.end("Contenido temporalmente no disponible.");
    }
  })
  .listen(4173, "127.0.0.1", () => console.log("Local: http://127.0.0.1:4173"));
