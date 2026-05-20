import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "../../__tests__/test-utils";
import { BulkActionBar } from "../BulkActionBar";

const selection = vi.hoisted(() => ({
  selectedIds: new Set<string>(),
  clearSelection: vi.fn(),
}));

vi.mock("../../providers/TaskSelectionProvider", () => ({
  useTaskSelection: () => selection,
}));

vi.mock("../../providers/TaskDataProvider", () => ({
  useTaskData: () => ({ users: [] }),
}));

vi.mock("../../hooks/useBulkTaskActions", () => ({
  useBulkTaskActions: () => ({
    busy: false,
    bulkMoveToStatus: vi.fn(),
    bulkAssign: vi.fn(),
    bulkDelete: vi.fn(),
  }),
}));

describe("BulkActionBar", () => {
  it("hidden when nothing selected", () => {
    selection.selectedIds = new Set();
    const { container } = render(<BulkActionBar />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows count and clear", async () => {
    selection.selectedIds = new Set(["a", "b"]);
    const user = userEvent.setup();
    render(<BulkActionBar />);
    expect(screen.getByText("2 selected")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(selection.clearSelection).toHaveBeenCalled();
  });
});
