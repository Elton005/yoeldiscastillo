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
  getUser: vi.fn(),
  rpc: vi.fn(),
  listener: null as
    | ((event: string, session: { user: { id: string } } | null) => void)
    | null,
}));
vi.mock("../src/lib/supabase", () => ({
  supabase: {
    auth: {
      getUser: mocks.getUser,
      onAuthStateChange: (callback: typeof mocks.listener) => {
        mocks.listener = callback;
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
    },
    rpc: mocks.rpc,
  },
}));
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
  mocks.getUser
    .mockReset()
    .mockResolvedValue({
      data: { user: { id: "verified-editor" } },
      error: null,
    });
  mocks.rpc.mockReset().mockResolvedValue({ data: "admin", error: null });
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
