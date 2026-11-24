import { expect, test } from "@playwright/test";
test.beforeEach(async ({ request }) => {
  await request.post("http://127.0.0.1:54329/test/reset");
});
test("Google simulado: PKCE único, retorno al panel, recarga, logout y nuevo login", async ({
  page,
}) => {
  const exchanges: string[] = [];
  page.on("request", (req) => {
    if (req.url().includes("grant_type=pkce")) exchanges.push(req.url());
  });
  await page.goto("/admin.html");
  await page
    .getByRole("button", { name: "Iniciar sesión con Google", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Gestionar Libros", exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/admin\.html$/);
  expect(exchanges).toHaveLength(1);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Crear libro", exact: true }),
  ).toBeVisible();
  expect(exchanges).toHaveLength(1);
  await page.getByRole("button", { name: /Cerrar Sesión/i }).click();
  await expect(
    page.getByRole("button", {
      name: "Iniciar sesión con Google",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Iniciar sesión con Google", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Gestionar Libros", exact: true }),
  ).toBeVisible();
  expect(exchanges).toHaveLength(2);
});
test("lector autenticado ve denegación y no otro login Google", async ({
  page,
  request,
}) => {
  await request.post("http://127.0.0.1:54329/test/oauth", {
    data: { role: "reader" },
  });
  await page.goto("/admin.html");
  await page
    .getByRole("button", { name: "Iniciar sesión con Google", exact: true })
    .click();
  await expect(
    page.getByText(
      "Tu cuenta no tiene autorización para administrar este sitio.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Iniciar sesión con Google",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(page).toHaveURL(/\/admin\.html$/);
});
test("RPC ausente conserva sesión, muestra error y permite reintentar sin Google", async ({
  page,
  request,
}) => {
  await request.post("http://127.0.0.1:54329/test/oauth", {
    data: { roleError: true },
  });
  await page.goto("/admin.html");
  await page
    .getByRole("button", { name: "Iniciar sesión con Google", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "servicio de permisos no está configurado",
  );
  await expect(
    page.getByRole("button", {
      name: "Iniciar sesión con Google",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(page).toHaveURL(/\/admin\.html$/);
  await request.post("http://127.0.0.1:54329/test/oauth", {
    data: { roleError: false },
  });
  await page
    .getByRole("button", { name: "Reintentar verificación", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Gestionar Libros", exact: true }),
  ).toBeVisible();
});
test("rescata un retorno OAuth a Inicio y no intercambia el código dos veces", async ({
  page,
  request,
}) => {
  await request.post("http://127.0.0.1:54329/test/oauth", {
    data: { landing: "/" },
  });
  let exchanges = 0;
  page.on("request", (req) => {
    if (req.url().includes("grant_type=pkce")) exchanges++;
  });
  await page.goto("/admin.html");
  await page
    .getByRole("button", { name: "Iniciar sesión con Google", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Gestionar Libros", exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/admin\.html$/);
  expect(exchanges).toBe(1);
});
test("código sin verificador muestra error estable y conserva destino", async ({
  page,
}) => {
  await page.goto("/admin.html");
  await page.evaluate(() => sessionStorage.setItem("auth-next", "/admin.html"));
  await page.goto("/auth/callback?code=local-invalid-code");
  await expect(page.getByText(/No se pudo verificar el acceso/)).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Volver a iniciar sesión" }),
  ).toHaveAttribute("href", "/acceso?next=%2Fadmin.html");
  await expect(page).toHaveURL(/\/auth\/callback$/);
  await page.reload();
  await expect(page.getByText(/No se pudo verificar el acceso/)).toBeVisible();
});
test("rechazo del proveedor queda visible y no inicia otro OAuth automáticamente", async ({
  page,
}) => {
  await page.goto(
    "/auth/callback?error=access_denied&error_description=local-test",
  );
  await expect(page.getByText(/No se pudo verificar el acceso/)).toBeVisible();
  await expect(page).toHaveURL(/\/auth\/callback$/);
  await expect(page.getByRole("button", { name: /Google/ })).toHaveCount(0);
});
