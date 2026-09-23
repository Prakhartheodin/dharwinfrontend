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

/**
 * `getConversation` failures that mean "this id is not yours to open" (malformed id, forbidden,
 * gone). These clear `?conv=`; other failures (network, 5xx) leave the URL alone so a retry works.
 */
export function isConversationUnavailableError(err: unknown): boolean {
  const status = (err as { response?: { status?: number } })?.response?.status;
  return status === 400 || status === 403 || status === 404;
}
