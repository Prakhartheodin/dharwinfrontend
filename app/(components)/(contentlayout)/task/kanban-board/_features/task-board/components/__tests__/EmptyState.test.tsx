import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { render } from "../../__tests__/test-utils";
import { EmptyState } from "../EmptyState";

describe("EmptyState", () => {
  it("shows title and description", () => {
    render(<EmptyState title="No tasks" description="Add one" />);
    expect(screen.getByText("No tasks")).toBeInTheDocument();
    expect(screen.getByText("Add one")).toBeInTheDocument();
  });
});
