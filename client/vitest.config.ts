import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    exclude: [
      "**/node_modules/**",
      "**/e2e/**",          // Playwright E2E tests — jangan dijalankan oleh Vitest
      "**/*.spec.ts",       // *.spec.ts adalah Playwright convention
    ],
    include: [
      "**/*.test.ts",
      "**/*.test.tsx",
    ],
    pool: "threads",
    server: {
      deps: {
        inline: ["lucide-react"],
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
