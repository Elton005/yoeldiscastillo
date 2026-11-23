import { defineConfig } from "@playwright/test";
const vitePort = Number(process.env.QA_VITE_PORT || 5173);
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  use: { baseURL: `http://127.0.0.1:${vitePort}`, trace: "retain-on-failure" },
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
      reuseExistingServer: false,
    },
    {
      command: `npm run dev -- --port ${vitePort} --strictPort`,
      url: `http://127.0.0.1:${vitePort}`,
      reuseExistingServer: false,
      env: {
        VITE_SUPABASE_URL: "http://127.0.0.1:54329",
        VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_local_fixture_only",
      },
    },
    {
      command: "node tests/fixtures/serve-ssr.mjs",
      url: "http://127.0.0.1:4173/contacto.html",
      reuseExistingServer: false,
      timeout: 120000,
    },
  ],
});
