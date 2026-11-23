// Read-only visual reference. All Supabase calls are redirected to the local test double.
// Never serve this test harness publicly or use it as the application runtime.
import http from "node:http";
import { readFile, stat, mkdir } from "node:fs/promises";
import { resolve, sep, extname } from "node:path";
import { build } from "esbuild";
await mkdir(".qa/visual", { recursive: true });
await build({
  stdin: {
    contents: 'export * from "@supabase/supabase-js";',
    resolveDir: process.cwd(),
  },
  bundle: true,
  format: "iife",
  globalName: "supabase",
  platform: "browser",
  outfile: ".qa/visual/legacy-sdk.js",
});
const root = resolve("legacy");
http
  .createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
      let file;
      if (pathname === "/visual-sdk.js")
        file = resolve(".qa/visual/legacy-sdk.js");
      else if (pathname.startsWith("/img/"))
        file = resolve("public", `.${pathname}`);
      else if (pathname.startsWith("/fontawesome/"))
        file = resolve(
          "node_modules/@fortawesome/fontawesome-free",
          pathname.slice("/fontawesome/".length),
        );
      else
        file = resolve(root, `.${pathname === "/" ? "/index.html" : pathname}`);
      const permitted = [
        root,
        resolve("public/img"),
        resolve("node_modules/@fortawesome/fontawesome-free"),
        resolve(".qa/visual"),
      ];
      if (
        !permitted.some((folder) => file.startsWith(folder + sep)) ||
        !(await stat(file).catch(() => null))?.isFile()
      ) {
        res.writeHead(404);
        res.end();
        return;
      }
      let data = await readFile(file);
      const ext = extname(file);
      if (ext === ".html")
        data = Buffer.from(
          data
            .toString("utf8")
            .replace(
              "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",
              "/visual-sdk.js",
            )
            .replace(
              "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css",
              "/fontawesome/css/all.min.css",
            )
            .replace(
              "</head>",
              '<script>window.LEGACY_SUPABASE_PUBLIC_KEY="sb_publishable_local_fixture_only";</script></head>',
            ),
        );
      if (ext === ".js" && file.startsWith(root))
        data = Buffer.from(
          data
            .toString("utf8")
            .replaceAll(
              "https://jjbztkljgsdwrqylspeg.supabase.co",
              "http://127.0.0.1:54329",
            ),
        );
      const types = {
        ".html": "text/html; charset=utf-8",
        ".css": "text/css",
        ".js": "application/javascript",
        ".jpg": "image/jpeg",
        ".woff2": "font/woff2",
        ".ttf": "font/ttf",
      };
      res.writeHead(200, {
        "Content-Type": types[ext] || "application/octet-stream",
        "Cache-Control": "no-store",
      });
      res.end(data);
    } catch {
      res.writeHead(500);
      res.end("Reference unavailable");
    }
  })
  .listen(54330, "127.0.0.1", () =>
    console.log("Original visual reference: http://127.0.0.1:54330"),
  );
