import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { render } from "../../__tests__/test-utils";
import { SkipLinks } from "../SkipLinks";

describe("SkipLinks", () => {
  it("renders skip anchors", () => {
    render(<SkipLinks />);
    expect(screen.getByRole("link", { name: /skip to board/i })).toHaveAttribute(
      "href",
      "#task-board-main"
    );
    expect(screen.getByRole("link", { name: /skip to filters/i })).toHaveAttribute(
      "href",
      "#task-board-filters"
    );
  });
});
