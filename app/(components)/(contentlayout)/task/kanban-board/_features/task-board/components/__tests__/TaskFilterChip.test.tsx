import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "../../__tests__/test-utils";
import { TaskFilterChip } from "../TaskFilterChip";

describe("TaskFilterChip", () => {
  it("toggles via click", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<TaskFilterChip label="High" active={false} onClick={onToggle} />);
    await user.click(screen.getByRole("button", { name: "High" }));
    expect(onToggle).toHaveBeenCalled();
  });
});
