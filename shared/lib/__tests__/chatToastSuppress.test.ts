import { describe, expect, it } from "vitest";
import {
  chatToastDedupeKey,
  claimChatToastKeys,
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
