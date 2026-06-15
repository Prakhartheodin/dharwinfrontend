import { describe, expect, it } from "vitest";
import { assignedToWritePayload } from "../task-write-payload";

describe("assignedToWritePayload", () => {
  it("edit always sends assignedTo so a task can be unassigned", () => {
    // Regression: removing every assignee in the drawer must persist as unassigned.
    expect(assignedToWritePayload("edit", [])).toEqual({ assignedTo: [] });
    expect(assignedToWritePayload("edit", ["u1", "u2"])).toEqual({
      assignedTo: ["u1", "u2"],
    });
  });

  it("create omits assignedTo when there is nobody to assign", () => {
    expect(assignedToWritePayload("create", [])).toEqual({});
    expect(assignedToWritePayload("create", ["u1"])).toEqual({ assignedTo: ["u1"] });
  });
});
