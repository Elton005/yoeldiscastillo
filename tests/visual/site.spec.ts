import { test, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
test("hero, páginas públicas, tarjetas y footer", async ({
  page,
  request,
}, info) => {
  await request.post("http://127.0.0.1:54329/test/reset");
  const folder = `.qa/visual/${info.project.name}`;
  await mkdir(folder, { recursive: true });
  const metrics: unknown[] = [];
  const errors: string[] = [];
  const portraitRequests: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (/\/img\/hero\/(?:author|seated)-\d+\.webp/.test(request.url()))
      portraitRequests.push(request.url());
  });
  for (const [name, path] of [
    ["inicio", "/"],
    ["libros", "/libros.html"],
    ["articulos", "/articulos.html"],
    ["biografia", "/sobre-mi.html"],
    ["contacto", "/contacto.html"],
  ]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    if (name === "libros")
      await expect(page.locator(".libro-detalle").first()).toBeVisible();
    if (name === "articulos")
      await expect(page.locator(".articulo-card").first()).toBeVisible();
    if (name === "inicio")
      await expect(page.locator(".promo-card").first()).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await page
      .locator("img[src]:visible")
      .evaluateAll((images) =>
        images.forEach(
          (image) => ((image as HTMLImageElement).loading = "eager"),
        ),
      );
    await expect
      .poll(
        () =>
          page
            .locator("img[src]:visible")
            .evaluateAll((images) =>
              images.every(
                (image) =>
                  (image as HTMLImageElement).complete &&
                  (image as HTMLImageElement).naturalWidth > 0,
              ),
            ),
        { timeout: 20000 },
      )
      .toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    {
      const footer = page.locator(".site-footer");
      await expect(footer).toContainText("Desarrollado por Elton Olivares");
      await expect(footer).toContainText(
        `© ${new Date().getFullYear()} Yoeldis Castillo Quiala`,
      );
      await expect(
        footer.getByRole("link", {
          name: "Enviar correo al autor",
          exact: true,
        }),
      ).toHaveAttribute("href", "mailto:contacto@yoeldisquiala.com");
      for (const link of await footer.locator("a[href]").all())
        expect(await link.getAttribute("href")).not.toBe("#");
    }
    if (name === "inicio") {
      const hero = page.locator(".editorial-hero");
      const layout = await hero.evaluate((section) => {
        const image = section.querySelector<HTMLImageElement>(
          ".editorial-hero__portrait img",
        )!;
        return {
          width: innerWidth,
          source: image.currentSrc,
          visual: section
            .querySelector(".editorial-hero__visual")!
            .getBoundingClientRect()
            .toJSON(),
          content: section
            .querySelector(".editorial-hero__content")!
            .getBoundingClientRect()
            .toJSON(),
          image: image.getBoundingClientRect().toJSON(),
          naturalRatio: image.naturalWidth / image.naturalHeight,
          title: section.querySelector("h1")!.getBoundingClientRect().toJSON(),
          titleLineHeight: parseFloat(
            getComputedStyle(section.querySelector("h1")!).lineHeight,
          ),
          headerBottom: document
            .querySelector("header")!
            .getBoundingClientRect().bottom,
        };
      });
      if (layout.width >= 1366) {
        expect(layout.source).toContain("seated-");
        expect(layout.visual.right).toBeLessThanOrEqual(
          layout.content.left + 1,
        );
      } else {
        expect(layout.source).toContain("author-");
        expect(layout.visual.bottom).toBeLessThanOrEqual(
          layout.content.top + 1,
        );
      }
      expect(layout.image.top).toBeGreaterThanOrEqual(layout.headerBottom - 1);
      expect(
        Math.abs(
          layout.image.width / layout.image.height - layout.naturalRatio,
        ),
      ).toBeLessThan(0.01);
      expect(layout.title.height / layout.titleLineHeight).toBeLessThanOrEqual(
        2.15,
      );
      if (layout.width >= 1366)
        expect(portraitRequests.every((url) => url.includes("seated-"))).toBe(
          true,
        );
      else
        expect(portraitRequests.every((url) => url.includes("author-"))).toBe(
          true,
        );
      metrics.push(layout);
    }
    await page.mouse.move(0, 0);
    await page.screenshot({
      path: `${folder}/${name}.png`,
      fullPage: true,
      animations: "disabled",
    });
    if (name === "inicio")
      await page
        .locator(".editorial-hero")
        .screenshot({ path: `${folder}/hero.png`, animations: "disabled" });
  }
  await writeFile(`${folder}/metrics.json`, JSON.stringify(metrics, null, 2));
  expect(errors).toEqual([]);
});
