import { db } from "../lib/supabase";

export async function recoverIdentity(callback = false) {
  const client = db();
  // The SDK owns PKCE exchange through detectSessionInUrl. initialize() shares
  // its promise with getSession/subscribers; never exchange a code twice.
  const initialized = await client.auth.initialize();
  const { data, error } = await client.auth.getSession();
  if (error || (callback && initialized.error))
    throw new Error(
      "No se pudo recuperar la sesión. Reinicia el acceso en este mismo navegador y dominio www.",
    );
  if (!data.session) {
    if (callback || initialized.error)
      throw new Error(
        "No se recibió una sesión válida. Reinicia el acceso en este mismo navegador y dominio www.",
      );
    return null;
  }
  const result = await client.auth.getUser();
  if (result.error || !result.data.user)
    throw new Error(
      "No se pudo validar la sesión. Reintenta o vuelve a iniciar sesión.",
    );
  return result.data.user;
}
