import { describe, it, expect } from "vitest";
import {
  myReactionEmoji,
  reactionToggleEmoji,
  splitTextLinks,
  conversationPreviewText,
  conversationPreviewAfterDelete,
  lastMessageFromMsg,
  matchesSearchQuery,
  findMentionToken,
  insertMentionText,
  callStatusLabel,
  formatCallClock,
  timelineCallPillText,
  groupReactions,
  applyReactionLocally,
  mentionsForSend,
  shouldOpenMenuUp,
} from "./chatHelpers";

describe("myReactionEmoji", () => {
  it("returns the current user's emoji (populated user object)", () => {
    const reactions = [
      { user: { id: "u1" }, emoji: "👍" },
      { user: { id: "u2" }, emoji: "❤️" },
    ];
    expect(myReactionEmoji(reactions, "u1")).toBe("👍");
  });
  it("matches when user is a raw id string", () => {
    expect(myReactionEmoji([{ user: "u1", emoji: "😂" }], "u1")).toBe("😂");
  });
  it("matches when user is populated with _id", () => {
    expect(myReactionEmoji([{ user: { _id: "u1" }, emoji: "🙏" }], "u1")).toBe("🙏");
  });
  it("returns undefined when the user has no reaction", () => {
    expect(myReactionEmoji([{ user: { id: "u2" }, emoji: "❤️" }], "u1")).toBeUndefined();
  });
  it("returns undefined for empty/missing inputs", () => {
    expect(myReactionEmoji([], "u1")).toBeUndefined();
    expect(myReactionEmoji(undefined, "u1")).toBeUndefined();
    expect(myReactionEmoji([{ user: { id: "u1" }, emoji: "👍" }], undefined)).toBeUndefined();
  });
});

describe("reactionToggleEmoji", () => {
  it("returns empty string to remove when clicking the same emoji", () => {
    expect(reactionToggleEmoji("👍", "👍")).toBe("");
  });
  it("returns the clicked emoji when different", () => {
    expect(reactionToggleEmoji("👍", "❤️")).toBe("❤️");
  });
  it("returns the clicked emoji when none applied", () => {
    expect(reactionToggleEmoji(undefined, "👍")).toBe("👍");
  });
});

describe("splitTextLinks", () => {
  it("returns one plain segment when there is no URL", () => {
    expect(splitTextLinks("hello there")).toEqual([{ text: "hello there" }]);
  });
  it("linkifies a bare https URL", () => {
    const url = "https://dharwinfrontend.vercel.app/join/room?room=meeting_6c2e4416d4281e2b";
    expect(splitTextLinks(url)).toEqual([{ text: url, href: url }]);
  });
  it("keeps surrounding text as plain segments", () => {
    expect(splitTextLinks("join https://a.com now")).toEqual([
      { text: "join " },
      { text: "https://a.com", href: "https://a.com" },
      { text: " now" },
    ]);
  });
  it("prefixes https:// on www links", () => {
    expect(splitTextLinks("www.flipkart.com")).toEqual([
      { text: "www.flipkart.com", href: "https://www.flipkart.com" },
    ]);
  });
  it("drops trailing sentence punctuation from the link", () => {
    expect(splitTextLinks("see https://a.com.")).toEqual([
      { text: "see " },
      { text: "https://a.com", href: "https://a.com" },
      { text: "." },
    ]);
  });
  it("keeps a balanced trailing paren inside the link", () => {
    expect(splitTextLinks("https://en.wikipedia.org/wiki/X_(y)")).toEqual([
      { text: "https://en.wikipedia.org/wiki/X_(y)", href: "https://en.wikipedia.org/wiki/X_(y)" },
    ]);
  });
  it("handles multiple links", () => {
    expect(splitTextLinks("https://a.com and https://b.com")).toEqual([
      { text: "https://a.com", href: "https://a.com" },
      { text: " and " },
      { text: "https://b.com", href: "https://b.com" },
    ]);
  });
  it("ignores javascript: and other non-http schemes", () => {
    expect(splitTextLinks("javascript:alert(1)")).toEqual([{ text: "javascript:alert(1)" }]);
  });
  it("returns empty array for empty input", () => {
    expect(splitTextLinks("")).toEqual([]);
  });
});

describe("conversationPreviewText", () => {
  it("shows deleted placeholder from lastMessage content", () => {
    expect(conversationPreviewText({ content: "This message was deleted", createdAt: "2026-01-01" })).toBe(
      "This message was deleted"
    );
  });
  it("falls back when preview is missing", () => {
    expect(conversationPreviewText(null)).toBe("No messages yet");
    expect(conversationPreviewText(undefined)).toBe("No messages yet");
  });
});

describe("matchesSearchQuery", () => {
  it("returns true for empty query", () => {
    expect(matchesSearchQuery("", ["Alice", "Hello"])).toBe(true);
    expect(matchesSearchQuery("   ", ["Alice", "Hello"])).toBe(true);
  });

  it("matches any field case-insensitively", () => {
    expect(matchesSearchQuery("alice", ["Bob", "ALICE JOHNSON"])).toBe(true);
  });

  it("returns false when no field includes query", () => {
    expect(matchesSearchQuery("zoom", ["Alice", "Voice call"])).toBe(false);
  });
});

describe("lastMessageFromMsg", () => {
  it("maps deleted-for-everyone to sidebar placeholder", () => {
    expect(
      lastMessageFromMsg({
        content: "HI",
        createdAt: "2026-01-01",
        deletedAt: "2026-01-02",
        deletedFor: "everyone",
      } as any)
    ).toEqual({
      content: "This message was deleted",
      sender: undefined,
      createdAt: "2026-01-01",
    });
  });
});

describe("conversationPreviewAfterDelete", () => {
  it("uses deleted placeholder when the latest message was removed", () => {
    const preview = conversationPreviewAfterDelete(
      [{ id: "m2", content: "HI", createdAt: "2026-01-02" }] as any,
      "m2",
      { id: "m2", content: "HI", createdAt: "2026-01-02" } as any
    );
    expect(preview.content).toBe("This message was deleted");
  });

  it("falls back to the previous visible message when the latest is deleted", () => {
    const preview = conversationPreviewAfterDelete(
      [
        { id: "m2", content: "HI", createdAt: "2026-01-02" },
        { id: "m1", content: "Earlier note", createdAt: "2026-01-01", sender: { name: "Alex" } },
      ] as any,
      "m2",
      { id: "m2", content: "HI", createdAt: "2026-01-02" } as any
    );
    expect(preview.content).toBe("Earlier note");
    expect(preview.sender).toBe("Alex");
  });
});

describe("findMentionToken", () => {
  it("detects active token after @ in message text", () => {
    expect(findMentionToken("hello @har", "hello @har".length)).toEqual({
      start: 6,
      end: 10,
      query: "har",
    });
  });

  it("returns empty query for bare @ trigger", () => {
    expect(findMentionToken("ping @", "ping @".length)).toEqual({
      start: 5,
      end: 6,
      query: "",
    });
  });

  it("ignores @ when not starting a mention token", () => {
    expect(findMentionToken("mail me at test@example.com", "mail me at test@example.com".length)).toBeNull();
  });
});

describe("insertMentionText", () => {
  it("replaces mention token and keeps trailing words spaced", () => {
    const out = insertMentionText("hello @ha there", { start: 6, end: 9 }, "Harvinder Singh");
    expect(out.value).toBe("hello @Harvinder Singh there");
    expect(out.caret).toBe("hello @Harvinder Singh".length);
  });

  it("adds spacing when mention is glued to previous text", () => {
    const out = insertMentionText("hello@ha", { start: 5, end: 8 }, "Admin");
    expect(out.value).toBe("hello @Admin");
    expect(out.caret).toBe("hello @Admin".length);
  });
});

describe("callStatusLabel", () => {
  it("labels missed-type outcomes by direction", () => {
    for (const status of ["cancelled", "no_answer", "missed"]) {
      expect(callStatusLabel({ status, direction: "incoming" })).toEqual({ label: "Missed", tone: "danger" });
    }
    expect(callStatusLabel({ status: "cancelled", direction: "outgoing" })).toEqual({ label: "Cancelled", tone: "neutral" });
    expect(callStatusLabel({ status: "no_answer", direction: "outgoing" }).label).toBe("No answer");
    expect(callStatusLabel({ status: "missed", direction: "outgoing" }).label).toBe("No answer");
  });

  it("maps the remaining statuses and never leaks a raw status word", () => {
    expect(callStatusLabel({ status: "declined" }).label).toBe("Declined");
    expect(callStatusLabel({ status: "failed" }).label).toBe("Failed");
    expect(callStatusLabel({ status: "completed", durationSeconds: 125 }).label).toBe("Ended · 2:05");
    expect(callStatusLabel({ status: "completed", duration: 9 }).label).toBe("Ended · 0:09");
    expect(callStatusLabel({ status: "completed" }).label).toBe("Ended");
    expect(callStatusLabel({ status: "ringing" }).label).toBe("Ringing");
    expect(callStatusLabel({ status: "initiated" }).label).toBe("Ringing");
    expect(callStatusLabel({ status: "ongoing" }).label).toBe("Ongoing");
    expect(callStatusLabel({ status: "weird_new_state" }).label).toBe("");
  });

  it("feeds the thread pill text", () => {
    expect(
      timelineCallPillText({ direction: "outgoing", peer: { name: "Ada" }, callType: "audio", status: "cancelled" })
    ).toBe("You called Ada · Voice · Cancelled");
    expect(
      timelineCallPillText({ direction: "incoming", peer: { name: "Ada" }, callType: "video", status: "no_answer" })
    ).toBe("Ada called · Video · Missed");
  });
});

describe("formatCallClock", () => {
  it("formats m:ss", () => {
    expect(formatCallClock(0)).toBe("0:00");
    expect(formatCallClock(61)).toBe("1:01");
    expect(formatCallClock(undefined)).toBe("0:00");
  });
});

describe("groupReactions / applyReactionLocally", () => {
  const reactions = [
    { user: { id: "u1", name: "Ada" }, emoji: "❤️" },
    { user: { id: "me", name: "Me" }, emoji: "❤️" },
    { user: "u3", emoji: "👍" },
  ];

  it("groups by emoji, flags mine and lists names", () => {
    expect(groupReactions(reactions, "me")).toEqual([
      { emoji: "❤️", count: 2, mine: true, names: ["Ada", "You"] },
      { emoji: "👍", count: 1, mine: false, names: [] },
    ]);
  });

  it("chip click on my emoji removes it; on another emoji switches to it", () => {
    const mine = myReactionEmoji(reactions, "me");
    expect(reactionToggleEmoji(mine, "❤️")).toBe("");
    expect(reactionToggleEmoji(mine, "👍")).toBe("👍");
    const removed = applyReactionLocally(reactions, { id: "me" }, "");
    expect(groupReactions(removed, "me")[0]).toMatchObject({ emoji: "❤️", count: 1, mine: false });
    const switched = applyReactionLocally(reactions, { id: "me", name: "Me" }, "👍");
    expect(groupReactions(switched, "me").find((c) => c.emoji === "👍")).toMatchObject({ count: 2, mine: true });
  });
});

describe("mentionsForSend", () => {
  it("keeps only mentions still present in the text, deduped", () => {
    const picked = [
      { userId: "u1", displayName: "Ada Lovelace" },
      { userId: "u2", displayName: "Grace" },
      { userId: "u1", displayName: "Ada Lovelace" },
    ];
    expect(mentionsForSend("hi @Ada Lovelace", picked)).toEqual([{ userId: "u1", displayName: "Ada Lovelace" }]);
    expect(mentionsForSend("no mentions", picked)).toEqual([]);
  });
});

describe("shouldOpenMenuUp", () => {
  it("opens downward when there is enough space below", () => {
    expect(shouldOpenMenuUp(400, 300)).toBe(false);
  });

  it("opens upward when space below is less than the menu height", () => {
    expect(shouldOpenMenuUp(120, 300)).toBe(true);
  });

  it("stays downward when space below exactly equals the menu height", () => {
    expect(shouldOpenMenuUp(300, 300)).toBe(false);
  });

  it("opens upward when space below is just under the menu height", () => {
    expect(shouldOpenMenuUp(299, 300)).toBe(true);
  });
});
