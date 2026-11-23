import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
export default defineConfig({
  testDir: "./tests/visual",
  workers: 1,
  timeout: 60000,
  outputDir: ".qa/visual/test-results",
  use: { trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
    { name: "tablet", use: { viewport: { width: 820, height: 1180 } } },
    {
      name: "mobile",
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: [
    {
      command: "node tests/fixtures/backend.mjs",
      url: "http://127.0.0.1:54329/rest/v1/libros",
      env: existsSync(".qa/visual/public-reference.json")
        ? {
            VISUAL_REFERENCE_SNAPSHOT: resolve(
              ".qa/visual/public-reference.json",
            ),
          }
        : {},
    },
    {
      command: "node tests/fixtures/legacy-server.mjs",
      url: "http://127.0.0.1:54330",
    },
    {
      command: "npm run dev -- --port 5173 --strictPort",
      url: "http://127.0.0.1:5173",
      env: {
        VITE_SUPABASE_URL: "http://127.0.0.1:54329",
        VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_local_fixture_only",
      },
    },
  ],
});
