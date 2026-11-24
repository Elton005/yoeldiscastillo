import { expect, test } from "@playwright/test";

test("cerrar sesión permite conservar o descartar un borrador", async ({
  page,
  request,
}) => {
  await request.post("http://127.0.0.1:54329/test/reset");
  await page.goto("/acceso");
  await page
    .getByLabel("Correo electrónico", { exact: true })
    .fill("admin@example.test");
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill("local-fixture-only");
  await page
    .locator("#formLogin")
    .getByRole("button", { name: /iniciar sesión/i })
    .click();
  await page.getByRole("link", { name: "Entrar al panel" }).click();
  const title = page.getByLabel("Título *", { exact: true });
  await title.fill("Borrador que debe conservarse");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page
    .getByRole("button", { name: "Cerrar Sesión", exact: true })
    .click();
  await expect(title).toHaveValue("Borrador que debe conservarse");
  await expect(
    page.getByRole("heading", { name: "Gestionar Libros", exact: true }),
  ).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Cerrar Sesión", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Acceso Restringido" }),
  ).toBeVisible();
});
