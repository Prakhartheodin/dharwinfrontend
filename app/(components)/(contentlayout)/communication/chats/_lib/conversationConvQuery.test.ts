import { describe, expect, it } from "vitest";
import {
  applyConversationConvParam,
  conversationConvMatches,
} from "./conversationConvQuery";

describe("applyConversationConvParam", () => {
  it("sets conv A then B while preserving page and q", () => {
    const base = new URLSearchParams("page=2&q=eng");
    const withA = applyConversationConvParam(base, "convA");
    expect(withA.get("conv")).toBe("convA");
    expect(withA.get("page")).toBe("2");
    expect(withA.get("q")).toBe("eng");

    const withB = applyConversationConvParam(withA, "convB");
    expect(withB.get("conv")).toBe("convB");
    expect(withB.get("page")).toBe("2");
    expect(withB.get("q")).toBe("eng");
  });

  it("clears conv without dropping page/q", () => {
    const current = new URLSearchParams("page=3&q=team&conv=old");
    const next = applyConversationConvParam(current, null);
    expect(next.get("conv")).toBeNull();
    expect(next.get("page")).toBe("3");
    expect(next.get("q")).toBe("team");
  });

  it("trims blank conv to a delete", () => {
    const current = new URLSearchParams("conv=x&page=1");
    const next = applyConversationConvParam(current, "  ");
    expect(next.get("conv")).toBeNull();
  });
});

describe("conversationConvMatches", () => {
  it("treats empty and missing as matching", () => {
    expect(conversationConvMatches(new URLSearchParams(""), null)).toBe(true);
    expect(conversationConvMatches(new URLSearchParams("conv=a"), "a")).toBe(true);
    expect(conversationConvMatches(new URLSearchParams("conv=a"), "b")).toBe(false);
  });
});
