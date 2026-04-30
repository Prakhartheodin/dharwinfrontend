"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/shared/contexts/auth-context";
import { useChatSocket } from "@/shared/contexts/ChatSocketContext";
import { openNotificationStream } from "@/shared/lib/api/notifications";
import { notifTypeToColor, notifTypeToIcon } from "@/shared/lib/notification-utils";

type ToastKind = "chat" | "system";

interface AppToast {
  id: string;
  kind: ToastKind;
  title: string;
  body: string;
  link?: string;
  icon: string;
  color: string;
  createdAt: number;
}

const CHAT_TTL = 5000;
const SYSTEM_TTL = 8000;
const MAX_TOASTS = 4;
const TICK_MS = 80;

function authUserId(user: { id?: string; _id?: string } | null | undefined): string {
  if (!user) return "";
  const id = user.id ?? (typeof user._id === "string" ? user._id : "");
  return id ? String(id).trim() : "";
}

const colorMap: Record<string, string> = {
  primary:   "bg-primary/10 text-primary",
  success:   "bg-success/10 text-success",
  secondary: "bg-secondary/10 text-secondary",
  warning:   "bg-warning/10 text-warning",
  pinkmain:  "bg-pinkmain/10 text-pinkmain",
  danger:    "bg-danger/10 text-danger",
};
const progressColorMap: Record<string, string> = {
  primary:   "bg-primary",
  success:   "bg-success",
  secondary: "bg-secondary",
  warning:   "bg-warning",
  pinkmain:  "bg-pinkmain",
  danger:    "bg-danger",
};

function ToastCard({ toast, onDismiss }: { toast: AppToast; onDismiss: (id: string) => void }) {
  const router = useRouter();
  const ttl = toast.kind === "chat" ? CHAT_TTL : SYSTEM_TTL;
  const [progress, setProgress] = useState(100);
  const [paused, setPaused] = useState(false);
  const [exiting, setExiting] = useState(false);
  const pausedRef = useRef(false);
  const elapsed = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const dismiss = useCallback(() => {
    if (!mountedRef.current) return;
    setExiting(true);
    setTimeout(() => { if (mountedRef.current) onDismiss(toast.id); }, 220);
  }, [onDismiss, toast.id]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (pausedRef.current) return;
      elapsed.current += TICK_MS;
      const pct = Math.max(0, 100 - (elapsed.current / ttl) * 100);
      setProgress(pct);
      if (pct <= 0) dismiss();
    }, TICK_MS);
    return () => clearInterval(interval);
  }, [dismiss, ttl]);

  const handleMouseEnter = () => { setPaused(true); pausedRef.current = true; };
  const handleMouseLeave = () => { setPaused(false); pausedRef.current = false; };

  const iconBg = colorMap[toast.color] ?? colorMap.secondary;
  const progressBg = progressColorMap[toast.color] ?? progressColorMap.secondary;

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={() => { if (toast.link) { router.push(toast.link); dismiss(); } }}
      className={`relative w-[22rem] bg-white dark:bg-bodybg2 rounded-xl shadow-xl border border-defaultborder dark:border-defaultborder/30 overflow-hidden cursor-pointer select-none transition-all duration-200 ${exiting ? "opacity-0 translate-x-4" : "animate-slide-in-right"}`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3 p-4">
        <span className={`shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full text-sm ${iconBg}`}>
          <i className={`ti ti-${toast.icon} text-[1.1rem]`} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[0.8125rem] font-semibold text-defaulttextcolor dark:text-white leading-snug truncate">
            {toast.title}
          </p>
          <p className="text-[0.75rem] text-[#8c9097] dark:text-white/50 mt-0.5 line-clamp-2 leading-snug">
            {toast.body}
          </p>
        </div>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={(e) => { e.stopPropagation(); dismiss(); }}
          className="shrink-0 text-[#8c9097] hover:text-defaulttextcolor dark:text-white/40 dark:hover:text-white transition-colors p-0.5 rounded"
        >
          <i className="ti ti-x text-[0.9rem]" />
        </button>
      </div>
      <div className="h-[3px] w-full bg-defaultborder/30 dark:bg-white/10">
        <div
          className={`h-full ${progressBg}`}
          style={{ width: `${progress}%`, transition: paused ? "none" : `width ${TICK_MS}ms linear` }}
        />
      </div>
    </div>
  );
}

export function NotificationToastStack() {
  const { user } = useAuth();
  const userId = authUserId(user as { id?: string; _id?: string } | null);
  const { onNewMessage } = useChatSocket();
  const [toasts, setToasts] = useState<AppToast[]>([]);
  const seenMsgIds = useRef<Set<string>>(new Set());

  const addToast = useCallback((toast: Omit<AppToast, "id" | "createdAt">) => {
    setToasts((prev) => {
      const next = [...prev, { ...toast, id: crypto.randomUUID(), createdAt: Date.now() }];
      return next.slice(-MAX_TOASTS);
    });
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Chat message toasts
  useEffect(() => {
    return onNewMessage((msg: unknown) => {
      const m = msg as {
        id?: string;
        _id?: string;
        conversation?: string;
        sender?: { id?: string; _id?: string; name?: string };
        content?: string;
        type?: string;
      };
      // Dedup: backend now emits new_message to both conversation room and user room
      const msgId = String(m?.id || m?._id || "").trim();
      if (msgId) {
        if (seenMsgIds.current.has(msgId)) return;
        seenMsgIds.current.add(msgId);
      }
      const senderId = authUserId(m?.sender);
      if (!senderId || senderId === userId) return;

      const senderName = m?.sender?.name?.trim() || "New message";
      const body =
        m?.type === "audio" ? "Sent you a voice note" :
        m?.type === "image" ? "Sent you an image" :
        m?.type === "file"  ? "Sent you a file" :
        (m?.content || "Sent you a new message").trim();

      addToast({
        kind: "chat",
        title: senderName,
        body,
        link: m?.conversation ? `/communication/chats?conv=${m.conversation}` : "/communication/chats",
        icon: "message-circle",
        color: "primary",
      });
    });
  }, [onNewMessage, userId, addToast]);

  // System notification toasts via SSE
  useEffect(() => {
    if (!user?.id) return;
    const stream = openNotificationStream((event) => {
      if (event.type !== "notification") return;
      const n = event.notification;
      addToast({
        kind: "system",
        title: n.title,
        body: n.message,
        link: (n.link?.startsWith('/') ? n.link : null) ?? "/pages/notifications/",
        icon: notifTypeToIcon[n.type] ?? "bell",
        color: notifTypeToColor[n.type] ?? "secondary",
      });
    });
    return () => stream.close();
  }, [user?.id, addToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-[4.5rem] end-6 flex flex-col gap-2 z-[9999] pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastCard toast={t} onDismiss={dismiss} />
        </div>
      ))}
    </div>
  );
}
