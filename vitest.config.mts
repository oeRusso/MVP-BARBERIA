import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    setupFiles: ["dotenv/config"],
    testTimeout: 30_000,
    // Las pruebas de integración comparten la base de datos.
    fileParallelism: false,
  },
});
