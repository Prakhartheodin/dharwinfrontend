import "@testing-library/jest-dom/vitest";
import React from "react";
import { vi } from "vitest";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/task/kanban-board",
  useSearchParams: () => new URLSearchParams(),
}));
