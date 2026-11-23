import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
const mocks = vi.hoisted(() => ({ read: vi.fn(), save: vi.fn() }));
vi.mock("../src/services/siteSettings", () => ({
  readSiteSettings: mocks.read,
  saveSiteSettings: mocks.save,
  siteSettingsKey: ["site-settings", "public"],
}));
import SiteSettingsEditor from "../src/admin/SiteSettingsEditor";
import { defaultSiteSettings } from "../src/models/siteSettings";
beforeEach(() => {
  vi.resetAllMocks();
  mocks.read.mockResolvedValue({
    settings: defaultSiteSettings,
    available: true,
    revision: 1,
  });
});
afterEach(() => vi.restoreAllMocks());
function mount() {
  const cache = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const dirty = vi.fn();
  render(
    <QueryClientProvider client={cache}>
      <MemoryRouter>
        <SiteSettingsEditor onDirtyChange={dirty} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { cache, dirty };
}
it("un error al recargar no desmonta el formulario ni borra su borrador", async () => {
  const { cache, dirty } = mount();
  const title = await screen.findByLabelText("Título de inicio", {
    exact: true,
  });
  fireEvent.change(title, { target: { value: "Texto que debo conservar" } });
  await waitFor(() => expect(dirty).toHaveBeenLastCalledWith(true));
  mocks.read.mockRejectedValue(new Error("Red no disponible"));
  vi.spyOn(window, "confirm").mockReturnValue(true);
  fireEvent.click(
    screen.getByRole("button", {
      name: "Descartar / recargar ajustes",
    }),
  );
  await waitFor(
    () =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Tu borrador se conserva",
      ),
    { timeout: 4000 },
  );
  expect(
    screen.getByLabelText("Título de inicio", { exact: true }),
  ).toHaveValue("Texto que debo conservar");
  expect(dirty).toHaveBeenLastCalledWith(true);
  cache.clear();
});
it("cancelar el descarte conserva los cambios y no vuelve a leer el servidor", async () => {
  const { cache } = mount();
  const title = await screen.findByLabelText("Título de inicio", {
    exact: true,
  });
  fireEvent.change(title, { target: { value: "Mi borrador" } });
  vi.spyOn(window, "confirm").mockReturnValue(false);
  fireEvent.click(
    screen.getByRole("button", {
      name: "Descartar / recargar ajustes",
    }),
  );
  expect(title).toHaveValue("Mi borrador");
  expect(mocks.read).toHaveBeenCalledTimes(1);
  cache.clear();
});
