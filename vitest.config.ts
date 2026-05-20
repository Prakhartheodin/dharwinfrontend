import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: [
      "**/_features/task-board/**/__tests__/**/*.{test,spec}.{ts,tsx}",
      "shared/hooks/__tests__/**/*.{test,spec}.{ts,tsx}",
      "shared/components/pm/**/__tests__/**/*.{test,spec}.{ts,tsx}",
      "app/**/*.{test,spec}.{ts,tsx}",
    ],
    coverage: {
      provider: "v8",
      include: ["app/**/_features/task-board/**/*.{ts,tsx}", "shared/hooks/useFeatureFlag.ts"],
      exclude: ["**/__tests__/**", "**/*.test.*", "**/TaskBoardPage.tsx", "**/BoardSkeletonSSR.tsx", "**/TaskBoardErrorBoundary.tsx"],
      thresholds: {
        lines: 45,
        functions: 40,
        statements: 44,
        branches: 28,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
