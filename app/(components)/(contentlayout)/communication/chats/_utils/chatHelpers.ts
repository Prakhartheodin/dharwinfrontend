import type { ChatCall, Conversation, Message } from "@/shared/lib/api/chat";

/** Resolve Mongo/API id from either shape. */
export function getId(x: { id?: string; _id?: string } | null | undefined): string | null {
  if (!x) return null;
  return x.id || (x as { _id?: { toString?: () => string } })._id?.toString?.() || null;
}

/** Sidebar / list preview line for a conversation's last message. */
export function conversationPreviewText(lastMessage?: Conversation["lastMessage"] | null): string {
  const content = lastMessage?.content?.trim();
  return content || "No messages yet";
}

/** Case-insensitive query matcher used by chat sidebar filters. */
export function matchesSearchQuery(
  query: string | null | undefined,
  fields: Array<string | null | undefined>
): boolean {
  const normalizedQuery = (query || "").trim().toLowerCase();
  if (!normalizedQuery) return true;
  return fields.some((field) => (field || "").toLowerCase().includes(normalizedQuery));
}

/** Sidebar preview after a delete-for-everyone: placeholder or previous visible message. */
export function conversationPreviewAfterDelete(
  messages: Message[],
  deletedMessageId: string,
  deletedMsg: Message
): NonNullable<Conversation["lastMessage"]> {
  const byDate = [...messages].sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  );
  const latestId = String((byDate[0] as { id?: string; _id?: string })?.id || (byDate[0] as { _id?: string })?._id || "");
  const deletedCopy = {
    ...deletedMsg,
    deletedAt: new Date().toISOString(),
    deletedFor: "everyone" as const,
  };

  if (latestId !== deletedMessageId) {
    const visible = byDate.find((m) => {
      const id = String((m as { id?: string; _id?: string }).id || (m as { _id?: string })._id || "");
      if (id === deletedMessageId) return false;
      return !((m as { deletedAt?: string | null }).deletedAt && (m as { deletedFor?: string }).deletedFor === "everyone");
    });
    return visible ? lastMessageFromMsg(visible) : lastMessageFromMsg(deletedCopy);
  }

  const nextVisible = byDate.find((m) => {
    const id = String((m as { id?: string; _id?: string }).id || (m as { _id?: string })._id || "");
    return id !== deletedMessageId && !((m as { deletedAt?: string | null }).deletedAt && (m as { deletedFor?: string }).deletedFor === "everyone");
  });
  return nextVisible ? lastMessageFromMsg(nextVisible) : lastMessageFromMsg(deletedCopy);
}

/** Build sidebar preview from a message after send/upload. */
export function lastMessageFromMsg(msg: Message): NonNullable<Conversation["lastMessage"]> {
  const isDeleted = !!(msg as { deletedAt?: string | null }).deletedAt;
  const deletedFor = (msg as { deletedFor?: "me" | "everyone" }).deletedFor;
  if (isDeleted && deletedFor === "everyone") {
    return {
      content: "This message was deleted",
      sender: msg.sender?.name,
      createdAt: msg.createdAt,
    };
  }
  let content = msg.content || "";
  if (msg.type === "image") content = "📷 Image";
  else if (msg.type === "video") content = "🎬 Video";
  else if (msg.type === "audio") content = "🎤 Voice note";
  else if (msg.type === "file") content = "📎 File";
  return {
    content,
    sender: msg.sender?.name,
    createdAt: msg.createdAt,
  };
}

export type CallStatusTone = "danger" | "neutral";

/** m:ss clock for a finished call's length. */
export function formatCallClock(seconds: number | null | undefined): string {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Viewer-facing call outcome. The raw status is never shown: the same record reads "Missed" to the
 * callee and "Cancelled"/"No answer" to the caller, so the label depends on `direction`.
 * Unknown direction is treated as incoming (the safer reading for a call you did not start).
 * Unknown statuses return an empty label rather than leaking the enum.
 */
export function callStatusLabel(call: {
  status?: string;
  direction?: "incoming" | "outgoing";
  durationSeconds?: number | null;
  duration?: number | null;
}): { label: string; tone: CallStatusTone } {
  const outgoing = call.direction === "outgoing";
  const neutral = (label: string) => ({ label, tone: "neutral" as const });
  switch (call.status) {
    case "cancelled":
    case "no_answer":
    case "missed":
      if (!outgoing) return { label: "Missed", tone: "danger" };
      return neutral(call.status === "cancelled" ? "Cancelled" : "No answer");
    case "declined":
      return neutral("Declined");
    case "failed":
      return neutral("Failed");
    case "completed":
    case "ended": {
      const secs = call.durationSeconds ?? call.duration;
      return neutral(secs && secs > 0 ? `Ended · ${formatCallClock(secs)}` : "Ended");
    }
    case "ringing":
    case "initiated":
      return neutral("Ringing");
    case "ongoing":
      return neutral("Ongoing");
    default:
      return neutral("");
  }
}

/** Short line for merged thread timeline (enriched calls from getCallsForConversation). */
export function timelineCallPillText(call: {
  direction?: "incoming" | "outgoing";
  peer?: { name?: string; isGroup?: boolean };
  callType?: string;
  status?: string;
  durationSeconds?: number | null;
  duration?: number | null;
}): string {
  const kind = call.callType === "video" ? "Video" : "Voice";
  const dir = call.direction === "outgoing" ? "Outgoing" : "Incoming";
  const status = callStatusLabel(call).label;
  const peerName = (call.peer?.name || "Unknown").trim() || "Unknown";
  const chunks: string[] = [];
  if (call.peer?.isGroup) {
    chunks.push(`${peerName} · ${kind} · ${dir}`);
  } else if (call.direction === "outgoing") {
    chunks.push(`You called ${peerName} · ${kind}`);
  } else if (call.direction === "incoming") {
    chunks.push(`${peerName} called · ${kind}`);
  } else {
    chunks.push(`${kind} call`);
  }
  if (status) chunks.push(status);
  return chunks.join(" · ");
}

export type MentionToken = { start: number; end: number; query: string };

/** Finds an active @mention token around the current caret position. */
export function findMentionToken(text: string, caret: number): MentionToken | null {
  const safeCaret = Math.max(0, Math.min(caret, text.length));
  const beforeCaret = text.slice(0, safeCaret);
  const match = /(?:^|\s)@([^\s@]{0,32})$/.exec(beforeCaret);
  if (!match) return null;
  const query = match[1] || "";
  const end = safeCaret;
  const start = end - query.length - 1;
  if (start < 0 || text[start] !== "@") return null;
  return { start, end, query };
}

/** Replaces the mention token range with a selected mention label. */
export function insertMentionText(
  text: string,
  range: { start: number; end: number },
  mentionLabel: string
): { value: string; caret: number } {
  const safeStart = Math.max(0, Math.min(range.start, text.length));
  const safeEnd = Math.max(safeStart, Math.min(range.end, text.length));
  const cleanLabel = mentionLabel.trim();
  if (!cleanLabel) return { value: text, caret: safeEnd };

  const before = text.slice(0, safeStart);
  const after = text.slice(safeEnd);
  const spacerBefore = before && !/\s$/.test(before) ? " " : "";
  const spacerAfter = after && !/^\s/.test(after) ? " " : "";
  const mention = `@${cleanLabel}`;
  const value = `${before}${spacerBefore}${mention}${spacerAfter}${after}`;
  const caret = (before + spacerBefore + mention + spacerAfter).length;
  return { value, caret };
}

export type PickedMention = { userId: string; displayName: string };

/**
 * Mentions to send with a message: only those whose `@Name` text survived editing, deduped by user.
 * The backend re-filters to current participants, so this is about intent, not authorization.
 */
export function mentionsForSend(content: string, picked: PickedMention[]): PickedMention[] {
  const seen = new Set<string>();
  const out: PickedMention[] = [];
  for (const p of picked) {
    if (!p.userId || seen.has(p.userId)) continue;
    if (!content.includes(`@${p.displayName}`)) continue;
    seen.add(p.userId);
    out.push(p);
  }
  return out.slice(0, 20);
}

export type TextSegment = { text: string; href?: string };

// ponytail: http(s)/www only — no scheme-agnostic match, so javascript:/data: can never become an href.
const URL_RE = /(?:https?:\/\/|www\.)[^\s<>"']+/gi;

/** Split message text into plain + link segments so bubbles can render real anchors. */
export function splitTextLinks(text: string | null | undefined): TextSegment[] {
  if (!text) return [];
  const out: TextSegment[] = [];
  let last = 0;
  URL_RE.lastIndex = 0;
  for (let m = URL_RE.exec(text); m; m = URL_RE.exec(text)) {
    let url = m[0];
    // Trailing chars that are almost always sentence punctuation, not part of the URL.
    // A ")" only counts as trailing when the URL has more ")" than "(".
    for (;;) {
      const tail = url[url.length - 1];
      if (!tail) break;
      if (".,!?;:".includes(tail)) url = url.slice(0, -1);
      else if (tail === ")" && (url.match(/\(/g)?.length ?? 0) < (url.match(/\)/g)?.length ?? 0))
        url = url.slice(0, -1);
      else break;
    }
    if (m.index > last) out.push({ text: text.slice(last, m.index) });
    out.push({ text: url, href: url.startsWith("www.") ? `https://${url}` : url });
    last = m.index + url.length;
    URL_RE.lastIndex = last;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}

/** The current user's applied reaction emoji on a message, or undefined. */
export function myReactionEmoji(
  reactions: Array<{ user?: { id?: string; _id?: string } | string; emoji?: string }> | undefined,
  myId: string | undefined
): string | undefined {
  if (!reactions?.length || !myId) return undefined;
  const mine = reactions.find((r) => {
    const u = r.user as { id?: string; _id?: string } | string | undefined;
    const uid = typeof u === "string" ? u : u?.id || u?._id;
    return uid && String(uid) === String(myId);
  });
  return mine?.emoji;
}

export type ReactionLike = { user?: { id?: string; _id?: string; name?: string } | string; emoji?: string };

function reactionUserId(r: ReactionLike): string {
  const u = r.user;
  return String(typeof u === "string" ? u : u?.id || u?._id || "");
}

export type ReactionChip = { emoji: string; count: number; mine: boolean; names: string[] };

/** Group reactions into chips (first-seen order), flagging the one that includes me. */
export function groupReactions(reactions: ReactionLike[] | undefined, myId: string | undefined): ReactionChip[] {
  const chips = new Map<string, ReactionChip>();
  for (const r of reactions || []) {
    if (!r?.emoji) continue;
    const chip = chips.get(r.emoji) || { emoji: r.emoji, count: 0, mine: false, names: [] };
    chip.count += 1;
    const uid = reactionUserId(r);
    if (myId && uid && uid === String(myId)) {
      chip.mine = true;
      chip.names.push("You");
    } else {
      const name = typeof r.user === "object" ? r.user?.name?.trim() : "";
      if (name) chip.names.push(name);
    }
    chips.set(r.emoji, chip);
  }
  return Array.from(chips.values());
}

/** Optimistic local copy of the server's one-reaction-per-user rule ('' removes mine). */
export function applyReactionLocally<T extends ReactionLike>(
  reactions: T[] | undefined,
  me: { id: string; name?: string },
  emoji: string
): ReactionLike[] {
  const rest = (reactions || []).filter((r) => reactionUserId(r) !== String(me.id));
  return emoji ? [...rest, { user: { id: String(me.id), name: me.name }, emoji }] : rest;
}

/** Emoji to send when a user clicks `clicked` on the reaction bar:
 *  empty string removes an existing identical reaction (toggle-off),
 *  otherwise the clicked emoji is applied/replaces. */
export function reactionToggleEmoji(current: string | undefined, clicked: string): string {
  return current === clicked ? "" : clicked;
}

/**
 * Reserved height for the message action menu before it is measured in the DOM.
 * Covers the densest case (React → Delete for everyone, optional Download/Pin).
 */
export const MESSAGE_ACTION_MENU_EST_HEIGHT = 300;

/** Gap between the chevron trigger and the menu (`mt-1` / `mb-1`). */
export const MESSAGE_ACTION_MENU_GAP_PX = 4;

/** Open the message action menu upward when it would not fit in the space below the trigger. */
export function shouldOpenMenuUp(spaceBelow: number, menuHeight: number): boolean {
  return spaceBelow < menuHeight;
}

export function participantIdFromCallUser(p: { id?: string; _id?: string } | null | undefined): string {
  if (!p) return "";
  return String((p as { id?: string }).id ?? (p as { _id?: string })._id ?? "").trim();
}

/** Calls list row title: explicit callee (outgoing) or caller (incoming); group name for group calls. */
export function callsTabHeadline(call: ChatCall): string {
  const peer = call.peer;
  const name = (peer?.name || (call.caller as { name?: string } | undefined)?.name || "Unknown").trim() || "Unknown";
  if (peer?.isGroup) {
    if (call.direction === "outgoing") return `You called ${name}`;
    return name;
  }
  if (call.direction === "outgoing") return `You called ${name}`;
  if (call.direction === "incoming") return `${name} called you`;
  return name;
}

/** Names of users who actually joined the LiveKit room (You for viewer); omit if no join data. */
export function callJoinedParticipantsLine(
  call: { roomJoinedUserIds?: Array<{ id?: string; _id?: string; name?: string }> },
  myId: string | undefined
): string | null {
  const list = call.roomJoinedUserIds?.length ? call.roomJoinedUserIds : [];
  if (list.length === 0) return null;
  const labels: string[] = [];
  const seen = new Set<string>();
  for (const p of list) {
    const pid = participantIdFromCallUser(p);
    const label =
      myId && pid && pid === String(myId) ? "You" : (p.name || "Unknown").trim() || "Unknown";
    const dedupe = label.toLowerCase();
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    labels.push(label);
  }
  if (labels.length === 0) return null;
  return labels.join(", ");
}
