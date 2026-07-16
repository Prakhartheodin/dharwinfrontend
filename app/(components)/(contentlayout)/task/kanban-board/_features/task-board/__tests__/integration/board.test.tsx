import { describe, expect, it, vi, beforeAll, afterAll, afterEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { render } from "../test-utils";
import { TaskBoardProvider } from "../../providers/TaskBoardProvider";
import { TaskBoardShell } from "../../TaskBoardShell";

const tasks = [
  { _id: "t1", title: "Alpha", status: "new", priority: "high" },
  { _id: "t2", title: "Beta", status: "todo", priority: "low" },
];

const server = setupServer(
  http.get("*/api/v1/tasks", () => HttpResponse.json({ results: tasks, total: 2 })),
  http.get("*/api/v1/projects", () => HttpResponse.json({ results: [] })),
  http.get("*/api/v1/users", () => HttpResponse.json({ results: [] })),
  http.patch("*/api/v1/tasks/:id", () =>
    HttpResponse.json({ _id: "t1", title: "Alpha", status: "todo" }, { status: 500 })
  )
);

vi.mock("@/shared/contexts/auth-context", () => ({
  useAuth: () => ({
    user: { id: "u1", email: "test@example.com" },
    permissions: ["create_task", "update_task"],
  }),
}));
vi.mock("@/shared/lib/permissions", () => ({ hasPermission: () => true }));
vi.mock("../../lib/telemetry", () => ({ trackTaskBoard: vi.fn() }));

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("board integration (MSW)", () => {
  it("loads toolbar and filter search", async () => {
    render(
      <TaskBoardProvider>
        <TaskBoardShell />
      </TaskBoardProvider>
    );
    await waitFor(() =>
      expect(screen.getByRole("search", { name: "Task filters" })).toBeInTheDocument()
    );
    expect(screen.getByLabelText("Search by task, employee, or ID")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reassigned" })).toBeInTheDocument();
    expect(screen.getByLabelText("Advanced filters")).toBeInTheDocument();
  });
});
