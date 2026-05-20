import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { render } from "./test-utils";
import { TaskBoardShell } from "../TaskBoardShell";
import { TaskBoardProvider } from "../providers/TaskBoardProvider";

vi.mock("@/shared/contexts/auth-context", () => ({
  useAuth: () => ({
    user: { id: "u1", email: "test@example.com" },
    permissions: ["create_task", "update_task"],
  }),
}));

vi.mock("@/shared/lib/permissions", () => ({
  hasPermission: () => true,
}));

vi.mock("../lib/telemetry", () => ({
  trackTaskBoard: vi.fn(),
}));

vi.mock("../providers/TaskDataProvider", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../providers/TaskDataProvider")>();
  return {
    ...actual,
    useTaskData: () => ({
      projects: [],
      users: [],
      tasks: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      mutate: { applyPatch: vi.fn(), revertPatch: vi.fn() },
      pagination: {
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 1,
        isFetchingPage: false,
        goTo: vi.fn(),
        next: vi.fn(),
        prev: vi.fn(),
      },
    }),
  };
});

describe("TaskBoardShell", () => {
  it("renders toolbar and task count", () => {
    render(
      <TaskBoardProvider>
        <TaskBoardShell />
      </TaskBoardProvider>
    );
    expect(screen.getByText("Task board")).toBeInTheDocument();
    expect(screen.getByText(/tasks match filters/i)).toBeInTheDocument();
  });
});
