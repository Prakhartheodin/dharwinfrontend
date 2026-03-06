"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { apiClient } from "@/shared/lib/api/client";

function getSocketUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
  if (apiUrl) {
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
  conversationId: string;
  callId: string;
  roomName: string;
  callType: "audio" | "video";
  caller: { id: string; name: string; email?: string };
}

interface ChatSocketContextValue {
  socket: Socket | null;
  connected: boolean;
  onlineUsers: Set<string>;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  onNewMessage: (callback: (msg: unknown) => void) => () => void;
  onConversationUpdated: (callback: () => void) => () => void;
  onIncomingCall: (callback: (data: IncomingCallData) => void) => () => void;
  onCallEnded: (callback: (data: { conversationId: string; roomName: string }) => void) => () => void;
  onMessageDeleted: (callback: (data: { conversationId: string; messageId: string; deleteFor?: string }) => void) => () => void;
  onMessageReacted: (callback: (data: { conversationId: string; message: unknown }) => void) => () => void;
  onTyping: (callback: (data: { conversationId: string; userId: string; userName: string }) => void) => () => void;
  onMessagesRead: (callback: (data: { conversationId: string; userId: string; readAt: string }) => void) => () => void;
  emitTyping: (conversationId: string) => void;
  emitMessageRead: (conversationId: string) => void;
}

const ChatSocketContext = createContext<ChatSocketContextValue | null>(null);

export function ChatSocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  const newMsgListeners = useRef<Set<(msg: unknown) => void>>(new Set());
  const convUpdateListeners = useRef<Set<() => void>>(new Set());
  const incomingCallListeners = useRef<Set<(data: IncomingCallData) => void>>(new Set());
  const callEndedListeners = useRef<Set<(data: { conversationId: string; roomName: string }) => void>>(new Set());
  const messageDeletedListeners = useRef<Set<(data: { conversationId: string; messageId: string; deleteFor?: string }) => void>>(new Set());
  const messageReactedListeners = useRef<Set<(data: { conversationId: string; message: unknown }) => void>>(new Set());
  const typingListeners = useRef<Set<(data: { conversationId: string; userId: string; userName: string }) => void>>(new Set());
  const readListeners = useRef<Set<(data: { conversationId: string; userId: string; readAt: string }) => void>>(new Set());

  const onNewMessage = useCallback((cb: (msg: unknown) => void) => {
    newMsgListeners.current.add(cb);
    return () => { newMsgListeners.current.delete(cb); };
  }, []);

  const onConversationUpdated = useCallback((cb: () => void) => {
    convUpdateListeners.current.add(cb);
    return () => { convUpdateListeners.current.delete(cb); };
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

    let sock: Socket | null = null;

    async function connect() {
      try {
        const { data } = await apiClient.get<{ token: string }>("/chats/socket-token");
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

        sock.on("user_online", ({ userId }: { userId: string }) => {
          setOnlineUsers((prev) => {
            const next = new Set(prev);
            next.add(userId);
            return next;
          });
        });

        sock.on("user_offline", ({ userId }: { userId: string }) => {
          setOnlineUsers((prev) => {
            const next = new Set(prev);
            next.delete(userId);
            return next;
          });
        });

        setSocket(sock);
      } catch {
        // Not authenticated or token fetch failed
      }
    }

    connect();

    return () => {
      sock?.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, []);

  const value: ChatSocketContextValue = {
    socket,
    connected,
    onlineUsers,
    joinConversation,
    leaveConversation,
    onNewMessage,
    onConversationUpdated,
    onIncomingCall,
    onCallEnded,
    onMessageDeleted,
    onMessageReacted,
    onTyping,
    onMessagesRead,
    emitTyping,
    emitMessageRead,
  };

  return (
    <ChatSocketContext.Provider value={value}>{children}</ChatSocketContext.Provider>
  );
}

export function useChatSocket() {
  const ctx = useContext(ChatSocketContext);
  if (!ctx) throw new Error("useChatSocket must be used within ChatSocketProvider");
  return ctx;
}
