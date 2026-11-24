import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { build } from "vite";
import { serveStatic } from "./serve-static.mjs";
import lighthouse from "lighthouse";
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
const phase = process.env.AUDIT_PHASE || "after";
if (!["before", "after"].includes(phase))
  throw new Error("AUDIT_PHASE debe ser before o after.");
const folder = `.qa/final-audit/${phase}`;
await mkdir(folder, { recursive: true });
process.env.VITE_SUPABASE_URL = "http://127.0.0.1:54329";
process.env.VITE_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_local_fixture_only";
const backend = spawn(process.execPath, ["tests/fixtures/backend.mjs"], {
  stdio: "ignore",
  windowsHide: true,
});
let server, browser;
const results = [];
try {
  if (process.env.AUDIT_REUSE_BUILD !== "1")
    await build({ build: { outDir: ".qa/final-audit/build" } });
  if (
    phase === "after" &&
    (await readFile(".qa/final-audit/build/index.html", "utf8")).includes(
      "<!--page-head-->",
    )
  ) {
    const { prerender } = await import("./prerender.mjs");
    await prerender(".qa/final-audit/build", "/", { requireBackend: true });
  }
  server = await serveStatic(".qa/final-audit/build", 5177);
  browser = await chromium.launch({ args: ["--remote-debugging-port=9225"] });
  const sizes = [
    [320, 700],
    [360, 800],
    [375, 812],
    [390, 844],
    [430, 932],
    [768, 1024],
    [820, 1180],
    [1024, 768],
    [1280, 800],
    [1366, 768],
    [1440, 900],
    [1920, 1080],
    [844, 390],
    [320, 256],
  ];
  if (phase === "after")
    sizes.push(
      [1280, 800, "text200"],
      [640, 450, "reflow200"],
      [320, 225, "reflow400"],
    );
  for (const [width, height, mode] of sizes) {
    const label = `${width}x${height}${mode ? "-" + mode : ""}`;
    await mkdir(`${folder}/${label}`, { recursive: true });
    const context = await browser.newContext({
      viewport: { width, height },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    for (const [name, path] of [
      ["inicio", "/"],
      ["libros", "/libros.html"],
      ["articulos", "/articulos.html"],
      ["biografia", "/sobre-mi.html"],
      ["contacto", "/contacto.html"],
      ["libro", "/libros/1"],
      ["articulo", "/articulos/7"],
    ]) {
      await page.goto(`http://127.0.0.1:5177${path}`);
      await page.locator("h1").first().waitFor();
      if (name === "inicio")
        await page.locator(".promo-card").first().waitFor();
      if (name === "libros")
        await page.locator(".libro-detalle").first().waitFor();
      if (name === "articulos")
        await page.locator(".articulo-card").first().waitFor();
      if (mode === "text200")
        await page.addStyleTag({ content: "html{font-size:200%!important}" });
      await page.evaluate(() => document.fonts.ready);
      await page.locator("img").evaluateAll((images) =>
        images.forEach((img) => {
          img.loading = "eager";
        }),
      );
      await page.waitForTimeout(100);
      const geometry = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        width: innerWidth,
        h1: document.querySelector("h1")?.textContent,
        clipped: [
          ...document.querySelectorAll("h1,h2,h3,button,input,select,textarea"),
        ]
          .filter(
            (el) =>
              el.getClientRects().length &&
              el.getBoundingClientRect().right > innerWidth + 1,
          )
          .map((el) => ({
            tag: el.tagName,
            text: el.textContent?.slice(0, 70),
            right: el.getBoundingClientRect().right,
          })),
      }));
      let axe = [];
      if (width === 375 || width === 1440) {
        const audit = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        axe = audit.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          description: v.description,
          nodes: v.nodes.map((n) => ({
            target: n.target,
            summary: n.failureSummary,
          })),
        }));
      }
      await page.screenshot({
        path: `${folder}/${label}/${name}.png`,
        fullPage: true,
        animations: "disabled",
      });
      results.push({ label, name, ...geometry, axe, errors: [...errors] });
    }
    if (
      await page
        .getByRole("button", { name: "Abrir menú", exact: true })
        .isVisible()
    ) {
      await page.goto("http://127.0.0.1:5177/");
      await page
        .getByRole("button", { name: "Abrir menú", exact: true })
        .click();
      await page.screenshot({
        path: `${folder}/${label}/menu.png`,
        fullPage: true,
      });
      await page.keyboard.press("Escape");
      results.push({
        label,
        name: "menu-escape",
        expanded: await page
          .getByRole("button", { name: "Abrir menú", exact: true })
          .getAttribute("aria-expanded"),
      });
    }
    await page.goto("http://127.0.0.1:5177/acceso");
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
    await page.getByRole("heading", { name: "Mi cuenta" }).waitFor();
    await page.goto("http://127.0.0.1:5177/admin.html");
    await page
      .getByRole("heading", { name: "Gestionar Libros", exact: true })
      .waitFor();
    await page.screenshot({
      path: `${folder}/${label}/admin.png`,
      fullPage: true,
    });
    const adminGeo = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      width: innerWidth,
    }));
    const adminAxe =
      width === 375 || width === 1440
        ? (
            await new AxeBuilder({ page })
              .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
              .analyze()
          ).violations.map((v) => ({
            id: v.id,
            impact: v.impact,
            nodes: v.nodes.map((n) => ({
              target: n.target,
              summary: n.failureSummary,
            })),
          }))
        : [];
    results.push({
      label,
      name: "admin",
      ...adminGeo,
      axe: adminAxe,
      errors: [...errors],
    });
    if (width === 375 || width === 1440) {
      await page.getByRole("button", { name: /Crear libro/i }).click();
      await page.screenshot({
        path: `${folder}/${label}/editor.png`,
        fullPage: true,
      });
    }
    await context.close();
    console.log(`${phase}: ${label} público + admin capturados`);
  }

  await writeFile(`${folder}/results.json`, JSON.stringify(results, null, 2));
  if (phase === "after") {
    const context = await browser.newContext({
      viewport: { width: 375, height: 812 },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    await mkdir(`${folder}/states`, { recursive: true });
    for (const scenario of ["long", "empty"]) {
      await fetch("http://127.0.0.1:54329/test/reset", { method: "POST" });
      await fetch("http://127.0.0.1:54329/test/scenario", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scenario }),
      });
      for (const [name, path] of scenario === "long"
        ? [
            ["long-books", "/libros.html"],
            ["long-article", "/articulos/7"],
          ]
        : [
            ["empty-books", "/libros.html"],
            ["empty-articles", "/articulos.html"],
          ]) {
        await page.goto("http://127.0.0.1:5177" + path);
        await page.waitForTimeout(500);
        if (name === "long-article")
          await page
            .getByRole("heading", { name: "Una lectura extensa", exact: true })
            .waitFor();
        await page.screenshot({
          path: `${folder}/states/${name}.png`,
          fullPage: true,
        });
        results.push({
          label: "375x812",
          name,
          ...(await page.evaluate(() => ({
            scroll: document.documentElement.scrollWidth,
            width: innerWidth,
          }))),
        });
      }
    }
    await fetch("http://127.0.0.1:54329/test/reset", { method: "POST" });
    await page.goto("http://127.0.0.1:5177/acceso");
    await page
      .getByLabel("Correo electrónico", { exact: true })
      .fill("admin@example.test");
    await page.getByLabel("Contraseña", { exact: true }).fill("123");
    await page
      .locator("#formLogin")
      .getByRole("button", { name: /iniciar sesión/i })
      .click();
    await page.locator(".field-error").first().waitFor();
    await page.screenshot({
      path: `${folder}/states/auth-errors.png`,
      fullPage: true,
    });
    await page
      .getByLabel("Contraseña", { exact: true })
      .fill("local-fixture-only");
    await page
      .locator("#formLogin")
      .getByRole("button", { name: /iniciar sesión/i })
      .click();
    await page.getByRole("heading", { name: "Mi cuenta" }).waitFor();
    await page.screenshot({
      path: `${folder}/states/auth-valid.png`,
      fullPage: true,
    });
    await page.route("**/rest/v1/libros?**", async (route) => {
      await new Promise((done) => setTimeout(done, 3000));
      await route.continue().catch(() => {});
    });
    await page.goto("http://127.0.0.1:5177/admin.html");
    await page.getByText("Cargando contenido…", { exact: true }).waitFor();
    await page.screenshot({
      path: `${folder}/states/admin-loading.png`,
      fullPage: true,
    });
    await page.unrouteAll({ behavior: "wait" });
    await page
      .getByRole("heading", { name: "Gestionar Libros", exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "Guardar cambios", exact: true })
      .click();
    await page.locator(".field-error").first().waitFor();
    await page.screenshot({
      path: `${folder}/states/admin-errors.png`,
      fullPage: true,
    });
    await context.close();
  }
  await writeFile(`${folder}/results.json`, JSON.stringify(results, null, 2));
  if (process.env.AUDIT_SKIP_LIGHTHOUSE !== "1")
    for (const [name, options] of [
      ["mobile", {}],
      [
        "desktop",
        {
          formFactor: "desktop",
          screenEmulation: {
            mobile: false,
            width: 1440,
            height: 900,
            deviceScaleFactor: 1,
            disabled: false,
          },
        },
      ],
    ]) {
      const report = await lighthouse("http://127.0.0.1:5177/", {
        port: 9225,
        output: ["json", "html"],
        onlyCategories: [
          "performance",
          "accessibility",
          "best-practices",
          "seo",
        ],
        logLevel: "error",
        ...options,
      });
      await writeFile(`${folder}/lighthouse-${name}.json`, report.report[0]);
      await writeFile(`${folder}/lighthouse-${name}.html`, report.report[1]);
      console.log(
        name,
        Object.fromEntries(
          Object.entries(report.lhr.categories).map(([k, v]) => [k, v.score]),
        ),
        Object.fromEntries(
          [
            "largest-contentful-paint",
            "cumulative-layout-shift",
            "total-blocking-time",
          ].map((k) => [k, report.lhr.audits[k].numericValue]),
        ),
      );
    }
  console.log(
    "Issues:",
    results
      .filter((r) => r.scroll > r.width || r.clipped?.length || r.axe?.length)
      .map((r) => ({
        label: r.label,
        name: r.name,
        overflow: r.scroll - r.width,
        axe: r.axe?.map((x) => x.id),
        clipped: r.clipped,
      })),
  );
} finally {
  await browser?.close();
  await server?.httpServer.close();
  backend.kill();
}
