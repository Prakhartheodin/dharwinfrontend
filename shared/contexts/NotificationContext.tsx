"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "@/shared/contexts/auth-context";
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  type Notification,
} from "@/shared/lib/api/notifications";
import { apiClient } from "@/shared/lib/api/client";
import { resolveNotificationRoute } from "@/shared/lib/notificationRoutes";

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  isConnected: boolean;
  error: string | null;
  latestNotification: Notification | null;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  /** Resolve a route for any notification — uses stored link, then central type→route map. */
  resolveRoute: (n: Notification | null | undefined) => string;
  /** Mark notification read (best-effort) and return its destination route. Caller navigates. */
  openNotification: (n: Notification) => Promise<string>;
}

const NotificationContext = createContext<NotificationContextValue>({
  notifications: [],
  unreadCount: 0,
  isConnected: false,
  error: null,
  latestNotification: null,
  markRead: async () => {},
  markAllRead: async () => {},
  resolveRoute: () => "/notifications",
  openNotification: async () => "/notifications",
});

export function useNotificationContext() {
  return useContext(NotificationContext);
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latestNotification, setLatestNotification] = useState<Notification | null>(null);

  const mountedRef = useRef(true);
  const retriesRef = useRef(0);
  const consecutiveFailuresRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const markRead = useCallback(async (id: string) => {
    try {
      await markAsRead(id);
      setNotifications((prev) => prev.map((n) => n._id === id ? { ...n, read: true } : n));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (e) {
      console.warn("markRead failed:", e);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (e) {
      console.warn("markAllRead failed:", e);
    }
  }, []);

  const resolveRoute = useCallback(
    (n: Notification | null | undefined) => resolveNotificationRoute(n),
    []
  );

  const openNotification = useCallback(
    async (n: Notification) => {
      const route = resolveNotificationRoute(n);
      // Mark read in background; navigation should not wait on the network.
      if (!n.read && n._id) {
        markRead(n._id).catch(() => {});
      }
      return route;
    },
    [markRead]
  );

  useEffect(() => {
    if (!user?.id) {
      setNotifications([]);
      setUnreadCount(0);
      setIsConnected(false);
      setError(null);
      return;
    }

    Promise.all([getNotifications({ limit: 50 }), getUnreadCount()])
      .then(([list, count]) => {
        if (!mountedRef.current) return;
        setNotifications(list.results || []);
        setUnreadCount(count);
      })
      .catch(() => {});

    const controller = new AbortController();
    retriesRef.current = 0;
    consecutiveFailuresRef.current = 0;

    const baseURL = apiClient.defaults.baseURL || "/api/v1";
    const url = `${baseURL}/notifications/sse`;

    function scheduleReconnect() {
      if (controller.signal.aborted || !mountedRef.current) return;
      setIsConnected(false);
      consecutiveFailuresRef.current += 1;
      if (consecutiveFailuresRef.current >= 5) {
        setError("Notifications disconnected. Reconnecting…");
      }
      const delay = Math.min(1000 * 2 ** retriesRef.current, 30000);
      retriesRef.current += 1;
      setTimeout(openStream, delay);
    }

    function openStream() {
      if (controller.signal.aborted || !mountedRef.current) return;
      fetch(url, { credentials: "include", signal: controller.signal })
        .then((res) => {
          if (!res.ok || !res.body) { scheduleReconnect(); return; }
          if (!mountedRef.current) return;
          retriesRef.current = 0;
          consecutiveFailuresRef.current = 0;
          setIsConnected(true);
          setError(null);

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          function read(): Promise<void> {
            return reader.read().then(({ done, value }) => {
              if (done) { scheduleReconnect(); return; }
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n\n");
              buffer = lines.pop() || "";
              for (const chunk of lines) {
                if (!chunk.startsWith("data: ")) continue;
                try {
                  const payload = JSON.parse(chunk.slice(6));
                  if (payload.type === "unread_count") {
                    setUnreadCount(payload.count);
                  } else if (payload.type === "notification") {
                    const n = payload.notification as Notification;
                    // Dedupe: server emits both `notification` and `unread_count`
                    // and reconnects can replay; prefer the authoritative count
                    // event for the badge instead of incrementing here.
                    setNotifications((prev) => {
                      if (prev.some((p) => p._id === n._id)) return prev;
                      return [n, ...prev].slice(0, 50);
                    });
                    setLatestNotification(n);
                  }
                } catch (_) {}
              }
              return read();
            });
          }
          return read();
        })
        .catch((err) => {
          if (err?.name === "AbortError") return;
          scheduleReconnect();
        });
    }

    openStream();

    return () => {
      controller.abort();
      setIsConnected(false);
    };
  }, [user?.id]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isConnected,
        error,
        latestNotification,
        markRead,
        markAllRead,
        resolveRoute,
        openNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
