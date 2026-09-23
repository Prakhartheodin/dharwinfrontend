"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { apiClient } from "@/shared/lib/api/client";
import { useAuth } from "@/shared/contexts/auth-context";
import {
  CallNoticeToast,
  GlobalIncomingCall,
  GlobalOutgoingCall,
  IncomingCallBar,
} from "@/shared/components/GlobalIncomingCall";
import {
  BoundedSet,
  chatToastDedupeKey,
  claimChatToastKeys,
  decideChatMessageNotify,
  sharedChatClaims,
} from "@/shared/lib/chatToastSuppress";
import {
  buildChatCallRoomPath,
  isTerminalOutgoingStatus,
  outgoingStatusFromCancelled,
  outgoingStatusFromDismiss,
  shouldClosePendingCallWindow,
  type CallDismissReason,
  type OutgoingCallStatus,
} from "@/shared/components/chat-call/callState";
import {
  isSocketAuthError,
  nextAuthMode,
  planOnConnect,
  reconnectBackoffMs,
  type SocketAuthMode,
} from "@/shared/components/chat-call/realtime";

export type { CallDismissReason, OutgoingCallStatus } from "@/shared/components/chat-call/callState";

function getSocketUrl(): string {
  const apiUrl = (process.env.NEXT_PUBLIC_API_URL ?? "").trim();
  if (apiUrl.startsWith("http://") || apiUrl.startsWith("https://")) {
    try {
      const u = new URL(apiUrl);
      return `${u.protocol}//${u.host}`;
    } catch {
      return "";
    }
  }
  if (typeof window !== "undefined") {
    return window.location.origin.replace(/:\d+$/, ":3000");
  }
  return "";
}

export interface IncomingCallData {
  /** Chat (default) vs designated superadmin support camera invite */
  callSource?: "chat" | "support_camera";
  /** Present when callSource is support_camera — join path uses this token */
  supportInviteToken?: string;
  conversationId: string;
  callId: string;
  /** Shared LiveKit room name — present on group invites and REST-initiated calls */
  roomName?: string;
  callType: "audio" | "video";
  caller: { id: string; name: string; email?: string };
  /** Explicit direct vs group — set by server; never infer from participant count alone */
  callScope?: "direct" | "group";
  /** From server when call is in a group conversation */
  conversationType?: "direct" | "group";
  /** Present for group calls; display as secondary context under caller */
  groupName?: string;
  /** Shared LiveKit room all invitees join */
  participantIds?: string[];
  participantCount?: number;
}

export interface CallStartData {
  callId: string;
  conversationId: string;
  roomName: string;
  callType: "audio" | "video";
  token: string;
}

/** Caller-side ringing state. Set when the local user starts a call; drives the outgoing-call overlay. */
export interface OutgoingCallData {
  callId?: string;
  conversationId: string;
  callType: "audio" | "video";
  calleeName: string;
  status: OutgoingCallStatus;
  /** Server/ack error text when status is `failed`. */
  error?: string;
  callScope?: "direct" | "group";
  groupName?: string;
  participantCount?: number;
}

export interface ConversationUpdatedData {
  conversationId?: string;
  lastMessage?: {
    content?: string;
    sender?: string;
    createdAt?: string;
    type?: string;
  };
}

/** `message_delivered` — some of the local user's messages reached `userId`. */
export interface MessageDeliveredData {
  conversationId: string;
  messageIds: string[];
  userId: string;
  at: string;
}

/** `conversation_delivered` — every message in the conversation reached `userId`. */
export interface ConversationDeliveredData {
  conversationId: string;
  userId: string;
  at: string;
}

/** `conversation_removed` — the local user was removed from (or left) the conversation. */
export interface ConversationRemovedData {
  conversationId: string;
}

/** `call:dismiss` — the call stopped ringing for this user (sent to all of their tabs). */
export interface CallDismissData {
  callId: string;
  reason: CallDismissReason;
}

/**
 * A call window opened synchronously inside a click (popup blockers only allow that).
 * It shows a "Connecting…" placeholder until `call:start` points it at the room.
 */
export interface CallWindowHandle {
  /** Close the window unless it has already been navigated to the call room. */
  close: () => void;
}

/** Bolna telephony delta emitted on `call:update` (see chatSocket.service.js::emitCallUpdate). */
export interface CallUpdateData {
  id?: string | null;
  executionId?: string;
  status?: string;
  statusRank?: number;
  statusUpdatedAt?: string;
  completedAt?: string | null;
  duration?: number;
  recordingUrl?: string;
  fromPhoneNumber?: string;
  toPhoneNumber?: string;
  recipientPhoneNumber?: string;
  phone?: string;
  businessName?: string;
  purpose?: string | null;
  agentId?: string;
  errorMessage?: string | null;
}

type CallAck = { success?: boolean; callId?: string; error?: string };

interface ChatSocketContextValue {
  socket: Socket | null;
  connected: boolean;
  onlineUsers: Set<string>;
  /** Set when an incoming call is received (callee only). Cleared on accept/decline/timeout. */
  incomingCall: IncomingCallData | null;
  setIncomingCall: (data: IncomingCallData | null) => void;
  /** Set when the local user starts a call (caller only). Cleared on connect/decline/cancel/timeout. */
  outgoingCall: OutgoingCallData | null;
  clearOutgoingCall: () => void;
  /**
   * Caller cancels the ringing call. Manual (no reason) closes the overlay; `"timeout"` is the
   * 45 s no-answer path and shows "No answer". Works before the initiate ack returns a callId.
   */
  cancelOutgoingCall: (reason?: "timeout") => void;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  /** Conversation the local client has joined (open chat pane). Used for toast suppress when URL lags. */
  activeConversationId: string | null;
  onNewMessage: (callback: (msg: unknown) => void) => () => void;
  onConversationUpdated: (callback: (data?: ConversationUpdatedData) => void) => () => void;
  onConversationDeleted: (callback: (data: { conversationId: string }) => void) => () => void;
  onIncomingCall: (callback: (data: IncomingCallData) => void) => () => void;
  onCallEnded: (callback: (data: { conversationId: string; roomName: string }) => void) => () => void;
  onMessageDeleted: (callback: (data: { conversationId: string; messageId: string; deleteFor?: string }) => void) => () => void;
  onMessageReacted: (callback: (data: { conversationId: string; message: unknown }) => void) => () => void;
  onMessagePinned: (callback: (data: { conversationId: string; messageId: string; pinned: boolean; message: unknown }) => void) => () => void;
  onTyping: (callback: (data: { conversationId: string; userId: string; userName: string }) => void) => () => void;
  onMessagesRead: (callback: (data: { conversationId: string; userId: string; readAt: string }) => void) => () => void;
  onMessageDelivered: (callback: (data: MessageDeliveredData) => void) => () => void;
  onConversationDelivered: (callback: (data: ConversationDeliveredData) => void) => () => void;
  onConversationRemoved: (callback: (data: ConversationRemovedData) => void) => () => void;
  /** Fires after the socket reconnects (not on the first connect). The open conversation is already re-joined. */
  onReconnected: (callback: () => void) => () => void;
  onCallDismiss: (callback: (data: CallDismissData) => void) => () => void;
  emitTyping: (conversationId: string) => void;
  emitMessageRead: (conversationId: string) => void;
  syncOnlineUsers: (userIds: string[]) => void;
  onCallStart: (callback: (data: CallStartData) => void) => () => void;
  onCallDeclined: (callback: (data: { callId: string; conversationId: string }) => void) => () => void;
  onCallCancelled: (callback: (data: { callId: string; conversationId: string; reason?: string }) => void) => () => void;
  /** Bolna telephony delta — admin dashboard + scoped subscribers receive these. */
  onCallUpdate: (callback: (data: CallUpdateData) => void) => () => void;
  emitSubscribeCall: (scope: "candidate" | "job", id: string) => void;
  emitUnsubscribeCall: (scope: "candidate" | "job", id: string) => void;
  emitCallInitiate: (
    conversationId: string,
    callType: "audio" | "video",
    meta?: { calleeName?: string; callScope?: "direct" | "group"; groupName?: string; participantCount?: number },
    cb?: (res: CallAck) => void
  ) => void;
  emitCallAccept: (callId: string, cb?: (res: { success?: boolean; error?: string }) => void) => void;
  emitCallDecline: (callId: string) => void;
  emitCallEnd: (callId: string) => void;
  /** Low-level cancel. Prefer `cancelOutgoingCall`, which also handles the overlay and the call window. */
  emitCallCancel: (callId: string, reason?: "timeout") => void;
  /**
   * Open the call window NOW, inside the click handler that starts or accepts a call
   * (popup blockers reject window.open after an await). The window is pointed at the room
   * when `call:start` arrives and closed if the call is declined/cancelled/unanswered/failed.
   * Returns null when the browser blocked it — the room then opens in this tab instead.
   */
  prepareCallWindow: () => CallWindowHandle | null;
  /** Accept the current incoming call (opens the call window inside the gesture). */
  acceptIncomingCall: () => void;
  /** Decline the current incoming call. */
  declineIncomingCall: () => void;
  /** Short transient call notice ("This call has ended"). */
  callNotice: string | null;
  showCallNotice: (message: string) => void;
  clearCallNotice: () => void;
  /** Stops ringtone, clears incoming UI — same as modal Accept/Decline. Registered by GlobalIncomingCall. */
  dismissIncomingCall: () => void;
  /** @internal Registered by GlobalIncomingCall; do not use elsewhere. */
  registerIncomingCallDismiss: (fn: (() => void) | null) => void;
}

const ChatSocketContext = createContext<ChatSocketContextValue | null>(null);

function authUserId(user: { id?: string; _id?: unknown } | null | undefined): string {
  if (!user) return "";
  const rawId = user.id ?? user._id;
  if (rawId == null) return "";
  return String(rawId).trim();
}

const CALL_NOTICE_MS = 4500;
const ACCEPT_ACK_TIMEOUT_MS = 15_000;

/** Static placeholder shown in the call window until `call:start` navigates it. */
function paintCallWindowPlaceholder(win: Window) {
  try {
    win.document.title = "Connecting call…";
    const body = win.document.body;
    if (!body) return;
    body.style.cssText =
      "margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;" +
      "background:#0f1012;color:#e5e7eb;font:500 15px/1.5 system-ui,-apple-system,Segoe UI,sans-serif";
    body.textContent = "Connecting your call…";
  } catch {
    // Cross-origin or already navigated — nothing to paint.
  }
}

/** Listener-set subscribe helper; returns its unsubscribe. */
function subscribe<T>(set: Set<T>, cb: T): () => void {
  set.add(cb);
  return () => {
    set.delete(cb);
  };
}

export function ChatSocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const userId = authUserId(user as { id?: string; _id?: string } | null);

  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null);
  const [outgoingCall, setOutgoingCall] = useState<OutgoingCallData | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [callNotice, setCallNotice] = useState<string | null>(null);

  // Refs mirror state for socket handlers registered once per connection.
  const activeConvRef = useRef<string | null>(null);
  const incomingCallRef = useRef<IncomingCallData | null>(null);
  incomingCallRef.current = incomingCall;
  const outgoingCallRef = useRef<OutgoingCallData | null>(null);
  outgoingCallRef.current = outgoingCall;
  const socketRef = useRef<Socket | null>(null);
  const routerRef = useRef(router);
  routerRef.current = router;

  const newMsgListeners = useRef<Set<(msg: unknown) => void>>(new Set());
  const convUpdateListeners = useRef<Set<(data?: ConversationUpdatedData) => void>>(new Set());
  const convDeletedListeners = useRef<Set<(data: { conversationId: string }) => void>>(new Set());
  const incomingCallListeners = useRef<Set<(data: IncomingCallData) => void>>(new Set());
  const callEndedListeners = useRef<Set<(data: { conversationId: string; roomName: string }) => void>>(new Set());
  const messageDeletedListeners = useRef<Set<(data: { conversationId: string; messageId: string; deleteFor?: string }) => void>>(new Set());
  const messageReactedListeners = useRef<Set<(data: { conversationId: string; message: unknown }) => void>>(new Set());
  const messagePinnedListeners = useRef<Set<(data: { conversationId: string; messageId: string; pinned: boolean; message: unknown }) => void>>(new Set());
  const typingListeners = useRef<Set<(data: { conversationId: string; userId: string; userName: string }) => void>>(new Set());
  const readListeners = useRef<Set<(data: { conversationId: string; userId: string; readAt: string }) => void>>(new Set());
  const messageDeliveredListeners = useRef<Set<(data: MessageDeliveredData) => void>>(new Set());
  const conversationDeliveredListeners = useRef<Set<(data: ConversationDeliveredData) => void>>(new Set());
  const conversationRemovedListeners = useRef<Set<(data: ConversationRemovedData) => void>>(new Set());
  const reconnectedListeners = useRef<Set<() => void>>(new Set());
  const callDismissListeners = useRef<Set<(data: CallDismissData) => void>>(new Set());
  const dismissIncomingCallFnRef = useRef<(() => void) | null>(null);
  const callStartListeners = useRef<Set<(data: CallStartData) => void>>(new Set());
  const callDeclinedListeners = useRef<Set<(data: { callId: string; conversationId: string }) => void>>(new Set());
  const callCancelledListeners = useRef<Set<(data: { callId: string; conversationId: string; reason?: string }) => void>>(new Set());
  const callUpdateListeners = useRef<Set<(data: CallUpdateData) => void>>(new Set());
  const pendingAcceptCallIdRef = useRef<string | null>(null);
  const pendingInitiateCallIdRef = useRef<string | null>(null);
  /** Conversation whose call the caller cancelled before the initiate ack returned a callId. */
  const cancelBeforeAckConvRef = useRef<string | null>(null);
  /** Call ids this tab cancelled — a late `call:start` for one of them is ignored. */
  const cancelledCallIdsRef = useRef<Set<string>>(new BoundedSet<string>(100));
  /** Call window opened inside a click, waiting for `call:start`. */
  const pendingCallWindowRef = useRef<Window | null>(null);
  const callNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const registerIncomingCallDismiss = useCallback((fn: (() => void) | null) => {
    dismissIncomingCallFnRef.current = fn;
  }, []);

  const dismissIncomingCall = useCallback(() => {
    if (dismissIncomingCallFnRef.current) dismissIncomingCallFnRef.current();
    else setIncomingCall(null);
  }, []);

  const onNewMessage = useCallback((cb: (msg: unknown) => void) => subscribe(newMsgListeners.current, cb), []);
  const onConversationUpdated = useCallback(
    (cb: (data?: ConversationUpdatedData) => void) => subscribe(convUpdateListeners.current, cb),
    []
  );
  const onConversationDeleted = useCallback(
    (cb: (data: { conversationId: string }) => void) => subscribe(convDeletedListeners.current, cb),
    []
  );
  const onIncomingCall = useCallback((cb: (data: IncomingCallData) => void) => subscribe(incomingCallListeners.current, cb), []);
  const onMessageDeleted = useCallback(
    (cb: (data: { conversationId: string; messageId: string; deleteFor?: string }) => void) =>
      subscribe(messageDeletedListeners.current, cb),
    []
  );
  const onMessageReacted = useCallback(
    (cb: (data: { conversationId: string; message: unknown }) => void) => subscribe(messageReactedListeners.current, cb),
    []
  );
  const onMessagePinned = useCallback(
    (cb: (data: { conversationId: string; messageId: string; pinned: boolean; message: unknown }) => void) =>
      subscribe(messagePinnedListeners.current, cb),
    []
  );
  const onCallEnded = useCallback(
    (cb: (data: { conversationId: string; roomName: string }) => void) => subscribe(callEndedListeners.current, cb),
    []
  );
  const onTyping = useCallback(
    (cb: (data: { conversationId: string; userId: string; userName: string }) => void) => subscribe(typingListeners.current, cb),
    []
  );
  const onMessagesRead = useCallback(
    (cb: (data: { conversationId: string; userId: string; readAt: string }) => void) => subscribe(readListeners.current, cb),
    []
  );
  const onMessageDelivered = useCallback(
    (cb: (data: MessageDeliveredData) => void) => subscribe(messageDeliveredListeners.current, cb),
    []
  );
  const onConversationDelivered = useCallback(
    (cb: (data: ConversationDeliveredData) => void) => subscribe(conversationDeliveredListeners.current, cb),
    []
  );
  const onConversationRemoved = useCallback(
    (cb: (data: ConversationRemovedData) => void) => subscribe(conversationRemovedListeners.current, cb),
    []
  );
  const onReconnected = useCallback((cb: () => void) => subscribe(reconnectedListeners.current, cb), []);
  const onCallDismiss = useCallback((cb: (data: CallDismissData) => void) => subscribe(callDismissListeners.current, cb), []);
  const onCallStart = useCallback((cb: (data: CallStartData) => void) => subscribe(callStartListeners.current, cb), []);
  const onCallDeclined = useCallback(
    (cb: (data: { callId: string; conversationId: string }) => void) => subscribe(callDeclinedListeners.current, cb),
    []
  );
  const onCallCancelled = useCallback(
    (cb: (data: { callId: string; conversationId: string; reason?: string }) => void) =>
      subscribe(callCancelledListeners.current, cb),
    []
  );
  const onCallUpdate = useCallback((cb: (data: CallUpdateData) => void) => subscribe(callUpdateListeners.current, cb), []);

  const clearCallNotice = useCallback(() => {
    if (callNoticeTimerRef.current) clearTimeout(callNoticeTimerRef.current);
    callNoticeTimerRef.current = null;
    setCallNotice(null);
  }, []);

  const showCallNotice = useCallback((message: string) => {
    if (callNoticeTimerRef.current) clearTimeout(callNoticeTimerRef.current);
    setCallNotice(message);
    callNoticeTimerRef.current = setTimeout(() => {
      callNoticeTimerRef.current = null;
      setCallNotice(null);
    }, CALL_NOTICE_MS);
  }, []);

  useEffect(
    () => () => {
      if (callNoticeTimerRef.current) clearTimeout(callNoticeTimerRef.current);
    },
    []
  );

  // ─── Call window (popup opened inside the user gesture) ────────────────────
  const closePendingCallWindow = useCallback(() => {
    const win = pendingCallWindowRef.current;
    pendingCallWindowRef.current = null;
    if (win && !win.closed) {
      try {
        win.close();
      } catch {
        /* ignore */
      }
    }
  }, []);

  const prepareCallWindow = useCallback((): CallWindowHandle | null => {
    if (typeof window === "undefined") return null;
    closePendingCallWindow();
    let win: Window | null = null;
    try {
      // No "noopener": with it window.open always returns null, so a blocked popup is
      // indistinguishable from an opened one. The opener is severed by hand below.
      win = window.open("about:blank", "_blank");
    } catch {
      win = null;
    }
    if (!win) return null;
    try {
      win.opener = null;
    } catch {
      /* ignore */
    }
    paintCallWindowPlaceholder(win);
    pendingCallWindowRef.current = win;
    const opened = win;
    return {
      close: () => {
        if (pendingCallWindowRef.current === opened) closePendingCallWindow();
      },
    };
  }, [closePendingCallWindow]);

  /** Point the pending call window at the room; else try a new tab; else navigate this tab. */
  const openCallRoom = useCallback((data: CallStartData) => {
    if (typeof window === "undefined") return;
    const path = buildChatCallRoomPath(data);
    const pending = pendingCallWindowRef.current;
    pendingCallWindowRef.current = null;
    if (pending && !pending.closed) {
      try {
        pending.location.href = new URL(path, window.location.origin).toString();
        return;
      } catch {
        /* fall through */
      }
    }
    let win: Window | null = null;
    try {
      win = window.open(path, "_blank");
    } catch {
      win = null;
    }
    if (win) {
      try {
        win.opener = null;
      } catch {
        /* ignore */
      }
      return;
    }
    // Popup blocked (call:start arrives outside any user gesture) — join in this tab.
    routerRef.current.push(path);
  }, []);

  const emitSubscribeCall = useCallback(
    (scope: "candidate" | "job", id: string) => {
      socket?.emit("subscribe:call", { scope, id });
    },
    [socket]
  );

  const emitUnsubscribeCall = useCallback(
    (scope: "candidate" | "job", id: string) => {
      socket?.emit("unsubscribe:call", { scope, id });
    },
    [socket]
  );

  const clearOutgoingCall = useCallback(() => {
    closePendingCallWindow();
    setOutgoingCall(null);
  }, [closePendingCallWindow]);

  const emitCallInitiate = useCallback(
    (
      conversationId: string,
      callType: "audio" | "video",
      meta?: { calleeName?: string; callScope?: "direct" | "group"; groupName?: string; participantCount?: number },
      cb?: (res: CallAck) => void
    ) => {
      cancelBeforeAckConvRef.current = null;
      // Show the caller a "Calling…" overlay immediately; backend only emits call:start on accept.
      setOutgoingCall({
        conversationId,
        callType,
        calleeName: meta?.calleeName?.trim() || "",
        status: "calling",
        callScope: meta?.callScope,
        groupName: meta?.groupName,
        participantCount: meta?.participantCount,
      });
      const sock = socketRef.current;
      if (!sock || !sock.connected) {
        const res = { error: "You're offline — the call couldn't be placed." };
        setOutgoingCall((prev) =>
          prev && prev.conversationId === conversationId ? { ...prev, status: "failed", error: res.error } : prev
        );
        closePendingCallWindow();
        cb?.(res);
        return;
      }
      sock.emit("call:initiate", { conversationId, callType }, (res: CallAck) => {
        if (res?.callId && cancelBeforeAckConvRef.current === conversationId) {
          // Caller hit Cancel before we knew the callId — cancel it now so the callee stops ringing.
          cancelBeforeAckConvRef.current = null;
          cancelledCallIdsRef.current.add(res.callId);
          sock.emit("call:cancel", { callId: res.callId });
          cb?.(res);
          return;
        }
        if (res?.callId) {
          pendingInitiateCallIdRef.current = res.callId;
          setOutgoingCall((prev) => (prev && prev.conversationId === conversationId ? { ...prev, callId: res.callId } : prev));
        }
        if (res?.error || !res?.callId) {
          const error = res?.error || "The call couldn't be placed.";
          setOutgoingCall((prev) =>
            prev && prev.conversationId === conversationId && prev.status === "calling"
              ? { ...prev, status: "failed", error }
              : prev
          );
          closePendingCallWindow();
        }
        cb?.(res);
      });
    },
    [closePendingCallWindow]
  );

  const emitCallAccept = useCallback((callId: string, cb?: (res: { success?: boolean; error?: string }) => void) => {
    const sock = socketRef.current;
    if (!sock || !sock.connected) {
      cb?.({ error: "Not connected" });
      return;
    }
    pendingAcceptCallIdRef.current = callId;
    sock
      .timeout(ACCEPT_ACK_TIMEOUT_MS)
      .emit("call:accept", { callId }, (err: Error | null, res?: { success?: boolean; error?: string }) => {
        const result = err ? { error: "Call no longer available" } : res ?? {};
        if (result.error && pendingAcceptCallIdRef.current === callId) pendingAcceptCallIdRef.current = null;
        cb?.(result);
      });
  }, []);

  const emitCallDecline = useCallback(
    (callId: string) => {
      socket?.emit("call:decline", { callId });
    },
    [socket]
  );

  const emitCallEnd = useCallback(
    (callId: string) => {
      socket?.emit("call:end", { callId });
    },
    [socket]
  );

  const emitCallCancel = useCallback((callId: string, reason?: "timeout") => {
    if (!callId) return;
    cancelledCallIdsRef.current.add(callId);
    if (pendingInitiateCallIdRef.current === callId) pendingInitiateCallIdRef.current = null;
    socketRef.current?.emit("call:cancel", reason ? { callId, reason } : { callId });
  }, []);

  const cancelOutgoingCall = useCallback(
    (reason?: "timeout") => {
      const current = outgoingCallRef.current;
      if (!current) return;
      if (current.callId) emitCallCancel(current.callId, reason);
      else cancelBeforeAckConvRef.current = current.conversationId;
      pendingInitiateCallIdRef.current = null;
      closePendingCallWindow();
      if (reason === "timeout") {
        setOutgoingCall((prev) => (prev && prev.status === "calling" ? { ...prev, status: "no_answer" } : prev));
      } else {
        setOutgoingCall(null);
      }
    },
    [emitCallCancel, closePendingCallWindow]
  );

  const acceptIncomingCall = useCallback(() => {
    const call = incomingCallRef.current;
    if (!call) return;
    if (call.callSource === "support_camera") {
      const t = call.supportInviteToken?.trim();
      dismissIncomingCall();
      if (t) window.open(`/support/camera/join/${encodeURIComponent(t)}`, "_blank", "noopener");
      return;
    }
    // Must run synchronously in the click — the popup is only allowed inside the gesture.
    const handle = prepareCallWindow();
    emitCallAccept(call.callId, (res) => {
      if (res?.error) {
        handle?.close();
        showCallNotice("This call has ended");
      }
    });
    dismissIncomingCall();
  }, [dismissIncomingCall, prepareCallWindow, emitCallAccept, showCallNotice]);

  const declineIncomingCall = useCallback(() => {
    const call = incomingCallRef.current;
    dismissIncomingCall();
    if (!call || call.callSource === "support_camera") return;
    if (call.callId) socketRef.current?.emit("call:decline", { callId: call.callId });
  }, [dismissIncomingCall]);

  const joinConversation = useCallback(
    (conversationId: string) => {
      const id = String(conversationId || "").trim();
      if (!id) return;
      activeConvRef.current = id;
      setActiveConversationId(id);
      socket?.emit("join_conversation", { conversationId: id });
    },
    [socket]
  );

  const leaveConversation = useCallback(
    (conversationId: string) => {
      const id = String(conversationId || "").trim();
      if (id) socket?.emit("leave_conversation", { conversationId: id });
      if (id && activeConvRef.current === id) activeConvRef.current = null;
      setActiveConversationId((prev) => (prev && id && prev === id ? null : prev));
    },
    [socket]
  );

  const emitTyping = useCallback(
    (conversationId: string) => {
      socket?.emit("typing", { conversationId });
    },
    [socket]
  );

  const emitMessageRead = useCallback(
    (conversationId: string) => {
      socket?.emit("message_read", { conversationId });
    },
    [socket]
  );

  const syncOnlineUsers = useCallback(
    (userIds: string[]) => {
      if (!socket || !connected || userIds.length === 0) return;
      const normalized = Array.from(
        new Set(
          userIds
            .map((id) => String(id || "").trim())
            .filter(Boolean)
        )
      );
      if (normalized.length === 0) return;
      socket.emit("get_online_users", { userIds: normalized }, (response?: { onlineUsers?: Record<string, boolean> }) => {
        const snapshot = response?.onlineUsers || {};
        setOnlineUsers((prev) => {
          const next = new Set(prev);
          normalized.forEach((id) => {
            if (snapshot[id]) next.add(id);
            else next.delete(id);
          });
          return next;
        });
      });
    },
    [socket, connected]
  );

  // Socket handlers reach these through a ref so the socket effect only depends on userId.
  const callHelpersRef = useRef({ openCallRoom, closePendingCallWindow, dismissIncomingCall });
  callHelpersRef.current = { openCallRoom, closePendingCallWindow, dismissIncomingCall };

  useEffect(() => {
    const url = getSocketUrl();
    if (!url) return;

    if (!userId) {
      setIncomingCall(null);
      setSocket((prev) => {
        prev?.disconnect();
        return null;
      });
      socketRef.current = null;
      setConnected(false);
      setOnlineUsers(new Set());
      return;
    }

    let cancelled = false;
    let hasConnected = false;
    let authMode: SocketAuthMode = "cookie";
    let retryAttempt = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    /**
     * Auth: the httpOnly accessToken cookie rides the handshake (withCredentials). If the server
     * rejects it we fall back to a bearer token, fetched fresh on every (re)connect attempt — the
     * old code cached one per user and it expired after 30 min.
     */
    const sock: Socket = io(url, {
      withCredentials: true,
      path: "/socket.io",
      auth: (cb: (data: object) => void) => {
        if (authMode !== "bearer") {
          cb({});
          return;
        }
        apiClient
          .get<{ token?: string }>("/chats/socket-token")
          .then(({ data }) => cb(data?.token ? { token: data.token } : {}))
          .catch(() => {
            // Cookie-only session (endpoint 401s) — the axios interceptor refreshed the cookie
            // on the way, so the cookie handshake is the right next try.
            authMode = "cookie";
            cb({});
          });
      },
    });
    socketRef.current = sock;

    /**
     * The server rejected the handshake (middleware error) or kicked the socket — socket.io will
     * not retry either by itself. Retry with capped exponential backoff so realtime never stays
     * dead after a token expiry, and never spins.
     */
    const scheduleManualReconnect = () => {
      if (cancelled || retryTimer) return;
      const delay = reconnectBackoffMs(retryAttempt);
      retryAttempt += 1;
      retryTimer = setTimeout(() => {
        retryTimer = null;
        if (!cancelled && !sock.connected) sock.connect();
      }, delay);
    };

    sock.on("connect", () => {
      retryAttempt = 0;
      setConnected(true);
      const plan = planOnConnect({ hasConnectedBefore: hasConnected, activeConversationId: activeConvRef.current });
      hasConnected = true;
      // Rooms do not survive a new socket id; re-join the open pane so thread events and
      // backend active-viewer suppression keep working after a reconnect.
      if (plan.rejoinConversationId) sock.emit("join_conversation", { conversationId: plan.rejoinConversationId });
      if (plan.notifyReconnected) reconnectedListeners.current.forEach((cb) => cb());
    });

    sock.on("connect_error", (err: Error) => {
      setConnected(false);
      // Transport errors keep `active` true and the manager backs off on its own.
      if (sock.active) return;
      if (isSocketAuthError(err?.message)) authMode = nextAuthMode(authMode);
      scheduleManualReconnect();
    });

    sock.on("disconnect", (reason: Socket.DisconnectReason) => {
      setConnected(false);
      if (reason === "io server disconnect") scheduleManualReconnect();
    });

    sock.on("new_message", (msg: unknown) => {
      const typedMsg = msg as {
        id?: string;
        _id?: string;
        conversation?: string;
        sender?: { id?: string; _id?: string; name?: string };
        content?: string;
        type?: string;
        suppressInAppNotify?: boolean;
      };
      const messageId = String(typedMsg?.id || typedMsg?._id || "").trim();
      const conversationId = String(typedMsg?.conversation ?? "").trim();
      if (typeof window !== "undefined") {
        const osGranted = "Notification" in window && Notification.permission === "granted";
        const decision = decideChatMessageNotify({
          selfId: userId,
          senderId: authUserId(typedMsg?.sender),
          conversationId,
          suppressInAppNotify: typedMsg?.suppressInAppNotify,
          loc: { pathname: window.location.pathname, activeConversationId: activeConvRef.current },
          visibility: document.visibilityState,
          osPermissionGranted: osGranted,
        });
        if (decision.action === "suppress") {
          const key = chatToastDedupeKey({ messageId });
          if (key) sharedChatClaims.add(key);
        } else if (
          decision.action === "notify" &&
          decision.os &&
          messageId &&
          claimChatToastKeys(sharedChatClaims, { messageId, conversationId })
        ) {
          const senderName = typedMsg?.sender?.name?.trim() || "New message";
          const body =
            typedMsg?.type === "audio"
              ? "Sent you a voice note"
              : typedMsg?.type === "image"
                ? "Sent you an image"
                : typedMsg?.type === "file"
                  ? "Sent you a file"
                  : (typedMsg?.content || "Sent you a new message").trim();
          try {
            const notification = new Notification(senderName, { body, tag: `chat-${messageId}` });
            notification.onclick = () => {
              window.focus();
              notification.close();
              if (conversationId) {
                routerRef.current.push(`/communication/chats?conv=${encodeURIComponent(conversationId)}`);
              }
            };
          } catch {
            // Some browsers (Android Chrome) only allow notifications from a service worker.
          }
        }
      }
      newMsgListeners.current.forEach((cb) => cb(msg));
    });

    sock.on("conversation_updated", (data?: ConversationUpdatedData) => {
      convUpdateListeners.current.forEach((cb) => cb(data));
    });

    sock.on("conversation_deleted", (data: { conversationId: string }) => {
      convDeletedListeners.current.forEach((cb) => cb(data));
    });

    sock.on("conversation_removed", (data: ConversationRemovedData) => {
      conversationRemovedListeners.current.forEach((cb) => cb(data));
    });

    sock.on("message_delivered", (data: MessageDeliveredData) => {
      messageDeliveredListeners.current.forEach((cb) => cb(data));
    });

    sock.on("conversation_delivered", (data: ConversationDeliveredData) => {
      conversationDeliveredListeners.current.forEach((cb) => cb(data));
    });

    sock.on("incoming_call", (data: IncomingCallData) => {
      incomingCallListeners.current.forEach((cb) => cb(data));
    });

    sock.on("call_ended", (data: { conversationId: string; roomName: string }) => {
      callEndedListeners.current.forEach((cb) => cb(data));
    });

    sock.on(
      "call:incoming",
      (data: {
        callId: string;
        conversationId: string;
        callType: "audio" | "video";
        callScope?: "direct" | "group";
        conversationType?: "direct" | "group";
        groupName?: string;
        roomName?: string;
        participantIds?: string[];
        participantCount?: number;
        caller: { id: string; name: string };
      }) => {
        const scope = data.callScope ?? data.conversationType;
        const callData: IncomingCallData = {
          callId: data.callId,
          conversationId: data.conversationId,
          callType: data.callType,
          caller: data.caller,
          callSource: "chat",
          callScope: scope,
          conversationType: data.conversationType ?? scope,
          groupName: data.groupName,
          roomName: data.roomName,
          participantIds: data.participantIds,
          participantCount: data.participantCount,
        };
        incomingCallListeners.current.forEach((cb) => cb(callData));
      }
    );

    sock.on("call:start", (data: CallStartData) => {
      // This tab cancelled the call; a racing accept must not open a room for it.
      if (cancelledCallIdsRef.current.has(data.callId)) return;
      callStartListeners.current.forEach((cb) => cb(data));
      if (
        (pendingAcceptCallIdRef.current && pendingAcceptCallIdRef.current === data.callId) ||
        (pendingInitiateCallIdRef.current && pendingInitiateCallIdRef.current === data.callId)
      ) {
        pendingAcceptCallIdRef.current = null;
        pendingInitiateCallIdRef.current = null;
        setOutgoingCall(null);
        callHelpersRef.current.openCallRoom(data);
      }
    });

    sock.on("call:declined", (data: { callId: string; conversationId: string }) => {
      callDeclinedListeners.current.forEach((cb) => cb(data));
      const out = outgoingCallRef.current;
      // One member declining a group call does not end it for the caller — call:dismiss does.
      if (!out || out.callScope === "group" || out.status !== "calling") return;
      if (out.callId !== data.callId && out.conversationId !== data.conversationId) return;
      if (pendingInitiateCallIdRef.current === data.callId) pendingInitiateCallIdRef.current = null;
      callHelpersRef.current.closePendingCallWindow();
      setOutgoingCall((prev) => (prev && prev.status === "calling" ? { ...prev, status: "declined" } : prev));
    });

    sock.on("call:cancelled", (data: { callId: string; conversationId: string; reason?: string }) => {
      callCancelledListeners.current.forEach((cb) => cb(data));
      // Callee: the caller hung up (or the call timed out) — stop ringing.
      if (incomingCallRef.current?.callId === data.callId) callHelpersRef.current.dismissIncomingCall();
      if (pendingAcceptCallIdRef.current === data.callId) {
        pendingAcceptCallIdRef.current = null;
        callHelpersRef.current.closePendingCallWindow();
      }
      // Caller (another tab of the caller cancelled, or a server-side timeout).
      const out = outgoingCallRef.current;
      if (
        out &&
        out.status === "calling" &&
        (out.callId === data.callId || (!out.callId && out.conversationId === data.conversationId))
      ) {
        if (pendingInitiateCallIdRef.current === data.callId) pendingInitiateCallIdRef.current = null;
        callHelpersRef.current.closePendingCallWindow();
        const status = outgoingStatusFromCancelled(data.reason);
        setOutgoingCall((prev) => (prev && prev.status === "calling" ? { ...prev, status } : prev));
      }
    });

    sock.on("call:dismiss", (data: CallDismissData) => {
      if (!data?.callId) return;
      callDismissListeners.current.forEach((cb) => cb(data));
      if (incomingCallRef.current?.callId === data.callId) callHelpersRef.current.dismissIncomingCall();
      if (pendingAcceptCallIdRef.current === data.callId && shouldClosePendingCallWindow(data.reason)) {
        pendingAcceptCallIdRef.current = null;
        callHelpersRef.current.closePendingCallWindow();
      }
      const out = outgoingCallRef.current;
      if (!out || out.callId !== data.callId || out.status !== "calling") return;
      const next = outgoingStatusFromDismiss(data.reason);
      if (next === "keep") return;
      if (pendingInitiateCallIdRef.current === data.callId) pendingInitiateCallIdRef.current = null;
      callHelpersRef.current.closePendingCallWindow();
      if (next === "close") setOutgoingCall(null);
      else if (isTerminalOutgoingStatus(next)) {
        setOutgoingCall((prev) => (prev && prev.callId === data.callId ? { ...prev, status: next } : prev));
      }
    });

    // Bolna telephony — admin dashboard + scoped subscribers see deltas live.
    sock.on("call:update", (data: CallUpdateData) => {
      callUpdateListeners.current.forEach((cb) => cb(data));
    });

    sock.on("message_deleted", (data: { conversationId: string; messageId: string; deleteFor?: string }) => {
      messageDeletedListeners.current.forEach((cb) => cb(data));
    });

    sock.on("message_reacted", (data: { conversationId: string; message: unknown }) => {
      messageReactedListeners.current.forEach((cb) => cb(data));
    });

    sock.on("message_pinned", (data: { conversationId: string; messageId: string; pinned: boolean; message: unknown }) => {
      messagePinnedListeners.current.forEach((cb) => cb(data));
    });

    sock.on("user_typing", (data: { conversationId: string; userId: string; userName: string }) => {
      typingListeners.current.forEach((cb) => cb(data));
    });

    sock.on("messages_read", (data: { conversationId: string; userId: string; readAt: string }) => {
      readListeners.current.forEach((cb) => cb(data));
    });

    sock.on("user_online", ({ userId: onlineId }: { userId: string }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.add(onlineId);
        return next;
      });
    });

    sock.on("user_offline", ({ userId: offlineId }: { userId: string }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.delete(offlineId);
        return next;
      });
    });

    setSocket(sock);

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      sock.disconnect();
      if (socketRef.current === sock) socketRef.current = null;
      setSocket(null);
      setConnected(false);
      sharedChatClaims.clear();
    };
  }, [userId]);

  const value: ChatSocketContextValue = {
    socket,
    connected,
    onlineUsers,
    incomingCall,
    setIncomingCall,
    outgoingCall,
    clearOutgoingCall,
    cancelOutgoingCall,
    joinConversation,
    leaveConversation,
    activeConversationId,
    onNewMessage,
    onConversationUpdated,
    onConversationDeleted,
    onIncomingCall,
    onCallEnded,
    onMessageDeleted,
    onMessageReacted,
    onMessagePinned,
    onTyping,
    onMessagesRead,
    onMessageDelivered,
    onConversationDelivered,
    onConversationRemoved,
    onReconnected,
    onCallDismiss,
    emitTyping,
    emitMessageRead,
    syncOnlineUsers,
    onCallStart,
    onCallDeclined,
    onCallCancelled,
    onCallUpdate,
    emitSubscribeCall,
    emitUnsubscribeCall,
    emitCallInitiate,
    emitCallAccept,
    emitCallDecline,
    emitCallEnd,
    emitCallCancel,
    prepareCallWindow,
    acceptIncomingCall,
    declineIncomingCall,
    callNotice,
    showCallNotice,
    clearCallNotice,
    dismissIncomingCall,
    registerIncomingCallDismiss,
  };

  return (
    <ChatSocketContext.Provider value={value}>
      {children}
      <IncomingCallBar />
      <GlobalIncomingCall />
      <GlobalOutgoingCall />
      <CallNoticeToast />
    </ChatSocketContext.Provider>
  );
}

export function useChatSocket() {
  const ctx = useContext(ChatSocketContext);
  if (!ctx) throw new Error("useChatSocket must be used within ChatSocketProvider");
  return ctx;
}
