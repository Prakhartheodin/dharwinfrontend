/**
 * Close-panel decision: DM/group info close must not clear the selected conversation.
 */
export function shouldClearConversationOnPanelClose(): false {
  return false;
}

/**
 * Selected-member chip labels must survive search-result changes.
 * Store id→label when selecting; removing updates the same map + set.
 */
export function toggleSelectedMemberChip(
  selectedIds: Set<string>,
  labels: Record<string, string>,
  userId: string,
  displayName: string
): { selectedIds: Set<string>; labels: Record<string, string> } {
  const nextIds = new Set(selectedIds);
  const nextLabels = { ...labels };
  const id = String(userId);
  if (nextIds.has(id)) {
    nextIds.delete(id);
    delete nextLabels[id];
  } else {
    nextIds.add(id);
    const name = String(displayName ?? "").trim();
    if (name) nextLabels[id] = name;
  }
  return { selectedIds: nextIds, labels: nextLabels };
}

export function selectedMemberChipEntries(
  selectedIds: Set<string>,
  labels: Record<string, string>
): { id: string; label: string }[] {
  return Array.from(selectedIds).map((id) => ({
    id,
    label: labels[id] || "Selected user",
  }));
}
