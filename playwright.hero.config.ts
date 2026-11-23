import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/hero",
  workers: 1,
  timeout: 30000,
  outputDir: ".qa/hero/test-results",
  use: { baseURL: "http://127.0.0.1:5177", trace: "retain-on-failure" },
  projects: [320, 375, 430, 768, 1024, 1366, 1440, 1920].map((width) => ({
    name: String(width),
    use: {
      viewport: { width, height: width < 768 ? 900 : 1000 },
      isMobile: width < 768,
      hasTouch: width < 768,
    },
  })),
  webServer: [
    {
      command: "node tests/fixtures/backend.mjs",
      url: "http://127.0.0.1:54329/rest/v1/libros",
    },
    {
      command: "npm run dev -- --port 5177 --strictPort",
      url: "http://127.0.0.1:5177",
      env: {
        VITE_SUPABASE_URL: "http://127.0.0.1:54329",
        VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_local_fixture_only",
      },
    },
  ],
});
