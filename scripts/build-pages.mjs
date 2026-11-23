import { build } from "vite";
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { pathToFileURL } from "node:url";

// Pages serves compiled files only; it cannot run the Node SSR renderer.
export async function buildPages(
  outDir = "dist-pages",
  base = process.env.PAGES_BASE_PATH || "/yoeldiscastillo/",
) {
  if (!/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(base))
    throw new Error("PAGES_BASE_PATH debe ser / o una ruta /repositorio/.");
  await build({ base, build: { outDir } });
  for (const route of [
    "sobre-mi.html",
    "libros.html",
    "articulos.html",
    "contacto.html",
    "admin.html",
    "acceso/index.html",
    "admin/index.html",
    "auth/callback/index.html",
    "404.html",
  ]) {
    const target = resolve(outDir, route);
    await mkdir(dirname(target), { recursive: true });
    await copyFile(resolve(outDir, "index.html"), target);
  }
  await writeFile(resolve(outDir, ".nojekyll"), "");
  console.log(`GitHub Pages: ${outDir}, base ${base}`);
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  await buildPages();
