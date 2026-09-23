/**
 * Pure socket-lifecycle helpers for ChatSocketContext (auth fallback, backoff, reconnect rejoin).
 * Unit-tested in __tests__/realtime.test.ts.
 */

/** How the socket.io handshake authenticates. `cookie` = httpOnly accessToken; `bearer` = /chats/socket-token. */
export type SocketAuthMode = "cookie" | "bearer";

/** Messages the backend auth middleware rejects with (chatSocket.service.js io.use). */
export function isSocketAuthError(message: string | null | undefined): boolean {
  return /auth|token|unauthori|not found or inactive|jwt/i.test(String(message ?? ""));
}

/**
 * After an auth rejection, try the other mode next. From `cookie` we fall back to a freshly
 * fetched bearer token; from `bearer` we go back to the cookie (the socket-token fetch goes
 * through the axios 401 interceptor, which refreshes the cookie on the way).
 */
export function nextAuthMode(current: SocketAuthMode): SocketAuthMode {
  return current === "cookie" ? "bearer" : "cookie";
}

const BACKOFF_BASE_MS = 1000;
const BACKOFF_MAX_MS = 60_000;

/**
 * Delay before the Nth manual reconnect after the server rejected the handshake.
 * Attempt 0 is immediate (the first cookie → bearer fallback should not wait), then
 * 1 s, 2 s, 4 s … capped at 60 s, so a persistently failing auth never spins.
 */
export function reconnectBackoffMs(attempt: number): number {
  const n = Math.max(0, Math.floor(attempt));
  if (n === 0) return 0;
  return Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * 2 ** Math.min(n - 1, 16));
}

/**
 * On every `connect`: re-join the open conversation's room (rooms do not survive a new socket
 * id, and a join emitted before the first connect was lost). Fire onReconnected listeners only
 * when this is not the first connect of this socket.
 */
export function planOnConnect(args: {
  hasConnectedBefore: boolean;
  activeConversationId: string | null | undefined;
}): { rejoinConversationId: string | null; notifyReconnected: boolean } {
  const id = String(args.activeConversationId ?? "").trim();
  return {
    rejoinConversationId: id || null,
    notifyReconnected: args.hasConnectedBefore,
  };
}
