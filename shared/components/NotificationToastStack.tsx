"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/shared/contexts/auth-context";
import { useChatSocket } from "@/shared/contexts/ChatSocketContext";
import { useNotificationContext } from "@/shared/contexts/NotificationContext";
import { isAiNudge, notifTypeToColor, notifTypeToIcon } from "@/shared/lib/notification-utils";
import { resolveNotificationRoute } from "@/shared/lib/notificationRoutes";
import { AiNudgeBadge } from "@/shared/components/AiNudgeBadge";
import {
  chatToastDedupeKey,
  claimChatToastKeys,
  decideChatMessageNotify,
  sharedChatClaims,
  shouldDeferSseChatToastToOs,
  shouldSuppressSystemChatToast,
} from "@/shared/lib/chatToastSuppress";

type ToastKind = "chat" | "system";

interface AppToast {
  id: string;
  kind: ToastKind;
  title: string;
  body: string;
  link?: string;
  icon: string;
  color: string;
  fromAi?: boolean;
  createdAt: number;
}

const CHAT_TTL = 5000;
const SYSTEM_TTL = 5000;
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

  // Announced by the stack's polite live region; the card itself is not an assertive alert
  // and never takes focus. Keyboard focus inside the card pauses the timer like hover does.
  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
      onClick={() => { if (toast.link) { router.push(toast.link); dismiss(); } }}
      className={`relative w-[22rem] max-w-[calc(100vw-2rem)] bg-white dark:bg-bodybg2 rounded-xl shadow-xl border border-defaultborder dark:border-defaultborder/30 overflow-hidden cursor-pointer select-none transition-all duration-200 motion-reduce:transition-none ${exiting ? "opacity-0 translate-x-4" : "animate-slide-in-right motion-reduce:animate-none"}`}
      aria-label={toast.fromAi ? `${toast.title} - AI generated` : toast.title}
    >
      <div className="flex items-start gap-3 py-2 ps-4 pe-1">
        <span className={`mt-2 shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full text-sm ${iconBg}`}>
          <i className={`ti ti-${toast.icon} text-[1.1rem]`} />
        </span>
        <div className="flex-1 min-w-0 py-2">
          <p className="text-[0.8125rem] font-semibold text-defaulttextcolor dark:text-white leading-snug min-w-0 flex items-center gap-1.5">
            <span className="truncate">{toast.title}</span>
            {toast.fromAi ? <AiNudgeBadge /> : null}
          </p>
          <p className="text-[0.75rem] text-[#8c9097] dark:text-white/50 mt-0.5 line-clamp-2 leading-snug">
            {toast.body}
          </p>
        </div>
        <button
          type="button"
          aria-label={`Dismiss notification: ${toast.title}`}
          onClick={(e) => { e.stopPropagation(); dismiss(); }}
          className="shrink-0 inline-flex h-11 w-11 items-center justify-center rounded-full text-[#8c9097] hover:bg-black/5 hover:text-defaulttextcolor dark:text-white/40 dark:hover:bg-white/10 dark:hover:text-white transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <i className="ri-close-line text-lg" aria-hidden />
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
  const { onNewMessage, activeConversationId, connected } = useChatSocket();
  const { latestNotification, error: sseError } = useNotificationContext();
  const [toasts, setToasts] = useState<AppToast[]>([]);
  // Claims are shared with the OS-notification path in ChatSocketContext (bounded, ~500 keys).
  const claimedChatKeys = sharedChatClaims;
  const prevLatestIdRef = useRef<string | null>(null);
  const activeConvRef = useRef<string | null>(activeConversationId);
  const connectedRef = useRef(connected);

  useEffect(() => {
    activeConvRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    connectedRef.current = connected;
  }, [connected]);

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
        suppressInAppNotify?: boolean;
      };
      if (typeof window === "undefined") return;
      const msgId = String(m?.id || m?._id || "").trim();
      const conversationId = m?.conversation ? String(m.conversation) : "";

      // Same decision the OS-notification path makes (ChatSocketContext). Viewing =
      // activeConversationId only — a stale URL ?conv= must not suppress.
      const decision = decideChatMessageNotify({
        selfId: userId,
        senderId: authUserId(m?.sender),
        conversationId,
        suppressInAppNotify: m?.suppressInAppNotify,
        loc: { pathname: window.location.pathname, activeConversationId: activeConvRef.current },
        visibility: document.visibilityState,
        osPermissionGranted: "Notification" in window && Notification.permission === "granted",
      });
      if (decision.action === "suppress") {
        // Muted / being viewed: claim so the SSE twin of this message is dropped too.
        const key = chatToastDedupeKey({ messageId: msgId });
        if (key) claimedChatKeys.add(key);
        return;
      }
      // "defer": the conversation-room copy; the user-room copy (with the mute flag) decides.
      if (decision.action !== "notify" || !decision.toast) return;

      // Claim before showing so a later SSE chat_message for the same id is dropped — and the
      // backend's room + user double delivery shows once. False = another surface already won.
      const isFirstClaim = claimChatToastKeys(claimedChatKeys, {
        messageId: msgId || null,
        conversationId: conversationId || null,
      });
      if (!isFirstClaim) return;

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
        link: conversationId ? `/communication/chats?conv=${conversationId}` : "/communication/chats",
        icon: "message-circle",
        color: "primary",
      });
    });
  }, [onNewMessage, userId, addToast, claimedChatKeys]);

  // System notification toasts from shared SSE context
  useEffect(() => {
    if (!latestNotification) return;
    if (prevLatestIdRef.current === latestNotification._id) return;
    prevLatestIdRef.current = latestNotification._id;
    const n = latestNotification;

    const relatedConv =
      n.type === "chat_message" ? String(n.relatedEntity?.id ?? "").trim() : "";
    const messageId =
      n.type === "chat_message"
        ? String((n.metadata as { messageId?: string } | null | undefined)?.messageId ?? "").trim()
        : "";

    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      const loc = {
        pathname: url.pathname,
        activeConversationId: activeConvRef.current,
      };
      if (
        shouldSuppressSystemChatToast({
          notificationType: n.type,
          conversationId: relatedConv || null,
          messageId: messageId || null,
          loc,
          claimedKeys: claimedChatKeys,
        })
      ) {
        return;
      }
      if (n.type === "chat_message") {
        // Hidden tab: the socket path shows the OS notification for this message. Do not
        // claim, or that path would find the key taken and show nothing.
        if (
          shouldDeferSseChatToastToOs({
            visibility: document.visibilityState,
            osPermissionGranted: "Notification" in window && Notification.permission === "granted",
            socketConnected: connectedRef.current,
          })
        ) {
          return;
        }
        // First arrival via SSE: claim so a later socket toast for the same message is dropped.
        // (Muted messages never reach here: the backend skips persisting them, and a socket
        // copy flagged suppressInAppNotify claims the key first.)
        const isFirst = claimChatToastKeys(claimedChatKeys, {
          messageId: messageId || null,
          conversationId: relatedConv || null,
        });
        if (!isFirst) return;
      }
    }

    addToast({
      kind: "system",
      title: n.title,
      body: n.message,
      link: resolveNotificationRoute(n),
      icon: notifTypeToIcon[n.type] ?? "bell",
      color: notifTypeToColor[n.type] ?? "secondary",
      fromAi: isAiNudge(n.type),
    });
  }, [latestNotification, addToast, claimedChatKeys]);

  return (
    <>
      {sseError && (
        <div className="fixed top-[4.5rem] start-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 px-4 py-2 text-[0.8125rem] text-danger shadow-sm">
          <i className="ti ti-wifi-off" />
          {sseError}
        </div>
      )}
      {/* Always mounted so screen readers register the live region before the first toast. */}
      <div
        className="fixed top-[4.5rem] end-4 sm:end-6 flex flex-col gap-2 z-[9999] pointer-events-none"
        role="region"
        aria-label="Notifications"
        aria-live="polite"
        aria-relevant="additions"
      >
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastCard toast={t} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </>
  );
}
