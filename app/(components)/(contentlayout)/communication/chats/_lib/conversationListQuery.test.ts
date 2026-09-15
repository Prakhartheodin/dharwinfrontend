import { describe, expect, it } from "vitest";
import {
  buildConversationListSearch,
  conversationSearchParam,
  parseConversationListQuery,
} from "./conversationListQuery";

describe("parseConversationListQuery", () => {
  it("defaults page to 1 and empty q", () => {
    expect(parseConversationListQuery(new URLSearchParams())).toEqual({
      q: "",
      page: 1,
      conv: null,
    });
  });

  it("reads q, page, and conv from the URL", () => {
    const sp = new URLSearchParams("q=Engineering&page=3&conv=abc123");
    expect(parseConversationListQuery(sp)).toEqual({
      q: "Engineering",
      page: 3,
      conv: "abc123",
    });
  });

  it("treats invalid or zero page as 1", () => {
    expect(parseConversationListQuery(new URLSearchParams("page=0")).page).toBe(1);
    expect(parseConversationListQuery(new URLSearchParams("page=-2")).page).toBe(1);
    expect(parseConversationListQuery(new URLSearchParams("page=foo")).page).toBe(1);
  });

  it("trims q and conv", () => {
    const sp = new URLSearchParams("q=%20ab%20&conv=%20xyz%20");
    expect(parseConversationListQuery(sp)).toEqual({ q: "ab", page: 1, conv: "xyz" });
  });
});

describe("conversationSearchParam", () => {
  it("omits empty, whitespace, and 1-character queries", () => {
    expect(conversationSearchParam("")).toBeUndefined();
    expect(conversationSearchParam("  ")).toBeUndefined();
    expect(conversationSearchParam("a")).toBeUndefined();
  });

  it("returns trimmed q when length is at least 2", () => {
    expect(conversationSearchParam(" ab ")).toBe("ab");
  });
});

describe("buildConversationListSearch", () => {
  it("writes q and page and resets page when q changes", () => {
    const current = new URLSearchParams("page=4&conv=keep-me");
    expect(buildConversationListSearch(current, { q: "eng", page: 1 })).toBe(
      "conv=keep-me&q=eng"
    );
  });

  it("omits page=1 and empty q", () => {
    const current = new URLSearchParams("q=old&page=2");
    expect(buildConversationListSearch(current, { q: "", page: 1 })).toBe("");
  });

  it("keeps conv unless patched off", () => {
    const current = new URLSearchParams("conv=abc&page=2");
    expect(buildConversationListSearch(current, { page: 3 })).toBe("conv=abc&page=3");
    expect(buildConversationListSearch(current, { conv: null })).toBe("page=2");
  });
});
