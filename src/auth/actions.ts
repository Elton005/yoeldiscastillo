import { db } from "../lib/supabase";
export function safeNext(value: string | null) {
  if (value === "/admin" || value === "/admin/") return "/admin.html";
  return value === "/admin.html" || value === "/"
    ? value
    : value && /^\/(?:libros|articulos)(?:\.html|\/[a-zA-Z0-9-]+)$/.test(value)
      ? value
      : "/";
}
const nextKey = "yc:auth-return";
export function rememberAuthNext(next: string) {
  sessionStorage.setItem("auth-next", safeNext(next));
  localStorage.setItem(
    nextKey,
    JSON.stringify({ next: safeNext(next), at: Date.now() }),
  );
}
export function readAuthNext() {
  if (typeof window === "undefined") return "/";
  try {
    const tab = sessionStorage.getItem("auth-next");
    if (tab) return safeNext(tab);
    const saved = JSON.parse(localStorage.getItem(nextKey) || "null");
    if (
      saved &&
      typeof saved.at === "number" &&
      Date.now() - saved.at >= 0 &&
      Date.now() - saved.at < 30 * 60 * 1000
    )
      return safeNext(saved.next);
  } catch {
    /* Untrusted/expired intent never becomes an external URL. */
  }
  return "/";
}
export function clearAuthNext() {
  try {
    sessionStorage.removeItem("auth-next");
  } catch {
    /* Logout must still complete if storage is unavailable. */
  }
  try {
    localStorage.removeItem(nextKey);
  } catch {
    /* Best effort. */
  }
}
export function callbackUrl(
  origin = window.location.origin,
  base = import.meta.env.BASE_URL,
) {
  const url = new URL(base + "auth/callback", origin);
  if (
    ["yoeldiscastillo.com", "www.yoeldiscastillo.com"].includes(url.hostname)
  ) {
    url.hostname = "www.yoeldiscastillo.com";
    url.protocol = "https:";
    url.port = "";
  }
  return url.href;
}
export async function googleLogin(next = "/") {
  const redirectTo = callbackUrl();
  // Create the PKCE verifier on the same origin that receives the callback.
  if (new URL(redirectTo).origin !== window.location.origin) {
    window.location.assign(
      new URL(
        `${import.meta.env.BASE_URL}acceso?next=${encodeURIComponent(safeNext(next))}`,
        redirectTo,
      ).href,
    );
    return;
  }
  rememberAuthNext(next);
  const { error } = await db().auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
    },
  });
  if (error)
    throw new Error(
      "No se pudo iniciar el acceso con Google. Inténtalo de nuevo.",
    );
}
