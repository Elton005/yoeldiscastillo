import { createClient } from "@supabase/supabase-js";
export const backendUrl = import.meta.env.VITE_SUPABASE_URL as
  string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
// Capture before the SDK consumes the one-use code/removes it from the URL.
// Only a boolean is retained; never copy codes/tokens into logs or storage.
export const authReturnDetected =
  typeof window !== "undefined" &&
  [
    new URLSearchParams(window.location.search),
    new URLSearchParams(window.location.hash.slice(1)),
  ].some((params) =>
    ["code", "access_token", "error", "error_code"].some((name) =>
      params.has(name),
    ),
  );
function publicKey(value: string): boolean {
  if (value.startsWith("sb_publishable_")) return true;
  try {
    return JSON.parse(atob(value.split(".")[1])).role === "anon";
  } catch {
    return false;
  }
}
if (key && !publicKey(key))
  throw new Error("La configuración requiere una clave pública de Supabase.");
export const supabase =
  backendUrl && key
    ? createClient(backendUrl, key, {
        db: { schema: "public", retry: false },
        auth: {
          flowType: "pkce",
          persistSession: !import.meta.env.SSR,
          autoRefreshToken: !import.meta.env.SSR,
          detectSessionInUrl: !import.meta.env.SSR,
        },
        global: {
          fetch: (input, init) =>
            fetch(input, {
              ...init,
              signal: init?.signal ?? AbortSignal.timeout(10000),
            }),
        },
      })
    : null;
export function db() {
  if (!supabase)
    throw new Error("La conexión de contenido todavía no está configurada.");
  return supabase;
}
