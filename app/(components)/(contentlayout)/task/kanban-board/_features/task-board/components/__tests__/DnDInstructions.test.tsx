import { describe, expect, it } from "vitest";
import { render } from "../../__tests__/test-utils";
import { DnDInstructions } from "../DnDInstructions";

describe("DnDInstructions", () => {
  it("renders hidden instructions with id", () => {
    const { container } = render(<DnDInstructions />);
    expect(container.querySelector("#dnd-instructions")).toBeTruthy();
  });
});
