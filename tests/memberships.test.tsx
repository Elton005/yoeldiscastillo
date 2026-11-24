import { expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
const mock = vi.hoisted(() => ({
  rpc: vi.fn(async (_name: string, _args?: unknown) => ({ data: [], error: null })),
}));
vi.mock("../src/lib/supabase", () => ({ db: () => mock }));
vi.mock("../src/services/content", () => ({
  requireEditor: vi.fn(async () => ({})),
}));
import Memberships from "../src/admin/Memberships";
it("explica un nombre inválido y no envía la asignación de permisos", async () => {
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <Memberships />
    </QueryClientProvider>,
  );
  fireEvent.change(screen.getByLabelText("Correo electrónico"), {
    target: { value: "editor@example.test" },
  });
  const input = screen.getByLabelText("Nombre (opcional)");
  fireEvent.change(input, { target: { value: "a".repeat(151) } });
  fireEvent.submit(input.closest("form")!);
  const error = await screen.findByRole("alert");
  expect(error).toHaveTextContent("hasta 150 caracteres");
  expect(input).toHaveAttribute("aria-invalid", "true");
  expect(input).toHaveAttribute("aria-describedby", error.id);
  expect(
    mock.rpc.mock.calls.some(([name]) => name === "manage_editor_membership"),
  ).toBe(false);
});
