import { test, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
test("composición aprobada: retrato auténtico, capas, título y CTA completos", async ({
  page,
  request,
}, info) => {
  await request.post("http://127.0.0.1:54329/test/reset");
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  const hero = page.locator(".editorial-hero");
  const portrait = hero.locator(".editorial-hero__portrait img");
  await expect(portrait).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await expect
    .poll(() =>
      hero
        .locator("img")
        .evaluateAll((images) =>
          images.every(
            (image) =>
              (image as HTMLImageElement).complete &&
              (image as HTMLImageElement).naturalWidth > 0,
          ),
        ),
    )
    .toBe(true);
  await expect(hero.getByRole("heading", { level: 1 })).toHaveText(
    "Comprende tu mente,transforma tu vida.",
  );
  const metrics = await hero.evaluate((section) => {
    const visual = section
      .querySelector(".editorial-hero__visual")!
      .getBoundingClientRect();
    const content = section
      .querySelector(".editorial-hero__content")!
      .getBoundingClientRect();
    const image = section.querySelector<HTMLImageElement>(
      ".editorial-hero__portrait img",
    )!;
    const imageBox = image.getBoundingClientRect();
    return {
      width: innerWidth,
      headerBottom: document.querySelector("header")!.getBoundingClientRect()
        .bottom,
      scrollWidth: document.documentElement.scrollWidth,
      visual: visual.toJSON(),
      content: content.toJSON(),
      image: imageBox.toJSON(),
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
      objectFit: getComputedStyle(image).objectFit,
      source: image.currentSrc,
      background: section.querySelector<HTMLImageElement>(
        ".editorial-hero__background img",
      )!.currentSrc,
    };
  });
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.width);
  expect(metrics.objectFit).toBe("contain");
  expect(
    Math.abs(
      metrics.image.width / metrics.image.height -
        metrics.naturalWidth / metrics.naturalHeight,
    ),
  ).toBeLessThan(0.01);
  expect(metrics.image.top).toBeGreaterThanOrEqual(metrics.headerBottom - 1);
  expect(metrics.image.left).toBeGreaterThanOrEqual(0);
  expect(metrics.image.right).toBeLessThanOrEqual(metrics.width + 1);
  if (metrics.width >= 1366)
    expect(metrics.visual.right).toBeLessThanOrEqual(metrics.content.left + 1);
  else
    expect(metrics.visual.bottom).toBeLessThanOrEqual(metrics.content.top + 1);
  const primary = hero.getByRole("link", {
    name: "Explorar Libros",
    exact: true,
  });
  const secondary = hero.getByRole("link", {
    name: "Conoce mi trayectoria",
    exact: true,
  });
  for (const button of [primary, secondary]) {
    const bounds = await button.boundingBox();
    expect(bounds!.height).toBeGreaterThanOrEqual(44);
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(metrics.width + 1);
  }
  if (metrics.width < 768)
    expect((await primary.boundingBox())!.width).toBeGreaterThan(
      metrics.width * 0.8,
    );
  await mkdir(".qa/hero", { recursive: true });
  await page.screenshot({
    path: `.qa/hero/${info.project.name}.png`,
    fullPage: true,
    animations: "disabled",
  });
  await hero.screenshot({
    path: `.qa/hero/${info.project.name}-hero.png`,
    animations: "disabled",
  });
  await writeFile(
    `.qa/hero/${info.project.name}.json`,
    JSON.stringify(metrics, null, 2),
  );
  await primary.click();
  await expect(page).toHaveURL(/\/libros\.html$/);
  await page.goto("/");
  await page
    .locator(".editorial-hero")
    .getByRole("link", { name: "Conoce mi trayectoria", exact: true })
    .click();
  await expect(page).toHaveURL(/\/sobre-mi\.html$/);
  expect(errors).toEqual([]);
});
