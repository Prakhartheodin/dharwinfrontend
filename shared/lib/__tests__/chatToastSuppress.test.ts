import { describe, expect, it } from "vitest";
import {
  BoundedSet,
  chatToastDedupeKey,
  claimChatToastKeys,
  decideChatMessageNotify,
  shouldDeferSseChatToastToOs,
  shouldSuppressChatMessageToast,
  shouldSuppressSystemChatToast,
} from "../chatToastSuppress";

const chatsLoc = (over: Partial<{ convParam: string | null; activeConversationId: string | null }> = {}) => ({
  pathname: "/communication/chats",
  convParam: over.convParam ?? null,
  activeConversationId: over.activeConversationId ?? null,
});

describe("shouldSuppressChatMessageToast", () => {
  it("suppresses only when activeConversationId matches (not URL alone)", () => {
    expect(
      shouldSuppressChatMessageToast(chatsLoc({ convParam: "c1" }), "c1")
    ).toBe(false);
    expect(
      shouldSuppressChatMessageToast(
        chatsLoc({ convParam: "c1", activeConversationId: "c1" }),
        "c1"
      )
    ).toBe(true);
  });

  it("does not suppress for stale ?conv= while viewing a different conversation", () => {
    expect(
      shouldSuppressChatMessageToast(
        chatsLoc({ convParam: "c1", activeConversationId: "c2" }),
        "c1"
      )
    ).toBe(false);
  });

  it("suppresses when active open conversation matches even if URL is stale", () => {
    expect(
      shouldSuppressChatMessageToast(
        chatsLoc({ convParam: "stale", activeConversationId: "c1" }),
        "c1"
      )
    ).toBe(true);
  });

  it("does not suppress when viewing a different conversation", () => {
    expect(
      shouldSuppressChatMessageToast(
        chatsLoc({ convParam: "c2", activeConversationId: "c2" }),
        "c1"
      )
    ).toBe(false);
  });

  it("does not suppress off the chats page", () => {
    expect(
      shouldSuppressChatMessageToast(
        { pathname: "/dashboard", convParam: "c1", activeConversationId: "c1" },
        "c1"
      )
    ).toBe(false);
  });
});

describe("socket + SSE duplicate toast id", () => {
  it("claims message id so SSE chat_message is suppressed", () => {
    const claimed = new Set<string>();
    expect(claimChatToastKeys(claimed, { messageId: "m1", conversationId: "c1" })).toBe(true);
    expect(claimed.has("msg:m1")).toBe(true);
    expect(claimed.has("conv:c1")).toBe(true);
    expect(claimChatToastKeys(claimed, { messageId: "m1", conversationId: "c1" })).toBe(false);

    expect(
      shouldSuppressSystemChatToast({
        notificationType: "chat_message",
        conversationId: "c1",
        messageId: "m1",
        loc: chatsLoc(),
        claimedKeys: claimed,
      })
    ).toBe(true);
  });

  it("still suppresses SSE while viewing even without a prior socket claim", () => {
    expect(
      shouldSuppressSystemChatToast({
        notificationType: "chat_message",
        conversationId: "c1",
        messageId: "m9",
        loc: chatsLoc({ activeConversationId: "c1" }),
        claimedKeys: new Set(),
      })
    ).toBe(true);
  });

  it("does not suppress unrelated system notifications", () => {
    expect(
      shouldSuppressSystemChatToast({
        notificationType: "task_assigned",
        conversationId: "c1",
        loc: chatsLoc({ activeConversationId: "c1" }),
        claimedKeys: new Set(["msg:m1"]),
      })
    ).toBe(false);
  });

  it("builds stable dedupe keys", () => {
    expect(chatToastDedupeKey({ messageId: "m1" })).toBe("msg:m1");
    expect(chatToastDedupeKey({ conversationId: "c1" })).toBe("conv:c1");
    expect(chatToastDedupeKey({})).toBeNull();
  });
});

describe("BoundedSet (claim-set cap)", () => {
  it("evicts the oldest key past the cap", () => {
    const s = new BoundedSet<string>(3);
    ["a", "b", "c", "d"].forEach((k) => s.add(k));
    expect(s.size).toBe(3);
    expect(s.has("a")).toBe(false);
    expect([...s]).toEqual(["b", "c", "d"]);
  });

  it("re-adding a key refreshes it so it is evicted last", () => {
    const s = new BoundedSet<string>(3);
    ["a", "b", "c"].forEach((k) => s.add(k));
    s.add("a");
    s.add("d");
    expect(s.has("a")).toBe(true);
    expect(s.has("b")).toBe(false);
  });

  it("keeps claim semantics working through claimChatToastKeys", () => {
    const s = new BoundedSet<string>(500);
    for (let i = 0; i < 1000; i += 1) claimChatToastKeys(s, { messageId: `m${i}`, conversationId: "c1" });
    expect(s.size).toBeLessThanOrEqual(500);
    // A recent message is still deduped; an evicted one could toast again (acceptable, bounded).
    expect(claimChatToastKeys(s, { messageId: "m999", conversationId: "c1" })).toBe(false);
  });
});

describe("decideChatMessageNotify", () => {
  const base = {
    selfId: "me",
    senderId: "other",
    conversationId: "c1",
    suppressInAppNotify: false as boolean | undefined,
    loc: { pathname: "/dashboard", activeConversationId: null as string | null },
    visibility: "visible",
    osPermissionGranted: true,
  };

  it("ignores own messages", () => {
    expect(decideChatMessageNotify({ ...base, senderId: "me" })).toEqual({ action: "ignore" });
  });

  it("muted (suppressInAppNotify) produces neither toast nor OS notification", () => {
    expect(decideChatMessageNotify({ ...base, suppressInAppNotify: true })).toEqual({ action: "suppress" });
    expect(
      decideChatMessageNotify({ ...base, suppressInAppNotify: true, visibility: "hidden" })
    ).toEqual({ action: "suppress" });
  });

  it("visible tab → in-page toast only", () => {
    expect(decideChatMessageNotify(base)).toEqual({ action: "notify", os: false, toast: true });
  });

  it("visible tab viewing that conversation → suppressed (no toast, no OS)", () => {
    expect(
      decideChatMessageNotify({
        ...base,
        loc: { pathname: "/communication/chats", activeConversationId: "c1" },
      })
    ).toEqual({ action: "suppress" });
  });

  it("hidden tab with permission → OS notification, no in-page toast", () => {
    expect(decideChatMessageNotify({ ...base, visibility: "hidden" })).toEqual({
      action: "notify",
      os: true,
      toast: false,
    });
  });

  it("hidden tab still notifies the OS for the open conversation", () => {
    expect(
      decideChatMessageNotify({
        ...base,
        visibility: "hidden",
        loc: { pathname: "/communication/chats", activeConversationId: "c1" },
      })
    ).toEqual({ action: "notify", os: true, toast: false });
  });

  it("hidden tab without permission → toast fallback (unless viewing)", () => {
    expect(decideChatMessageNotify({ ...base, visibility: "hidden", osPermissionGranted: false })).toEqual({
      action: "notify",
      os: false,
      toast: true,
    });
    expect(
      decideChatMessageNotify({
        ...base,
        visibility: "hidden",
        osPermissionGranted: false,
        loc: { pathname: "/communication/chats", activeConversationId: "c1" },
      })
    ).toEqual({ action: "suppress" });
  });

  it("defers the flagless conversation-room copy of the open conversation to the user-room copy", () => {
    expect(
      decideChatMessageNotify({
        ...base,
        suppressInAppNotify: undefined,
        loc: { pathname: "/communication/chats", activeConversationId: "c1" },
      })
    ).toEqual({ action: "defer" });
  });

  it("flagless copy for a non-open conversation is still decided (legacy payloads)", () => {
    expect(decideChatMessageNotify({ ...base, suppressInAppNotify: undefined })).toEqual({
      action: "notify",
      os: false,
      toast: true,
    });
  });
});

describe("shouldDeferSseChatToastToOs", () => {
  it("defers only when hidden, permitted and the socket can deliver", () => {
    expect(shouldDeferSseChatToastToOs({ visibility: "hidden", osPermissionGranted: true, socketConnected: true })).toBe(true);
    expect(shouldDeferSseChatToastToOs({ visibility: "visible", osPermissionGranted: true, socketConnected: true })).toBe(false);
    expect(shouldDeferSseChatToastToOs({ visibility: "hidden", osPermissionGranted: false, socketConnected: true })).toBe(false);
    expect(shouldDeferSseChatToastToOs({ visibility: "hidden", osPermissionGranted: true, socketConnected: false })).toBe(false);
  });
});
