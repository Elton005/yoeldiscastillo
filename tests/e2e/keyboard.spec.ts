import { expect, test } from "@playwright/test";
test("el enlace para saltar al contenido funciona con teclado", async ({
  page,
}) => {
  await page.goto("/contacto.html");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Saltar al contenido" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
});
