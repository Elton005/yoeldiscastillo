import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";

// Resolve generated directory indexes before the React fallback. Vite preview
// otherwise serves the home snapshot for /libros/1 without a final slash.
export async function serveStatic(directory = "dist", port = 4173) {
  const root = resolve(directory);
  const compressed = new Map();
  const types = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".avif": "image/avif",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".xml": "application/xml; charset=utf-8",
    ".txt": "text/plain; charset=utf-8",
    ".json": "application/json; charset=utf-8",
  };
  const httpServer = createServer(async (request, response) => {
    try {
      if (!["GET", "HEAD"].includes(request.method)) {
        response.writeHead(405, { Allow: "GET, HEAD" }).end();
        return;
      }
      const path = decodeURIComponent(
        new URL(request.url, "http://localhost").pathname,
      );
      let file = resolve(root, `.${path}`);
      if (file !== root && !file.startsWith(root + sep)) {
        response.writeHead(403).end();
        return;
      }
      if ((await stat(file).catch(() => null))?.isDirectory())
        file = resolve(file, "index.html");
      if (!(await stat(file).catch(() => null))?.isFile()) {
        if (/^\/(assets|img)\//.test(path)) {
          response.writeHead(404).end();
          return;
        }
        file = resolve(root, "404.html");
      }
      response.setHeader(
        "Content-Type",
        types[extname(file)] || "application/octet-stream",
      );
      response.setHeader("Cache-Control", "no-store");
      response.setHeader("X-Content-Type-Options", "nosniff");
      let body = await readFile(file);
      if (/\.(html|js|css|svg|xml|txt|json)$/.test(file)) {
        response.setHeader("Vary", "Accept-Encoding");
        if (request.headers["accept-encoding"]?.includes("gzip")) {
          const info = await stat(file);
          const key = `${file}:${info.mtimeMs}:${info.size}`;
          if (!compressed.has(key)) compressed.set(key, gzipSync(body));
          body = compressed.get(key);
          response.setHeader("Content-Encoding", "gzip");
        }
      }
      response.setHeader("Content-Length", body.length);
      response.end(request.method === "HEAD" ? "" : body);
    } catch {
      response.writeHead(404).end("Página no disponible.");
    }
  });
  await new Promise((yes, no) => {
    httpServer.once("error", no);
    httpServer.listen(port, "127.0.0.1", yes);
  });
  return { httpServer };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  await serveStatic(
    process.argv[2] || "dist",
    Number(process.env.PORT || 4173),
  );
  console.log(
    `Vista previa estática: http://127.0.0.1:${process.env.PORT || 4173}`,
  );
}
