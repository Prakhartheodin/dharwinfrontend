import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BreakdownContextForm, getDefaultBreakdownContext } from "../BreakdownContextForm";

describe("BreakdownContextForm tasksPerEmployee", () => {
  it("emits tasksPerEmployee on change", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<BreakdownContextForm value={getDefaultBreakdownContext()} onChange={onChange} showFull />);
    const input = screen.getByLabelText(/tasks per team member/i);
    await user.clear(input);
    await user.type(input, "4");
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ tasksPerEmployee: 4 }));
  });
});
