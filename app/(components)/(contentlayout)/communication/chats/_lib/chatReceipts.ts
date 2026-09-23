/**
 * Delivery / read receipts for the chat thread and list.
 *
 * Wire shape (backend normalizeReceipts): `{ user: string, at: string | null }[]`.
 * Legacy bare-id strings are still tolerated on read so an old cached payload cannot crash the tick.
 */
import type { Message, MessageReceipt } from "@/shared/lib/api/chat";

export type TickStatus = "sent" | "delivered" | "read";

type ReceiptLike = MessageReceipt | string | { user?: { id?: string; _id?: string } | string } | null | undefined;

export function receiptUserId(entry: ReceiptLike): string {
  if (entry == null) return "";
  if (typeof entry === "string") return entry;
  const u = (entry as { user?: unknown }).user;
  if (u == null) return "";
  if (typeof u === "object") {
    const o = u as { id?: string; _id?: string };
    return String(o.id || o._id || "");
  }
  return String(u);
}

function hasReceipt(list: ReceiptLike[] | undefined, userId: string): boolean {
  return (list || []).some((r) => receiptUserId(r) === userId);
}

/**
 * Tick for a message I sent. `recipientIds` = every participant except me.
 * 1:1 → the other person; group → read only when ALL others read, delivered when all have it.
 * Read implies delivered (a reader who never emitted a delivered event still counts).
 */
export function messageTickStatus(
  m: Pick<Message, "readBy" | "deliveredTo">,
  recipientIds: string[]
): TickStatus {
  const others = recipientIds.filter(Boolean);
  if (others.length === 0) return "sent";
  const readBy = (m.readBy || []) as ReceiptLike[];
  const deliveredTo = (m.deliveredTo || []) as ReceiptLike[];
  if (others.every((id) => hasReceipt(readBy, id))) return "read";
  if (others.every((id) => hasReceipt(readBy, id) || hasReceipt(deliveredTo, id))) return "delivered";
  return "sent";
}

/** Add a `{user, at}` receipt, deduped by user. Returns the same array when nothing changes. */
export function mergeReceipt(
  list: MessageReceipt[] | undefined,
  userId: string,
  at?: string | null
): MessageReceipt[] {
  const current = (list || []) as ReceiptLike[];
  if (!userId || hasReceipt(current, userId)) return (list || []) as MessageReceipt[];
  const normalized = current
    .map((r) => {
      const user = receiptUserId(r);
      if (!user) return null;
      const rAt = typeof r === "object" && r ? (r as { at?: string | null }).at ?? null : null;
      return { user, at: rAt };
    })
    .filter(Boolean) as MessageReceipt[];
  return [...normalized, { user: userId, at: at ?? new Date().toISOString() }];
}

/**
 * Apply a `message_delivered` / `conversation_delivered` / `messages_read` event to the open thread.
 * Only messages NOT sent by `userId` gain the receipt (nobody receipts their own message).
 * `messageIds` narrows the update; omitted means "everything loaded in the conversation".
 */
export function applyReceiptEvent<T extends Message>(
  messages: T[],
  event: { kind: "delivered" | "read"; userId: string; at?: string | null; messageIds?: string[] }
): T[] {
  const uid = String(event.userId || "");
  if (!uid) return messages;
  const only = event.messageIds?.length ? new Set(event.messageIds.map(String)) : null;
  const field = event.kind === "read" ? "readBy" : "deliveredTo";
  let changed = false;
  const next = messages.map((m) => {
    const mid = String((m as { id?: string; _id?: string }).id || (m as { _id?: string })._id || "");
    if (only && !only.has(mid)) return m;
    const sender = m.sender as { id?: string; _id?: string } | undefined;
    const senderId = String(sender?.id || sender?._id || "");
    if (senderId === uid) return m;
    const before = m[field] as MessageReceipt[] | undefined;
    const after = mergeReceipt(before, uid, event.at);
    if (after === before) return m;
    changed = true;
    return { ...m, [field]: after };
  });
  return changed ? next : messages;
}

/** Monotonic merge for the list row: never downgrade read → delivered → sent. */
export function upgradeTickStatus(current: TickStatus | undefined, incoming: TickStatus): TickStatus {
  const rank: Record<TickStatus, number> = { sent: 0, delivered: 1, read: 2 };
  if (!current) return incoming;
  return rank[incoming] > rank[current] ? incoming : current;
}
