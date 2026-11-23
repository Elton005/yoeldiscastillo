import { readdir, readFile } from "node:fs/promises";
async function scan(path) {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const file = `${path}/${entry.name}`;
    if (entry.isDirectory()) {
      await scan(file);
      continue;
    }
    if (!/\.(js|html|json|map)$/.test(file)) continue;
    const text = await readFile(file, "utf8");
    if (/sb_secret_[A-Za-z0-9_-]+/.test(text))
      throw new Error(`Credencial privilegiada detectada en ${file}`);
    for (const token of text.matchAll(
      /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
    )) {
      let role;
      try {
        role = JSON.parse(
          Buffer.from(token[0].split(".")[1], "base64url").toString(),
        ).role;
      } catch {
        throw new Error(`JWT no clasificable en ${file}`);
      }
      if (role !== "anon") throw new Error(`JWT no público en ${file}`);
    }
  }
}
await scan("dist");
await scan("server");
console.log("Bundles revisados: sin claves Supabase privilegiadas detectadas.");
