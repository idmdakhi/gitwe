import { defineConfig } from "vitest/config";
// import tsconfigPaths from "vite-tsconfig-paths";
import path from "node:path";

export default defineConfig({
  // plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      "#gitwe": path.resolve(__dirname, "src"),
      "#tests": path.resolve(__dirname, "tests"),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/cli/**"],
    },
  },
});
