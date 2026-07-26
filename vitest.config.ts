import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "#gitwe": path.resolve(__dirname, "src"),
      "#tests": path.resolve(__dirname, "tests"),
    },
  },
  test: {
    include: ["tests/**/*.test.ts", "tests/**/*.spec.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/cli/**"],
    },
  },
});
