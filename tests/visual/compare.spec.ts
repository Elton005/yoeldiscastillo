import { test, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const scenes = [
  ["inicio", "/"],
  ["sobre-mi", "/sobre-mi.html"],
  ["libros", "/libros.html"],
  ["articulos", "/articulos.html"],
  ["contacto", "/contacto.html"],
  ["login", "/"],
  ["admin-login", "/admin.html"],
  ["admin", "/admin.html"],
] as const;
for (const [scene, path] of scenes)
  test(scene, async ({ browser, request }, info) => {
    await request.post("http://127.0.0.1:54329/test/reset");
    const folder = `.qa/visual/${process.env.VISUAL_PHASE || "after"}/${info.project.name}`;
    await mkdir(folder, { recursive: true });
    for (const [version, origin] of [
      ["original", "http://127.0.0.1:54330"],
      ["react", "http://127.0.0.1:5173"],
    ] as const) {
      const context = await browser.newContext({
        viewport: info.project.use.viewport,
      });
      const page = await context.newPage();
      const productionRequests: string[] = [];
      page.on("request", (req) => {
        if (
          req.url().includes(".supabase.co/") &&
          !(
            req.method() === "GET" &&
            req.url().includes("/storage/v1/object/public/")
          )
        )
          productionRequests.push(req.url());
      });
      if (version === "react" && scene === "admin") {
        await page.goto(`${origin}/acceso`);
        await page
          .getByLabel("Correo electrónico", { exact: true })
          .fill("admin@example.test");
        await page
          .getByLabel("Contraseña", { exact: true })
          .fill("local-fixture-only");
        await page
          .getByRole("button", { name: /^Iniciar sesión$/i })
          .last()
          .click();
        await expect(
          page.getByRole("heading", { name: "Mi cuenta" }),
        ).toBeVisible();
      }
      await page.goto(origin + path);
      if (scene === "login") {
        if (version === "original") await page.evaluate("abrirModalAuth()");
        else if (process.env.VISUAL_PHASE === "before") {
          await page.goto(`${origin}/acceso`);
          await expect(
            page.getByRole("heading", { name: "Bienvenido de vuelta." }),
          ).toBeVisible();
        } else
          await page
            .locator(
              "#btnLoginUsuarioDesktop:visible,#btnLoginUsuarioMobile:visible",
            )
            .count()
            .then(async (count) => {
              if (!count) {
                await page.getByRole("button", { name: "Abrir menú" }).click();
              }
              await page
                .locator(
                  "#btnLoginUsuarioDesktop:visible,#btnLoginUsuarioMobile:visible",
                )
                .click();
            });
      }
      if (version === "original" && scene === "admin") {
        await page.evaluate(
          "sb.auth.signInWithPassword({email:'admin@example.test',password:'local-fixture-only'})",
        );
        await expect(page.locator("#dashboardScreen")).toBeVisible();
        await expect(
          page.locator("#listaLibros .admin-item").first(),
        ).toBeVisible();
      }
      if (version === "react" && scene === "admin-login")
        await expect(
          page.getByRole("heading", {
            name:
              process.env.VISUAL_PHASE === "before"
                ? "Acceso al estudio editorial."
                : "Acceso Restringido",
            exact: true,
          }),
        ).toBeVisible();
      if (
        version === "react" &&
        scene === "login" &&
        process.env.VISUAL_PHASE !== "before"
      )
        await expect(page.getByRole("dialog")).toBeVisible();
      if (version === "react" && scene === "admin")
        await expect(
          page.getByRole("heading", {
            name:
              process.env.VISUAL_PHASE === "before"
                ? "Una mirada a tu espacio."
                : "Gestionar Libros",
            exact: true,
          }),
        ).toBeVisible();
      if (scene === "libros")
        await expect(
          page
            .locator(
              version === "original"
                ? ".libro-detalle"
                : process.env.VISUAL_PHASE === "before"
                  ? ".content-card"
                  : ".libro-detalle",
            )
            .first(),
        ).toBeVisible();
      if (scene === "articulos")
        await expect(
          page
            .locator(
              version === "original"
                ? ".articulo-card"
                : process.env.VISUAL_PHASE === "before"
                  ? ".content-card"
                  : ".articulo-card",
            )
            .first(),
        ).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      // Decode every rendered image before measuring the page, including lazy
      // images below the fold used by the full-page comparison.
      await page.locator('img[src]:visible').evaluateAll((images) => {
        for (const image of images) (image as HTMLImageElement).loading = "eager";
      });
      await expect.poll(async () => page.locator('img[src]:visible').evaluateAll(
        (images) => images.every((image) => {
          const img = image as HTMLImageElement;
          return img.complete && img.naturalWidth > 0;
        }),
      ), { timeout: 20000 }).toBe(true);
      // Opening the mobile menu leaves the pointer over the Google button.
      // Compare both implementations in the same neutral pointer state.
      await page.mouse.move(0, 0);
      await page.screenshot({
        path: `${folder}/${scene}-${version}.png`,
        animations: "disabled",
        scale: "css",
      });
      if (
        ["inicio", "sobre-mi", "libros", "articulos", "contacto"].includes(
          scene,
        )
      )
        await page.screenshot({
          path: `${folder}/${scene}-${version}-full.png`,
          fullPage: true,
          animations: "disabled",
          scale: "css",
        });
      const metrics = await page.evaluate(() => ({
        viewport: { width: innerWidth, height: innerHeight },
        scrollWidth: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight,
        background: getComputedStyle(document.body).backgroundColor,
        font: getComputedStyle(document.body).fontFamily,
        headings: [...document.querySelectorAll("h1,h2")].map((el) => ({
          text: el.textContent,
          font: getComputedStyle(el).fontFamily,
          size: getComputedStyle(el).fontSize,
          rect: el.getBoundingClientRect().toJSON(),
        })),
      }));
      await writeFile(
        `${folder}/${scene}-${version}.json`,
        JSON.stringify(metrics, null, 2),
      );
      expect(productionRequests).toEqual([]);
      await context.close();
    }
  });
