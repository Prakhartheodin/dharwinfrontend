import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "../../__tests__/test-utils";
import { DensityToggle } from "../DensityToggle";

const ui = vi.hoisted(() => ({
  density: "comfortable" as "comfortable" | "compact",
  setDensity: vi.fn(),
}));

const telemetry = vi.hoisted(() => ({ trackTaskBoard: vi.fn() }));

vi.mock("../../hooks/useTaskUI", () => ({
  useTaskUI: () => ui,
}));
vi.mock("../../lib/telemetry", () => telemetry);

describe("DensityToggle", () => {
  it("toggles density and emits telemetry", async () => {
    ui.density = "comfortable";
    ui.setDensity.mockClear();
    telemetry.trackTaskBoard.mockClear();
    const user = userEvent.setup();
    render(<DensityToggle />);
    await user.click(screen.getByRole("button", { name: /compact/i }));
    expect(ui.setDensity).toHaveBeenCalledWith("compact");
    expect(telemetry.trackTaskBoard).toHaveBeenCalledWith(
      "taskboard.density_changed",
      { density: "compact" }
    );
  });

  it("switches back to comfortable when already compact", async () => {
    ui.density = "compact";
    ui.setDensity.mockClear();
    telemetry.trackTaskBoard.mockClear();
    const user = userEvent.setup();
    render(<DensityToggle />);
    await user.click(screen.getByRole("button", { name: /comfortable/i }));
    expect(ui.setDensity).toHaveBeenCalledWith("comfortable");
    expect(telemetry.trackTaskBoard).toHaveBeenCalledWith(
      "taskboard.density_changed",
      { density: "comfortable" }
    );
  });
});
