// Optional, READ-ONLY visual evidence. Never logs or persists an API key.
// Queries the same public content as the original website, not users/Auth/admin tables.
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
const source = execFileSync("git", ["show", "0f6ab9b:js/main.js"], {
  encoding: "utf8",
});
const url = source.match(/const SUPABASE_URL = '([^']+)'/)?.[1];
const key = source.match(/const SUPABASE_ANON_KEY = '([^']+)'/)?.[1];
if (
  !url ||
  !key ||
  JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString()).role !==
    "anon"
)
  throw new Error("Public reference configuration unavailable");
const tables = {};
for (const [table, filter] of [
  ["libros", "order=fecha_publicacion.desc.nullslast"],
  ["articulos", "publicado=eq.true&order=creado_en.desc"],
  ["destacados", "activo=eq.true&order=orden.asc&limit=2"],
]) {
  const response = await fetch(`${url}/rest/v1/${table}?select=*&${filter}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok)
    throw new Error(
      `Public ${table} reference unavailable (${response.status})`,
    );
  tables[table] = await response.json();
  console.log(
    `${table}: ${tables[table].length} registros públicos leídos; ninguna escritura.`,
  );
}
await mkdir(".qa/visual", { recursive: true });
await writeFile(
  ".qa/visual/public-reference.json",
  JSON.stringify(
    {
      readOnly: true,
      capturedAt: new Date().toISOString(),
      source: "Public anonymous queries only; no Auth/admin reads or writes",
      tables,
    },
    null,
    2,
  ),
);
