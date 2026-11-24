import {
  act,
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
const mocks = vi.hoisted(() => ({
  initialize: vi.fn(),
  getSession: vi.fn(),
  getUser: vi.fn(),
  rpc: vi.fn(),
  listener: null as
    ((event: string, session: { user: { id: string } } | null) => void) | null,
}));
vi.mock("../src/lib/supabase", () => {
  const supabase = {
    auth: {
      initialize: mocks.initialize,
      getSession: mocks.getSession,
      getUser: mocks.getUser,
      onAuthStateChange: (callback: typeof mocks.listener) => {
        mocks.listener = callback;
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
    },
    rpc: mocks.rpc,
  };
  return { supabase, db: () => supabase };
});
import { AuthProvider, useAuth } from "../src/auth/AuthProvider";
function Draft() {
  const [count, setCount] = useState(0);
  return (
    <button onClick={() => setCount((value) => value + 1)}>
      Cambios: {count}
    </button>
  );
}
function Gate() {
  const auth = useAuth();
  if (auth.error)
    return (
      <p role="alert">
        {auth.error.kind}: {auth.error.message} (
        {auth.user?.id || "sin identidad"})
      </p>
    );
  return auth.loading ? (
    <p>Comprobando</p>
  ) : auth.role ? (
    <Draft />
  ) : (
    <p>Sin permisos</p>
  );
}
function setup() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  mocks.initialize.mockReset().mockResolvedValue({ error: null });
  mocks.getSession
    .mockReset()
    .mockResolvedValue({
      data: { session: { user: { id: "verified-editor" } } },
      error: null,
    });
  mocks.getUser.mockReset().mockResolvedValue({
    data: { user: { id: "verified-editor" } },
    error: null,
  });
  mocks.rpc.mockReset().mockResolvedValue({ data: "admin", error: null });
});
it("espera la recuperación antes de decidir que no existe una sesión", async () => {
  let finish: ((value: unknown) => void) | undefined;
  mocks.getSession.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  setup();
  expect(screen.getByText("Comprobando")).toBeVisible();
  await waitFor(() => expect(finish).toBeDefined());
  expect(mocks.rpc).not.toHaveBeenCalled();
  await act(async () => {
    finish?.({ data: { session: null }, error: null });
  });
  expect(screen.getByText("Sin permisos")).toBeVisible();
  expect(mocks.getUser).not.toHaveBeenCalled();
});
it("conserva la identidad y distingue una RPC ausente de una denegación", async () => {
  mocks.rpc.mockResolvedValue({ data: null, error: { code: "PGRST202" } });
  setup();
  expect(await screen.findByRole("alert")).toHaveTextContent("permissions:");
  expect(screen.getByRole("alert")).toHaveTextContent("verified-editor");
  expect(screen.getByRole("alert")).toHaveTextContent("no está configurado");
});
it("un fallo de red al validar la sesión muestra error en lugar de fingir logout", async () => {
  mocks.getUser.mockRejectedValue(new Error("network"));
  setup();
  expect(await screen.findByRole("alert")).toHaveTextContent("session:");
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it("una consulta correcta sin rol deniega acceso sin error técnico", async () => {
  mocks.rpc.mockResolvedValue({ data: null, error: null });
  setup();
  await screen.findByText("Sin permisos");
  expect(screen.queryByRole("alert")).toBeNull();
});
it("conserva la edición al renovar una sesión del mismo usuario", async () => {
  setup();
  await screen.findByRole("button", { name: "Cambios: 0" });
  fireEvent.click(screen.getByRole("button"));
  expect(screen.getByRole("button")).toHaveTextContent("Cambios: 1");
  await act(async () => {
    mocks.listener?.("TOKEN_REFRESHED", { user: { id: "verified-editor" } });
  });
  await waitFor(() => expect(mocks.getUser).toHaveBeenCalledTimes(2));
  expect(screen.getByRole("button")).toHaveTextContent("Cambios: 1");
});
it("un resultado de verificación antiguo no restaura privilegios después de logout", async () => {
  setup();
  await screen.findByRole("button");
  let finish: ((value: unknown) => void) | undefined;
  mocks.getUser.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  await act(async () => {
    mocks.listener?.("TOKEN_REFRESHED", { user: { id: "verified-editor" } });
  });
  await waitFor(() => expect(finish).toBeDefined());
  await act(async () => {
    mocks.listener?.("SIGNED_OUT", null);
  });
  expect(screen.getByText("Sin permisos")).toBeVisible();
  await act(async () => {
    finish?.({ data: { user: { id: "verified-editor" } }, error: null });
  });
  expect(screen.getByText("Sin permisos")).toBeVisible();
  expect(screen.queryByRole("button")).toBeNull();
});
