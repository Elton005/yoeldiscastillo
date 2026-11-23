import { expect, test } from "@playwright/test";
test("SSR compilado entrega publicaciones y metadatos indexables e hidrata sin errores", async ({
  page,
  request,
}) => {
  const html = await request.get("http://127.0.0.1:4173/articulos/7");
  expect(html.status()).toBe(200);
  const body = await html.text();
  expect(body).toContain("<title>Artículo de prueba —");
  expect(body).toContain("<h2>Contenido antiguo</h2>");
  expect(body).not.toContain("<script>window.xss=true</script>");
  expect(body).toContain("/articulos/7");
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("http://127.0.0.1:4173/articulos/7");
  await expect(
    page.getByRole("heading", { name: "Contenido antiguo" }),
  ).toBeVisible();
  await expect(page).toHaveTitle(
    "Artículo de prueba — Yoeldis Castillo Quiala",
  );
  await page.goto("http://127.0.0.1:4173/");
  await expect(
    page.getByRole("heading", { name: "Recurso de prueba", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
  const sitemap = await request.get("http://127.0.0.1:4173/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  expect(await sitemap.text()).toContain("/articulos/7");
  expect(
    (await request.get("http://127.0.0.1:4173/articulos/999")).status(),
  ).toBe(404);
  expect(
    (
      await request.get("http://127.0.0.1:4173/index.html", { maxRedirects: 0 })
    ).status(),
  ).toBe(301);
});
test("la biografía y artículos se leen sin JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:4173/sobre-mi.html");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Rigor académico",
  );
  await page.goto("http://127.0.0.1:4173/articulos/7");
  await expect(
    page.getByRole("heading", { name: "Contenido antiguo" }),
  ).toBeVisible();
  await context.close();
});
