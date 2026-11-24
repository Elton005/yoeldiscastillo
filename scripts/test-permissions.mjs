import { createClient } from "@supabase/supabase-js";
import { existsSync } from "node:fs";
if (existsSync(".env.staging.local")) process.loadEnvFile(".env.staging.local");
const env = process.env;
const url = env.STAGING_SUPABASE_URL;
const key = env.STAGING_SUPABASE_PUBLISHABLE_KEY;
if (
  env.STAGING_TESTS_AUTHORIZED !== "true" ||
  !url ||
  !key ||
  !env.STAGING_ADMIN_EMAIL ||
  !env.STAGING_USER_EMAIL ||
  !env.STAGING_ADMIN_PASSWORD ||
  !env.STAGING_USER_PASSWORD
) {
  console.error(
    "NO EJECUTADO: configura staging y cuentas de prueba en .env.staging.local y STAGING_TESTS_AUTHORIZED=true. No uses producción.",
  );
  process.exit(2);
}
if (new URL(url).hostname === "jjbztkljgsdwrqylspeg.supabase.co") {
  console.error(
    "El proyecto original de producción está bloqueado para estas pruebas.",
  );
  process.exit(2);
}
const client = () =>
  createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { retry: false },
  });
const admin = client(),
  reader = client(),
  anonymous = client();
const permissionError = (result) =>
  result.error &&
  (result.error.code === "42501" ||
    result.status === 401 ||
    result.status === 403);
function assert(condition, label) {
  if (!condition) throw new Error(label);
  console.log(`PASS: ${label}`);
}
const cleanup = [];
try {
  for (const [instance, email, password] of [
    [admin, env.STAGING_ADMIN_EMAIL, env.STAGING_ADMIN_PASSWORD],
    [reader, env.STAGING_USER_EMAIL, env.STAGING_USER_PASSWORD],
  ]) {
    const login = await instance.auth.signInWithPassword({ email, password });
    if (login.error)
      throw new Error("No se pudieron verificar las cuentas de staging.");
  }
  assert(
    (await admin.rpc("current_editor_role")).data === "admin",
    "cuenta administradora verificada",
  );
  const readerRole = await reader.rpc("current_editor_role");
  assert(
    !readerRole.error && readerRole.data === null,
    "cuenta común sin membresía",
  );
  const marker = `permission-test-${crypto.randomUUID()}`;
  const visibility = await admin.from("libros").select("visible").limit(0);
  const missingVisibility =
    visibility.error &&
    ["42703", "PGRST204"].includes(visibility.error.code) &&
    /\bvisible\b/i.test(visibility.error.message || "");
  if (visibility.error && !missingVisibility)
    throw new Error("No se pudo verificar el contrato del catálogo de staging.");
  if (missingVisibility)
    console.log("INFO: libros.visible no está instalado; se prueba el catálogo original sin ocultación de libros.");
  for (const [table, visibilityFlag] of [
    ["libros", "visible"],
    ["articulos", "publicado"],
    ["destacados", "activo"],
  ]) {
    const flag = table === "libros" && missingVisibility ? null : visibilityFlag;
    const fixtures = flag
      ? [
          { titulo: marker, [flag]: true, orden: 999999 },
          { titulo: marker, [flag]: false, orden: 999999 },
        ]
      : [{ titulo: marker, orden: 999999 }];
    const created = await admin
      .from(table)
      .insert(fixtures)
      .select(flag ? "id," + flag : "id");
    assert(
      !created.error && created.data?.length === fixtures.length,
      `${table}: fixtures temporales autorizados`,
    );
    for (const row of created.data) cleanup.push([table, row.id]);
    const visible = flag ? created.data.find((row) => row[flag]) : created.data[0];
    const hidden = flag ? created.data.find((row) => !row[flag]) : undefined;
    for (const [instance, name] of [
      [anonymous, "anónimo"],
      [reader, "lector"],
    ]) {
      const publicRead = await instance
        .from(table)
        .select("id")
        .eq("id", visible.id);
      assert(
        !publicRead.error && publicRead.data.length === 1,
        `${table}: lectura pública de ${name}`,
      );
      if (hidden) {
        const privateRead = await instance
          .from(table)
          .select("id")
          .eq("id", hidden.id);
        assert(
          !privateRead.error && privateRead.data.length === 0,
          `${table}: borrador inaccesible para ${name}`,
        );
      }
      const insert = await instance
        .from(table)
        .insert({ titulo: marker, ...(flag ? { [flag]: true } : {}), orden: 999999 })
        .select("id");
      for (const row of insert.data ?? []) cleanup.push([table, row.id]);
      assert(permissionError(insert), `${table}: INSERT denegado a ${name}`);
      for (const method of ["update", "delete"]) {
        const mutation =
          method === "update"
            ? instance.from(table).update({ titulo: marker + "-unauthorized" })
            : instance.from(table).delete();
        const result = await mutation.eq("id", visible.id).select("id");
        assert(
          permissionError(result) ||
            (!result.error && result.data.length === 0),
          `${table}: ${method.toUpperCase()} denegado a ${name}`,
        );
      }
    }
  }
  const membership = await reader.rpc("manage_editor_membership", {
    operation: "grant",
    target_email: env.STAGING_USER_EMAIL,
    assigned_role: "admin",
    target_user_id: null,
  });
  assert(permissionError(membership), "RPC no permite autopromoción de lector");
  assert(
    permissionError(await reader.from("editor_memberships").select("*")),
    "membresías privadas",
  );
  assert(
    permissionError(await anonymous.from("administradores").select("*")),
    "administradores legacy privados",
  );
  const storage = await reader.storage
    .from("libros-imagenes")
    .upload(
      `${crypto.randomUUID()}/unauthorized.png`,
      new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]),
      { contentType: "image/png" },
    );
  assert(
    Boolean(storage.error) &&
      ["403", "42501"].includes(
        String(storage.error.statusCode ?? storage.error.status),
      ),
    "Storage deniega escritura directa de lector",
  );
  console.log(
    "Pruebas negativas contra staging completadas. Google, envío SMTP y carga Edge válida requieren verificación adicional.",
  );
} catch (error) {
  console.error(
    error instanceof Error
      ? error.message
      : "Falló la verificación de staging.",
  );
  process.exitCode = 1;
} finally {
  for (const [table, id] of cleanup) {
    const result = await admin.from(table).delete().eq("id", id);
    if (result.error) {
      console.error(
        "No se pudo limpiar un fixture temporal de staging. Revisa el catálogo de pruebas.",
      );
      process.exitCode = 1;
    }
  }
  await Promise.all([admin.auth.signOut(), reader.auth.signOut()]);
}
