import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  rpc: vi.fn(),
  from: vi.fn(),
}));
vi.mock("../src/lib/supabase", () => ({
  db: () => ({
    auth: { getUser: mocks.getUser },
    rpc: mocks.rpc,
    from: mocks.from,
  }),
}));
import {
  deleteContent,
  listContent,
  saveContent,
  getBookVisibilitySupport,
  reorderContent,
} from "../src/services/content";
import { defaults } from "../src/models/content";
beforeEach(() => vi.clearAllMocks());
describe("Denegación administrativa en servicios cliente", () => {
  it("distingue fallos de sesión/permisos y no escribe contenido en ninguno", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "network" },
    });
    await expect(deleteContent("libros", 1)).rejects.toThrow(
      "validar la sesión",
    );
    expect(mocks.rpc).not.toHaveBeenCalled();
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "editor" } },
      error: null,
    });
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "PGRST202" } });
    await expect(
      saveContent("libros", { ...defaults(), titulo: "Prueba" }),
    ).rejects.toThrow("verificar los permisos");
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("no consulta tablas privadas ni modifica contenido sin sesión", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(listContent("libros", true)).rejects.toThrow("Inicia sesión");
    await expect(
      saveContent("libros", { ...defaults(), titulo: "Prueba" }),
    ).rejects.toThrow("Inicia sesión");
    await expect(deleteContent("articulos", 1)).rejects.toThrow(
      "Inicia sesión",
    );
    expect(mocks.from).not.toHaveBeenCalled();
    await expect(reorderContent("libros", 1, "up")).rejects.toThrow(
      "Inicia sesión",
    );
  });
  it("rechaza usuario autenticado sin membresía aunque reclame un rol en sus metadatos", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "reader", user_metadata: { role: "admin" } } },
      error: null,
    });
    mocks.rpc.mockResolvedValue({ data: null, error: null });
    await expect(
      saveContent("destacados", { ...defaults(), titulo: "Prueba" }),
    ).rejects.toThrow("autorización");
    await expect(deleteContent("libros", 1)).rejects.toThrow("autorización");
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
it("lee y guarda el contrato original de libros sin exigir la columna opcional visible", async () => {
  const response = (result: unknown) => ({
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    then: (resolve: (value: unknown) => unknown) =>
      Promise.resolve(result).then(resolve),
  });
  mocks.from
    .mockReturnValueOnce(
      response({
        data: null,
        error: {
          code: "42703",
          message: "column libros.visible does not exist",
        },
      }),
    )
    .mockReturnValueOnce(
      response({ data: [{ id: 1, titulo: "Libro original" }], error: null }),
    );
  expect(await listContent("libros")).toEqual([
    { id: 1, titulo: "Libro original" },
  ]);
  expect(getBookVisibilitySupport()).toBe(false);
  expect(mocks.from).toHaveBeenCalledTimes(2);
  mocks.getUser.mockResolvedValue({
    data: { user: { id: "editor" } },
    error: null,
  });
  mocks.rpc.mockResolvedValue({ data: "editor", error: null });
  const update = vi.fn().mockReturnThis();
  mocks.from.mockReturnValue({
    update,
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: async () => ({ data: { id: 1 }, error: null }),
  });
  await saveContent(
    "libros",
    { ...defaults(), titulo: "Libro actualizado" },
    1,
  );
  expect(update.mock.calls[0][0]).not.toHaveProperty("visible");
});
