import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { TaskFiltersProvider, useTaskFilters } from "../TaskFiltersProvider";
import { STORAGE_KEY_FILTERS } from "../../lib/constants";
import { safeSet } from "../../lib/safe-storage";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace }),
  usePathname: () => "/task/kanban-board",
}));

vi.mock("@/shared/contexts/auth-context", () => ({
  useAuth: () => ({ user: { id: "u1" } }),
}));

vi.mock("../../lib/telemetry", () => ({
  trackTaskBoard: vi.fn(),
}));

function Probe() {
  const { filters, searchInput } = useTaskFilters();
  return (
    <div>
      <span data-testid="q">{filters.q}</span>
      <span data-testid="search-input">{searchInput}</span>
      <span data-testid="leaving">{filters.leaving ? "1" : "0"}</span>
    </div>
  );
}

describe("TaskFiltersProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    replace.mockClear();
  });

  it("does not restore filters from localStorage when URL has no query params", async () => {
    safeSet(STORAGE_KEY_FILTERS("u1"), {
      q: "prakhar",
      projectIds: [],
      assigneeIds: [],
      statuses: [],
      priorities: [],
      labels: [],
      sprintIds: [],
      createdByIds: [],
      due: null,
      assignedToMe: false,
      unassigned: false,
      leaving: true,
    });

    render(
      <TaskFiltersProvider>
        <Probe />
      </TaskFiltersProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("q")).toHaveTextContent("");
      expect(screen.getByTestId("search-input")).toHaveTextContent("");
      expect(screen.getByTestId("leaving")).toHaveTextContent("0");
    });

    expect(localStorage.getItem(STORAGE_KEY_FILTERS("u1"))).toBeNull();
  });
});
