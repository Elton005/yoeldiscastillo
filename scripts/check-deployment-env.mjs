import { loadEnv } from "vite";
const env = {
  ...loadEnv("production", process.cwd(), "VITE_"),
  ...process.env,
};
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key)
  throw new Error(
    "Faltan VITE_SUPABASE_URL y/o VITE_SUPABASE_PUBLISHABLE_KEY en la plataforma de despliegue.",
  );
if (new URL(url).protocol !== "https:")
  throw new Error("VITE_SUPABASE_URL debe usar HTTPS.");
let publicKey = key.startsWith("sb_publishable_");
try {
  publicKey ||=
    JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString()).role ===
    "anon";
} catch {}
if (!publicKey)
  throw new Error(
    "Usa una clave publicable/anon de Supabase; nunca una clave administrativa.",
  );
console.log(
  "Variables públicas presentes y formato válido; no se ha probado la conexión remota.",
);
