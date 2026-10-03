import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname) } },
  test: { include: ["tests/**/*.test.ts"], environment: "node", env: { DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://cloro:cloro@localhost:5432/cloro" } },
});
