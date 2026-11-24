import { build } from "vite";
import { prerender } from "./prerender.mjs";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

// Pages serves compiled files only; it cannot run the Node SSR renderer.
export async function buildPages(
  outDir = "dist-pages",
  base = process.env.PAGES_BASE_PATH || "/yoeldiscastillo/",
) {
  if (!/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(base))
    throw new Error("PAGES_BASE_PATH debe ser / o una ruta /repositorio/.");
  await build({ base, build: { outDir } });
  await prerender(outDir, base);
  await writeFile(resolve(outDir, ".nojekyll"), "");
  console.log(`GitHub Pages: ${outDir}, base ${base}`);
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  await buildPages();
