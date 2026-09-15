import { describe, expect, it } from "vitest";
import {
  applyConversationListParams,
  parseConversationListPage,
  parseConversationListQ,
} from "./conversationListQuery";

describe("parseConversationListPage", () => {
  it("defaults missing or invalid values to 1", () => {
    expect(parseConversationListPage(null)).toBe(1);
    expect(parseConversationListPage("0")).toBe(1);
    expect(parseConversationListPage("-2")).toBe(1);
    expect(parseConversationListPage("1.5")).toBe(1);
    expect(parseConversationListPage("abc")).toBe(1);
  });

  it("keeps positive integers", () => {
    expect(parseConversationListPage("2")).toBe(2);
  });
});

describe("parseConversationListQ", () => {
  it("trims and bounds length", () => {
    expect(parseConversationListQ("  eng  ")).toBe("eng");
    expect(parseConversationListQ("a".repeat(101)).length).toBe(100);
  });
});

describe("applyConversationListParams", () => {
  it("writes page and q while preserving conv", () => {
    const current = new URLSearchParams("conv=abc123");
    const next = applyConversationListParams(current, { page: 2, q: "engineering" });
    expect(next.get("page")).toBe("2");
    expect(next.get("q")).toBe("engineering");
    expect(next.get("conv")).toBe("abc123");
  });

  it("omits page=1 and empty q", () => {
    const current = new URLSearchParams("page=3&q=old&conv=abc123");
    const next = applyConversationListParams(current, { page: 1, q: "  " });
    expect(next.get("page")).toBeNull();
    expect(next.get("q")).toBeNull();
    expect(next.get("conv")).toBe("abc123");
  });
});
