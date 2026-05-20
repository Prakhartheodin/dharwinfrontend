import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { render } from "../../__tests__/test-utils";
import { TaskBoard } from "../TaskBoard";
import { EMPTY_FILTERS } from "../../types";

vi.mock("../../hooks/useTaskFilters", () => ({
  useTaskFilters: () => ({ filters: EMPTY_FILTERS }),
}));
vi.mock("../../hooks/useTaskUI", () => ({
  useTaskUI: () => ({ density: "comfortable" }),
}));
vi.mock("../../providers/TaskSelectionProvider", () => ({
  useTaskSelection: () => ({ selectedIds: new Set(), toggle: vi.fn() }),
}));
const paginationStub = {
  page: 1,
  limit: 50,
  total: 1,
  totalPages: 1,
  isFetchingPage: false,
  goTo: vi.fn(),
  next: vi.fn(),
  prev: vi.fn(),
};

vi.mock("../../providers/TaskDataProvider", () => ({
  useTaskData: () => ({
    tasks: [{ _id: "t1", title: "Focus me", status: "new" }],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    mutate: { applyPatch: vi.fn(), revertPatch: vi.fn() },
    pagination: paginationStub,
  }),
}));
vi.mock("../../hooks/useTaskDnd", () => ({
  useTaskDnd: () => ({
    sensors: [],
    collisionDetection: vi.fn(),
    activeId: null,
    onDragStart: vi.fn(),
    onDragEnd: vi.fn(),
    onDragCancel: vi.fn(),
  }),
}));
vi.mock("../../hooks/useTaskBoardTelemetry", () => ({
  useTaskBoardTelemetry: () => ({ handleDragStart: vi.fn() }),
}));
vi.mock("@/shared/hooks/usePmRefetchOnFocus", () => ({ emitPmDataMutated: vi.fn() }));
vi.mock("../../lib/toast", () => ({ toast: { error: vi.fn() } }));

describe("TaskBoard focus rollback", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("focuses card on optimistic_rollback event", async () => {
    render(<TaskBoard canCreate onOpenTask={vi.fn()} />);
    await waitFor(() => expect(screen.getByText("Focus me")).toBeInTheDocument());
    const card = document.querySelector('[data-task-id="t1"]') as HTMLElement;
    expect(card).toBeTruthy();
    card.blur();
    window.dispatchEvent(
      new CustomEvent("taskboard.optimistic_rollback", { detail: { taskId: "t1" } })
    );
    expect(document.activeElement).toBe(card);
  });
});
