import { describe, it, expect } from "vitest";
import { myReactionEmoji, reactionToggleEmoji } from "./chatHelpers";

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
