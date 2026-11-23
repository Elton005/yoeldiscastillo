import { expect, test, type Page } from "@playwright/test";
test.beforeEach(async ({ request }) => {
  await request.post("http://127.0.0.1:54329/test/reset");
});
async function signIn(page: Page, role: "admin" | "reader") {
  await page.goto("/acceso");
  await page
    .getByLabel("Correo electrónico", { exact: true })
    .fill(`${role}@example.test`);
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill("local-fixture-only");
  await page
    .locator("#formLogin")
    .getByRole("button", { name: /iniciar sesión/i })
    .click();
  await expect(page.getByRole("heading", { name: "Mi cuenta" })).toBeVisible();
}

test("personalización: vista previa privada, imágenes, guardado, persistencia y SSR público", async ({
  page,
  context,
  request,
}, info) => {
  test.setTimeout(60000);
  const publicPage = await context.newPage();
  await publicPage.goto("/");
  await expect(publicPage.getByRole("heading", { level: 1 })).toContainText(
    "Comprende tu mente",
  );
  await signIn(page, "admin");
  await page.goto("/admin.html");
  await page.getByRole("button", { name: "Página web", exact: true }).click();
  await page
    .getByLabel("Título de inicio", { exact: true })
    .fill("Conoce tu mundo interior,");
  await page.getByLabel("Altura del retrato en escritorio (px)").fill("260");
  await page.getByLabel("Integración del retrato").selectOption("circle");
  await page
    .getByRole("button", { name: "Vista previa de la página", exact: true })
    .click();
  await expect(
    page
      .getByRole("region", { name: "Vista previa sin publicar" })
      .getByRole("heading", { level: 1 }),
  ).toContainText("Conoce tu mundo interior");
  await publicPage.reload();
  await expect(publicPage.getByRole("heading", { level: 1 })).toContainText(
    "Comprende tu mente",
  );
  await page
    .getByRole("button", { name: "Cerrar vista previa", exact: true })
    .click();
  await page.getByRole("button", { name: "Sobre mí", exact: true }).click();
  await page
    .locator('input[type="file"]:visible')
    .setInputFiles("public/img/autor.jpg");
  await expect(page.getByRole("status")).toContainText("Imagen subida");
  await page
    .getByLabel("Biografía (separa párrafos con una línea vacía)")
    .fill("Biografía editada desde el panel.\n\nSegundo párrafo conservado.");
  await page.getByRole("button", { name: "Contacto", exact: true }).click();
  await page
    .getByLabel("Correo de contacto", { exact: true })
    .fill("autor@example.com");
  await page
    .getByRole("button", { name: "Redes y pie de página", exact: true })
    .click();
  await page
    .getByLabel("LinkedIn", { exact: true })
    .fill("https://www.linkedin.com/in/autor-de-prueba");
  await page
    .getByRole("button", { name: "Guardar página", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Página actualizada");
  await publicPage.evaluate(() => window.dispatchEvent(new Event("focus")));
  await publicPage.reload();
  await expect(publicPage.getByRole("heading", { level: 1 })).toContainText(
    "Conoce tu mundo interior",
  );
  await expect(
    publicPage.locator(".editorial-hero__visual--circle"),
  ).toBeVisible();
  expect(
    await publicPage
      .locator(".editorial-hero__visual")
      .evaluate((el) => el.getBoundingClientRect().height),
  ).toBeLessThanOrEqual(411);
  await expect(
    publicPage.locator('a[aria-label="LinkedIn"]').first(),
  ).toHaveAttribute("href", "https://www.linkedin.com/in/autor-de-prueba");
  expect(
    await publicPage.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await publicPage.screenshot({
    path: `test-results/custom-home-${info.project.name}.png`,
    animations: "disabled",
  });
  await publicPage.goto("/contacto.html");
  await expect(
    publicPage.getByRole("link", { name: "autor@example.com" }),
  ).toHaveAttribute("href", "mailto:autor@example.com");
  await publicPage.goto("/sobre-mi.html");
  await expect(
    publicPage.getByText("Biografía editada desde el panel.", { exact: true }),
  ).toBeVisible();
  const ssr = await request.get("http://127.0.0.1:4173/");
  expect(ssr.status()).toBe(200);
  expect(await ssr.text()).toContain("Conoce tu mundo interior,");
  await page.reload();
  await page.getByRole("button", { name: "Página web", exact: true }).click();
  await expect(
    page.getByLabel("Título de inicio", { exact: true }),
  ).toHaveValue("Conoce tu mundo interior,");
  await page.screenshot({
    path: `test-results/custom-admin-${info.project.name}.png`,
    animations: "disabled",
  });
  await publicPage.close();
});

test("personalización rechaza revisiones obsoletas y mantiene borrador; sin tabla conserva el original", async ({
  page,
  request,
}) => {
  await signIn(page, "admin");
  await page.goto("/admin.html");
  await page.getByRole("button", { name: "Página web", exact: true }).click();
  await page
    .getByLabel("Título de inicio", { exact: true })
    .fill("Mi borrador local");
  const updated = await request.post(
    "http://127.0.0.1:54329/rest/v1/rpc/save_site_settings",
    {
      headers: { Authorization: "Bearer fixture-admin" },
      data: {
        payload: { homeTitle: "Otra edición publicada" },
        expected_revision: 1,
      },
    },
  );
  expect(updated.ok()).toBe(true);
  await page
    .getByRole("button", { name: "Guardar página", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "tu borrador sigue aquí",
  );
  await expect(
    page.getByLabel("Título de inicio", { exact: true }),
  ).toHaveValue("Mi borrador local");
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Descartar / recargar ajustes", exact: true })
    .click();
  await expect(
    page.getByLabel("Título de inicio", { exact: true }),
  ).toHaveValue("Otra edición publicada");
  await page.route("**/rest/v1/site_settings?**", (route) =>
    route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({
        code: "PGRST205",
        message: "public.site_settings not found",
      }),
    }),
  );
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Comprende tu mente",
  );
});
test("navegación pública, contenido antiguo, sanitización y contacto real", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Comprende tu mente",
  );
  await expect(
    page.getByRole("heading", { name: "Recurso de prueba" }),
  ).toBeVisible();
  await page.screenshot({
    path: `test-results/home-${info.project.name}.png`,
    animations: "disabled",
    scale: "css",
  });
  if (info.project.name === "mobile" || info.project.name === "tablet")
    await page.getByRole("button", { name: "Abrir menú" }).click();
  await page.getByRole("link", { name: "SOBRE MÍ", exact: true }).click();
  await expect(
    page.getByText(
      "Profesor Asistente, Máster en Dirección y Licenciado en Psicología",
      { exact: true },
    ),
  ).toBeVisible();
  for (const path of [
    "/libros.html",
    "/articulos.html",
    "/contacto.html",
    "/libros/1",
    "/articulos/7",
  ]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await expect(
    page.getByRole("heading", { name: "Contenido antiguo" }),
  ).toBeVisible();
  expect(await page.evaluate(() => Reflect.get(window, "xss"))).toBeUndefined();
  await page.goto("/contacto.html");
  await expect(
    page.getByRole("link", { name: "contacto@yoeldisquiala.com" }),
  ).toHaveAttribute("href", "mailto:contacto@yoeldisquiala.com");
  expect(errors).toEqual([]);
});
test("rutas administrativas deniegan anónimo y usuario común, logout elimina acceso", async ({
  page,
}) => {
  await page.goto("/admin.html");
  await expect(
    page.getByRole("heading", { name: "Acceso Restringido", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Crear libro" })).toHaveCount(
    0,
  );
  await signIn(page, "reader");
  await page.goto("/admin.html");
  await expect(
    page.getByText(
      "Tu cuenta no tiene autorización para administrar este sitio.",
    ),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Crear libro" })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: /cerrar sesión/i }).click();
  await expect(
    page.getByText("Esta área es exclusiva para administradores autorizados."),
  ).toBeVisible();
});
test("administrador crea, previsualiza, edita, recarga y elimina libros, artículos y destacados", async ({
  page,
}, info) => {
  test.setTimeout(60000);
  await signIn(page, "admin");
  await page.getByRole("link", { name: "Entrar al panel" }).click();
  await expect(
    page.getByRole("heading", { name: "Gestionar Libros", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: `test-results/admin-${info.project.name}.png`,
    animations: "disabled",
    scale: "css",
  });
  for (const [section, create, title, publicPath] of [
    ["Libros", "Crear libro", "Libro E2E", "/libros.html"],
    ["Artículos", "Crear artículo", "Artículo E2E", "/articulos.html"],
    ["Destacados", "Crear destacado", "Destacado E2E", "/"],
  ]) {
    await page
      .getByRole("navigation", { name: "Secciones del panel" })
      .getByRole("button", { name: section, exact: true })
      .click();
    await page.getByRole("button", { name: create, exact: true }).click();
    await page.getByLabel("Título *", { exact: true }).fill(title);
    if (section === "Artículos") {
      await page
        .getByRole("textbox", { name: "Contenido del artículo", exact: true })
        .fill("Texto para publicar desde el panel.");
      await page
        .getByLabel("Publicado (desmarcar para guardar borrador)")
        .check();
    }
    if (section === "Libros") {
      await page
        .getByLabel("Archivo de imagen", { exact: true })
        .setInputFiles("img/autor.jpg");
      await expect(
        page.getByAltText("Vista previa de la imagen"),
      ).toBeVisible();
    }
    if (section === "Destacados") {
      await page.getByLabel("Tipo", { exact: true }).selectOption("libro");
      await page.getByLabel("Asociar publicación").selectOption("1");
      await expect(page.getByLabel("Destino del botón")).toHaveValue(
        "/libros/1",
      );
    }
    await page
      .getByRole("button", { name: "Vista previa", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Guardar cambios", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel("Título *", { exact: true })).toHaveValue("");
    await page
      .getByRole("button", { name: `Editar ${title}`, exact: true })
      .click();
    await page.getByLabel("Título *", { exact: true }).fill(`${title} editado`);
    await page
      .getByRole("button", { name: "Guardar cambios", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: `${title} editado`, exact: true }),
    ).toBeVisible();
    await page.reload();
    await page
      .getByRole("navigation", { name: "Secciones del panel" })
      .getByRole("button", { name: section, exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: `${title} editado`, exact: true }),
    ).toBeVisible();
    const visitor = await page.context().newPage();
    await visitor.goto(publicPath);
    await expect(
      visitor.getByRole("heading", { name: `${title} editado`, exact: true }),
    ).toBeVisible();
    await visitor.close();
    page.once("dialog", (dialog) => dialog.accept());
    await page
      .getByRole("button", { name: `Eliminar ${title} editado`, exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: `${title} editado`, exact: true }),
    ).toHaveCount(0);
  }
});
test("modales originales funcionan con teclado y no ejecutan HTML malicioso", async ({
  page,
}, info) => {
  await page.goto("/articulos.html");
  await page
    .getByRole("button", { name: "Leer artículo", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Artículo de prueba" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Contenido antiguo" }),
  ).toBeVisible();
  expect(await page.evaluate(() => Reflect.get(window, "xss"))).toBeUndefined();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  if (info.project.name === "mobile" || info.project.name === "tablet")
    await page.getByRole("button", { name: "Abrir menú" }).click();
  await page
    .locator("#btnLoginUsuarioDesktop:visible,#btnLoginUsuarioMobile:visible")
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("estados de red y vacíos permiten reintentar sin fingir datos", async ({
  page,
}) => {
  await page.route("**/rest/v1/articulos?**", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: '{"message":"Offline"}',
    }),
  );
  await page.goto("/articulos.html");
  await expect(page.getByRole("alert")).toContainText("No pudimos cargar");
  await page.unroute("**/rest/v1/articulos?**");
  await page.route("**/rest/v1/articulos?**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
  );
  await page.getByRole("button", { name: "Volver a intentar" }).click();
  await expect(
    page.getByText("Todavía no hay publicaciones en esta sección."),
  ).toBeVisible();
});
