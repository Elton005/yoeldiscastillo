import { z } from "zod";
import { db, supabase } from "../lib/supabase";
import { requireEditor } from "./content";
import {
  defaultSiteSettings,
  parseSiteSettings,
  siteSettingsSchema,
  type SiteSettings,
} from "../models/siteSettings";
export const siteSettingsKey = ["site-settings", "public"] as const;
export type SiteSettingsRecord = {
  settings: SiteSettings;
  revision: number;
  available: boolean;
};
const rowSchema = z.object({
  content: z.unknown(),
  revision: z.number().int().positive(),
});
export async function readSiteSettings(): Promise<SiteSettingsRecord> {
  if (!supabase)
    return { settings: defaultSiteSettings, revision: 0, available: false };
  const { data, error } = await db()
    .from("site_settings")
    .select("content,revision")
    .eq("id", 1)
    .maybeSingle();
  if (
    error &&
    ["42P01", "PGRST205"].includes(error.code) &&
    /site_settings/i.test(error.message)
  )
    return { settings: defaultSiteSettings, revision: 0, available: false };
  if (error || !data)
    throw new Error(
      "No se pudieron cargar los ajustes de la página. Vuelve a intentarlo.",
    );
  const row = rowSchema.parse(data);
  return {
    settings: parseSiteSettings(row.content),
    revision: row.revision,
    available: true,
  };
}
export async function saveSiteSettings(
  settings: SiteSettings,
  revision: number,
): Promise<SiteSettingsRecord> {
  await requireEditor();
  const payload = siteSettingsSchema.parse(settings);
  const { data, error } = await db().rpc("save_site_settings", {
    payload,
    expected_revision: revision,
  });
  if (error?.code === "40001")
    throw new Error(
      "Otra persona ha actualizado la página. Recarga los ajustes antes de volver a guardar; tu borrador sigue aquí.",
    );
  if (error)
    throw new Error(
      "No se pudieron guardar los ajustes. Comprueba tus permisos y la configuración del panel.",
    );
  const row = rowSchema.parse(data);
  return {
    settings: parseSiteSettings(row.content),
    revision: row.revision,
    available: true,
  };
}
