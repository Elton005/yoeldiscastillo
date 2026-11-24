import { build } from "vite";
import lighthouse from "lighthouse";
import desktop from "lighthouse/core/config/desktop-config.js";
import { chromium } from "@playwright/test";
import { mkdir, writeFile, copyFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { serveStatic } from "./serve-static.mjs";
const folder = ".qa/final-audit/performance";
await mkdir(folder, { recursive: true });
const source = resolve(folder, "baseline-source");
await mkdir(source, { recursive: true });
const archive = resolve(folder, "baseline.tar");
function run(command, args) {
  const r = spawnSync(command, args, { stdio: "inherit", windowsHide: true });
  if (r.status !== 0) throw new Error(`${command} falló`);
}
run("git", [
  "archive",
  "--format=tar",
  `--output=${archive}`,
  process.env.AUDIT_BASE_REF || "02d259fe98aee2de77706ce43a6da7ffef27ac0d",
  "src",
  "supabase/functions/_shared",
  "public",
  "index.html",
  "vite.config.ts",
  "package.json",
]);
run("tar", ["-xf", archive, "-C", source]);
process.env.VITE_SUPABASE_URL = "http://127.0.0.1:54329";
process.env.VITE_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_local_fixture_only";
await build({
  root: source,
  configFile: resolve(source, "vite.config.ts"),
  cacheDir: resolve(folder, "vite-cache"),
  build: { outDir: resolve(folder, "baseline-build"), emptyOutDir: true },
});
const backend = spawn(process.execPath, ["tests/fixtures/backend.mjs"], {
  windowsHide: true,
  stdio: "ignore",
});
let browser, server;
const samples = [];
try {
  for (let i = 0; ; i++) {
    try {
      if ((await fetch("http://127.0.0.1:54329/rest/v1/libros")).ok) break;
    } catch {}
    if (i > 50) throw new Error("Backend no disponible");
    await new Promise((done) => setTimeout(done, 100));
  }
  for (const profile of ["mobile", "desktop"])
    for (let round = 0; round < 3; round++)
      for (const phase of round % 2
        ? ["after", "before"]
        : ["before", "after"]) {
        await fetch("http://127.0.0.1:54329/test/reset", { method: "POST" });
        server = await serveStatic(
          phase === "before"
            ? resolve(folder, "baseline-build")
            : ".qa/final-audit/build",
          5177,
        );
        browser = await chromium.launch({
          args: ["--remote-debugging-port=9225"],
        });
        const result = await lighthouse(
          "http://127.0.0.1:5177/",
          {
            port: 9225,
            output: ["json", "html"],
            onlyCategories: [
              "performance",
              "accessibility",
              "best-practices",
              "seo",
            ],
            logLevel: "error",
          },
          profile === "desktop" ? desktop : undefined,
        );
        const path = `${folder}/${phase}-${profile}-${round}`;
        await writeFile(path + ".json", result.report[0]);
        await writeFile(path + ".html", result.report[1]);
        const lhr = result.lhr;
        const row = {
          phase,
          profile,
          round,
          path,
          lcp: lhr.audits["largest-contentful-paint"].numericValue,
          cls: lhr.audits["cumulative-layout-shift"].numericValue,
          tbt: lhr.audits["total-blocking-time"].numericValue,
          score: lhr.categories.performance.score,
          benchmark: lhr.environment.benchmarkIndex,
        };
        samples.push(row);
        console.log(JSON.stringify(row));
        await browser.close();
        browser = null;
        await new Promise((done) => server.httpServer.close(done));
        server = null;
      }
  for (const phase of ["before", "after"])
    for (const profile of ["mobile", "desktop"]) {
      const rows = samples
        .filter((row) => row.phase === phase && row.profile === profile)
        .sort((a, b) => a.lcp - b.lcp);
      const selected = rows[1];
      await copyFile(
        selected.path + ".json",
        `.qa/final-audit/${phase}/lighthouse-${profile}.json`,
      );
      await copyFile(
        selected.path + ".html",
        `.qa/final-audit/${phase}/lighthouse-${profile}.html`,
      );
    }
  await writeFile(`${folder}/samples.json`, JSON.stringify(samples, null, 2));
  console.log(
    "Tres muestras por perfil/destino; informe seleccionado por mediana LCP.",
  );
} finally {
  await browser?.close();
  if (server) await new Promise((done) => server.httpServer.close(done));
  backend.kill();
}
