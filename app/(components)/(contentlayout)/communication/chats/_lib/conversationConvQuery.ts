/**
 * URL `conv` helpers for the chats page.
 * Selection updates must set `?conv=<id>` while preserving `page` and `q`.
 */

/** Set or clear `conv` on a copy of the current search params. Preserves page/q/other keys. */
export function applyConversationConvParam(
  current: URLSearchParams,
  convId: string | null | undefined
): URLSearchParams {
  const params = new URLSearchParams(current.toString());
  const id = String(convId ?? "").trim();
  if (!id) params.delete("conv");
  else params.set("conv", id);
  return params;
}

/** True when the URL already reflects the desired conversation id (including cleared). */
export function conversationConvMatches(
  current: URLSearchParams,
  convId: string | null | undefined
): boolean {
  const want = String(convId ?? "").trim();
  const have = String(current.get("conv") ?? "").trim();
  return want === have;
}
