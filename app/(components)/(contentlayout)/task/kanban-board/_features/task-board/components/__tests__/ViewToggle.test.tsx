import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "../../__tests__/test-utils";
import { ViewToggle } from "../ViewToggle";

const ui = vi.hoisted(() => ({
  viewMode: "board" as "board" | "list",
  setViewMode: vi.fn(),
}));

vi.mock("../../hooks/useTaskUI", () => ({
  useTaskUI: () => ui,
}));
vi.mock("../../lib/telemetry", () => ({ trackTaskBoard: vi.fn() }));

describe("ViewToggle", () => {
  it("switches to list view", async () => {
    ui.viewMode = "board";
    const user = userEvent.setup();
    render(<ViewToggle />);
    await user.click(screen.getByRole("button", { name: /list/i }));
    expect(ui.setViewMode).toHaveBeenCalledWith("list");
  });
});
