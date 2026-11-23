import { readFile } from "node:fs/promises";
import { render } from "../server/entry-server.js";
export default async function handler(request, response) {
  const url = new URL(request.url, "https://www.yoeldiscastillo.com");
  const path = url.searchParams.get("path") || url.pathname;
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.setHeader("Allow", "GET, HEAD");
    return response.status(405).end();
  }
  if (!path.startsWith("/") || path.startsWith("//") || path.length > 2048)
    return response.status(400).end();
  try {
    const template = await readFile(
      new URL("../server/template.html", import.meta.url),
      "utf8",
    );
    const page = await render(path, template);
    response.setHeader("Content-Type", page.contentType);
    response.setHeader("Cache-Control", "no-store");
    if (page.status === 503) response.setHeader("Retry-After", "60");
    response
      .status(page.status)
      .end(request.method === "HEAD" ? "" : page.html);
  } catch {
    response.status(503).send("Contenido temporalmente no disponible.");
  }
}
