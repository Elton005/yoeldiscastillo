import { renderToPipeableStream } from "react-dom/server";
import { Writable } from "node:stream";
import { StaticRouter } from "react-router-dom";
import {
  QueryClient,
  QueryClientProvider,
  dehydrate,
} from "@tanstack/react-query";
import { App } from "./App";
import { AuthProvider } from "./auth/AuthProvider";
import { metadata, siteUrl } from "./lib/seo";
import { contentKey, listContent } from "./services/content";
import { tables, type Content, type Table } from "./models/content";
import { readSiteSettings, siteSettingsKey } from "./services/siteSettings";
const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ]!,
  );
export const jsonForHtml = (value: unknown) =>
  JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
export async function render(path: string, template: string) {
  const cache = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 30000, enabled: false },
    },
  });
  const collections: Partial<Record<Table, Content[]>> = {};
  const requested: readonly Table[] =
    path === "/sitemap.xml"
      ? [...tables]
      : path === "/" || path === "/acceso"
        ? ["destacados"]
        : path.startsWith("/libros")
          ? ["libros"]
          : path.startsWith("/articulos")
            ? ["articulos"]
            : [];
  let failed = false;
  // Load published copy before rendering so crawlers and hydration see the same content.
  if (path !== "/sitemap.xml" && !path.startsWith("/admin")) {
    try {
      await cache.fetchQuery({
        queryKey: siteSettingsKey,
        queryFn: readSiteSettings,
      });
    } catch {
      failed = true;
    }
  }
  await Promise.all(
    requested.map(async (table) => {
      try {
        collections[table] = await cache.fetchQuery({
          queryKey: contentKey(table),
          queryFn: () => listContent(table),
        });
      } catch {
        failed = true;
        cache.removeQueries({ queryKey: contentKey(table) });
      }
    }),
  );
  if (path === "/sitemap.xml") {
    if (failed)
      return {
        status: 503,
        contentType: "application/xml",
        html: '<?xml version="1.0"?><error>Contenido temporalmente no disponible</error>',
      };
    const paths = [
      "/",
      "/sobre-mi.html",
      "/libros.html",
      "/articulos.html",
      "/contacto.html",
      ...(["libros", "articulos"] as const).flatMap(
        (table) =>
          collections[table]?.map(
            (item) => `/${table}/${encodeURIComponent(item.id)}`,
          ) ?? [],
      ),
    ];
    return {
      status: 200,
      contentType: "application/xml; charset=utf-8",
      html: `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((url) => `<url><loc>${escape(siteUrl + url)}</loc></url>`).join("")}</urlset>`,
    };
  }
  const meta = metadata(path, collections);
  const schema =
    path === "/" || path === "/sobre-mi.html"
      ? {
          "@context": "https://schema.org",
          "@type": "Person",
          name: "Yoeldis Castillo Quiala",
          jobTitle: "Psicólogo y escritor",
          url: siteUrl,
          image: meta.image,
        }
      : undefined;
  const detailMatch = path.match(/^\/(libros|articulos)\/([^/]+)$/);
  const item = detailMatch
    ? collections[detailMatch[1] as Table]?.find(
        (row) => String(row.id) === detailMatch[2],
      )
    : undefined;
  const structured = item
    ? {
        "@context": "https://schema.org",
        "@type": detailMatch![1] === "libros" ? "Book" : "Article",
        name: item.titulo,
        headline: item.titulo,
        description: meta.description,
        url: meta.canonical,
        ...(detailMatch![1] === "articulos"
          ? { author: { "@type": "Person", name: "Yoeldis Castillo Quiala" } }
          : {}),
      }
    : schema;
  const head = `<title>${escape(meta.title)}</title><meta name="description" content="${escape(meta.description)}"/><meta name="keywords" content="${escape(meta.keywords)}"/><meta name="author" content="Yoeldis Castillo Quiala"/><meta name="robots" content="${meta.noindex ? "noindex,nofollow" : "index,follow"}"/><link rel="canonical" href="${escape(meta.canonical)}"/><meta property="og:title" content="${escape(meta.title)}"/><meta property="og:description" content="${escape(meta.description)}"/><meta property="og:url" content="${escape(meta.canonical)}"/><meta property="og:image" content="${escape(meta.image)}"/><meta name="twitter:title" content="${escape(meta.title)}"/><meta name="twitter:description" content="${escape(meta.description)}"/><meta name="twitter:image" content="${escape(meta.image)}"/>${structured ? `<script type="application/ld+json">${jsonForHtml(structured)}</script>` : ""}`;
  const app = (
    <QueryClientProvider client={cache}>
      <StaticRouter location={path}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </StaticRouter>
    </QueryClientProvider>
  );
  const markup = await new Promise<string>((resolve, reject) => {
    let output = "";
    const sink = new Writable({
      write(chunk, _encoding, callback) {
        output += chunk.toString();
        callback();
      },
    });
    sink.on("finish", () => resolve(output));
    sink.on("error", reject);
    const stream = renderToPipeableStream(app, {
      onAllReady() {
        stream.pipe(sink);
      },
      onShellError: reject,
      onError: reject,
    });
  });
  const state = `<script id="query-state" type="application/json">${jsonForHtml(dehydrate(cache))}</script>`;
  cache.clear();
  return {
    status: failed ? 503 : meta.known ? 200 : 404,
    contentType: "text/html; charset=utf-8",
    html: template
      .replace("<!--page-head-->", head)
      .replace("<!--app-html-->", markup)
      .replace("<!--app-state-->", state),
  };
}
