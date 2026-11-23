import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react()],
  build: {
    copyPublicDir: !isSsrBuild,
    sourcemap: false,
    rollupOptions: {
      output: isSsrBuild
        ? {}
        : {
            manualChunks: {
              react: ["react", "react-dom", "react-router-dom"],
              query: ["@tanstack/react-query"],
              supabase: ["@supabase/supabase-js"],
              html: ["sanitize-html"],
            },
          },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
  },
}));
