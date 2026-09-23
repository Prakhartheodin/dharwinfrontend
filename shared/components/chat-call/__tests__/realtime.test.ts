import { describe, expect, it } from "vitest";
import { isSocketAuthError, nextAuthMode, planOnConnect, reconnectBackoffMs } from "../realtime";

describe("socket auth fallback", () => {
  it("recognises the backend's handshake rejections", () => {
    expect(isSocketAuthError("Authentication required")).toBe(true);
    expect(isSocketAuthError("Invalid token")).toBe(true);
    expect(isSocketAuthError("User not found or inactive")).toBe(true);
    expect(isSocketAuthError("xhr poll error")).toBe(false);
    expect(isSocketAuthError(undefined)).toBe(false);
  });

  it("alternates cookie ↔ bearer", () => {
    expect(nextAuthMode("cookie")).toBe("bearer");
    expect(nextAuthMode("bearer")).toBe("cookie");
  });
});

describe("reconnectBackoffMs", () => {
  it("is immediate first, then exponential, capped at 60s (never spins, never gives up)", () => {
    expect(reconnectBackoffMs(0)).toBe(0);
    expect(reconnectBackoffMs(1)).toBe(1000);
    expect(reconnectBackoffMs(2)).toBe(2000);
    expect(reconnectBackoffMs(3)).toBe(4000);
    expect(reconnectBackoffMs(7)).toBe(60_000);
    expect(reconnectBackoffMs(1000)).toBe(60_000);
    expect(reconnectBackoffMs(-5)).toBe(0);
  });
});

describe("planOnConnect", () => {
  it("first connect re-joins the open pane but does not fire onReconnected", () => {
    expect(planOnConnect({ hasConnectedBefore: false, activeConversationId: "c1" })).toEqual({
      rejoinConversationId: "c1",
      notifyReconnected: false,
    });
  });

  it("reconnect re-joins and fires onReconnected", () => {
    expect(planOnConnect({ hasConnectedBefore: true, activeConversationId: " c2 " })).toEqual({
      rejoinConversationId: "c2",
      notifyReconnected: true,
    });
  });

  it("no open conversation → nothing to re-join", () => {
    expect(planOnConnect({ hasConnectedBefore: true, activeConversationId: null })).toEqual({
      rejoinConversationId: null,
      notifyReconnected: true,
    });
  });
});
