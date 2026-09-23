/**
 * Pure helpers for chat toast / SSE toast suppression.
 * Keeps NotificationToastStack decision logic unit-testable.
 *
 * Viewing signal for in-app toasts (single path):
 *   ?conv=X → selectConversation / deep-link sets selectedConversation
 *   → joinConversation(X) sets ChatSocketContext.activeConversationId
 *   → shouldSuppress* uses activeConversationId only
 *
 * Backend bell-persist skip is a separate signal: socket room membership
 * (`isUserActiveInConversationRoom`). Do not OR URL ?conv= into toast
 * decisions — a stale ?conv= while activeConversationId is another id
 * would wrongly suppress (or disagree with the open pane).
 */

export type ChatToastLocation = {
  pathname: string;
  /**
   * Legacy field — ignored for suppress. Kept so call sites that still
   * pass URL `?conv=` do not break; viewing is `activeConversationId` only.
   */
  convParam?: string | null | undefined;
  /** Conversation the client has joined via joinConversation (open pane). */
  activeConversationId: string | null | undefined;
};

export function normalizeId(raw: string | null | undefined): string {
  return String(raw ?? "").trim();
}

/** Suppress in-app chat toast when the user is already viewing that conversation. */
export function shouldSuppressChatMessageToast(
  loc: ChatToastLocation,
  messageConversationId: string | null | undefined
): boolean {
  const msgConv = normalizeId(messageConversationId);
  if (!msgConv) return false;
  if (normalizeId(loc.pathname) !== "/communication/chats") return false;
  const activeConv = normalizeId(loc.activeConversationId);
  return Boolean(activeConv) && activeConv === msgConv;
}

/** Stable key for socket↔SSE toast dedupe (prefer message id, else conversation). */
export function chatToastDedupeKey(parts: {
  messageId?: string | null;
  conversationId?: string | null;
}): string | null {
  const msgId = normalizeId(parts.messageId);
  if (msgId) return `msg:${msgId}`;
  const convId = normalizeId(parts.conversationId);
  if (convId) return `conv:${convId}`;
  return null;
}

/**
 * Suppress SSE system toast for chat_message when:
 * - user is viewing that conversation, or
 * - a socket chat toast (or suppress decision) already claimed this message/conversation.
 */
export function shouldSuppressSystemChatToast(args: {
  notificationType: string | null | undefined;
  conversationId: string | null | undefined;
  messageId?: string | null;
  loc: ChatToastLocation;
  claimedKeys: ReadonlySet<string>;
}): boolean {
  if (normalizeId(args.notificationType) !== "chat_message") return false;
  if (shouldSuppressChatMessageToast(args.loc, args.conversationId)) return true;
  const key = chatToastDedupeKey({
    messageId: args.messageId,
    conversationId: args.conversationId,
  });
  if (key && args.claimedKeys.has(key)) return true;
  // Also claim by message id alone if socket stored msg: and SSE only has conv —
  // handled when both keys are registered by the socket path.
  return false;
}

/** Register all dedupe keys a socket new_message should claim. Returns false if already claimed. */
export function claimChatToastKeys(
  claimed: Set<string>,
  parts: { messageId?: string | null; conversationId?: string | null }
): boolean {
  const keys: string[] = [];
  const msgKey = chatToastDedupeKey({ messageId: parts.messageId });
  if (msgKey) keys.push(msgKey);
  const convKey = chatToastDedupeKey({ conversationId: parts.conversationId });
  // Prefer message-id identity for cross-channel dedupe; conv key alone is too coarse
  // when only conversationId is known (SSE without messageId still pairs via msg claim from socket).
  if (!msgKey && convKey) keys.push(convKey);
  if (keys.length === 0) return true;
  const already = keys.every((k) => claimed.has(k));
  for (const k of keys) claimed.add(k);
  // Also register conv alongside msg so an SSE that only has conversationId can still match
  // after a socket event that had both.
  if (msgKey && convKey) claimed.add(convKey);
  return !already;
}
