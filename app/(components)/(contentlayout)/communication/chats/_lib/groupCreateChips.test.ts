import { describe, expect, it } from "vitest";
import {
  selectedMemberChipEntries,
  shouldClearConversationOnPanelClose,
  toggleSelectedMemberChip,
} from "./groupCreateChips";

describe("shouldClearConversationOnPanelClose", () => {
  it("close panel does not clear conversation", () => {
    expect(shouldClearConversationOnPanelClose()).toBe(false);
  });
});

describe("toggleSelectedMemberChip", () => {
  it("chips survive search change and support removal", () => {
    let ids = new Set<string>();
    let labels: Record<string, string> = {};

    ({ selectedIds: ids, labels } = toggleSelectedMemberChip(ids, labels, "u1", "Ada"));
    ({ selectedIds: ids, labels } = toggleSelectedMemberChip(ids, labels, "u2", "Grace"));

    expect(selectedMemberChipEntries(ids, labels)).toEqual([
      { id: "u1", label: "Ada" },
      { id: "u2", label: "Grace" },
    ]);
    expect(ids.size).toBe(2);

    ({ selectedIds: ids, labels } = toggleSelectedMemberChip(ids, labels, "u1", "Ada"));
    expect(ids.has("u1")).toBe(false);
    expect(labels.u1).toBeUndefined();
    expect(selectedMemberChipEntries(ids, labels)).toEqual([{ id: "u2", label: "Grace" }]);
  });

  it("does not duplicate selection", () => {
    let ids = new Set<string>();
    let labels: Record<string, string> = {};
    ({ selectedIds: ids, labels } = toggleSelectedMemberChip(ids, labels, "u1", "Ada"));
    expect(ids.size).toBe(1);
    // Selecting again toggles off (Set has no duplicates while present)
    const removed = toggleSelectedMemberChip(ids, labels, "u1", "Ada");
    expect(removed.selectedIds.size).toBe(0);
    const readded = toggleSelectedMemberChip(removed.selectedIds, removed.labels, "u1", "Ada");
    expect(readded.selectedIds.size).toBe(1);
    expect(readded.labels.u1).toBe("Ada");
  });
});
