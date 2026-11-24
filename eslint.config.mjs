import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "dist-pages/**",
      "server/**",
      ".qa/**",
      "coverage/**",
    ],
  },
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ["src/**/*.{ts,tsx}"],
  })),
);
