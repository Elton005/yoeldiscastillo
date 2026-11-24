import { beforeEach, expect, it, vi } from "vitest";
const oauth = vi.hoisted(() => vi.fn(async () => ({ error: null })));
vi.mock("../src/lib/supabase", () => ({
  db: () => ({ auth: { signInWithOAuth: oauth } }),
}));
import {
  callbackUrl,
  clearAuthNext,
  googleLogin,
  readAuthNext,
  rememberAuthNext,
  safeNext,
} from "../src/auth/actions";
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  oauth.mockClear();
});
it("construye el callback www y conserva dominios de staging/Pages", () => {
  expect(callbackUrl("http://www.yoeldiscastillo.com", "/")).toBe(
    "https://www.yoeldiscastillo.com/auth/callback",
  );
  expect(callbackUrl("https://yoeldiscastillo.com", "/")).toBe(
    "https://www.yoeldiscastillo.com/auth/callback",
  );
  expect(callbackUrl("https://preview.example", "/")).toBe(
    "https://preview.example/auth/callback",
  );
  expect(callbackUrl("https://elton005.github.io", "/yoeldiscastillo/")).toBe(
    "https://elton005.github.io/yoeldiscastillo/auth/callback",
  );
});
it("conserva el destino al perder el almacenamiento por pestaña y lo limpia después", () => {
  rememberAuthNext("/admin.html");
  sessionStorage.clear();
  expect(readAuthNext()).toBe("/admin.html");
  clearAuthNext();
  expect(readAuthNext()).toBe("/");
});
it("rechaza retornos externos, manipulados y caducados", () => {
  for (const target of [
    "//evil.example",
    "https://evil.example",
    "/\\evil.example",
    "/admin.html?next=https://evil.example",
  ])
    expect(safeNext(target)).toBe("/");
  localStorage.setItem(
    "yc:auth-return",
    JSON.stringify({ next: "//evil.example", at: Date.now() }),
  );
  expect(readAuthNext()).toBe("/");
  localStorage.setItem(
    "yc:auth-return",
    JSON.stringify({ next: "/admin.html", at: Date.now() - 31 * 60 * 1000 }),
  );
  expect(readAuthNext()).toBe("/");
});
it("normaliza los alias administrativos", () => {
  expect(safeNext("/admin")).toBe("/admin.html");
  expect(safeNext("/admin/")).toBe("/admin.html");
});
it("envía Google al callback y guarda solamente la intención de navegación", async () => {
  await googleLogin("/admin.html");
  expect(oauth).toHaveBeenCalledWith({
    provider: "google",
    options: { redirectTo: callbackUrl() },
  });
  expect(readAuthNext()).toBe("/admin.html");
});
