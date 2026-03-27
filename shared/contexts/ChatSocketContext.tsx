"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { apiClient } from "@/shared/lib/api/client";
import { useAuth } from "@/shared/contexts/auth-context";
import { GlobalIncomingCall, IncomingCallBar } from "@/shared/components/GlobalIncomingCall";

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
  roomName: string;
  callType: "audio" | "video";
  caller: { id: string; name: string; email?: string };
  /** From server when call is in a group conversation */
  conversationType?: "direct" | "group";
  /** Present for group calls; display as secondary context under caller */
  groupName?: string;
}

interface ChatSocketContextValue {
  socket: Socket | null;
  connected: boolean;
  onlineUsers: Set<string>;
  /** Set when an incoming call is received (callee only). Cleared on accept/decline/timeout. */
  incomingCall: IncomingCallData | null;
  setIncomingCall: (data: IncomingCallData | null) => void;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  onNewMessage: (callback: (msg: unknown) => void) => () => void;
  onConversationUpdated: (callback: () => void) => () => void;
  onConversationDeleted: (callback: (data: { conversationId: string }) => void) => () => void;
  onIncomingCall: (callback: (data: IncomingCallData) => void) => () => void;
  onCallEnded: (callback: (data: { conversationId: string; roomName: string }) => void) => () => void;
  onMessageDeleted: (callback: (data: { conversationId: string; messageId: string; deleteFor?: string }) => void) => () => void;
  onMessageReacted: (callback: (data: { conversationId: string; message: unknown }) => void) => () => void;
  onTyping: (callback: (data: { conversationId: string; userId: string; userName: string }) => void) => () => void;
  onMessagesRead: (callback: (data: { conversationId: string; userId: string; readAt: string }) => void) => () => void;
  emitTyping: (conversationId: string) => void;
  emitMessageRead: (conversationId: string) => void;
  /** Stops ringtone, clears incoming UI — same as modal Accept/Decline. Registered by GlobalIncomingCall. */
  dismissIncomingCall: () => void;
  /** @internal Registered by GlobalIncomingCall; do not use elsewhere. */
  registerIncomingCallDismiss: (fn: (() => void) | null) => void;
}

const ChatSocketContext = createContext<ChatSocketContextValue | null>(null);

function authUserId(user: { id?: string; _id?: string } | null | undefined): string {
  if (!user) return "";
  const id = user.id ?? (typeof user._id === "string" ? user._id : (user._id as { toString?: () => string })?.toString?.());
  return id ? String(id).trim() : "";
}

export function ChatSocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = authUserId(user as { id?: string; _id?: string } | null);

  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null);

  const newMsgListeners = useRef<Set<(msg: unknown) => void>>(new Set());
  const convUpdateListeners = useRef<Set<() => void>>(new Set());
  const convDeletedListeners = useRef<Set<(data: { conversationId: string }) => void>>(new Set());
  const incomingCallListeners = useRef<Set<(data: IncomingCallData) => void>>(new Set());
  const callEndedListeners = useRef<Set<(data: { conversationId: string; roomName: string }) => void>>(new Set());
  const messageDeletedListeners = useRef<Set<(data: { conversationId: string; messageId: string; deleteFor?: string }) => void>>(new Set());
  const messageReactedListeners = useRef<Set<(data: { conversationId: string; message: unknown }) => void>>(new Set());
  const typingListeners = useRef<Set<(data: { conversationId: string; userId: string; userName: string }) => void>>(new Set());
  const readListeners = useRef<Set<(data: { conversationId: string; userId: string; readAt: string }) => void>>(new Set());
  const dismissIncomingCallFnRef = useRef<(() => void) | null>(null);

  const registerIncomingCallDismiss = useCallback((fn: (() => void) | null) => {
    dismissIncomingCallFnRef.current = fn;
  }, []);

  const dismissIncomingCall = useCallback(() => {
    dismissIncomingCallFnRef.current?.();
  }, []);

  const onNewMessage = useCallback((cb: (msg: unknown) => void) => {
    newMsgListeners.current.add(cb);
    return () => { newMsgListeners.current.delete(cb); };
  }, []);

  const onConversationUpdated = useCallback((cb: () => void) => {
    convUpdateListeners.current.add(cb);
    return () => { convUpdateListeners.current.delete(cb); };
  }, []);

  const onConversationDeleted = useCallback((cb: (data: { conversationId: string }) => void) => {
    convDeletedListeners.current.add(cb);
    return () => { convDeletedListeners.current.delete(cb); };
  }, []);

  const onIncomingCall = useCallback((cb: (data: IncomingCallData) => void) => {
    incomingCallListeners.current.add(cb);
    return () => { incomingCallListeners.current.delete(cb); };
  }, []);

  const onMessageDeleted = useCallback((cb: (data: { conversationId: string; messageId: string; deleteFor?: string }) => void) => {
    messageDeletedListeners.current.add(cb);
    return () => { messageDeletedListeners.current.delete(cb); };
  }, []);

  const onMessageReacted = useCallback((cb: (data: { conversationId: string; message: unknown }) => void) => {
    messageReactedListeners.current.add(cb);
    return () => { messageReactedListeners.current.delete(cb); };
  }, []);

  const onCallEnded = useCallback((cb: (data: { conversationId: string; roomName: string }) => void) => {
    callEndedListeners.current.add(cb);
    return () => { callEndedListeners.current.delete(cb); };
  }, []);

  const onTyping = useCallback((cb: (data: { conversationId: string; userId: string; userName: string }) => void) => {
    typingListeners.current.add(cb);
    return () => { typingListeners.current.delete(cb); };
  }, []);

  const onMessagesRead = useCallback((cb: (data: { conversationId: string; userId: string; readAt: string }) => void) => {
    readListeners.current.add(cb);
    return () => { readListeners.current.delete(cb); };
  }, []);

  const joinConversation = useCallback(
    (conversationId: string) => {
      socket?.emit("join_conversation", { conversationId });
    },
    [socket]
  );

  const leaveConversation = useCallback(
    (conversationId: string) => {
      socket?.emit("leave_conversation", { conversationId });
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

  useEffect(() => {
    const url = getSocketUrl();
    if (!url) return;

    if (!userId) {
      setIncomingCall(null);
      setSocket((prev) => {
        prev?.disconnect();
        return null;
      });
      setConnected(false);
      setOnlineUsers(new Set());
      return;
    }

    let cancelled = false;
    let sock: Socket | null = null;

    (async () => {
      try {
        const { data } = await apiClient.get<{ token: string }>("/chats/socket-token");
        if (cancelled) return;
        const token = data?.token;
        if (!token) return;

        sock = io(url, {
          auth: { token },
          withCredentials: true,
          path: "/socket.io",
        });

        sock.on("connect", () => setConnected(true));
        sock.on("disconnect", () => setConnected(false));

        sock.on("new_message", (msg: unknown) => {
          newMsgListeners.current.forEach((cb) => cb(msg));
        });

        sock.on("conversation_updated", () => {
          convUpdateListeners.current.forEach((cb) => cb());
        });

        sock.on("conversation_deleted", (data: { conversationId: string }) => {
          convDeletedListeners.current.forEach((cb) => cb(data));
        });

        sock.on("incoming_call", (data: IncomingCallData) => {
          incomingCallListeners.current.forEach((cb) => cb(data));
        });

        sock.on("call_ended", (data: { conversationId: string; roomName: string }) => {
          callEndedListeners.current.forEach((cb) => cb(data));
        });

        sock.on("message_deleted", (data: { conversationId: string; messageId: string; deleteFor?: string }) => {
          messageDeletedListeners.current.forEach((cb) => cb(data));
        });

        sock.on("message_reacted", (data: { conversationId: string; message: unknown }) => {
          messageReactedListeners.current.forEach((cb) => cb(data));
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

        if (cancelled) {
          sock.disconnect();
          return;
        }
        setSocket(sock);
      } catch {
        // Not authenticated or token fetch failed
      }
    })();

    return () => {
      cancelled = true;
      sock?.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, [userId]);

  const value: ChatSocketContextValue = {
    socket,
    connected,
    onlineUsers,
    incomingCall,
    setIncomingCall,
    joinConversation,
    leaveConversation,
    onNewMessage,
    onConversationUpdated,
    onConversationDeleted,
    onIncomingCall,
    onCallEnded,
    onMessageDeleted,
    onMessageReacted,
    onTyping,
    onMessagesRead,
    emitTyping,
    emitMessageRead,
    dismissIncomingCall,
    registerIncomingCallDismiss,
  };

  return (
    <ChatSocketContext.Provider value={value}>
      {children}
      <IncomingCallBar />
      <GlobalIncomingCall />
    </ChatSocketContext.Provider>
  );
}

export function useChatSocket() {
  const ctx = useContext(ChatSocketContext);
  if (!ctx) throw new Error("useChatSocket must be used within ChatSocketProvider");
  return ctx;
}
