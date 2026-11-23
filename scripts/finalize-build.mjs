import { readFile, writeFile, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
export async function finalizeBuild(dist = "dist", server = "server") {
  // Vercel gives filesystem routes priority. Keep the shell OUTSIDE the static root
  // so / always reaches SSR instead of serving an empty SPA document.
  const generatedIndex = resolve(dist, "index.html");
  await writeFile(
    resolve(server, "template.html"),
    await readFile(generatedIndex),
  );
  await unlink(generatedIndex);
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  await finalizeBuild();
