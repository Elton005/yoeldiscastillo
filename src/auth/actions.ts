import { db } from "../lib/supabase";
export function safeNext(value: string | null) {
  return value === "/admin.html" || value === "/"
    ? value
    : value && /^\/(?:libros|articulos)(?:\.html|\/[a-zA-Z0-9-]+)$/.test(value)
      ? value
      : "/";
}
export async function googleLogin(next = "/") {
  sessionStorage.setItem("auth-next", safeNext(next));
  const { error } = await db().auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  });
  if (error)
    throw new Error(
      "No se pudo iniciar el acceso con Google. Inténtalo de nuevo.",
    );
}
