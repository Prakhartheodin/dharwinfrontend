import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "../../__tests__/test-utils";
import { BulkActionBar } from "../BulkActionBar";

afterEach(cleanup);

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
    render(<BulkActionBar canEdit />);
    expect(screen.getByText("2 selected")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(selection.clearSelection).toHaveBeenCalled();
  });

  it("assign select uses the themed control with anti-clip classes", async () => {
    // Regression: a raw native <select> pinned to h-8 with no line-height clipped
    // the "Choose user…" text vertically on Windows. The fix bases it on the themed
    // .form-control and forces leading-none / py-0 / chevron padding.
    selection.selectedIds = new Set(["a"]);
    const user = userEvent.setup();
    render(<BulkActionBar canEdit />);
    await user.click(screen.getByRole("button", { name: "Assign" }));
    const select = screen.getByRole("combobox", { name: "Assign to user" });
    expect(select).toHaveClass("form-control", "!leading-none", "!py-0", "!pe-7");
  });
});
