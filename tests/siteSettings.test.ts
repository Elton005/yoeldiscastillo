import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
  requireEditor: vi.fn(),
}));
vi.mock("../src/lib/supabase", () => ({
  supabase: {},
  db: () => ({ from: mocks.from, rpc: mocks.rpc }),
}));
vi.mock("../src/services/content", () => ({
  requireEditor: mocks.requireEditor,
}));
import {
  defaultSiteSettings,
  parseSiteSettings,
  siteSettingsSchema,
} from "../src/models/siteSettings";
import {
  readSiteSettings,
  saveSiteSettings,
} from "../src/services/siteSettings";
beforeEach(() => vi.resetAllMocks());
function readResponse(data: unknown, error: unknown = null) {
  mocks.from.mockReturnValue({
    select: () => ({
      eq: () => ({ maybeSingle: async () => ({ data, error }) }),
    }),
  });
}
it("conserva el contenido original cuando no hay personalización y completa campos parciales", () => {
  expect(parseSiteSettings({})).toEqual(defaultSiteSettings);
  expect(parseSiteSettings({ homeImageSize: 260 }).homeTitle).toBe(
    defaultSiteSettings.homeTitle,
  );
});
it("rechaza URLs activas, formatos/tamaños inválidos y campos no publicados", () => {
  for (const override of [
    { homeImage: "javascript:alert(1)" },
    { facebook: "//evil.test" },
    { homeImage: "https://evil.test/a.svg" },
    { homeImageSize: 800 },
    { homeImageShape: "crop" },
    { privilegedKey: "secret" },
  ])
    expect(
      siteSettingsSchema.safeParse({ ...defaultSiteSettings, ...override })
        .success,
    ).toBe(false);
});
it("detecta únicamente la tabla ausente, sin ocultar errores de permisos o red", async () => {
  readResponse(null, {
    code: "PGRST205",
    message: "public.site_settings not found",
  });
  expect((await readSiteSettings()).available).toBe(false);
  readResponse(null, { code: "42501", message: "denied" });
  await expect(readSiteSettings()).rejects.toThrow("cargar");
  readResponse(null, { code: "FETCH", message: "network" });
  await expect(readSiteSettings()).rejects.toThrow("cargar");
});
it("lee la revisión publicada y rechaza una respuesta malformada", async () => {
  readResponse({ content: { homeTitle: "Mi título" }, revision: 4 });
  expect(await readSiteSettings()).toMatchObject({
    available: true,
    revision: 4,
    settings: { homeTitle: "Mi título" },
  });
  readResponse({ content: { homeImage: "javascript:x" }, revision: 4 });
  await expect(readSiteSettings()).rejects.toThrow();
});
it("no llama a la RPC sin autorización y mantiene el borrador ante conflicto", async () => {
  mocks.requireEditor.mockRejectedValueOnce(new Error("Sin autorización"));
  await expect(saveSiteSettings(defaultSiteSettings, 1)).rejects.toThrow(
    "autorización",
  );
  expect(mocks.rpc).not.toHaveBeenCalled();
  mocks.requireEditor.mockResolvedValue(undefined);
  mocks.rpc.mockResolvedValue({ error: { code: "40001" }, data: null });
  await expect(saveSiteSettings(defaultSiteSettings, 1)).rejects.toThrow(
    "tu borrador sigue aquí",
  );
  expect(mocks.rpc).toHaveBeenCalledWith("save_site_settings", {
    payload: defaultSiteSettings,
    expected_revision: 1,
  });
});

it("actualiza el recurso inicial anterior sin sustituir fotografías personalizadas", () => {
  expect(
    parseSiteSettings({
      homeImage: "/img/logo-cerebro.jpg",
      homeImageSize: 320,
    }).homeImage,
  ).toBe(defaultSiteSettings.homeImage);
  expect(
    parseSiteSettings({ homeImage: "/img/mi-foto.png", homeImageSize: 300 })
      .homeImage,
  ).toBe("/img/mi-foto.png");
  expect(
    siteSettingsSchema.safeParse({
      ...defaultSiteSettings,
      homePrimaryUrl: "javascript:alert(1)",
    }).success,
  ).toBe(false);
});
