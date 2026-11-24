import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { metadata, structuredData } from "../lib/seo";
import { contentKey } from "../services/content";
import type { Content } from "../models/content";
export function Seo() {
  const { pathname } = useLocation();
  const cache = useQueryClient();
  useEffect(() => {
    const update = () => {
      const collections = {
        libros: cache.getQueryData<Content[]>(contentKey("libros")),
        articulos: cache.getQueryData<Content[]>(contentKey("articulos")),
      };
      const meta = metadata(pathname, collections);
      document.title = meta.title;
      for (const [name, value] of Object.entries({
        description: meta.description,
        keywords: meta.keywords,
        author: "Yoeldis Castillo Quiala",
        robots: meta.noindex ? "noindex,nofollow" : "index,follow",
        "og:title": meta.title,
        "og:description": meta.description,
        "og:url": meta.canonical,
        "og:image": meta.image,
        "twitter:title": meta.title,
        "twitter:description": meta.description,
        "twitter:image": meta.image,
      })) {
        const attr = name.startsWith("og:") ? "property" : "name";
        let element = document.head.querySelector<HTMLMetaElement>(
          `meta[${attr}="${name}"]`,
        );
        if (!element) {
          element = document.createElement("meta");
          element.setAttribute(attr, name);
          document.head.append(element);
        }
        element.content = value;
      }
      let canonical = document.head.querySelector<HTMLLinkElement>(
        'link[rel="canonical"]',
      );
      if (!canonical) {
        canonical = document.createElement("link");
        canonical.rel = "canonical";
        document.head.append(canonical);
      }
      canonical.href = meta.canonical;
      const structured = structuredData(pathname, collections);
      let schema = document.getElementById("structured-data");
      if (!structured) schema?.remove();
      else {
        if (!schema) {
          schema = document.createElement("script");
          schema.id = "structured-data";
          schema.setAttribute("type", "application/ld+json");
          document.head.append(schema);
        }
        schema.textContent = JSON.stringify(structured).replace(/</g, "\\u003c");
      }
    };
    update();
    return cache.getQueryCache().subscribe(update);
  }, [cache, pathname]);
  return null;
}
