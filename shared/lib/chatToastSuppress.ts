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

/** Default cap for claim sets — enough to cover any realistic burst, small enough to never matter for memory. */
export const CHAT_CLAIM_MAX = 500;

/**
 * Insertion-ordered Set with a size cap: adding past `max` evicts the oldest key, and
 * re-adding an existing key refreshes it (so it is evicted last). The claim sets used to
 * grow for the whole life of the tab.
 */
export class BoundedSet<T> extends Set<T> {
  private readonly max: number;

  constructor(max: number = CHAT_CLAIM_MAX) {
    super();
    this.max = max;
  }

  add(value: T): this {
    if (super.has(value)) super.delete(value);
    super.add(value);
    while (this.size > this.max) {
      const oldest = this.values().next().value as T;
      super.delete(oldest);
    }
    return this;
  }
}

/**
 * Claim keys shared by every chat notification surface in this tab: the OS Notification
 * (ChatSocketContext), the in-app socket toast and the SSE system toast
 * (NotificationToastStack). Whichever surface claims `msg:<id>` first is the only one shown.
 * Module-level on purpose — the surfaces live in different components.
 */
export const sharedChatClaims: Set<string> = new BoundedSet<string>(CHAT_CLAIM_MAX);

export type ChatNotifyDecision =
  /** Own message or no sender — nothing to do, claim nothing. */
  | { action: "ignore" }
  /**
   * Conversation-room copy of a message for the open conversation (no `suppressInAppNotify`
   * field). The user-room copy carrying the mute flag follows; decide on that one.
   */
  | { action: "defer" }
  /** Muted or being viewed: claim (so the SSE twin is dropped) and show nothing. */
  | { action: "suppress" }
  | { action: "notify"; os: boolean; toast: boolean };

/**
 * One decision for a socket `new_message`, shared by the OS notification and the in-app toast.
 * - `suppressInAppNotify: true` (muted) → nothing.
 * - Hidden tab → prefer the OS notification; fall back to the in-page toast only when the
 *   OS permission is not granted.
 * - Visible tab → in-page toast unless the user is viewing that conversation.
 */
export function decideChatMessageNotify(input: {
  selfId: string;
  senderId: string;
  conversationId: string;
  suppressInAppNotify?: boolean | null;
  loc: ChatToastLocation;
  visibility: string;
  osPermissionGranted: boolean;
}): ChatNotifyDecision {
  const senderId = normalizeId(input.senderId);
  if (!senderId || senderId === normalizeId(input.selfId)) return { action: "ignore" };
  const conv = normalizeId(input.conversationId);
  const isActiveConv = Boolean(conv) && normalizeId(input.loc.activeConversationId) === conv;
  const hasFlag = typeof input.suppressInAppNotify === "boolean";
  if (!hasFlag && isActiveConv) return { action: "defer" };
  if (input.suppressInAppNotify === true) return { action: "suppress" };

  const viewing = shouldSuppressChatMessageToast(input.loc, conv);
  if (input.visibility !== "visible") {
    // Hidden tab: the open pane is not actually being looked at, so the OS notification
    // still fires for the active conversation. The in-page toast never does.
    const os = input.osPermissionGranted;
    const toast = !os && !viewing;
    if (!os && !toast) return { action: "suppress" };
    return { action: "notify", os, toast };
  }
  if (viewing) return { action: "suppress" };
  return { action: "notify", os: false, toast: true };
}

/**
 * SSE `chat_message` while the tab is hidden: the socket path owns it (OS notification),
 * so skip the in-page toast — but only when the socket is up to deliver that notification.
 * Do not claim in this case, or the socket path would find the key taken.
 */
export function shouldDeferSseChatToastToOs(args: {
  visibility: string;
  osPermissionGranted: boolean;
  socketConnected: boolean;
}): boolean {
  return args.visibility !== "visible" && args.osPermissionGranted && args.socketConnected;
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
