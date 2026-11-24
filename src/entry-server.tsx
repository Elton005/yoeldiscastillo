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
import { canonicalPath, metadata, publicPaths, siteUrl, structuredData } from "./lib/seo";
import { contentKey, listContent } from "./services/content";
import { publicAsset, safeUrl, tables, type Content, type Table } from "./models/content";
import { readSiteSettings, siteSettingsKey, type SiteSettingsRecord } from "./services/siteSettings";
import { supabase } from "./lib/supabase";
import { defaultSiteSettings, type SiteSettings } from "./models/siteSettings";
const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ]!,
  );
function homeBackgroundPreload(settings: SiteSettings) {
  const href = safeUrl(settings.homeBackground, true);
  if (!href) return "";
  if (settings.homeBackground !== defaultSiteSettings.homeBackground)
    return `<link rel="preload" as="image" href="${escape(href)}" fetchpriority="high"/>`;
  // These mutually exclusive hints mirror HomeHero's art direction. Only the
  // background matching the viewport is fetched, before application modules.
  return [
    {
      media: "(max-width: 767px)",
      href: "/img/hero/library-mobile-960.webp",
      srcSet: "/img/hero/library-mobile-640.webp 640w, /img/hero/library-mobile-960.webp 960w",
    },
    {
      media: "not all and (max-width: 767px)",
      href: "/img/hero/library-1672.webp",
      srcSet: "/img/hero/library-1024.webp 1024w, /img/hero/library-1672.webp 1672w",
    },
  ]
    .map(
      (image) =>
        `<link rel="preload" as="image" href="${escape(publicAsset(image.href))}" imagesrcset="${escape(publicAsset(image.srcSet))}" imagesizes="100vw" media="${escape(image.media)}" fetchpriority="high"/>`,
    )
    .join("");
}
export const jsonForHtml = (value: unknown) =>
  JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
export type PublicSnapshot = {
  settings: SiteSettingsRecord;
  collections: Record<Table, Content[]>;
};
// This client has no browser session: only published, anonymously readable rows
// can enter generated documents. A failed read aborts the build upstream.
export async function loadPublicSnapshot(): Promise<PublicSnapshot | undefined> {
  if (!supabase) return undefined;
  const [settings, collections] = await Promise.all([
    readSiteSettings(),
    Promise.all(tables.map((table) => listContent(table))),
  ]);
  return {
    settings,
    collections: Object.fromEntries(
      tables.map((table, index) => [table, collections[index]]),
    ) as Record<Table, Content[]>,
  };
}
export async function render(
  path: string,
  template: string,
  options: { snapshot?: PublicSnapshot; offline?: boolean } = {},
) {
  path = canonicalPath(path);
  const cache = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 30000, enabled: false },
    },
  });
  const collections: Partial<Record<Table, Content[]>> = options.snapshot?.collections ?? {};
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
  if (options.snapshot) {
    cache.setQueryData(siteSettingsKey, options.snapshot.settings);
    for (const table of requested)
      cache.setQueryData(contentKey(table), options.snapshot.collections[table]);
  } else if (options.offline) {
    cache.setQueryData(siteSettingsKey, {
      settings: defaultSiteSettings,
      revision: 0,
      available: false,
    });
  } else if (path !== "/sitemap.xml" && !path.startsWith("/admin")) {
    try {
      await cache.fetchQuery({
        queryKey: siteSettingsKey,
        queryFn: readSiteSettings,
      });
    } catch {
      failed = true;
    }
  }
  if (!options.snapshot && !options.offline) await Promise.all(
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
      ...publicPaths,
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
  const structured = structuredData(path, collections);
  const heroPreload = path === "/"
    ? homeBackgroundPreload(cache.getQueryData<SiteSettingsRecord>(siteSettingsKey)?.settings ?? defaultSiteSettings)
    : "";
  const head = `${heroPreload}<title>${escape(meta.title)}</title><meta name="description" content="${escape(meta.description)}"/><meta name="keywords" content="${escape(meta.keywords)}"/><meta name="author" content="Yoeldis Castillo Quiala"/><meta name="robots" content="${meta.noindex ? "noindex,nofollow" : "index,follow"}"/><link rel="canonical" href="${escape(meta.canonical)}"/><meta property="og:title" content="${escape(meta.title)}"/><meta property="og:description" content="${escape(meta.description)}"/><meta property="og:url" content="${escape(meta.canonical)}"/><meta property="og:image" content="${escape(meta.image)}"/><meta name="twitter:title" content="${escape(meta.title)}"/><meta name="twitter:description" content="${escape(meta.description)}"/><meta name="twitter:image" content="${escape(meta.image)}"/>${structured ? `<script id="structured-data" type="application/ld+json">${jsonForHtml(structured)}</script>` : ""}`;
  const app = (
    <QueryClientProvider client={cache}>
      <StaticRouter
        basename={import.meta.env.BASE_URL}
        location={`${import.meta.env.BASE_URL.replace(/\/$/, "")}${path}`}
      >
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
