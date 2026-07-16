import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaskAdvancedFilter } from "../TaskAdvancedFilter";

const patchFilters = vi.fn();
const togglePriority = vi.fn();

vi.mock("../../hooks/useTaskFilters", () => ({
  useTaskFilters: () => ({
    filters: { leaving: false, priorities: ["high"] },
    patchFilters,
    priorities: ["high"],
    togglePriority,
  }),
}));

describe("TaskAdvancedFilter", () => {
  it("shows active count badge and opens panel on click", async () => {
    const user = userEvent.setup();
    render(<TaskAdvancedFilter leavingCount={3} />);

    expect(screen.getByRole("button", { name: /Advanced filters, 1 active/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Advanced filters/i }));

    expect(screen.getByRole("dialog", { name: "Advanced filters" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Priority" })).toBeInTheDocument();
    expect(screen.getByText("Leaving · 3")).toBeInTheDocument();
  });
});
