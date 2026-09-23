import { describe, expect, it } from "vitest";
import type { Message } from "@/shared/lib/api/chat";
import { applyReceiptEvent, mergeReceipt, messageTickStatus, upgradeTickStatus } from "./chatReceipts";

const msg = (over: Partial<Message> = {}): Message =>
  ({
    id: "m1",
    conversation: "c1",
    sender: { id: "me", name: "Me", email: "" },
    content: "hi",
    type: "text",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...over,
  }) as Message;

describe("messageTickStatus", () => {
  it("1:1 — sent, delivered, read from the other participant", () => {
    expect(messageTickStatus(msg(), ["u2"])).toBe("sent");
    expect(messageTickStatus(msg({ deliveredTo: [{ user: "u2", at: null }] }), ["u2"])).toBe("delivered");
    expect(messageTickStatus(msg({ readBy: [{ user: "u2", at: null }] }), ["u2"])).toBe("read");
  });

  it("group — read only when every other member read; delivered when all have it", () => {
    const partial = msg({ readBy: [{ user: "u2", at: null }] });
    expect(messageTickStatus(partial, ["u2", "u3"])).toBe("sent");
    const mixed = msg({ readBy: [{ user: "u2", at: null }], deliveredTo: [{ user: "u3", at: null }] });
    expect(messageTickStatus(mixed, ["u2", "u3"])).toBe("delivered");
    const all = msg({ readBy: [{ user: "u2", at: null }, { user: "u3", at: null }] });
    expect(messageTickStatus(all, ["u2", "u3"])).toBe("read");
  });

  it("tolerates legacy bare-id receipts and an empty recipient list", () => {
    expect(messageTickStatus(msg({ readBy: ["u2"] as unknown as Message["readBy"] }), ["u2"])).toBe("read");
    expect(messageTickStatus(msg({ readBy: [{ user: "u2", at: null }] }), [])).toBe("sent");
  });
});

describe("mergeReceipt", () => {
  it("pushes {user, at} objects, never bare strings, and dedupes by user", () => {
    const once = mergeReceipt(undefined, "u2", "2026-01-01T00:00:00.000Z");
    expect(once).toEqual([{ user: "u2", at: "2026-01-01T00:00:00.000Z" }]);
    expect(mergeReceipt(once, "u2", "2026-02-01T00:00:00.000Z")).toBe(once);
  });
});

describe("applyReceiptEvent", () => {
  it("adds the receipt only to messages not sent by the reader", () => {
    const mine = msg({ id: "m1" });
    const theirs = msg({ id: "m2", sender: { id: "u2", name: "B", email: "" } });
    const out = applyReceiptEvent([mine, theirs], { kind: "read", userId: "u2", at: "t" });
    expect(out[0].readBy).toEqual([{ user: "u2", at: "t" }]);
    expect(out[1]).toBe(theirs);
  });

  it("respects messageIds and returns the same array when nothing changed", () => {
    const a = msg({ id: "a" });
    const b = msg({ id: "b" });
    const out = applyReceiptEvent([a, b], { kind: "delivered", userId: "u2", messageIds: ["b"], at: "t" });
    expect(out[0]).toBe(a);
    expect(out[1].deliveredTo).toEqual([{ user: "u2", at: "t" }]);
    const again = applyReceiptEvent(out, { kind: "delivered", userId: "u2", messageIds: ["b"], at: "t2" });
    expect(again).toBe(out);
  });
});

describe("upgradeTickStatus", () => {
  it("never downgrades", () => {
    expect(upgradeTickStatus("read", "delivered")).toBe("read");
    expect(upgradeTickStatus("sent", "delivered")).toBe("delivered");
    expect(upgradeTickStatus(undefined, "sent")).toBe("sent");
  });
});
