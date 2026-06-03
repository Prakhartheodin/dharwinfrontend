"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import chatStyles from "../chats.module.scss";

export type ChatToastType = "success" | "error";

export interface ChatToastState {
  message: string;
  type: ChatToastType;
}

/**
 * Lightweight toast for chat actions (send, upload, voice note errors).
 */
export function ChatToast({ toast }: { toast: ChatToastState | null }) {
  if (!toast) return null;
  return (
    <div
      className={`${chatStyles.chatToast} ${toast.type === "error" ? chatStyles.chatToastError : chatStyles.chatToastSuccess}`}
      role="status"
      aria-live="polite"
    >
      <i className={toast.type === "error" ? "ri-error-warning-line" : "ri-check-line"} aria-hidden />
      <span>{toast.message}</span>
    </div>
  );
}

/**
 * Hook to show auto-dismissing chat toasts.
 */
export function useChatToast(durationMs = 4000) {
  const [toast, setToast] = useState<ChatToastState | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const showToast = useCallback(
    (message: string, type: ChatToastType = "error") => {
      setToast({ message, type });
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setToast(null), durationMs);
    },
    [durationMs]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return { toast, showToast };
}
