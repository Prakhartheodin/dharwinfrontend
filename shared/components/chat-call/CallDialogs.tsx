"use client";

/**
 * Presentational pieces of the chat calling UI: the sheet (centered card on desktop,
 * bottom sheet on mobile), avatar, action buttons, countdown and modal keyboard handling.
 * State and socket wiring live in GlobalIncomingCall.tsx / ChatSocketContext.tsx.
 */

import React, { useEffect, useRef, useState } from "react";
import { initialsOf, RING_TIMEOUT_MS } from "@/shared/components/chat-call/callState";

/** Keyframes + reduced-motion guard shared by every call surface. */
export const CALL_UI_CSS = `
@keyframes cc-ring { 0% { transform: scale(1); opacity: .45; } 100% { transform: scale(1.4); opacity: 0; } }
@keyframes cc-sheet-in { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
@keyframes cc-fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes cc-bar-in { from { opacity: 0; transform: translateY(-100%); } to { opacity: 1; transform: none; } }
.cc-ring { animation: cc-ring 1.8s cubic-bezier(.22,1,.36,1) infinite; }
.cc-ring-late { animation-delay: .9s; }
.cc-backdrop { animation: cc-fade-in .2s ease-out both; }
.cc-sheet { animation: cc-sheet-in .24s cubic-bezier(.22,1,.36,1) both; }
.cc-bar { animation: cc-bar-in .24s cubic-bezier(.22,1,.36,1) both; }
@media (prefers-reduced-motion: reduce) {
  .cc-ring { animation: none; display: none; }
  .cc-backdrop, .cc-sheet, .cc-bar { animation: none; }
}
`;

export function CallUiStyles() {
  return <style>{CALL_UI_CSS}</style>;
}

/** Initials avatar with an optional ringing pulse (hidden under prefers-reduced-motion). */
export function CallAvatar({
  name,
  ringing,
  size = "lg",
  icon,
}: {
  name: string;
  ringing?: boolean;
  size?: "lg" | "sm";
  /** Remixicon class to show instead of initials (e.g. group calls). */
  icon?: string;
}) {
  const box = size === "lg" ? "h-24 w-24 text-3xl" : "h-11 w-11 text-base";
  return (
    <span className={`relative inline-flex shrink-0 ${box}`} aria-hidden>
      {ringing && (
        <>
          <span className="cc-ring absolute inset-0 rounded-full bg-success/40" />
          <span className="cc-ring cc-ring-late absolute inset-0 rounded-full bg-success/30" />
        </>
      )}
      <span className="relative flex h-full w-full items-center justify-center rounded-full bg-primary/10 font-semibold text-primary ring-4 ring-white dark:bg-primary/20 dark:ring-bodybg2">
        {icon ? <i className={`${icon} ${size === "lg" ? "text-4xl" : "text-xl"}`} /> : initialsOf(name)}
      </span>
    </span>
  );
}

/** Big round call action with its label underneath (color is never the only signal). */
export function CallActionButton({
  kind,
  label,
  ariaLabel,
  icon,
  onClick,
  buttonRef,
  id,
}: {
  kind: "accept" | "decline" | "neutral";
  label: string;
  ariaLabel: string;
  icon: string;
  onClick: () => void;
  buttonRef?: React.Ref<HTMLButtonElement>;
  id?: string;
}) {
  const tone =
    kind === "accept"
      ? "bg-success text-white hover:bg-success/90 focus-visible:ring-success/40"
      : kind === "decline"
        ? "bg-danger text-white hover:bg-danger/90 focus-visible:ring-danger/40"
        : "bg-black/5 text-defaulttextcolor hover:bg-black/10 focus-visible:ring-primary/40 dark:bg-white/10 dark:text-white dark:hover:bg-white/15";
  return (
    <div className="flex flex-col items-center gap-2">
      <button
        ref={buttonRef}
        id={id}
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        className={`flex h-16 w-16 items-center justify-center rounded-full shadow-lg transition-[transform,background-color,box-shadow] duration-200 ease-out hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-4 motion-reduce:transform-none motion-reduce:transition-none ${tone}`}
      >
        <i className={`${icon} text-[1.75rem] leading-none`} aria-hidden />
      </button>
      <span className="text-xs font-semibold text-defaulttextcolor dark:text-white/80">{label}</span>
    </div>
  );
}

/** Remaining ring time for a call id; restarts when the id changes. */
export function useRingCountdown(callId: string | null | undefined, totalMs: number = RING_TIMEOUT_MS): number {
  const [remainingMs, setRemainingMs] = useState(totalMs);
  useEffect(() => {
    if (!callId) return;
    const started = Date.now();
    const tick = () => setRemainingMs(Math.max(0, totalMs - (Date.now() - started)));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [callId, totalMs]);
  return remainingMs;
}

/**
 * Modal keyboard handling: initial focus, Tab trap, Escape, optional Enter, focus restore.
 * Callbacks are read through a ref so the listener is attached once per open.
 */
export function useDialogKeyboard(
  rootRef: React.RefObject<HTMLElement | null>,
  initialFocusRef: React.RefObject<HTMLElement | null>,
  open: boolean,
  handlers: { onEscape: () => void; onEnter?: () => void }
) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!open || typeof document === "undefined") return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusTimer = setTimeout(() => initialFocusRef.current?.focus(), 0);

    const onKeyDown = (e: KeyboardEvent) => {
      const root = rootRef.current;
      if (!root) return;
      if (e.key === "Escape") {
        e.preventDefault();
        handlersRef.current.onEscape();
        return;
      }
      if (e.key === "Enter" && handlersRef.current.onEnter) {
        const active = document.activeElement;
        // A focused button inside the dialog handles Enter natively (Decline stays Decline).
        if (!(active instanceof HTMLButtonElement && root.contains(active))) {
          e.preventDefault();
          handlersRef.current.onEnter();
        }
        return;
      }
      if (e.key !== "Tab") return;
      const focusables = Array.from(
        root.querySelectorAll<HTMLElement>('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (!active || !root.contains(active)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKeyDown);
      if (previouslyFocused && document.contains(previouslyFocused)) {
        try {
          previouslyFocused.focus();
        } catch {
          /* ignore */
        }
      }
    };
  }, [open, rootRef, initialFocusRef]);
}

/** Backdrop + card: a centered card on ≥sm screens, a bottom sheet on phones. */
export function CallSheet({
  children,
  labelledBy,
  describedBy,
  rootRef,
}: {
  children: React.ReactNode;
  labelledBy: string;
  describedBy?: string;
  rootRef: React.RefObject<HTMLDivElement>;
}) {
  return (
    <div className="cc-backdrop fixed inset-0 z-[10050] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-6">
      <div
        ref={rootRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        className="cc-sheet relative w-full overflow-hidden rounded-t-3xl border border-defaultborder bg-white pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl dark:border-white/10 dark:bg-bodybg2 sm:max-w-sm sm:rounded-2xl sm:pb-6"
      >
        {children}
      </div>
    </div>
  );
}

/** Thin countdown bar pinned to the top edge of a call card. */
export function RingCountdownBar({ remainingMs, totalMs = RING_TIMEOUT_MS }: { remainingMs: number; totalMs?: number }) {
  const pct = Math.min(100, Math.max(0, (remainingMs / totalMs) * 100));
  const urgent = remainingMs > 0 && remainingMs <= 10_000;
  return (
    <div className="absolute inset-x-0 top-0 h-1 bg-black/5 dark:bg-white/10" aria-hidden>
      <div
        className={`h-full transition-[width] duration-200 ease-linear motion-reduce:transition-none ${urgent ? "bg-warning" : "bg-success"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
